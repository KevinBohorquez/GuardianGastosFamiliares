# 🛡️ Guardián de Gastos

App de gestión financiera familiar con **cuenta única → múltiples perfiles**
(modelo "Netflix"). Stack: **React + TypeScript** (frontend) ↔
**Node/Express + Supabase** (backend).

## Arquitectura

```
┌──────────────────────┐     HTTP/JSON      ┌──────────────────────┐     supabase-js      ┌────────────┐
│  Frontend (raíz /)   │ ─────────────────▶ │  Backend/  Express   │ ───────────────────▶ │  Supabase  │
│  React + Vite + Tail │ ◀───── JWT ─────── │  Auth + REST API     │ ◀── service_role ──  │  Postgres  │
└──────────────────────┘                    └──────────────────────┘                      └────────────┘
```

## Estructura del repo

```
/
├── src/, index.html, ...    # Frontend (React) — raíz por requisito de Lovable
├── Frontend/README.md       # Documentación del módulo frontend
├── Backend/                 # API Node + Express + Supabase
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── README.md
├── supabase_schema.sql      # Esquema PostgreSQL + RLS + triggers
├── SUPABASE_SETUP.md        # Guía paso a paso para crear el proyecto Supabase
├── .env.example             # Variables del frontend (VITE_API_URL)
└── README.md                # (este archivo)
```

## Quickstart local (3 terminales)

### 1) Supabase
- Crea proyecto en [supabase.com](https://supabase.com).
- SQL Editor → ejecuta `supabase_schema.sql`.
- Authentication → Providers → Email → activa, desactiva *Confirm email*.
- Project Settings → API → copia `URL`, `anon key`, `service_role key`.

### 2) Backend
```bash
cd Backend
cp .env.example .env          # rellena las 3 keys de Supabase
npm install
npm run dev                   # → http://localhost:4000
```

### 3) Frontend (raíz)
```bash
cp .env.example .env          # VITE_API_URL=http://localhost:4000
npm install
npm run dev                   # → http://localhost:8080
```

Abre http://localhost:8080, regístrate y empieza a usar la app.

## Más detalle

- 📘 Backend → [`Backend/README.md`](./Backend/README.md)
- 🎨 Frontend → [`Frontend/README.md`](./Frontend/README.md)
- 🗄️ Base de datos → [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md)