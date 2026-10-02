const legacySslModes = new Set(["prefer", "require", "verify-ca"]);

/**
 * Make pg-connection-string's current TLS verification behavior explicit.
 * The driver warns that these legacy names will change meaning in a future
 * major version; verify-full preserves today's certificate verification.
 */
export function makePostgresSslModeExplicit(connectionString: string) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();

  if (!sslMode || !legacySslModes.has(sslMode)) {
    return connectionString;
  }

  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
