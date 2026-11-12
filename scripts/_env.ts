/** Carga .env.local (si existe) y comprueba las variables de Supabase para los scripts. */
export function loadSupabaseEnv(): { url: string; key: string } {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Sin .env.local: se usan las variables ya presentes en el entorno.
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY. Crea .env.local (mira .env.example).");
    process.exit(1);
  }
  return { url, key };
}
