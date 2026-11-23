import { Router, type Request } from 'express'
import { z } from 'zod'
import {
  budgetSchema,
  categorySchema,
  currentMonth,
  monthQuerySchema,
  transactionSchema,
} from '@cloudbudget/shared'
import { pool } from './db.js'

export const routes = Router()

export function resolveUserId(req: Request): number {
  const raw = req.query.user_id ?? req.headers['x-user-id'] ?? req.body?.user_id ?? 1
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : 1
}

export function invalidResponse(issues: z.ZodIssue[]) {
  return {
    error: {
      message: 'Datos inválidos',
      details: issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    },
  }
}

function resolveMonth(raw: unknown): string {
  const parsed = monthQuerySchema.safeParse(raw)
  return parsed.success ? parsed.data : currentMonth()
}

routes.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cloudbudget-api' })
})

routes.get('/users', async (_req, res) => {
  const { rows } = await pool.query('SELECT id, full_name, email FROM users ORDER BY id ASC')
  res.json({ data: rows })
})

routes.get('/categories', async (req, res) => {
  const userId = resolveUserId(req)
  const { rows } = await pool.query(
    'SELECT id, user_id, name, type FROM categories WHERE user_id = $1 ORDER BY type ASC, name ASC',
    [userId],
  )
  res.json({ data: rows })
})

routes.post('/categories', async (req, res, next) => {
  const parsed = categorySchema.safeParse({ ...req.body, user_id: resolveUserId(req) })
  if (!parsed.success) {
    res.status(400).json(invalidResponse(parsed.error.issues))
    return
  }
  try {
    const { user_id, name, type } = parsed.data
    const { rows } = await pool.query(
      'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) RETURNING id, user_id, name, type',
      [user_id, name, type],
    )
    res.status(201).json({ data: rows[0] })
  } catch (error) {
    next(error)
  }
})

routes.get('/transactions', async (req, res) => {
  const userId = resolveUserId(req)
  const categoryId = req.query.category_id ? Number(req.query.category_id) : null
  const type = typeof req.query.type === 'string' && ['income', 'expense'].includes(req.query.type) ? req.query.type : null
  const from = typeof req.query.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.from) ? req.query.from : null
  const to = typeof req.query.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to) ? req.query.to : null

  const { rows } = await pool.query(
    `SELECT
       t.id,
       t.user_id,
       t.category_id,
       c.name AS category_name,
       t.type,
       ROUND(t.amount, 2)::float AS amount,
       t.description,
       t.occurred_on::text AS occurred_on
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1
       AND ($2::int IS NULL OR t.category_id = $2)
       AND ($3::text IS NULL OR t.type = $3)
       AND ($4::date IS NULL OR t.occurred_on >= $4::date)
       AND ($5::date IS NULL OR t.occurred_on <= $5::date)
     ORDER BY t.occurred_on DESC, t.id DESC`,
    [userId, categoryId, type, from, to],
  )
  res.json({ data: rows })
})

routes.post('/transactions', async (req, res, next) => {
  const parsed = transactionSchema.safeParse({ ...req.body, user_id: resolveUserId(req) })
  if (!parsed.success) {
    res.status(400).json(invalidResponse(parsed.error.issues))
    return
  }
  try {
    const { user_id, category_id, type, amount, description, occurred_on } = parsed.data
    const catCheck = await pool.query(
      'SELECT id, type, name FROM categories WHERE id = $1 AND user_id = $2',
      [category_id, user_id],
    )
    if (catCheck.rowCount === 0) {
      res.status(400).json({ error: { message: 'La categoría seleccionada no pertenece a este usuario' } })
      return
    }
    if (catCheck.rows[0].type !== type) {
      res.status(400).json({ error: { message: 'El tipo de movimiento no coincide con el tipo de la categoría' } })
      return
    }

    const { rows } = await pool.query(
      `INSERT INTO transactions (user_id, category_id, type, amount, description, occurred_on)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, category_id, type, ROUND(amount, 2)::float AS amount, description, occurred_on::text AS occurred_on`,
      [user_id, category_id, type, amount, description, occurred_on],
    )
    res.status(201).json({
      data: {
        ...rows[0],
        category_name: catCheck.rows[0].name,
      },
    })
  } catch (error) {
    next(error)
  }
})

routes.delete('/transactions/:id', async (req, res) => {
  const userId = resolveUserId(req)
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: { message: 'Identificador inválido' } })
    return
  }
  const result = await pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, userId])
  if (result.rowCount === 0) {
    res.status(404).json({ error: { message: 'Movimiento no encontrado para este usuario' } })
    return
  }
  res.status(204).send()
})

routes.get('/budgets', async (req, res) => {
  const userId = resolveUserId(req)
  const month = resolveMonth(req.query.month)

  const { rows } = await pool.query(
    `SELECT
       b.id,
       b.user_id,
       b.category_id,
       c.name AS category_name,
       b.month,
       ROUND(b.limit_amount, 2)::float AS limit_amount,
       COALESCE(ROUND(SUM(t.amount), 2), 0)::float AS spent_amount,
       ROUND(b.limit_amount - COALESCE(SUM(t.amount), 0), 2)::float AS remaining_amount
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN transactions t
       ON t.category_id = b.category_id
      AND t.user_id = b.user_id
      AND t.type = 'expense'
      AND TO_CHAR(t.occurred_on, 'YYYY-MM') = b.month
     WHERE b.user_id = $1 AND b.month = $2
     GROUP BY b.id, b.user_id, b.category_id, c.name, b.month, b.limit_amount
     ORDER BY c.name ASC`,
    [userId, month],
  )
  res.json({ data: rows })
})

routes.post('/budgets', async (req, res, next) => {
  const parsed = budgetSchema.safeParse({ ...req.body, user_id: resolveUserId(req) })
  if (!parsed.success) {
    res.status(400).json(invalidResponse(parsed.error.issues))
    return
  }
  try {
    const { user_id, category_id, month, limit_amount } = parsed.data
    const catCheck = await pool.query(
      'SELECT id, name, type FROM categories WHERE id = $1 AND user_id = $2',
      [category_id, user_id],
    )
    if (catCheck.rowCount === 0) {
      res.status(400).json({ error: { message: 'La categoría no pertenece a este usuario' } })
      return
    }
    if (catCheck.rows[0].type !== 'expense') {
      res.status(400).json({ error: { message: 'Solo se pueden asignar presupuestos a categorías de gasto' } })
      return
    }

    const { rows } = await pool.query(
      `INSERT INTO budgets (user_id, category_id, month, limit_amount, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, category_id, month)
       DO UPDATE SET limit_amount = EXCLUDED.limit_amount, updated_at = NOW()
       RETURNING id, user_id, category_id, month, ROUND(limit_amount, 2)::float AS limit_amount`,
      [user_id, category_id, month, limit_amount],
    )
    res.status(200).json({
      data: {
        ...rows[0],
        category_name: catCheck.rows[0].name,
        spent_amount: 0,
        remaining_amount: rows[0].limit_amount,
      },
    })
  } catch (error) {
    next(error)
  }
})