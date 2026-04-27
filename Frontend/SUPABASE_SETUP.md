# 🛡️ Guardián de Gastos — Despliegue de la BD en Supabase

Esta app corre **100% en local** (datos en `localStorage`). Si quieres
migrarla a un backend real, sigue estos pasos para crear la base de datos
en Supabase.

## 1. Crear el proyecto

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta gratis.
2. **New project** → elige nombre, contraseña de BD y región más cercana.
3. Espera ~2 minutos a que se aprovisione.

## 2. Ejecutar el script SQL

1. En el panel lateral, abre **SQL Editor → New query**.
2. Copia y pega TODO el contenido del archivo [`supabase_schema.sql`](./supabase_schema.sql).
3. Pulsa **Run** (o `Ctrl+Enter`).
4. Verifica en **Table Editor** que existan: `families`, `members`, `expenses`.

## 3. Configurar autenticación

1. Ve a **Authentication → Providers → Email**.
2. Activa "Email".
3. Para desarrollo: desactiva *Confirm email* (así puedes probar sin recibir correo).

## 4. Obtener tus credenciales

En **Project Settings → API** copia:
- `Project URL`
- `anon public key`

## 5. Conectar desde React (cuando quieras migrar)

```bash
npm install @supabase/supabase-js
```

Crea `src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);
```

En `.env.local` (ya está en `.gitignore`):
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### Registro
```ts
await supabase.auth.signUp({
  email, password,
  options: { data: { family_name: 'Pérez García' } }
});
// ↑ el trigger crea automáticamente la fila en `families`
```

### Login
```ts
await supabase.auth.signInWithPassword({ email, password });
```

### Insertar miembro / gasto
```ts
// El family_id lo necesitas, lo lees una vez:
const { data: fam } = await supabase.from('families').select('id').single();

await supabase.from('members').insert({
  family_id: fam.id, name: 'Lucía', monthly_income: 3500
});

await supabase.from('expenses').insert({
  family_id: fam.id, member_id, description: 'Almuerzo',
  amount: 25.50, date: '2025-04-26', category: 'Alimentación'
});
```

RLS ya garantiza que cada familia **solo ve sus propios datos**.

## Tablas creadas

| Tabla | Descripción |
|-------|-------------|
| `families` | 1 fila por cuenta (vinculada a `auth.users`) |
| `members` | Miembros de cada familia + ingreso mensual |
| `expenses` | Gastos con categoría, fecha, monto y miembro |

## Seguridad

- ✅ RLS activado en las 3 tablas
- ✅ Función `current_family_id()` evita recursión en políticas
- ✅ `ON DELETE CASCADE` borra miembros/gastos al eliminar familia
- ✅ Trigger `handle_new_user` crea family al hacer signup
