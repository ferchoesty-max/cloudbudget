import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import express, { type ErrorRequestHandler } from 'express'
import cors from 'cors'
import { routes } from './routes.js'
import { pool } from './db.js'

export interface AppOptions {
  rateLimitMax?: number
  rateLimitWindowMs?: number
}

export function createApp(options: AppOptions = {}) {
  const app = express()
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  // ponytail: trazabilidad con node:crypto y headers nativos sin instalar helmet
  app.use((req, res, next) => {
    const requestId = req.header('x-request-id') ?? randomUUID()
    res.setHeader('X-Request-Id', requestId)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')
    if (process.env.NODE_ENV !== 'test') {
      const start = Date.now()
      res.on('finish', () => {
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms [${requestId}]`)
      })
    }
    next()
  })

  app.use(cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(Object.assign(new Error('Origen CORS no permitido'), { status: 403 }))
    },
  }))

  // ponytail: rate limit en memoria por instancia (en Render multi-réplica usar Redis)
  const windowMs = options.rateLimitWindowMs ?? 60_000
  const envMax = Number(process.env.RATE_LIMIT_MAX)
  const maxHits = options.rateLimitMax ?? (Number.isInteger(envMax) && envMax > 0 ? envMax : 120)
  const hits = new Map<string, { count: number; resetAt: number }>()
  app.use((req, res, next) => {
    const now = Date.now()
    if (hits.size > 5000) hits.clear()
    const key = req.ip || 'unknown'
    const entry = hits.get(key)
    const active = !entry || entry.resetAt <= now ? { count: 0, resetAt: now + windowMs } : entry
    active.count += 1
    hits.set(key, active)
    res.setHeader('X-RateLimit-Limit', String(maxHits))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxHits - active.count)))
    if (active.count > maxHits) {
      res.status(429).json({ error: { message: 'Demasiadas peticiones, intenta de nuevo en un minuto' } })
      return
    }
    next()
  })

  app.use(express.json({ limit: '20kb' }))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'cloudbudget-api' })
  })

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'cloudbudget-api' })
  })

  app.get('/ready', async (_req, res) => {
    try {
      await pool.query('SELECT 1')
      res.json({ status: 'ready' })
    } catch {
      res.status(503).json({ status: 'database_unavailable' })
    }
  })

  // ponytail: montamos en /api y /api/v1 para que funcione igual con el PDF (/api/...) y con el estilo GradeCloud
  app.use('/api', routes)
  app.use('/api/v1', routes)

  app.use((_req, res) => res.status(404).json({ error: { message: 'Ruta no encontrada' } }))

  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const err = error as { code?: string; status?: number; type?: string; message?: string }
    if (err.status === 403) {
      res.status(403).json({ error: { message: err.message || 'Origen CORS no permitido' } })
      return
    }
    if (err.type === 'entity.parse.failed' || (error instanceof SyntaxError && err.status === 400)) {
      res.status(400).json({ error: { message: 'JSON inválido en el cuerpo de la petición' } })
      return
    }
    if (err.code === '23505') {
      res.status(409).json({ error: { message: 'El registro ya existe para este usuario' } })
      return
    }
    if (err.code === '23503') {
      res.status(400).json({ error: { message: 'Usuario o categoría inexistente o en uso' } })
      return
    }
    if (err.code === '23514' || err.code === '22P02') {
      res.status(400).json({ error: { message: 'Valor fuera de rango o formato inválido' } })
      return
    }
    console.error('Error interno en API:', error)
    res.status(500).json({ error: { message: 'Error interno del servidor' } })
  }
  app.use(errorHandler)
  return app
}
