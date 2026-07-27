import 'server-only';

/**
 * Server-only environment contract for Plinko Solutions Core.
 * This module is intentionally not imported by browser-facing code.
 */
export function getPlinkoCoreConfig(environment = process.env) {
  const url = normalizeUrl(environment.PLINKO_CORE_URL);
  const serviceRoleKey = requiredValue(environment.PLINKO_CORE_SERVICE_ROLE_KEY);
  const publishableKey = requiredValue(environment.PLINKO_CORE_PUBLISHABLE_KEY);
  const appUrl = normalizeUrl(environment.PLINKO_APP_URL);

  if (!url || !serviceRoleKey || !publishableKey || !appUrl) {
    throw new Error('Missing Plinko Solutions Core configuration');
  }

  return { url, serviceRoleKey, publishableKey, appUrl };
}

function requiredValue(value) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue || undefined;
}

function normalizeUrl(value) {
  const normalizedValue = requiredValue(value);

  if (!normalizedValue) {
    return undefined;
  }

  try {
    const url = new URL(normalizedValue);

    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
      return undefined;
    }

    const pathname = url.pathname.replace(/\/+$/, '');
    return `${url.origin}${pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}
