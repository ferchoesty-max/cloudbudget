<script setup lang="ts">
const store = useBudgetStore()
const api = useCloudBudgetApi()

const form = reactive({
  category_id: '',
  limit_amount: '',
})

const saving = ref(false)
const notice = ref('')
const errorMessage = ref('')

const expenseCategories = computed(() =>
  store.categories.filter((c) => c.type === 'expense'),
)

async function load() {
  errorMessage.value = ''
  try {
    await Promise.all([store.loadCategories(), store.loadMonthlyReport()])
  } catch (error) {
    errorMessage.value = readableError(error)
  }
}

onMounted(load)

async function save() {
  saving.value = true
  notice.value = ''
  errorMessage.value = ''
  try {
    await api.saveBudget(store.activeUserId, {
      category_id: Number(form.category_id),
      month: store.selectedMonth,
      limit_amount: Number(form.limit_amount),
    })
    form.category_id = ''
    form.limit_amount = ''
    notice.value = 'Presupuesto mensual guardado y recalculado.'
    await store.loadMonthlyReport()
  } catch (error) {
    errorMessage.value = readableError(error)
  } finally {
    saving.value = false
  }
}

function editBudget(categoryId: number, currentLimit: number) {
  form.category_id = String(categoryId)
  form.limit_amount = String(currentLimit)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="text-sm font-semibold text-emerald-600">
        Planeación · {{ store.selectedMonth }}
      </p>
      <h1 class="mt-1 text-3xl font-extrabold tracking-tight">
        Presupuestos por categoría
      </h1>
      <p class="mt-2 text-sm text-slate-500">
        Define cuánto planeas gastar como máximo en cada categoría durante el mes seleccionado.
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
        Configurar presupuesto para {{ store.selectedMonth }}
      </h2>
      <form class="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end" @submit.prevent="save">
        <label class="block text-sm font-medium">
          Categoría de gasto
          <select v-model="form.category_id" class="form-control mt-2" required>
            <option value="" disabled>Selecciona una categoría...</option>
            <option v-for="cat in expenseCategories" :key="cat.id" :value="String(cat.id)">
              {{ cat.name }}
            </option>
          </select>
        </label>

        <label class="block text-sm font-medium">
          Tope mensual (MXN)
          <input
            v-model="form.limit_amount"
            type="number"
            step="0.01"
            min="1"
            required
            class="form-control mt-2"
            placeholder="3000.00"
          >
        </label>

        <button class="btn-primary" type="submit" :disabled="saving || expenseCategories.length === 0">
          {{ saving ? 'Guardando...' : 'Guardar presupuesto' }}
        </button>
      </form>
    </section>

    <section class="card overflow-hidden p-0">
      <div class="border-b border-slate-200 p-5">
        <h2 class="font-bold">
          Estado de presupuestos ({{ store.report?.budgets.length ?? 0 }})
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="table-head">
            <tr>
              <th class="table-cell">Categoría</th>
              <th class="table-cell text-right">Presupuesto</th>
              <th class="table-cell text-right">Gastado en {{ store.selectedMonth }}</th>
              <th class="table-cell text-right">Restante</th>
              <th class="table-cell text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="b in store.report?.budgets ?? []"
              :key="b.id"
              class="border-t border-slate-100"
            >
              <td class="table-cell font-semibold">{{ b.category_name }}</td>
              <td class="table-cell text-right font-medium">{{ formatCurrency(b.limit_amount) }}</td>
              <td class="table-cell text-right text-rose-600 font-medium">
                {{ formatCurrency(b.spent_amount) }}
              </td>
              <td
                class="table-cell text-right font-bold"
                :class="b.remaining_amount >= 0 ? 'text-emerald-600' : 'text-rose-600'"
              >
                {{ formatCurrency(b.remaining_amount) }}
              </td>
              <td class="table-cell text-right">
                <button
                  type="button"
                  class="text-xs font-semibold text-emerald-600 hover:underline"
                  @click="editBudget(b.category_id, b.limit_amount)"
                >
                  Ajustar tope
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!store.report?.budgets.length" class="p-5 text-sm text-slate-500">
          No hay presupuestos configurados para este mes.
        </p>
      </div>
    </section>
  </div>
</template>
