const normalizeBase = (value: string) => value.replace(/\/+$/, '');

export const getApiUrl = (path: string) => {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  const rawBase = envBase && envBase.trim() ? envBase.trim() : '';
  const cleanBase = normalizeBase(rawBase).replace(/\/api$/, '');

  const normalizedPath = path.startsWith('/api')
    ? path
    : `/api${path.startsWith('/') ? path : '/' + path}`;

  return `${cleanBase}${normalizedPath}`;
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

  const url = getApiUrl(endpoint);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

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
  } catch (err: any) {
    throw new Error(err.message || 'Failed to fetch API. Please check backend server and API URL.');
  }
}

export const decodeShortId = (shortId: string) => {
  if (!shortId || shortId.length !== 16) return shortId;
  const base64 = shortId.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return Array.from(binary).map(char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
};

