<script setup lang="ts">
interface Props {
  totalIncome: number
  totalExpense: number
  balance: number
  budgetsCount: number
}

const props = defineProps<Props>()

const cards = computed(() => [
  {
    label: 'Ingresos del mes',
    value: formatCurrency(props.totalIncome),
    tone: 'text-emerald-600',
    icon: '↑',
  },
  {
    label: 'Gastos del mes',
    value: formatCurrency(props.totalExpense),
    tone: 'text-rose-600',
    icon: '↓',
  },
  {
    label: 'Saldo disponible',
    value: formatCurrency(props.balance),
    tone: props.balance >= 0 ? 'text-slate-900' : 'text-rose-600',
    icon: '=',
  },
  {
    label: 'Presupuestos activos',
    value: String(props.budgetsCount),
    tone: 'text-emerald-600',
    icon: '◎',
  },
])
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <div v-for="card in cards" :key="card.label" class="card">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {{ card.label }}
        </span>
        <span class="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 font-bold text-slate-700">
          {{ card.icon }}
        </span>
      </div>
      <p class="mt-3 text-2xl font-black tracking-tight" :class="card.tone">
        {{ card.value }}
      </p>
    </div>
  </div>
</template>
