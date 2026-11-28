# Contrato de la API REST · CloudBudget

## Endpoints disponibles

| Método | Ruta | Descripción | Códigos HTTP |
|---|---|---|---|
| `GET` | `/api/health` | Estado del servicio Express | `200` |
| `GET` | `/ready` | Verificación de conexión activa con PostgreSQL | `200`, `503` |
| `GET` | `/api/users` | Lista de usuarios registrados para pruebas | `200` |
| `GET` | `/api/categories?user_id=1` | Categorías personalizadas del usuario | `200` |
| `POST` | `/api/categories` | Crea una categoría (`income` o `expense`) | `201`, `400`, `409` |
| `DELETE` | `/api/categories/:id?user_id=1` | Elimina una categoría sin movimientos asociados | `204`, `400`, `404` |
| `GET` | `/api/transactions?user_id=1&category_id=&from=&to=` | Lista movimientos filtrados por fecha y categoría | `200`, `400` |
| `POST` | `/api/transactions` | Registra un ingreso o gasto validando pertenencia de categoría | `201`, `400` |
| `DELETE` | `/api/transactions/:id?user_id=1` | Elimina un movimiento del usuario | `204`, `404` |
| `GET` | `/api/budgets?user_id=1&month=2026-11` | Lista presupuestos del mes con gasto acumulado | `200` |
| `POST` | `/api/budgets` | Define o actualiza el presupuesto mensual de una categoría | `200`, `400` |
| `DELETE` | `/api/budgets/:id?user_id=1` | Elimina un presupuesto del usuario | `204`, `400`, `404` |
| `GET` | `/api/reports/monthly?user_id=1&month=2026-11` | Resumen mensual de ingresos, gastos, saldo y presupuestos | `200` |

## Ejemplos de uso

### Crear transacción (`POST /api/transactions`)
```json
{
  "user_id": 1,
  "category_id": 2,
  "type": "expense",
  "amount": 350.50,
  "description": "Comida en cafetería universitaria",
  "occurred_on": "2026-11-08"
}
```

### Configurar presupuesto (`POST /api/budgets`)
```json
{
  "user_id": 1,
  "category_id": 2,
  "month": "2026-11",
  "limit_amount": 3000.00
}
```
