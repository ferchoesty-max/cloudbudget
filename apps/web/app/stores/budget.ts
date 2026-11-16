import { defineStore } from 'pinia'
import type { Category, MonthlyReport, TransactionItem, User } from '@cloudbudget/shared'

export const useBudgetStore = defineStore('budget', () => {
  const api = useCloudBudgetApi()

  const users = ref<User[]>([])
  const firstUser = users.value[0]
  const activeUserId = ref<number>(1)
  const selectedMonth = ref<string>('2026-11')
  const categories = ref<Category[]>([])
  const transactions = ref<TransactionItem[]>([])
  const report = ref<MonthlyReport | null>(null)
  const loading = ref<boolean>(false)
  const errorMessage = ref<string>('')

  async function loadUsers() {
    try {
      users.value = await api.getUsers()
      if (firstUser && !users.value.some((u) => u.id === activeUserId.value)) {
        activeUserId.value = firstUser.id
      }
    } catch (error) {
      errorMessage.value = readableError(error)
    }
  }

  async function loadCategories() {
    categories.value = await api.getCategories(activeUserId.value)
  }

  async function loadTransactions(filters?: { category_id?: string; type?: string; from?: string; to?: string }) {
    transactions.value = await api.getTransactions(activeUserId.value, filters)
  }

  async function loadMonthlyReport() {
    report.value = await api.getMonthlyReport(activeUserId.value, selectedMonth.value)
  }

  async function refreshAll() {
    loading.value = true
    errorMessage.value = ''
    try {
      if (users.value.length === 0) await loadUsers()
      await Promise.all([loadCategories(), loadTransactions()])
    } catch (error) {
      errorMessage.value = readableError(error)
    } finally {
      loading.value = false
    }
  }

  return {
    users,
    activeUserId,
    selectedMonth,
    categories,
    transactions,
    report,
    loading,
    errorMessage,
    loadUsers,
    loadCategories,
    loadTransactions,
    loadMonthlyReport,
    refreshAll,
  }
})
