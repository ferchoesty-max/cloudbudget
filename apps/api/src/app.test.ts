import { describe, expect, it } from 'vitest'
import request from 'supertest'
import {
  budgetUsagePercent,
  currentMonth,
  getBudgetStatus,
  monthQuerySchema,
  transactionFilterSchema,
} from '@cloudbudget/shared'
import { createApp } from './app.js'

const app = createApp()

describe('CloudBudget API - Salud y Seguridad', () => {
  it('GET /api/health devuelve estado OK y cabeceras de seguridad', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok', service: 'cloudbudget-api' })
    expect(response.headers['x-powered-by']).toBeUndefined()
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-frame-options']).toBe('DENY')
    expect(response.headers['referrer-policy']).toBe('no-referrer')
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

  it('POST /api/transactions rechaza importes negativos o formato de fecha inválido', async () => {
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
})

describe('CloudBudget Shared - Contratos y Helpers de Presupuesto', () => {
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
})
