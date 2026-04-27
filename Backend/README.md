# 🛡️ Backend — Guardián de Gastos

API REST en Node.js + Express + TypeScript que se conecta a Supabase
(PostgreSQL + Auth) y expone los endpoints que consume el frontend.

## Arquitectura

```
Frontend (React)  ──HTTP/JSON──▶  Backend (Express)  ──supabase-js──▶  Supabase
                                       │
                                       ├── /api/auth      (signup, login, logout)
                                       ├── /api/family    (datos de la familia)
                                       ├── /api/members   (CRUD de miembros)
                                       └── /api/expenses  (CRUD de gastos)
```

- **Auth**: Supabase emite un JWT. El frontend lo manda en
  `Authorization: Bearer <token>` y el middleware `requireAuth` lo valida.
- **DB**: el backend usa la `service_role key` para escribir, así que la
  RLS opera como red de seguridad (no como única defensa). El middleware
  filtra siempre por `family_id` del usuario autenticado.

## Configuración

1. Copia el archivo de variables:
   ```bash
   cp .env.example .env
   ```
2. Crea un proyecto en [supabase.com](https://supabase.com).
3. Ejecuta el script `../supabase_schema.sql` en
   **SQL Editor → New Query**.
4. En **Project Settings → API** copia y pega en `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secreta — solo backend)
   - `SUPABASE_ANON_KEY`
5. En **Authentication → Providers → Email** activa Email y, para
   desarrollo, desactiva *Confirm email*.

## Ejecutar

```bash
cd Backend
npm install
npm run dev          # http://localhost:4000
```

Verifica con:
```bash
curl http://localhost:4000/health
# → { "ok": true, "service": "guardian-backend" }
```

## Endpoints

| Método | Ruta                  | Descripción                          | Auth |
|--------|-----------------------|--------------------------------------|------|
| POST   | `/api/auth/signup`    | Crear familia + usuario              | ❌   |
| POST   | `/api/auth/login`     | Iniciar sesión                       | ❌   |
| POST   | `/api/auth/logout`    | Stateless, solo conveniencia         | ❌   |
| GET    | `/api/family/me`      | Datos de la familia actual           | ✅   |
| GET    | `/api/members`        | Listar miembros                      | ✅   |
| POST   | `/api/members`        | Crear miembro                        | ✅   |
| PATCH  | `/api/members/:id`    | Actualizar miembro                   | ✅   |
| DELETE | `/api/members/:id`    | Eliminar miembro (cascade en gastos) | ✅   |
| GET    | `/api/expenses`       | Listar gastos de la familia          | ✅   |
| POST   | `/api/expenses`       | Crear gasto                          | ✅   |
| PATCH  | `/api/expenses/:id`   | Actualizar gasto                     | ✅   |
| DELETE | `/api/expenses/:id`   | Eliminar gasto                       | ✅   |

## Producción

```bash
npm run build
npm start
```

Despliega en cualquier proveedor que ejecute Node 20+ (Railway, Render,
Fly.io, una VPS, etc.). Recuerda configurar las mismas variables de
entorno y apuntar `CORS_ORIGIN` al dominio del frontend.

## Estructura

```
Backend/
├── src/
│   ├── index.ts          # bootstrap Express
│   ├── supabase.ts       # clientes service_role + anon
│   ├── middleware/
│   │   └── auth.ts       # valida JWT y resuelve family_id
│   └── routes/
│       ├── auth.ts
│       ├── family.ts
│       ├── members.ts
│       └── expenses.ts
├── .env.example
├── package.json
└── tsconfig.json
```