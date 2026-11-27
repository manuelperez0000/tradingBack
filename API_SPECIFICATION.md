# Contrato de API REST & Telemetría NinjaTrader 8 — Trading Life Academy (Backend Express)

Este documento especifica todos los endpoints, esquemas JSON y cabeceras de seguridad requeridos por el Frontend para conectar inmediatamente con la capa de datos real (`VITE_DATA_SOURCE_MODE=REMOTE_API`).

Base URL configurada en el Frontend:
```text
http://localhost:3000/api/v1
```

---

## 1. Autenticación y Usuarios (`/auth`)

### `POST /api/v1/auth/login`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "carlos@tradinglifeacademy.com",
    "password": "mi_password_segura",
    "role": "ADMIN"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "user": {
      "id": "usr-001",
      "full_name": "Carlos Figuera",
      "email": "carlos@tradinglifeacademy.com",
      "handle": "@carlos_tla",
      "role": "ADMIN",
      "ninja_version": "NinjaTrader 8.1.3.1 (64-bit)",
      "default_machine_id": "WIN11-TRD-9F82A1C0",
      "member_since": "Enero 2026"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "refresh_token_string",
      "expires_in_seconds": 86400
    }
  }
  ```

### `POST /api/v1/auth/register`
- **Request Body:**
  ```json
  {
    "full_name": "Alejandro Mendoza",
    "email": "amendoza@propdesk-capital.com",
    "password": "password123",
    "default_machine_id": "WIN11-TRD-9F82A1C0"
  }
  ```
- **Response `201 Created`:** Retorna el mismo formato de `{ user, tokens }`.

### `GET /api/v1/auth/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response `200 OK`:** Retorna el objeto `user`.

### `POST /api/v1/auth/recover-password`
- **Request Body:** `{ "email": "carlos@tradinglifeacademy.com" }`
- **Response `200 OK`:** `{ "success": true, "message": "Código enviado a tu correo" }`

### `POST /api/v1/auth/reset-password`
- **Request Body:** `{ "email": "...", "code": "849201", "newPassword": "..." }`
- **Response `200 OK`:** `{ "success": true, "message": "Contraseña actualizada" }`

---

## 2. Suscripciones y Control Remoto NinjaTrader (`/subscriptions`)

### `GET /api/v1/subscriptions`
- **Headers:** `Authorization: Bearer <token>`
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "sub-001",
      "trader_name": "Alejandro Mendoza",
      "email": "amendoza@propdesk-capital.com",
      "ninja_account_name": "Apex_PA_104928_01",
      "license_key": "NT8-QTM-9921-ALPHA",
      "plan_tier": "INSTITUTIONAL_BOT",
      "remote_enabled": true,
      "sync_state": "CONFIRMED_ON",
      "connection_status": "ONLINE_TRADING",
      "bound_machine_id": "WIN11-TRD-9F82A1C0",
      "active_strategy_name": "QuantumOrderFlowScalperV4",
      "instrument": "NQ 12-26",
      "daily_pnl_usd": 2840.5,
      "last_heartbeat_at": "2026-11-16T23:59:00.000Z",
      "last_latency_ms": 34,
      "expires_at": "2027-06-30T23:59:59.000Z",
      "status_note": "Heartbeat OK — Estrategia autorizada en NinjaTrader 8"
    }
  ]
  ```

### `PATCH /api/v1/subscriptions/:id/remote-state`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "remote_enabled": false,
    "reason": "Desactivación manual por riesgo"
  }
  ```
- **Response `200 OK`:** Retorna la suscripción actualizada con `sync_state: "PENDING_ACK"`.

### `POST /api/v1/subscriptions/global-kill-switch`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "enabled": false,
    "reason": "Noticia de alto impacto (CPI / FOMC)"
  }
  ```
- **Response `200 OK`:** Retorna el array de todas las suscripciones actualizadas.

### `POST /api/v1/subscriptions/:id/reset-machine-id`
- **Headers:** `Authorization: Bearer <token>`
- **Response `200 OK`:** Retorna la suscripción con `bound_machine_id: null`.

### `GET /api/v1/subscriptions/audit-logs`
- **Headers:** `Authorization: Bearer <token>`
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "evt-1001",
      "timestampIso": "2026-11-16T23:50:00.000Z",
      "licenseKey": "NT8-QTM-9921-ALPHA",
      "traderName": "Alejandro Mendoza",
      "eventType": "ADMIN_TOGGLE_OFF",
      "allowedToTrade": false,
      "remoteCommand": "FLATTEN_AND_DISABLE",
      "machineId": "WIN11-TRD-9F82A1C0",
      "details": "Admin ejecutó Kill-Switch Remoto"
    }
  ]
  ```

---

## 3. Telemetría y Heartbeat de NinjaTrader 8 (`/ninja/heartbeat`)

Este endpoint es consumido directamente por el Add-On en C# de NinjaTrader 8 cada N segundos (Polling HTTP periódico):

### `POST /api/v1/ninja/heartbeat`
- **Headers:**
  - `Content-Type: application/json`
  - `X-Ninja-Signature: sha256=<hmac_hash>` (opcional en body o header)
