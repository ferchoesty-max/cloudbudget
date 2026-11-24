<script setup lang="ts">
const store = useBudgetStore()
const loading = ref(true)
const errorMessage = ref('')

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    await Promise.all([
      store.loadMonthlyReport(),
      store.loadTransactions(),
    ])
  } catch (error) {
    errorMessage.value = readableError(error)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-7">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold text-emerald-600">
          Resumen financiero · {{ store.selectedMonth }}
        </p>
        <h1 class="mt-1 text-3xl font-extrabold tracking-tight">
          Dashboard mensual
        </h1>
        <p class="mt-2 text-sm text-slate-500">
          Totales y saldo calculados en tiempo real desde los movimientos persistidos en PostgreSQL.
        </p>
      </div>
      <button class="btn-primary" type="button" :disabled="loading" @click="load">
        Actualizar cifras
      </button>
    </div>

    <p v-if="errorMessage" role="alert" class="rounded-xl bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </p>

    <SummaryCards
      :total-income="store.report?.total_income ?? 0"
      :total-expense="store.report?.total_expense ?? 0"
      :balance="store.report?.balance ?? 0"
      :budgets-count="store.report?.budgets.length ?? 0"
    />

    <section class="card space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold">
            Ejecución de presupuestos en {{ store.selectedMonth }}
          </h2>
          <p class="text-xs text-slate-500">
            Comparativa entre el tope mensual configurado y los gastos reales de cada categoría
          </p>
        </div>
        <NuxtLink to="/budgets" class="text-xs font-semibold text-emerald-600 hover:underline">
          Configurar topes →
        </NuxtLink>
      </div>

      <div v-if="!store.report?.budgets.length" class="py-6 text-sm text-slate-500">
        Todavía no hay presupuestos para este mes. Ve a la pestaña Presupuestos para definir uno.
      </div>

      <BudgetProgressRow
        v-for="b in store.report?.budgets ?? []"
        :key="b.id"
        :budget="b"
      />
    </section>

    <div class="rounded-2xl bg-slate-900 p-6 text-white">
      <h2 class="text-xl font-bold">
        Arquitectura CloudBudget activa
      </h2>
      <p class="mt-2 text-sm text-slate-300">
        Nuxt 4 + Pinia (Netlify) → Express 5 Docker (Render) → PostgreSQL NUMERIC(12,2)
      </p>
      <div class="mt-4 flex flex-wrap gap-3">
        <NuxtLink
          to="/transactions"
          class="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Registrar movimiento →
        </NuxtLink>
        <NuxtLink
          to="/budgets"
          class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Ajustar presupuestos
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
