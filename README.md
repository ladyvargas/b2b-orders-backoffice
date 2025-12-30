# Sistema de Backoffice de Pedidos B2B

Sistema backend distribuido para gestión de clientes y órdenes B2B, implementado con arquitectura de microservicios y orquestación serverless.

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Arquitectura](#arquitectura)
- [Stack Tecnológico](#stack-tecnológico)
- [Requisitos Previos](#requisitos-previos)
- [Instalación y Configuración](#instalación-y-configuración)
- [APIs Disponibles](#apis-disponibles)
- [Lambda Orchestrator](#lambda-orchestrator)
- [Base de Datos](#base-de-datos)
- [Autenticación y Seguridad](#autenticación-y-seguridad)
- [Despliegue](#despliegue)
- [Testing](#testing)

---

## Descripción General

Este proyecto implementa un sistema completo de gestión de pedidos B2B compuesto por tres componentes principales:

- **Customers API**: Gestión completa de clientes (CRUD + autenticación)
- **Orders API**: Gestión de productos y órdenes de compra
- **Lambda Orchestrator**: Función serverless que orquesta el flujo completo de creación y confirmación de pedidos

El sistema está diseñado con las siguientes características:

- ✅ Transacciones atómicas en base de datos
- ✅ Validaciones robustas con Zod
- ✅ Autenticación JWT para operadores
- ✅ Comunicación segura entre servicios
- ✅ Idempotencia en operaciones críticas
- ✅ SQL parametrizado para prevenir inyección
- ✅ Documentación OpenAPI completa

---

## Arquitectura

```
┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │
│  Customers API  │      │   Orders API    │
│   (Port 3001)   │      │   (Port 3002)   │
│                 │      │                 │
└────────┬────────┘      └────────┬────────┘
         │                        │
         │    ┌──────────────┐    │
         └────┤              ├────┘
              │    MySQL 8   │
              │  (Port 3306) │
              │              │
              └──────────────┘
                     ▲
                     │
         ┌───────────┴────────────┐
         │                        │
         │  Lambda Orchestrator   │
         │    (Serverless)        │
         │                        │
         └────────────────────────┘
```

### Flujo de Orquestación

1. **Validación de Cliente**: Lambda consulta Customers API para verificar existencia y estado
2. **Creación de Orden**: Lambda envía solicitud a Orders API con items validados
3. **Confirmación**: Lambda confirma la orden de forma idempotente
4. **Respuesta Consolidada**: Retorna resultado completo del proceso

---

## Stack Tecnológico

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Node.js | 22.x | Runtime principal |
| Express | 4.x | Framework web |
| MySQL | 8.0 | Base de datos relacional |
| Docker | Latest | Containerización |
| Docker Compose | Latest | Orquestación de contenedores |
| Serverless Framework | 3.x | Despliegue Lambda |
| Zod | 3.x | Validación de esquemas |
| JWT | 9.x | Autenticación |
| serverless-offline | 13.x | Testing local de Lambda |

---

## Requisitos Previos

- Node.js 22.x o superior
- Docker 20.x o superior
- Docker Compose 2.x o superior
- AWS CLI (para despliegue en AWS)
- Git

---

## Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd b2b-backoffice
```

### 2. Estructura del Proyecto

```
.
├── customers-api/
│   ├── src/
│   ├── openapi.yaml
│   ├── package.json
│   └── Dockerfile
├── orders-api/
│   ├── src/
│   ├── openapi.yaml
│   ├── package.json
│   └── Dockerfile
├── lambda-orchestrator/
│   ├── src/
│   ├── serverless.yml
│   └── package.json
├── db/
│   ├── schema.sql
│   └── seed.sql
├── docker-compose.yml
└── README.md
```

### 3. Variables de Entorno

Crear archivos `.env` en cada servicio:

#### `customers-api/.env`
```env
PORT=3001
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=customers_db
JWT_SECRET=your-jwt-secret-key
SERVICE_TOKEN=internal-service-token
```

#### `orders-api/.env`
```env
PORT=3002
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=orders_db
SERVICE_TOKEN=internal-service-token
```

#### `lambda-orchestrator/.env`
```env
CUSTOMERS_API_BASE=http://customers-api:3001
ORDERS_API_BASE=http://orders-api:3002
SERVICE_TOKEN=internal-service-token
```

### 4. Levantar el Sistema

```bash
# Construir imágenes
docker-compose build

# Iniciar servicios
docker-compose up -d

# Verificar estado
docker-compose ps

# Ver logs
docker-compose logs -f
```

### 5. Inicializar Base de Datos

```bash
# Ejecutar migraciones
docker-compose exec mysql mysql -uroot -prootpassword < db/schema.sql

# Cargar datos de prueba
docker-compose exec mysql mysql -uroot -prootpassword < db/seed.sql
```

---

## APIs Disponibles

### Customers API (Puerto 3001)

#### Autenticación

```http
POST /auth/token
Content-Type: application/json

{
  "username": "operator1",
  "password": "password123"
}

Response: { "token": "eyJhbGc..." }
```

#### Gestión de Clientes

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST` | `/customers` | Crear cliente | JWT |
| `GET` | `/customers/:id` | Obtener cliente | JWT |
| `GET` | `/customers` | Listar clientes | JWT |
| `PUT` | `/customers/:id` | Actualizar cliente | JWT |
| `DELETE` | `/customers/:id` | Eliminar cliente | JWT |
| `GET` | `/internal/customers/:id` | Validar cliente (interno) | SERVICE_TOKEN |

**Ejemplo: Crear Cliente**

```bash
curl -X POST http://localhost:3001/customers \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Empresa XYZ",
    "email": "contacto@xyz.com",
    "phone": "+1234567890",
    "address": "Calle Principal 123"
  }'
```

📄 **Documentación completa**: `customers-api/openapi.yaml`

---

### Orders API (Puerto 3002)

#### Productos

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST` | `/products` | Crear producto | JWT |
| `GET` | `/products/:id` | Obtener producto | JWT |
| `GET` | `/products` | Listar productos | JWT |
| `PATCH` | `/products/:id` | Actualizar producto | JWT |

**Ejemplo: Crear Producto**

```bash
curl -X POST http://localhost:3002/products \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Producto A",
    "description": "Descripción del producto",
    "price": 99.99,
    "stock": 100
  }'
```

#### Órdenes

| Método | Endpoint | Descripción | Auth | Idempotente |
|--------|----------|-------------|------|-------------|
| `POST` | `/orders` | Crear orden | JWT | ❌ |
| `POST` | `/orders/:id/confirm` | Confirmar orden | JWT | ✅ |
| `GET` | `/orders/:id` | Obtener orden | JWT | - |
| `GET` | `/orders` | Listar órdenes | JWT | - |
| `POST` | `/orders/:id/cancel` | Cancelar orden | JWT | ✅ |

**Ejemplo: Crear Orden**

```bash
curl -X POST http://localhost:3002/orders \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      {
        "product_id": 1,
        "quantity": 5,
        "unit_price": 99.99
      }
    ]
  }'
```

**Ejemplo: Confirmar Orden (Idempotente)**

```bash
curl -X POST http://localhost:3002/orders/1/confirm \
  -H "Authorization: Bearer <jwt-token>" \
  -H "X-Idempotency-Key: unique-key-123"
```

📄 **Documentación completa**: `orders-api/openapi.yaml`

---

## Lambda Orchestrator

### Descripción

Función serverless que orquesta el flujo completo de creación y confirmación de órdenes, garantizando atomicidad y manejo de errores.

### Endpoint Principal

```http
POST /orchestrator/create-and-confirm-order
Content-Type: application/json
Authorization: Bearer <service-token>

{
  "customer_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 3,
      "unit_price": 99.99
    }
  ],
  "idempotency_key": "order-2024-001"
}
```

### Flujo de Ejecución

```
1. Validar Cliente
   └─> GET /internal/customers/:id
       ├─> Cliente no existe → Error 404
       ├─> Cliente inactivo → Error 400
       └─> Cliente válido → Continuar

2. Crear Orden
   └─> POST /orders
       ├─> Validación de items → Error 400
       ├─> Stock insuficiente → Error 409
       └─> Orden creada → Continuar

3. Confirmar Orden
   └─> POST /orders/:id/confirm
       ├─> Idempotency check
       ├─> Actualizar stock
       └─> Orden confirmada

4. Retornar Resultado
   └─> JSON consolidado con:
       ├─ customer_info
       ├─ order_details
       └─ confirmation_status
```

### Ejecución Local

```bash
cd lambda-orchestrator

# Instalar dependencias
npm install

# Modo desarrollo (serverless-offline)
npm run dev

# La función estará disponible en:
# http://localhost:3000/dev/orchestrator/create-and-confirm-order
```

### Testing Local

```bash
curl -X POST http://localhost:3000/dev/orchestrator/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer internal-service-token" \
  -d '{
    "customer_id": 1,
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "unit_price": 99.99
      }
    ],
    "idempotency_key": "test-order-001"
  }'
```

### Respuesta Exitosa

```json
{
  "success": true,
  "customer": {
    "id": 1,
    "name": "Empresa XYZ",
    "email": "contacto@xyz.com"
  },
  "order": {
    "id": 123,
    "status": "confirmed",
    "total": 199.98,
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "unit_price": 99.99,
        "subtotal": 199.98
      }
    ]
  },
  "confirmed_at": "2024-12-30T10:30:00Z"
}
```

---

## Base de Datos

### Esquema

El sistema utiliza MySQL 8 con las siguientes tablas:

- **customers**: Información de clientes B2B
- **products**: Catálogo de productos
- **orders**: Órdenes de compra
- **order_items**: Detalle de items por orden
- **idempotency_keys**: Control de idempotencia

Scripts SQL completos disponibles en `/db/schema.sql`

### Comandos Útiles

```bash
# Ejecutar migraciones
npm run migrate

