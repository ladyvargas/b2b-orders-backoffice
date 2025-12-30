# Prueba Técnica – Backend Node.js (Customers, Orders & Lambda Orquestador)

##Descripción general

Este proyecto implementa un sistema mínimo de **Backoffice de Pedidos B2B**, compuesto por:

- **Customers API** (gestión de clientes)
- **Orders API** (gestión de productos y órdenes)
- **Lambda Orquestador** (Serverless) que valida cliente, crea y confirma pedidos
- **MySQL** como base de datos
- **Docker Compose** para levantar todo localmente

El objetivo es demostrar diseño backend, transacciones, validaciones, autenticación y orquestación.

---

## Tecnologías utilizadas

- Node.js 22
- Express
- MySQL 8
- Docker & Docker Compose
- Serverless Framework
- Zod (validaciones)
- JWT (autenticación)
- SQL parametrizado (`?`)

---

## Autenticación

- **JWT** para operadores
- **SERVICE_TOKEN** para comunicación interna entre servicios
- Header usado:
```http
Authorization: Bearer <token>

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

## Levantamiento local con Docker

```bash
docker-compose build
docker-compose up -d

---

##Levantamiento local con Docker

Función:
1. Orquesta el flujo completo:
2. Valida cliente (Customers /internal)
3. Crea orden (/orders)
4. Confirma orden (/orders/:id/confirm)
5. Retorna JSON consolidado

###Ejecución local (serverless-offline)
cd lambda-orchestrator
npm install
npm run dev

##Ejecución en AWS (DOCUMENTADO)

1. Configurar AWS CLI
    aws configure

2. Definir variables de entorno:
    CUSTOMERS_API_BASE
    ORDERS_API_BASE
    SERVICE_TOKEN

3. Desplegar:
    npm run deploy

4. Invocar el endpoint generado por API Gateway.
Scripts NPM
Ejemplo de scripts utilizados:
{
  "scripts": {
    "dev": "node src/index.js",
    "build": "echo build",
    "seed": "mysql < db/seed.sql",
    "migrate": "mysql < db/schema.sql",
    "test": "echo no tests"
  }
}

##Base de datos

Incluida en /db:
schema.sql
seed.sql

Tablas:
customers
products
orders
order_items
idempotency_keys
