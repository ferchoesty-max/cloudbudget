import 'dotenv/config'
import { createApp } from './app.js'
import { pool } from './db.js'

const port = Number(process.env.PORT ?? 4000)
if (!Number.isInteger(port) || port <= 0) {
  throw new Error('PORT debe ser un número entero positivo')
}

const server = createApp().listen(port, '0.0.0.0', () => {
  console.log(`CloudBudget API escuchando en el puerto ${port}`)
})

async function shutdown(signal: string) {
  console.log(`Recibida señal ${signal}, cerrando CloudBudget API...`)
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
