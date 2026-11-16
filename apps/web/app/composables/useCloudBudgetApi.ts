import type {
  BudgetItem,
  Category,
  CategoryType,
  MonthlyReport,
  TransactionItem,
  User,
} from '@cloudbudget/shared'

interface ApiResponse<T> {
  data: T
}

type HttpMethod = 'GET' | 'POST' | 'DELETE'

export function useCloudBudgetApi() {
  const config = useRuntimeConfig()
  const apiBase = String(config.public.apiBase).replace(/\/$/, '')

  async function call<T>(path: string, method: HttpMethod = 'GET', body?: Record<string, unknown>, userId = 1) {
    const response = await $fetch<ApiResponse<T>>(`${apiBase}/api${path}`, {
      method,
      body,
      headers: { 'x-user-id': String(userId) },
    })
    return response.data
  }

  return {
    getUsers: () => call<User[]>('/users'),
    getCategories: (userId: number) => call<Category[]>(`/categories?user_id=${userId}`, 'GET', undefined, userId),
    createCategory: (userId: number, data: { name: string; type: CategoryType }) =>
      call<Category>('/categories', 'POST', { ...data, user_id: userId }, userId),
    getTransactions: (
      userId: number,
      filters?: { category_id?: string; type?: string; from?: string; to?: string },
    ) => {
      const params = new URLSearchParams({ user_id: String(userId) })
      if (filters?.category_id) params.set('category_id', filters.category_id)
      if (filters?.type) params.set('type', filters.type)
      if (filters?.from) params.set('from', filters.from)
      if (filters?.to) params.set('to', filters.to)
      return call<TransactionItem[]>(`/transactions?${params.toString()}`, 'GET', undefined, userId)
    },
    createTransaction: (
      userId: number,
      data: {
        category_id: number
        type: CategoryType
        amount: number
        description: string
        occurred_on: string
      },
    ) => call<TransactionItem>('/transactions', 'POST', { ...data, user_id: userId }, userId),
    deleteTransaction: (userId: number, id: number) =>
      $fetch<void>(`${apiBase}/api/transactions/${id}?user_id=${userId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': String(userId) },
      }),
    getBudgets: (userId: number, month: string) =>
      call<BudgetItem[]>(`/budgets?user_id=${userId}&month=${month}`, 'GET', undefined, userId),
    saveBudget: (
      userId: number,
      data: { category_id: number; month: string; limit_amount: number },
    ) => call<BudgetItem>('/budgets', 'POST', { ...data, user_id: userId }, userId),
    getMonthlyReport: (userId: number, month: string) =>
      call<MonthlyReport>(`/reports/monthly?user_id=${userId}&month=${month}`, 'GET', undefined, userId),
  }
}

export function readableError(error: unknown) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { error?: { message?: string } } }).data
    if (data?.error?.message) return data.error.message
  }
  return error instanceof Error ? error.message : 'No fue posible comunicarse con la API'
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(value ?? 0)
}
