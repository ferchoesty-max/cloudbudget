/** Smoke E2E HTTP: verifica salud, conexion SQL, presupuestos y reporte mensual de CloudBudget */
const baseUrl = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '')
const checks = [
  { path: '/api/health', expected: 'ok', key: 'status' },
  { path: '/ready', expected: 'ready', key: 'status' },
  { path: '/api/users', expected: 'data', key: 'root' },
  { path: '/api/categories?user_id=1', expected: 'data', key: 'root' },
  { path: '/api/transactions?user_id=1', expected: 'data', key: 'root' },
  { path: '/api/budgets?user_id=1&month=2026-11', expected: 'data', key: 'root' },
  { path: '/api/reports/monthly?user_id=1&month=2026-11', expected: 'data', key: 'root' },
]

let failed = false
for (const check of checks) {
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      signal: AbortSignal.timeout(90000),
    })
    const payload = await response.json()
    const valid = check.key === 'root'
      ? Object.hasOwn(payload, check.expected)
      : payload[check.key] === check.expected
    if (!response.ok || !valid) throw new Error(`HTTP ${response.status}; ${JSON.stringify(payload)}`)
    console.log(`✔ ${check.path}: correcto`)
  } catch (error) {
    failed = true
    console.error(`✘ ${check.path}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
if (failed) process.exitCode = 1
