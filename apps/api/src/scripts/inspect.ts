import 'dotenv/config'
import { currentMonth, monthQuerySchema } from '@cloudbudget/shared'
import { pool } from '../db.js'

const argMonth = process.argv[2]
const month = monthQuerySchema.safeParse(argMonth).success ? String(argMonth) : currentMonth()

try {
  const [counts, summary] = await Promise.all([
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM categories) AS categories,
        (SELECT COUNT(*)::int FROM transactions) AS transactions,
        (SELECT COUNT(*)::int FROM budgets) AS budgets
    `),
    pool.query(
      `SELECT
         COALESCE(ROUND(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 2), 0)::float AS total_income,
         COALESCE(ROUND(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 2), 0)::float AS total_expense,
         COALESCE(ROUND(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 2), 0)::float AS balance
       FROM transactions
       WHERE TO_CHAR(occurred_on, 'YYYY-MM') = $1`,
      [month],
    ),
  ])

  console.log(`--- INSPECCIONANDO POSTGRESQL CLOUDBUDGET (${month}) ---`)
  console.table(counts.rows[0])
  console.table(summary.rows[0])
} catch (error) {
  console.error('Error inspeccionando base de datos:', error)
  process.exitCode = 1
} finally {
  await pool.end()
}
