import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  ssr: false,
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  runtimeConfig: {
    public: { apiBase: 'http://localhost:4000' },
  },
  app: {
    head: {
      title: 'CloudBudget | Gastos y Presupuestos',
      meta: [{ name: 'description', content: 'Control de ingresos, gastos y presupuestos mensuales en la nube' }],
    },
  },
})