# Cargar datos de prueba
npm run seed

# Acceso directo a MySQL
docker-compose exec mysql mysql -uroot -prootpassword
```

---

## Autenticación y Seguridad

### JWT para Operadores

Los operadores se autentican mediante JWT:

1. Obtener token: `POST /auth/token`
2. Incluir en header: `Authorization: Bearer <token>`
3. Token expira en 24 horas

### SERVICE_TOKEN para Comunicación Interna

Los servicios se comunican entre sí usando un token compartido:

```http
Authorization: Bearer internal-service-token
```

Este token debe configurarse de forma idéntica en:
- `customers-api`
- `orders-api`
- `lambda-orchestrator`

### SQL Parametrizado

Todas las consultas usan placeholders `?` para prevenir inyección SQL:

```javascript
// ✅ Correcto
db.query('SELECT * FROM customers WHERE id = ?', [customerId]);

// ❌ Incorrecto
db.query(`SELECT * FROM customers WHERE id = ${customerId}`);
```

---

## Despliegue

### Despliegue Local (Docker)

Ya cubierto en la sección de instalación.

### Despliegue en AWS

#### Prerrequisitos

1. Configurar AWS CLI:
```bash
aws configure
AWS Access Key ID: <your-key>
AWS Secret Access Key: <your-secret>
Default region: us-east-1
```

2. Crear archivo `lambda-orchestrator/.env.production`:
```env
CUSTOMERS_API_BASE=https://api.customers.example.com
ORDERS_API_BASE=https://api.orders.example.com
SERVICE_TOKEN=production-service-token
```

#### Desplegar Lambda

```bash
cd lambda-orchestrator

