<script setup lang="ts">
const route = useRoute()
const store = useBudgetStore()

const navigation = [
  { to: '/', title: 'Dashboard', symbol: '▦' },
  { to: '/transactions', title: 'Movimientos', symbol: '⇅' },
  { to: '/categories', title: 'Categorías', symbol: '🏷' },
  { to: '/budgets', title: 'Presupuestos', symbol: '◎' },
]

onMounted(() => {
  store.loadUsers()
})

async function onUserChange() {
  await store.refreshAll()
  if (route.path === '/' || route.path === '/budgets') {
    try {
      await store.loadMonthlyReport()
    } catch {
      // En semana 1 el endpoint de reportes aún puede no estar activo
    }
  }
}
</script>

<template>
  <div class="min-h-screen lg:flex">
    <aside class="bg-slate-950 p-5 text-white lg:min-h-screen lg:w-64 lg:shrink-0">
      <NuxtLink to="/" class="mb-8 flex items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 text-xl font-black text-slate-950">
          $
        </span>
        <span>
          <strong class="block text-xl tracking-tight">
            CloudBudget
          </strong>
          <small class="text-xs text-slate-400">
            Finanzas personales · Nube
          </small>
        </span>
      </NuxtLink>

      <div class="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-3">
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Usuario activo
        </label>
        <select
          v-model.number="store.activeUserId"
          class="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white outline-none focus:border-emerald-500"
          @change="onUserChange"
        >
          <option v-for="u in store.users" :key="u.id" :value="u.id">
            {{ u.full_name }}
          </option>
          <option v-if="store.users.length === 0" :value="1">
            Daniel Tolentino (Demo)
          </option>
        </select>
      </div>

      <nav class="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Navegación principal">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition"
          :class="route.path === item.to ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'"
        >
          <span class="text-lg">
            {{ item.symbol }}
          </span>
          {{ item.title }}
        </NuxtLink>
      </nav>

      <div class="mt-10 hidden rounded-xl border border-slate-800 p-4 text-xs leading-relaxed text-slate-400 lg:block">
        Proyecto 09 · Nuxt 4 + Pinia + Express 5 + PostgreSQL (DECIMAL).
      </div>
    </aside>

    <main class="min-w-0 flex-1">
      <header class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-emerald-600">
            Control Financiero Mensual
          </p>
          <p class="mt-0.5 text-sm text-slate-500">
            Ingresos, gastos y presupuestos sincronizados en PostgreSQL
          </p>
        </div>
        <div class="flex items-center gap-3">
          <label class="text-xs font-medium text-slate-600">
            Mes activo:
            <input
              v-model="store.selectedMonth"
              type="month"
              class="ml-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-800"
              @change="onUserChange"
            >
          </label>
          <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            En línea
          </span>
        </div>
      </header>
      <div class="mx-auto max-w-6xl p-5 md:p-8">
        <slot />
      </div>
    </main>
  </div>
</template>
