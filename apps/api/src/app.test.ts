import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from './app.js'

const app = createApp()

describe('CloudBudget API - Salud', () => {
  it('GET /api/health devuelve estado OK', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
  })
})
