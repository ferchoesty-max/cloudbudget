import 'dotenv/config'
import express, { type ErrorRequestHandler } from 'express'
import cors from 'cors'
import { routes } from './routes.js'
import { pool } from './db.js'

export function createApp() {
  const app = express()
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  app.use(cors({ origin: origins }))
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
    const dbError = error as { code?: string }
    if (dbError.code === '23505') {
      res.status(409).json({ error: { message: 'El registro ya existe para este usuario' } })
      return
    }
    if (dbError.code === '23503') {
      res.status(400).json({ error: { message: 'Usuario o categoría inexistente' } })
      return
    }
    console.error('Error interno en API:', error)
    res.status(500).json({ error: { message: 'Error interno del servidor' } })
  }
  app.use(errorHandler)
  return app
}
