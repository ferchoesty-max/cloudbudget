import { describe, expect, it } from 'vitest'
import request from 'supertest'
import {
  budgetUsagePercent,
  currentMonth,
  getBudgetStatus,
  monthQuerySchema,
  summarizeTransactions,
  transactionFilterSchema,
  transactionsToCsv,
} from '@cloudbudget/shared'
import { createApp } from './app.js'

const app = createApp()

describe('CloudBudget API - Salud, CORS, Rate Limit y Seguridad', () => {
  it('GET /api/health devuelve OK, trazabilidad y cabeceras de seguridad', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok', service: 'cloudbudget-api' })
    expect(response.headers['x-powered-by']).toBeUndefined()
    expect(response.headers['x-request-id']).toBeTruthy()
    expect(response.headers['x-ratelimit-limit']).toBeTruthy()
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-frame-options']).toBe('DENY')
    expect(response.headers['referrer-policy']).toBe('no-referrer')
  })

  it('CORS permite origen autorizado y bloquea origen ajeno con 403', async () => {
    const allowed = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000')
    expect(allowed.status).toBe(200)

    const blocked = await request(app)
      .get('/api/health')
      .set('Origin', 'https://sitio-no-autorizado.test')
    expect(blocked.status).toBe(403)
    expect(blocked.body.error.message).toBe('Origen CORS no permitido')
  })

  it('Rate limit devuelve 429 al superar el máximo por ventana', async () => {
    const limitedApp = createApp({ rateLimitMax: 2, rateLimitWindowMs: 60_000 })
    expect((await request(limitedApp).get('/api/health')).status).toBe(200)
    expect((await request(limitedApp).get('/api/health')).status).toBe(200)
    const third = await request(limitedApp).get('/api/health')
    expect(third.status).toBe(429)
    expect(third.body.error.message).toBe('Demasiadas peticiones, intenta de nuevo en un minuto')
  })

  it('POST /api/categories rechaza JSON malformado con 400', async () => {
    const response = await request(app)
      .post('/api/categories')
      .set('Content-Type', 'application/json')
      .send('{"name":')
    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('JSON inválido en el cuerpo de la petición')
  })

  it('POST /api/categories rechaza nombres cortos o tipos inválidos', async () => {
    const response = await request(app)
      .post('/api/categories')
      .send({ name: 'A', type: 'invalido' })
    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('Datos inválidos')
  })

  it('POST /api/transactions rechaza importes negativos o fecha inválida', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .send({
        category_id: 1,
        type: 'expense',
        amount: -50,
        description: 'Gasto inválido',
        occurred_on: '08-11-2026',
      })
    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('Datos inválidos')
  })

  it('GET /api/no-existe responde 404 con estructura estándar', async () => {
    const response = await request(app).get('/api/no-existe')
    expect(response.status).toBe(404)
    expect(response.body.error.message).toBe('Ruta no encontrada')
  })

  it('POST /api/budgets valida el formato YYYY-MM y monto positivo', async () => {
    const response = await request(app)
      .post('/api/budgets')
      .send({
        category_id: 2,
        month: 'noviembre-2026',
        limit_amount: 0,
      })
    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('Datos inválidos')
  })
})

describe('CloudBudget Shared - Contratos, Presupuestos y CSV', () => {
  it('monthQuerySchema valida YYYY-MM y currentMonth formatea fecha UTC', () => {
    expect(monthQuerySchema.safeParse('2026-11').success).toBe(true)
    expect(monthQuerySchema.safeParse('noviembre-2026').success).toBe(false)
    expect(currentMonth(new Date('2026-11-22T12:00:00Z'))).toBe('2026-11')
  })

  it('transactionFilterSchema acepta rango válido y rechaza from > to', () => {
    expect(
      transactionFilterSchema.safeParse({
        category_id: '2',
        type: 'expense',
        from: '2026-11-01',
        to: '2026-11-30',
      }).success,
    ).toBe(true)

    const inverted = transactionFilterSchema.safeParse({
      from: '2026-11-20',
      to: '2026-11-05',
    })
    expect(inverted.success).toBe(false)
  })

  it('budgetUsagePercent y getBudgetStatus calculan avance y semáforo', () => {
    expect(budgetUsagePercent(500, 1000)).toBe(50)
    expect(budgetUsagePercent(1500, 1000)).toBe(100)
    expect(budgetUsagePercent(100, 0)).toBe(0)

    expect(getBudgetStatus(500, 1000)).toBe('ok')
    expect(getBudgetStatus(800, 1000)).toBe('warning')
    expect(getBudgetStatus(1000.01, 1000)).toBe('exceeded')
    expect(getBudgetStatus(100, 0)).toBe('exceeded')
  })

  it('summarizeTransactions calcula totales exactos usando centavos enteros', () => {
    const summary = summarizeTransactions([
      { type: 'income', amount: 1000 },
      { type: 'expense', amount: 0.1 },
      { type: 'expense', amount: 0.2 },
    ])
    expect(summary).toEqual({
      income: 1000,
      expense: 0.3,
      balance: 999.7,
      count: 3,
    })
  })

  it('transactionsToCsv escapa comas y comillas según RFC-4180', () => {
    const csv = transactionsToCsv([
      {
        id: 1,
        user_id: 1,
        category_id: 2,
        category_name: 'Comida, café',
        type: 'expense',
        amount: 185.5,
        description: 'Torta "especial"',
        occurred_on: '2026-11-22',
      },
    ])
    expect(csv).toBe(
      'fecha,categoria,tipo,importe,descripcion\n2026-11-22,"Comida, café",expense,185.50,"Torta ""especial"""',
    )
  })
})
