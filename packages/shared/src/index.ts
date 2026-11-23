import { z } from 'zod'

export const categoryTypeSchema = z.enum(['income', 'expense'])
export type CategoryType = z.infer<typeof categoryTypeSchema>

export const categorySchema = z.object({
  user_id: z.coerce.number().int().positive().default(1),
  name: z.string().trim().min(2, 'El nombre requiere al menos 2 caracteres').max(80),
  type: categoryTypeSchema,
})

export const transactionSchema = z.object({
  user_id: z.coerce.number().int().positive().default(1),
  category_id: z.coerce.number().int().positive(),
  type: categoryTypeSchema,
  amount: z.coerce.number().positive('El importe debe ser mayor a 0').max(999999999.99),
  description: z.string().trim().min(2, 'Agrega una descripción breve').max(200),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD'),
})

export const budgetSchema = z.object({
  user_id: z.coerce.number().int().positive().default(1),
  category_id: z.coerce.number().int().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato de mes YYYY-MM'),
  limit_amount: z.coerce.number().positive('El presupuesto debe ser mayor a 0').max(999999999.99),
})

export interface User {
  id: number
  full_name: string
  email: string
}

export interface Category {
  id: number
  user_id: number
  name: string
  type: CategoryType
}

export interface TransactionItem {
  id: number
  user_id: number
  category_id: number
  category_name: string
  type: CategoryType
  amount: number
  description: string
  occurred_on: string
}

export interface BudgetItem {
  id: number
  user_id: number
  category_id: number
  category_name: string
  month: string
  limit_amount: number
  spent_amount: number
  remaining_amount: number
}

export interface MonthlyReport {
  month: string
  user_id: number
  total_income: number
  total_expense: number
  balance: number
  budgets: BudgetItem[]
}

// ponytail: esquemas y helpers compartidos para evitar duplicar regex y fórmulas entre API y Web
export const monthQuerySchema = z.string().regex(/^\d{4}-\d{2}$/, 'Formato de mes YYYY-MM')

export const transactionFilterSchema = z.object({
  category_id: z.coerce.number().int().positive().optional(),
  type: categoryTypeSchema.optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD').optional(),
}).refine((f) => !f.from || !f.to || f.from <= f.to, {
  message: 'La fecha inicial no puede ser mayor a la fecha final',
  path: ['from'],
})

export type BudgetStatus = 'ok' | 'warning' | 'exceeded'

export function currentMonth(date = new Date()): string {
  return date.toISOString().slice(0, 7)
}

export function budgetUsagePercent(spent: number, limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(spent)) return 0
  return Math.min(100, Math.max(0, Math.round((spent / limit) * 100)))
}

export function getBudgetStatus(spent: number, limit: number): BudgetStatus {
  if (!Number.isFinite(limit) || limit <= 0 || spent > limit) return 'exceeded'
  if (spent >= limit * 0.8) return 'warning'
  return 'ok'
}

export interface TransactionSummary {
  income: number
  expense: number
  balance: number
  count: number
}

// ponytail: acumula en centavos enteros (estilo MoneyCloud) para evitar errores de punto flotante
export function summarizeTransactions(
  items: ReadonlyArray<Pick<TransactionItem, 'type' | 'amount'>>,
): TransactionSummary {
  let incomeCents = 0
  let expenseCents = 0
  for (const item of items) {
    const cents = Math.round((Number(item.amount) || 0) * 100)
    if (item.type === 'income') incomeCents += cents
    else expenseCents += cents
  }
  return {
    income: incomeCents / 100,
    expense: expenseCents / 100,
    balance: (incomeCents - expenseCents) / 100,
    count: items.length,
  }
}

function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function transactionsToCsv(items: ReadonlyArray<TransactionItem>): string {
  const header = 'fecha,categoria,tipo,importe,descripcion'
  const rows = items.map((tx) =>
    [tx.occurred_on, tx.category_name, tx.type, tx.amount.toFixed(2), tx.description]
      .map(escapeCsvCell)
      .join(','),
  )
  return [header, ...rows].join('\n')
}