- **Request Body:**
  ```json
  {
    "licenseKey": "NT8-QTM-9921-ALPHA",
    "machineId": "WIN11-TRD-9F82A1C0",
    "strategyName": "QuantumOrderFlowScalperV4",
    "accountName": "Apex_PA_104928_01",
    "instrument": "NQ 12-26",
    "currentSessionPnlUsd": 2840.5,
    "timestampIso": "2026-11-16T23:59:00.000Z",
    "hmacSignature": "sha256=...",
    "simulatedLatencyMs": 35
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "allowedToTrade": true,
    "remoteCommand": "CONTINUE_TRADING",
    "syncStateAfterPoll": "CONFIRMED_ON",
    "pollIntervalMs": 4000,
    "serverTimestampIso": "2026-11-16T23:59:00.500Z",
    "message": "ACK: Suscripción activa. Permiso de trading renovado.",
    "subscriptionSnapshot": { ... }
  }
  ```
- **En caso de Kill-Switch activo:**
  ```json
  {
    "allowedToTrade": false,
    "remoteCommand": "FLATTEN_AND_DISABLE",
    "syncStateAfterPoll": "CONFIRMED_OFF",
    "pollIntervalMs": 4000,
    "serverTimestampIso": "2026-11-16T23:59:00.500Z",
    "message": "KILL-SWITCH ACTIVO: NinjaTrader debe aplanar y detener operativa."
  }
  ```

---

## 4. Muro social (`/posts`, `/users`)

Las publicaciones, likes y follows se guardan en PostgreSQL. Las operaciones
de escritura requieren `Authorization: Bearer <token>`; el feed es público y,
cuando se envía un token válido, incluye el estado de like y seguimiento del
usuario autenticado. Cada respuesta conserva el sobre común de la API.

### `GET /api/v1/posts`
- Lista publicaciones de más nuevas a más antiguas.
- Cada post incluye `author_name`, `user_id`, `likes_count`, `liked_by_me`,
  `followers_count`, `following_count` e `is_following`, además del texto,
  imagen y fecha de creación.
- Acepta `?status=true|false` y opcionalmente un Bearer token para el estado
  personal de likes y follows.

### `POST /api/v1/posts`
- Requiere autenticación; el autor se toma del JWT, no del cuerpo.
- Acepta texto, imagen o ambos. La imagen debe cargarse primero en
  `POST /api/v1/images`; envía la URL devuelta como `image`.

```json
{
  "text": "Mi publicación",
  "image": "http://localhost:3000/api/v1/images/<id-sha256>"
}
```

### `GET /api/v1/posts/:id` y `DELETE /api/v1/posts/:id`
- Consulta una publicación; el borrado requiere autenticación y solo permite
  eliminar al autor.

### `POST /api/v1/posts/:id/like`
- Requiere autenticación. Alterna el like de forma transaccional y responde
  con el post actualizado y `liked`.

### `PUT /api/v1/users/:id/follow` y `DELETE /api/v1/users/:id/follow`
- Requieren autenticación. Seguir y dejar de seguir son operaciones
  idempotentes, actualizan ambos contadores en la misma transacción y rechazan
  el auto-seguimiento con `400`.

Al iniciar el backend se ejecuta de forma idempotente la migración
`migrations/001_social_graph.sql`. Añade los contadores sin recrear tablas y
los reconcilia con los registros existentes.

---

## 5. Herramientas para bots (`/bots`)

`GET /api/v1/bots` y `GET /api/v1/bots/:id` son públicos. Las operaciones
`POST /api/v1/bots`, `PUT /api/v1/bots/:id` y `DELETE /api/v1/bots/:id`
requieren token Bearer y que el usuario esté incluido en `ADMINS`.
`PUT` reemplaza todos los campos del bot.

El cuerpo de `POST` y `PUT` contiene:

```json
{
  "nombre": "Bot de ejemplo",
  "profit_factor": 2.5,
  "win_rate": 72.5,
  "profit_1_year": 4200,
  "drawdown": 800,
  "imagen": "https://example.com/bot.jpg",
  "descripcion": "Descripción del bot."
}
```

`win_rate` debe estar entre 0 y 100. `profit_factor`, `drawdown` no pueden ser negativos; `profit_1_year` sí puede ser
negativo. Las respuestas usan el sobre común `{ "body": ..., "message": "...",
"status": <código HTTP> }`.

---

## 6. Facturación y Perfil de Usuario (`/account`)

### `GET /api/v1/account/billing-summary`
- **Response `200 OK`:**
  ```json
  {
    "primary_payment_method": "Visa •••• 4821",
    "auto_renew": true,
    "next_billing_date_iso": "2026-12-15",
    "estimated_next_amount_usd": 199,
    "total_billed_2026_usd": 547,
    "invoices_count": 3
  }
  ```
### `GET /api/v1/account/invoices`
- **Response `200 OK`:** Lista de facturas con `id`, `date_iso`, `concept`, `amount_usd`, `method`, `status`.
### `GET /api/v1/account/profile`
- **Response `200 OK`:** Objeto `UserDto`.
### `PATCH /api/v1/account/profile`
- **Request Body:** `{ "full_name": "...", "email": "...", "handle": "...", "default_machine_id": "..." }`
- **Response `200 OK`:** `UserDto` actualizado.
### `GET /api/v1/account/invoices/:id/download`
- **Response `200 OK`:** `{ "download_url": "https://...", "filename": "INV-2026-1104.pdf" }`
