<script setup lang="ts">
import type { CategoryType } from '@cloudbudget/shared'

const store = useBudgetStore()
const api = useCloudBudgetApi()

const form = reactive<{ name: string; type: CategoryType }>({
  name: '',
  type: 'expense',
})
const saving = ref(false)
const notice = ref('')
const errorMessage = ref('')

onMounted(() => {
  store.loadCategories()
})

async function save() {
  saving.value = true
  notice.value = ''
  errorMessage.value = ''
  try {
    await api.createCategory(store.activeUserId, {
      name: form.name,
      type: form.type,
    })
    form.name = ''
    notice.value = 'Categoría creada correctamente.'
    await store.loadCategories()
  } catch (error) {
    errorMessage.value = readableError(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="text-sm font-semibold text-emerald-600">
        Organización
      </p>
      <h1 class="mt-1 text-3xl font-extrabold tracking-tight">
        Categorías personalizadas
      </h1>
      <p class="mt-2 text-sm text-slate-500">
        Clasifica tus fuentes de ingreso y tus rubros de gasto mensual.
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
        Nueva categoría
      </h2>
      <form class="grid gap-4 md:grid-cols-[1fr_200px_auto] md:items-end" @submit.prevent="save">
        <label class="block text-sm font-medium">
          Nombre de la categoría
          <input
            v-model="form.name"
            class="form-control mt-2"
            required
            minlength="2"
            maxlength="80"
            placeholder="Ej. Comida, Renta, Beca..."
          >
        </label>
        <label class="block text-sm font-medium">
          Tipo
          <select v-model="form.type" class="form-control mt-2" required>
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </select>
        </label>
        <button class="btn-primary" type="submit" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Agregar categoría' }}
        </button>
      </form>
    </section>

    <section class="card overflow-hidden p-0">
      <div class="border-b border-slate-200 p-5">
        <h2 class="font-bold">
          Categorías del usuario ({{ store.categories.length }})
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="table-head">
            <tr>
              <th class="table-cell">ID</th>
              <th class="table-cell">Nombre</th>
              <th class="table-cell">Tipo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in store.categories" :key="cat.id" class="border-t border-slate-100">
              <td class="table-cell font-mono text-xs text-slate-400">#{{ cat.id }}</td>
              <td class="table-cell font-semibold">{{ cat.name }}</td>
              <td class="table-cell">
                <span
                  class="rounded-full px-3 py-1 text-xs font-semibold"
                  :class="cat.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
                >
                  {{ cat.type === 'income' ? 'Ingreso' : 'Gasto' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="store.categories.length === 0" class="p-5 text-sm text-slate-500">
          Aún no hay categorías registradas para este usuario.
        </p>
      </div>
    </section>
  </div>
</template>
