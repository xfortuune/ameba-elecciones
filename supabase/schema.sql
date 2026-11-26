-- =====================================================================
--  AMEBA CITY · Elecciones a Presidente del Grupo
--  Esquema de base de datos para Supabase (Postgres).
--  Pégalo entero en Supabase → SQL Editor → Run. Se puede re-ejecutar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Votantes (= candidatos). Se rellena con `npm run generate-pins`.
-- Solo se guarda el hash bcrypt del PIN, nunca el PIN en claro.
-- ---------------------------------------------------------------------
create table if not exists public.voters (
  id              smallint primary key,
  name            text not null unique,
  pin_hash        text,
  failed_attempts smallint not null default 0,
  locked_until    timestamptz
);

-- ---------------------------------------------------------------------
-- QUIÉN ha votado. La PK garantiza un único voto por persona.
-- ---------------------------------------------------------------------
create table if not exists public.participations (
  voter_id smallint primary key references public.voters (id) on delete cascade
);
-- blank = true: no se presentó y el admin lo marcó como voto en blanco (no reparte puntos).
alter table public.participations add column if not exists blank boolean not null default false;

-- ---------------------------------------------------------------------
-- QUÉ se ha votado. A propósito NO tiene columna de votante ni fecha:
-- una papeleta no se puede vincular con la persona que la emitió.
-- ---------------------------------------------------------------------
create table if not exists public.ballots (
  id        uuid primary key default gen_random_uuid(),
  first_id  smallint not null references public.voters (id) on delete cascade, -- 3 puntos
  second_id smallint not null references public.voters (id) on delete cascade, -- 2 puntos
  third_id  smallint not null references public.voters (id) on delete cascade, -- 1 punto
  constraint ballots_distinct check (
    first_id <> second_id and first_id <> third_id and second_id <> third_id
  )
);

-- ---------------------------------------------------------------------
-- Seguridad: RLS activado SIN políticas → las claves públicas (anon /
-- authenticated) no pueden leer ni escribir nada. Solo el servidor,
-- con la service role key, accede a los datos.
-- ---------------------------------------------------------------------
alter table public.voters         enable row level security;
alter table public.participations enable row level security;
alter table public.ballots        enable row level security;

revoke all on public.voters, public.participations, public.ballots from anon, authenticated;
grant select, insert, update, delete on public.voters, public.participations, public.ballots to service_role;

-- ---------------------------------------------------------------------
-- cast_vote: registra participación + papeleta en una sola transacción.
-- Si el votante ya votó, la PK de participations lanza 23505 y no se
-- inserta nada. También rechaza el autovoto y candidatos repetidos.
-- ---------------------------------------------------------------------
create or replace function public.cast_vote(
  p_voter  smallint,
  p_first  smallint,
  p_second smallint,
  p_third  smallint
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_voter in (p_first, p_second, p_third) then
    raise exception 'SELF_VOTE' using errcode = 'P0001';
  end if;

  insert into participations (voter_id) values (p_voter);
  insert into ballots (first_id, second_id, third_id) values (p_first, p_second, p_third);
end;
$$;

-- ---------------------------------------------------------------------
-- register_pin_failure: suma un fallo de forma atómica. Al llegar a
-- p_max fallos bloquea el nombre p_lock_minutes minutos.
-- ---------------------------------------------------------------------
create or replace function public.register_pin_failure(
  p_voter        smallint,
  p_max          int,
  p_lock_minutes int
) returns table (attempts smallint, lock_until timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts smallint;
  v_locked   timestamptz;
begin
  select v.failed_attempts, v.locked_until
    into v_attempts, v_locked
    from voters v
   where v.id = p_voter
     for update;

  if not found then
    return;
  end if;

  -- Un bloqueo ya caducado empieza de cero.
  if v_locked is not null and v_locked <= now() then
    v_attempts := 0;
    v_locked   := null;
  end if;

  v_attempts := v_attempts + 1;
  if v_attempts >= p_max then
    v_attempts := 0;
    v_locked   := now() + make_interval(mins => p_lock_minutes);
  end if;

  update voters v
     set failed_attempts = v_attempts, locked_until = v_locked
   where v.id = p_voter;

  return query select v_attempts, v_locked;
end;
$$;

-- ---------------------------------------------------------------------
-- reset_election: borra todos los votos y desbloquea a todo el mundo.
-- (Los `where true` son necesarios por la extensión safeupdate.)
-- ---------------------------------------------------------------------
create or replace function public.reset_election() returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from ballots where true;
  delete from participations where true;
  update voters set failed_attempts = 0, locked_until = null where true;
end;
$$;

-- ---------------------------------------------------------------------
-- cast_blank: el admin marca a un ausente como voto en blanco.
-- Cuenta como participación (no puede votar después) pero no crea papeleta.
-- Si ya había votado, la PK lanza 23505.
-- ---------------------------------------------------------------------
create or replace function public.cast_blank(p_voter smallint) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into participations (voter_id, blank) values (p_voter, true);
end;
$$;

-- ---------------------------------------------------------------------
-- undo_blank: deshace un voto en blanco. Nunca toca un voto real.
-- Devuelve true si había un voto en blanco que deshacer.
-- ---------------------------------------------------------------------
create or replace function public.undo_blank(p_voter smallint) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from participations where voter_id = p_voter and blank;
  return found;
end;
$$;

revoke execute on function public.cast_blank(smallint)                           from public, anon, authenticated;
revoke execute on function public.undo_blank(smallint)                           from public, anon, authenticated;
grant  execute on function public.cast_blank(smallint)                           to service_role;
grant  execute on function public.undo_blank(smallint)                           to service_role;
revoke execute on function public.cast_vote(smallint, smallint, smallint, smallint) from public, anon, authenticated;
revoke execute on function public.register_pin_failure(smallint, int, int)       from public, anon, authenticated;
revoke execute on function public.reset_election()                               from public, anon, authenticated;
grant  execute on function public.cast_vote(smallint, smallint, smallint, smallint) to service_role;
grant  execute on function public.register_pin_failure(smallint, int, int)       to service_role;
grant  execute on function public.reset_election()                               to service_role;
