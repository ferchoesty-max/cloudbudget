# CloudBudget · Proyecto 09 (Cómputo en la Nube)

Plataforma Full-Stack para el registro de ingresos, gastos y presupuestos mensuales por categoría, con cálculo de saldo en PostgreSQL y despliegue continuo en Netlify y Render.

## Integrantes del Equipo
- **Fernando Daniel Tolentino Uribe (Daniel):** Arquitectura monorepo, Docker, CI/CD, paquete compartido, hardening HTTP, smoke E2E y despliegue en la nube.
- **Eladio:** Modelo relacional PostgreSQL, migraciones, seeds, API REST en Express 5 y pruebas con Vitest.
- **Puga:** Interfaz en Nuxt 4, Tailwind CSS 4, estado global con Pinia, pantallas de captura, dashboard mensual y exportación CSV.

## Tecnologías
- **Frontend:** Nuxt 4, Vue 3, TypeScript, Tailwind CSS 4 y Pinia (`apps/web`).
- **Backend:** Node.js 24, Express 5, PostgreSQL (`pg`), validaciones con Zod 4 (`apps/api` y `packages/shared`).
- **Base de datos:** PostgreSQL 17 (`database/migrations/001_schema.sql` y `database/seeds/001_seed.sql`).
- **Contenedores y Nube:** Docker Compose local, Netlify (Frontend) y Render (Backend Docker + PostgreSQL).

## Despliegue en Producción
- **Frontend (Netlify):** `https://cloudbudget-computoenlanube.netlify.app`
- **Backend API (Render):** `https://cloudbudget-api.onrender.com`

## Instrucciones de Ejecución Local

1. Copiar variables de entorno:
   ```bash
   cp .env.example apps/api/.env
   cp .env.example apps/web/.env
   ```
2. Levantar PostgreSQL en Docker:
   ```bash
   docker compose up -d postgres
   ```
3. Instalar paquetes, correr migraciones y cargar datos iniciales:
   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```
4. Iniciar frontend (`http://localhost:3000`) y backend (`http://localhost:4000`):
   ```bash
   npm run dev
   ```

## Comandos de Verificación y Pruebas
```bash
npm run lint
npm run typecheck
npm test
npm run build:web
npm run smoke
```

## Documentación Adicional
- [Arquitectura y Decisiones Técnicas](./docs/architecture.md)
- [Backlog e Historias de Usuario](./docs/backlog.md)
- [Contrato y Ejemplos de la API](./docs/api.md)
