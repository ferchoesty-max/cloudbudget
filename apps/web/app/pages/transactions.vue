<script setup lang="ts">
import type { CategoryType } from '@cloudbudget/shared'

const store = useBudgetStore()
const api = useCloudBudgetApi()

const form = reactive<{
  type: CategoryType
  category_id: string
  amount: string
  description: string
  occurred_on: string
}>({
  type: 'expense',
  category_id: '',
  amount: '',
  description: '',
  occurred_on: new Date().toISOString().slice(0, 10),
})

const filters = reactive({
  category_id: '',
  type: '',
  from: '',
  to: '',
})

const saving = ref(false)
const notice = ref('')
const errorMessage = ref('')

const filteredCategories = computed(() =>
  store.categories.filter((c) => c.type === form.type),
)

watch(
  () => form.type,
  () => {
    form.category_id = ''
  },
)

onMounted(async () => {
  await store.refreshAll()
})

async function applyFilters() {
  errorMessage.value = ''
  try {
    await store.loadTransactions(filters)
  } catch (error) {
    errorMessage.value = readableError(error)
  }
}

async function clearFilters() {
  filters.category_id = ''
  filters.type = ''
  filters.from = ''
  filters.to = ''
  await applyFilters()
}

async function save() {
  saving.value = true
  notice.value = ''
  errorMessage.value = ''
  try {
    await api.createTransaction(store.activeUserId, {
      category_id: Number(form.category_id),
      type: form.type,
      amount: Number(form.amount),
      description: form.description,
      occurred_on: form.occurred_on,
    })
    form.amount = ''
    form.description = ''
    notice.value = 'Movimiento registrado en PostgreSQL.'
    await applyFilters()
  } catch (error) {
    errorMessage.value = readableError(error)
  } finally {
    saving.value = false
  }
}

async function remove(id: number) {
  errorMessage.value = ''
  notice.value = ''
  try {
    await api.deleteTransaction(store.activeUserId, id)
    notice.value = 'Movimiento eliminado.'
    await applyFilters()
  } catch (error) {
    errorMessage.value = readableError(error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="text-sm font-semibold text-emerald-600">
        Registro financiero
      </p>
      <h1 class="mt-1 text-3xl font-extrabold tracking-tight">
        Ingresos y gastos
      </h1>
      <p class="mt-2 text-sm text-slate-500">
        Captura cada movimiento con precisión decimal y filtra por fecha o categoría.
      </p>
    </div>

    <p v-if="errorMessage" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>
    <p v-if="notice" role="status" class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
      {{ notice }}
    </p>

    <section class="card">
      <h2 class="mb-4 text-lg font-bold">
        Registrar nuevo movimiento
      </h2>
      <form class="grid gap-4 md:grid-cols-2 lg:grid-cols-6 md:items-end" @submit.prevent="save">
        <label class="block text-sm font-medium">
          Tipo
          <select v-model="form.type" class="form-control mt-2" required>
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </select>
        </label>

        <label class="block text-sm font-medium">
          Categoría
          <select v-model="form.category_id" class="form-control mt-2" required>
            <option value="" disabled>Seleccionar...</option>
            <option v-for="cat in filteredCategories" :key="cat.id" :value="String(cat.id)">
              {{ cat.name }}
            </option>
          </select>
        </label>

        <label class="block text-sm font-medium">
          Importe (MXN)
          <input
            v-model="form.amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            class="form-control mt-2"
            placeholder="0.00"
          >
        </label>

        <label class="block text-sm font-medium">
          Fecha
          <input v-model="form.occurred_on" type="date" required class="form-control mt-2">
        </label>

        <label class="block text-sm font-medium lg:col-span-1">
          Descripción
          <input
            v-model="form.description"
            type="text"
            required
            minlength="2"
            maxlength="200"
            class="form-control mt-2"
            placeholder="Concepto..."
          >
        </label>

        <button class="btn-primary" type="submit" :disabled="saving || filteredCategories.length === 0">
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>
      </form>
    </section>

    <section class="card">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-bold uppercase tracking-wider text-slate-500">
          Filtrar movimientos
        </h2>
        <button type="button" class="text-xs font-semibold text-emerald-600 hover:underline" @click="clearFilters">
          Limpiar filtros
        </button>
      </div>
      <form class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 sm:items-end" @submit.prevent="applyFilters">
        <label class="block text-xs font-medium text-slate-600">
          Categoría
          <select v-model="filters.category_id" class="form-control mt-1">
            <option value="">Todas</option>
            <option v-for="cat in store.categories" :key="cat.id" :value="String(cat.id)">
              {{ cat.name }} ({{ cat.type === 'income' ? 'Ingreso' : 'Gasto' }})
            </option>
          </select>
        </label>
        <label class="block text-xs font-medium text-slate-600">
          Tipo
          <select v-model="filters.type" class="form-control mt-1">
            <option value="">Todos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Gastos</option>
          </select>
        </label>
        <label class="block text-xs font-medium text-slate-600">
          Desde fecha
          <input v-model="filters.from" type="date" class="form-control mt-1">
        </label>
        <label class="block text-xs font-medium text-slate-600">
          Hasta fecha
          <input v-model="filters.to" type="date" class="form-control mt-1">
        </label>
        <button type="submit" class="btn-primary">
          Aplicar filtro
        </button>
      </form>
    </section>

    <section class="card overflow-hidden p-0">
      <div class="border-b border-slate-200 p-5">
        <h2 class="font-bold">
          Historial de movimientos ({{ store.transactions.length }})
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="table-head">
            <tr>
              <th class="table-cell">Fecha</th>
              <th class="table-cell">Categoría</th>
              <th class="table-cell">Descripción</th>
              <th class="table-cell">Tipo</th>
              <th class="table-cell text-right">Importe</th>
              <th class="table-cell text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in store.transactions" :key="tx.id" class="border-t border-slate-100">
              <td class="table-cell font-mono text-xs text-slate-500">{{ tx.occurred_on }}</td>
              <td class="table-cell font-medium">{{ tx.category_name }}</td>
              <td class="table-cell text-slate-600">{{ tx.description }}</td>
              <td class="table-cell">
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  :class="tx.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
                >
                  {{ tx.type === 'income' ? 'Ingreso' : 'Gasto' }}
                </span>
              </td>
              <td
                class="table-cell text-right font-bold"
                :class="tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'"
              >
                {{ tx.type === 'income' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
              </td>
              <td class="table-cell text-right">
                <button
                  type="button"
                  class="text-xs font-semibold text-rose-600 hover:underline"
                  @click="remove(tx.id)"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="store.transactions.length === 0" class="p-5 text-sm text-slate-500">
          No se encontraron movimientos con los criterios seleccionados.
        </p>
      </div>
    </section>
  </div>
</template>
