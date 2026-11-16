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
