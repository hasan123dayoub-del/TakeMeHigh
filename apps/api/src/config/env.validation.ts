/** Fail fast at boot with a clear message instead of a confusing runtime error later. */
export function validateEnv(config: Record<string, unknown>) {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((k) => !config[k]);
  if (missing.length) {
    throw new Error(
      `Missing environment variables: ${missing.join(', ')}. See .env.example.`,
    );
  }
  if (!String(config.DATABASE_URL).startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a postgresql:// connection string.');
  }
  if (String(config.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }
  return config;
}
