# 🗳️ Elecciones a Presidente del Grupo · AMEBA CITY

Web app de votación para elegir al presidente del Discord. Cada miembro reparte **3, 2 y 1 puntos** entre tres personas distintas (nunca a sí mismo). El voto es secreto, no se puede cambiar y los resultados solo se publican cuando han votado los 10.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind 4 · Supabase (Postgres) · Vercel.

---

## Puesta en marcha (unos 15 minutos)

### 1. Crear la base de datos en Supabase

1. Entra en <https://supabase.com>, crea una cuenta y pulsa **New project** (plan Free). Elige una región europea, por ejemplo *West EU (Ireland)*.
2. Cuando termine de crearse, ve a **SQL Editor → New query**, pega **todo** el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**. Debe salir *Success. No rows returned*.
3. Ve a **Project Settings → API Keys** (o **Data API**) y copia:
   - **Project URL** → será `SUPABASE_URL`
   - La **secret key** (`sb_secret_…`) o, si tu proyecto aún las usa, la **service_role key** → será `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ Esa clave da acceso total a la base de datos. Solo va en Vercel y en tu `.env.local`. No la compartas ni la pegues en Discord. **No** uses la `anon`/`publishable` key: la app no la necesita.

### 2. Configurar las variables en local

```bash
cp .env.example .env.local
```

Rellena `.env.local`:

| Variable | Qué poner |
|---|---|
| `SUPABASE_URL` | Project URL de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | secret / service_role key |
| `ADMIN_PASSWORD` | La contraseña que quieras para `/admin` |
| `SESSION_SECRET` | Una cadena aleatoria larga, por ejemplo la salida de `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### 3. (Recomendado) Probar todo contra tu Supabase real

```bash
npm install
npm run simulate
```

Simula los 10 votos de principio a fin contra tu base de datos: PINs, bloqueo por intentos, papeletas inválidas, doble voto, resultados ocultos hasta el final y recuento con todos los tipos de desempate. **Al terminar deja la BD limpia.** Si ya hay votos reales se niega a ejecutarse.

### 4. Generar los PINs

```bash
npm run generate-pins
```

Imprime la lista `nombre → PIN`. **Cópiala en ese momento**: en la BD solo se guarda el hash (bcrypt) y no se puede recuperar. Si la pierdes, vuelve a ejecutarlo (los PINs anteriores dejan de valer) o usa *Regenerar PINs* en `/admin`.

Reparte cada PIN **por privado**.

### 5. Desplegar en Vercel

1. Entra en <https://vercel.com> con tu cuenta de GitHub → **Add New… → Project**.
2. Importa este repositorio. Si no aparece, pulsa *Adjust GitHub App Permissions* y dale acceso al repo privado.
3. En **Environment Variables** añade `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` y `SESSION_SECRET` con los mismos valores que en `.env.local`.
4. **Deploy**. Cuando acabe tendrás una URL tipo `https://ameba-elecciones.vercel.app`: ese es el enlace que se pega en Discord.

Cada `git push` a `main` vuelve a desplegar automáticamente.

> 💡 Si cambias variables de entorno en Vercel, haz **Redeploy** para que se apliquen.

---

## Cómo funciona

### Flujo
1. **Inicio:** los 10 nombres. Quien ya ha votado sale en gris con "✓ Ya ha votado" y no se puede pulsar.
2. **PIN:** 4 dígitos. 5 fallos seguidos bloquean ese nombre durante 10 minutos.
3. **Papeleta:** marcar una casilla de 3, una de 2 y una de 1 puntos, cada una a una persona distinta. Tu nombre no aparece.
4. **Confirmación:** "Esta es tu papeleta, no podrás cambiarla" → *Depositar en la urna*.
5. **Resultados** (`/resultados`): mientras falten votos solo se ve el progreso y quién falta. Con los 10 votos se abre la urna: cuenta atrás, podio (bronce → plata → oro con confeti) y la clasificación completa con desglose.

### Desempates
1. Más puntos totales.
2. Si empatan: más votos de 3 puntos.
3. Si siguen empatados: más votos de 2 puntos.
4. Si aun así coinciden: comparten posición y se marca **Empate** (por ejemplo 6º, 6º, 8º).

