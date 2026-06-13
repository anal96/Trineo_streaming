const normalizeBase = (value: string) => value.replace(/\/+$/, '');

const isPrivateHost = (hostname: string) =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '0.0.0.0' ||
  /^10\./.test(hostname) ||
  /^192\.168\./.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

const resolveApiBaseUrl = () => {
  const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
  if (envBase && envBase.trim()) return normalizeBase(envBase.trim());

  // Hard default: same-origin /api so mobile + forwarded routes work.
  // In Vite dev, this is proxied to localhost:5000 via vite.config.ts.
  return '/api';
};

const API_BASE_URL = resolveApiBaseUrl();

const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);

const buildRequestCandidates = (endpoint: string) => {
  const normalizedEndpoint = ensureLeadingSlash(endpoint);
  const { protocol, host, hostname } = window.location;
  const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;

  const bases = [
    envBase?.trim() ? normalizeBase(envBase.trim()) : '',
    normalizeBase(API_BASE_URL),
    '/api',
    `${protocol}//${host}/api`,
    `${protocol}//${host}`,
    `http://${hostname}:5000/api`,
    `http://${hostname}:5000`,
    'http://localhost:5000/api'
  ].filter(Boolean);

  const candidates: string[] = [];
  const seen = new Set<string>();
  for (const base of bases) {
    const normalizedBase = normalizeBase(base);
    const withApi = normalizedBase.endsWith('/api')
      ? `${normalizedBase}${normalizedEndpoint}`
      : `${normalizedBase}/api${normalizedEndpoint}`;
    const withoutApi = `${normalizedBase}${normalizedEndpoint}`;
    [withApi, withoutApi].forEach((url) => {
      if (!seen.has(url)) {
        seen.add(url);
        candidates.push(url);
      }
    });
  }
  return candidates;
};

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(options.headers || {}),
  } as Record<string, string>;

  // Only set application/json if we are not uploading multipart data
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const requestCandidates = buildRequestCandidates(endpoint);

  let response: Response | null = null;
  let lastNetworkError: any = null;
  let lastStatusError = '';

  for (const url of requestCandidates) {
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
      if (response.ok || response.status === 401) break;
      // Try fallback for common proxy misses
      if (response.status === 404 || response.status === 502 || response.status === 503) {
        lastStatusError = `API request failed (${response.status})`;
        continue;
      }
      break;
    } catch (err) {
      lastNetworkError = err;
    }
  }

  if (!response) {
    throw new Error(lastNetworkError?.message || lastStatusError || 'Failed to fetch API. Please check backend server and API URL.');
  }

  if (response.status === 401) {
    const data = await response.json().catch(() => ({}));
    if (data.oneDeviceViolation) {
      alert('Session invalidated: You have been logged in from another device.');
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error(data.message || 'Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed (${response.status})`);
  }

  return response.json();
}

export const getApiUrl = (path: string) => {
  const normalizedPath = ensureLeadingSlash(path);
  const normalizedBase = normalizeBase(API_BASE_URL);
  const root = normalizedBase.replace(/\/api$/, '');
  if (path.startsWith('/api/')) {
    if (normalizedBase.startsWith('/')) return path;
    return `${root}${path}`;
  }
  if (normalizedBase.startsWith('/')) return `/api${normalizedPath}`;
  return `${normalizedBase}${normalizedPath}`;
};

export const decodeShortId = (shortId: string) => {
  if (!shortId || shortId.length !== 16) return shortId;
  const base64 = shortId.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return Array.from(binary).map(char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
};
