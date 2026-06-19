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

export async function apiFetch(endpoint: string, options: RequestInit & { ignoreAuthError?: boolean } = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(options.headers || {}),
  } as Record<string, string>;

  // Only set application/json if we are not uploading multipart data
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && token !== 'session_active') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = getApiUrl(endpoint);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      if (!options.ignoreAuthError) {
        // If the user is on the login page (attempting to sign in), do NOT
        // redirect — just throw so the login form can display the error.
        const isLoginAttempt = endpoint.includes('/auth/login');
        if (!isLoginAttempt) {
          if (data.oneDeviceViolation) {
            alert('Session invalidated: You have been logged in from another device.');
          }
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
        }
      }
      throw new Error(data.message || 'Unauthorized');
    }

    if (response.status === 403) {
      const data = await response.clone().json().catch(() => ({}));
      if (data.mustChangePassword === true) {
        if (window.location.pathname !== '/change-password') {
          window.location.href = '/change-password';
        }
        throw new Error(data.message || 'Password change required');
      }
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