### Seguridad
- **Toda la lógica va en el servidor** (server actions + route handlers). La service role key nunca llega al navegador (`import "server-only"`).
- **RLS activado sin políticas** y permisos revocados a `anon`/`authenticated`: aunque alguien obtuviera la clave pública, no podría leer nada.
- **PINs:** solo se guarda el hash bcrypt. Los fallos y el bloqueo se registran de forma atómica en la BD (`register_pin_failure`).
- **Sesión:** tras el PIN correcto se emite una cookie `httpOnly` firmada con HMAC que dura 20 minutos. El servidor saca de ella quién vota, nunca del cliente.
- **Validación en servidor:** 3 candidatos válidos y distintos, ninguno es el propio votante, puntos fijos 3/2/1. La BD lo refuerza con un `CHECK` (distintos), la función `cast_vote` (sin autovoto) y la PK de `participations` (un voto por persona, en la misma transacción que la papeleta).
- **Voto secreto real:** la tabla `ballots` **no tiene columna de votante ni fecha**. "Quién ha votado" (`participations`) y "qué se ha votado" (`ballots`) van separados, así que ni siquiera el admin, mirando la BD, puede saber a quién votó cada uno.
- **Resultados blindados:** `GET /api/resultados` responde `403` sin ningún dato de puntos hasta que haya 10 votos. La página `/resultados` usa la misma función.

### Panel `/admin`
Protegido con `ADMIN_PASSWORD` (cookie firmada de 8 h). Permite:
- Ver quién ha votado y quién falta.
- **Marcar ausentes (voto en blanco):** quien no se presenta cuenta como que ha participado y su voto da **+1 punto al más votado** (si hay empate total en el 1º, a cada empatado). Sigue pudiendo recibir puntos. Se puede deshacer mientras no haya votado. Los resultados se publican cuando los 10 han votado o están en blanco.
- **Regenerar PINs:** se muestran una sola vez, con botón para copiarlos.
- **Resetear votación:** borra todos los votos y desbloquea a todo el mundo.

### API pública
| Ruta | Devuelve |
|---|---|
| `GET /api/estado` | `{ total, votedCount, complete, voters: [{ id, name, hasVoted }] }` |
| `GET /api/resultados` | `403` mientras falten votos · `{ complete: true, standings }` al terminar |

---

## Desarrollo

```bash
npm run dev            # http://localhost:3000
npm test               # tests (vitest)
npm run typecheck
npm run lint
```

**Sin Supabase:** pon `USE_MEMORY_STORE=1` en `.env.local` (más `ADMIN_PASSWORD` y `SESSION_SECRET`). La app usa una BD en memoria y muestra los PINs de prueba en la consola. Con `MEMORY_STORE_SEED=1` precarga 10 votos para ver la página de resultados. Esto solo funciona en desarrollo; en producción se ignora.

### Tests
- `tests/tally.test.ts`: recuento y los tres niveles de desempate.
- `tests/election.test.ts`: flujo completo de 10 votos, caducidad del bloqueo por PIN, que los resultados no se filtren antes de tiempo y la firma de cookies.
- `tests/sql.test.ts`: ejecuta `supabase/schema.sql` en un **Postgres real embebido (PGlite)** y pasa por él la simulación completa. Comprueba también que la BD rechaza el autovoto, los repetidos y el doble voto aunque alguien se salte la app, y que `anon`/`authenticated` no tienen acceso.

### Estructura
```
supabase/schema.sql          tablas, RLS y funciones SQL
scripts/generate-pins.ts     npm run generate-pins
scripts/simulate.ts          npm run simulate
src/lib/
  participants.ts            los 10 miembros
  tally.ts                   recuento + desempates (puro)
  ballot.ts                  validación de papeletas (puro)
  pin.ts                     generación y hash de PINs
  election.ts                reglas de la votación
  simulation.ts              escenario de 10 votos (tests y simulate)
  store/                     acceso a datos: supabase.ts y memory.ts
  server/                    instancia de servidor + sesiones (server-only)
src/app/
  page.tsx                   inicio → PIN → papeleta → confirmación
  resultados/                progreso o escrutinio
  admin/                     panel de administración
  api/                       estado y resultados
  opengraph-image.tsx        vista previa para Discord
src/components/              UI (papeleta, podio, etc.)
```

### Notas
- **Si actualizas la app y el esquema ha cambiado**, vuelve a ejecutar `supabase/schema.sql` entero en el SQL Editor: es seguro re-ejecutarlo y no borra votos.
- El plan gratuito de Supabase **pausa el proyecto tras 7 días sin actividad**. Si pasa, entra en el dashboard y pulsa *Restore*.
- Para cambiar participantes, edita `src/lib/participants.ts` y vuelve a ejecutar `npm run generate-pins`.
