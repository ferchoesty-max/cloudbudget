// ponytail: script directo con fetch nativo de Node 24 sin librerías extra
const baseUrl = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '')
console.log(`Smoke check configurado hacia ${baseUrl}`)

