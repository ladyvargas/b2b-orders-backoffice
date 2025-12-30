# B2B Orders Backoffice
Prueba Técnica – Senior Backend  
Node.js + MySQL + Docker + AWS Lambda (Serverless)

---

## Objetivo
Construir un sistema mínimo compuesto por dos APIs (Customers y Orders) y un Lambda Orquestador,
capaz de crear y confirmar pedidos de forma idempotente.

---

## Arquitectura

- Customers API (puerto 3001)
- Orders API (puerto 3002)
- Lambda Orchestrator (serverless-offline)
- MySQL 8 (Docker)

---

## Estructura del repositorio

/customers-api  
/orders-api  
/lambda-orchestrator  
/db  
docker-compose.yml  
README.md  

---

## Base de datos

Tablas incluidas:
- customers
- products
- orders
- order_items
- idempotency_keys

Todas las consultas SQL están **parametrizadas con `?`**.

---

## Autenticación

- Operadores: JWT
- Comunicación interna entre servicios: SERVICE_TOKEN
- Lambda usa SERVICE_TOKEN para validar clientes y crear órdenes

---

## Customers API (3001)

| Método | Endpoint | Estado |
|------|---------|-------|
| POST | /auth/token | OK |
| POST | /customers | OK |
| GET | /customers/:id | OK |
| GET | /customers | OK |
| PUT | /customers/:id | OK |
| DELETE | /customers/:id | OK |
| GET | /internal/customers/:id | OK |

OpenAPI: `customers-api/openapi.yaml`

---

## Orders API (3002)

### Productos

| Método | Endpoint | Estado |
|------|---------|-------|
| POST | /products | OK |
| GET | /products/:id | OK |
| GET | /products | OK |
| PATCH | /products/:id | OK |

### Órdenes

| Método | Endpoint | Estado |
|------|---------|-------|
| POST | /orders | OK |
| POST | /orders/:id/confirm | OK (idempotente) |
| GET | /orders/:id | OK |
| GET | /orders | OK |
| POST | /orders/:id/cancel | OK |

OpenAPI: `orders-api/openapi.yaml`

---

## Lambda Orchestrator

Runtime: **nodejs22.x**

Endpoint:
POST /orchestrator/create-and-confirm-order

Flujo:
1. Valida cliente (Customers /internal)
2. Crea orden (Orders /orders)
3. Confirma orden (Orders /orders/:id/confirm)
4. Retorna respuesta consolidada

---

## Docker

```bash
docker-compose build
docker-compose up -d
