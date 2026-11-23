<script setup lang="ts">
import { budgetUsagePercent, getBudgetStatus, type BudgetItem } from '@cloudbudget/shared'

interface Props {
  budget: BudgetItem
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showActions: false,
})

const emit = defineEmits<{
  edit: [categoryId: number, currentLimit: number]
  delete: [budgetId: number, categoryName: string]
}>()

const percent = computed(() =>
  budgetUsagePercent(props.budget.spent_amount, props.budget.limit_amount),
)

const status = computed(() =>
  getBudgetStatus(props.budget.spent_amount, props.budget.limit_amount),
)

const statusStyle = computed(() => {
  if (status.value === 'exceeded') {
    return { bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700', label: 'Excedido' }
  }
  if (status.value === 'warning') {
    return { bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700', label: 'Cerca del tope' }
  }
  return { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700', label: 'En rango' }
})
</script>

<template>
  <div class="space-y-1.5 pt-2">
    <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
      <div class="flex items-center gap-2">
        <span class="font-semibold">{{ budget.category_name }}</span>
        <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusStyle.badge">
          {{ statusStyle.label }} ({{ percent }}%)
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-xs font-medium text-slate-600">
          Gastado: <strong>{{ formatCurrency(budget.spent_amount) }}</strong> de {{ formatCurrency(budget.limit_amount) }}
          · Restante:
          <strong :class="budget.remaining_amount >= 0 ? 'text-emerald-600' : 'text-rose-600'">
            {{ formatCurrency(budget.remaining_amount) }}
          </strong>
        </span>
        <template v-if="showActions">
          <button
            type="button"
            class="text-xs font-semibold text-emerald-600 hover:underline"
            @click="emit('edit', budget.category_id, budget.limit_amount)"
          >
            Ajustar
          </button>
          <button
            type="button"
            class="text-xs font-semibold text-rose-600 hover:underline"
            @click="emit('delete', budget.id, budget.category_name)"
          >
            Eliminar
          </button>
        </template>
      </div>
    </div>
    <div class="h-3 overflow-hidden rounded-full bg-slate-100">
      <div
        class="h-full rounded-full transition-all"
        :class="statusStyle.bar"
        :style="{ width: `${percent}%` }"
      />
    </div>
  </div>
</template>