# Instalar Serverless Framework globalmente
npm install -g serverless

# Desplegar a AWS
npm run deploy

# Output:
# ✓ Service deployed to stack lambda-orchestrator-dev
# endpoint: POST - https://abc123.execute-api.us-east-1.amazonaws.com/dev/orchestrator/create-and-confirm-order
```

#### Desplegar APIs (ECS/Fargate o EC2)

Las APIs pueden desplegarse en:
- AWS ECS con Fargate
- AWS EC2 con Docker
- AWS Elastic Beanstalk
- Kubernetes (EKS)

Ejemplo con ECS:

```bash
# Build y push a ECR
docker build -t customers-api ./customers-api
docker tag customers-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/customers-api:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/customers-api:latest

# Crear servicio ECS (usar AWS Console o Terraform)
```

---

## Testing

### Testing Manual

Colección de Postman disponible en: `postman/B2B-Backoffice.postman_collection.json`

### Testing Automatizado

```bash
# Customers API
cd customers-api
npm test

# Orders API
cd orders-api
npm test

# Lambda
cd lambda-orchestrator
npm test
```

### Scripts Útiles

Cada servicio incluye los siguientes scripts npm:

```json
{
  "scripts": {
    "dev": "node src/index.js",
    "start": "node src/index.js",
    "build": "echo 'No build step required'",
    "test": "jest --coverage",
    "lint": "eslint src/",
    "migrate": "node scripts/migrate.js",
    "seed": "node scripts/seed.js"
  }
}
```

---

## Características Destacadas

### ✅ Transacciones Atómicas
Las operaciones críticas usan transacciones DB para garantizar consistencia.

### ✅ Idempotencia
Operaciones críticas previenen duplicados usando `X-Idempotency-Key`.

### ✅ Validaciones con Zod
Esquemas tipados para validación de entrada en todos los endpoints.

### ✅ Seguridad
- SQL parametrizado (prevención de inyección)
- JWT para operadores
- SERVICE_TOKEN para comunicación interna

---

## Troubleshooting

### La base de datos no se conecta

```bash
# Verificar que MySQL esté corriendo
docker-compose ps mysql

# Ver logs de MySQL
docker-compose logs mysql

# Reiniciar servicio
docker-compose restart mysql
```

### Lambda no puede conectarse a las APIs

Verificar que las URLs base sean correctas en `.env`:

```bash
# En desarrollo local con Docker
CUSTOMERS_API_BASE=http://customers-api:3001
ORDERS_API_BASE=http://orders-api:3002

# En desarrollo local con servicios nativos
CUSTOMERS_API_BASE=http://localhost:3001
ORDERS_API_BASE=http://localhost:3002
```

### Error de autenticación

Verificar que los tokens coincidan en todos los servicios:

```bash
# customers-api/.env
SERVICE_TOKEN=internal-service-token

# orders-api/.env
SERVICE_TOKEN=internal-service-token

# lambda-orchestrator/.env
SERVICE_TOKEN=internal-service-token
```

---

## Contribuir

1. Fork el repositorio
2. Crear branch de feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -am 'Agregar nueva funcionalidad'`
4. Push al branch: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

---

## Licencia

Este proyecto es una prueba técnica y no tiene licencia comercial.
