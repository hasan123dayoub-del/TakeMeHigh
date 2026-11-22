/** Fail fast at boot with a clear message instead of a confusing runtime error later. */
export function validateEnv(config: Record<string, unknown>) {
  // DB_PASSWORD may be empty: XAMPP's default root account has no password.
  const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
  const missing = required.filter((k) => !config[k]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env.`);
  }
  if (String(config.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }
  return config;
}
