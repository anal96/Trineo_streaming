import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { apiFetch } from '../../utils/api';
import trineoLogoImg from '@/images/trineoStream-1.png';
import '@/styles/studiova-scoped.css';

const ASSET_BASE = '/studiova-assets';

// ─── Helper: Dynamically load a script ──────────────────────────────────────
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

export default function LoginPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState('');
  const [resetTokenValid, setResetTokenValid] = useState(false);

  // Auth guard: redirect authenticated users or check active session cookies
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'owner') { navigate('/owner', { replace: true }); return; }
        if (user.role === 'admin') { navigate('/admin', { replace: true }); return; }
        navigate('/student', { replace: true });
      } catch { /* ignore parse errors */ }
    } else {
      const checkSession = async () => {
        try {
          const freshUser = await apiFetch('/auth/session', { ignoreAuthError: true });
          if (freshUser) {
            localStorage.setItem('token', 'session_active');
            localStorage.setItem('user', JSON.stringify(freshUser));
            if (freshUser.role === 'owner') { navigate('/owner', { replace: true }); return; }
            if (freshUser.role === 'admin') { navigate('/admin', { replace: true }); return; }
            navigate('/student', { replace: true });
          }
        } catch (err) {
          // Silent catch: not logged in via cookie
        }
      };
      checkSession();
    }
  }, [navigate]);

  // Handle URL params for violation, resetToken, and errors (including SSO)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const violation = params.get('violation');
    if (violation === 'sustained_capture') {
      setSecurityAlert('Your session was terminated due to a sustained screen capture or recording attempt. Direct screen grabbing of protected premium streams is strictly prohibited.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (violation === 'exceeded') {
      setSecurityAlert('Security violations exceeded. Session terminated.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const errorParam = params.get('error');
    if (errorParam) {
      setError(errorParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const token = params.get('resetToken');
    if (token) {
      setResetToken(token);
      apiFetch(`/student-account/password/validate/${token}`)
        .then(() => setResetTokenValid(true))
        .catch(() => setResetTokenValid(false));
    }
  }, []);

  // Sync loading state and button text with spinner support
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (submitBtn) {
      submitBtn.disabled = loading;
      if (loading) {
        submitBtn.innerHTML = resetToken 
          ? `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style="width: 1rem; height: 1rem; border-width: 0.15em;"></span>Resetting...` 
          : `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style="width: 1rem; height: 1rem; border-width: 0.15em;"></span>Signing In...`;
      } else {
        submitBtn.innerHTML = resetToken ? 'Reset Password' : 'Sign In';
      }
    }
  }, [loading, resetToken]);

  // Load remembered email if exists
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const emailInput = container.querySelector('#exampleInputEmail1') as HTMLInputElement | null;
    const rememberCheckbox = container.querySelector('#rememberMeCheckbox') as HTMLInputElement | null;
    if (emailInput) {
      const remembered = localStorage.getItem('trineo_remembered_email');
      if (remembered) {
        emailInput.value = remembered;
        if (rememberCheckbox) {
          rememberCheckbox.checked = true;
        }
      }
    }
  }, [resetToken]);

  // Render error/alert message to the DOM placeholder
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const placeholder = container.querySelector('#alert-placeholder');
    if (!placeholder) return;

    const activeMessage = error || securityAlert;
    if (activeMessage) {
      const isError = !!error;
      placeholder.innerHTML = `
        <div class="alert alert-${isError ? 'danger' : 'warning'} alert-dismissible fade show border-0 shadow-sm" role="alert" style="border-radius: 12px; font-size: 0.9rem; padding: 1rem 1.25rem;">
          <div class="d-flex align-items-start gap-2">
            <iconify-icon icon="${isError ? 'solar:danger-triangle-bold' : 'solar:bell-bing-bold'}" class="fs-5 mt-0.5 text-${isError ? 'danger' : 'warning'}"></iconify-icon>
            <div style="flex: 1; font-weight: 500;">${activeMessage}</div>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" style="top: 0.75rem; right: 0.75rem; font-size: 0.75rem;"></button>
        </div>
      `;
      // Bind event listener to manual close button in standard alert
      const closeBtn = placeholder.querySelector('.btn-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          setError('');
          setSecurityAlert(null);
        });
      }
    } else {
      placeholder.innerHTML = '';
    }
  }, [error, securityAlert]);

  // Load Vendor JS files
  useEffect(() => {
    async function loadAssets() {
      try {
        await loadScript(`${ASSET_BASE}/libs/jquery/dist/jquery.min.js`);
        await loadScript(`${ASSET_BASE}/libs/bootstrap/dist/js/bootstrap.bundle.min.js`);
        await loadScript('https://cdn.jsdelivr.net/npm/iconify-icon@1.0.8/dist/iconify-icon.min.js');
      } catch (err) {
        console.error('Failed to load libraries on login page', err);
      }
    }
    loadAssets();
  }, []);

  // Event handlers and delegation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Handle form submissions
    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;

      if (form.id === 'login-form') {
        const emailInput = form.querySelector('#exampleInputEmail1') as HTMLInputElement | null;
        const passwordInput = form.querySelector('#inputPassword') as HTMLInputElement | null;
        const rememberCheckbox = form.querySelector('#rememberMeCheckbox') as HTMLInputElement | null;
        const email = emailInput?.value || '';
        const password = passwordInput?.value || '';

        if (!email || !password) {
          setError('Please fill in all fields');
          return;
        }

        if (rememberCheckbox?.checked) {
          localStorage.setItem('trineo_remembered_email', email);
        } else {
          localStorage.removeItem('trineo_remembered_email');
        }

        setError('');
        setLoading(true);
        try {
          const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
          });

          localStorage.setItem('token', 'session_active');
          localStorage.setItem('user', JSON.stringify({
            id: data._id,
            user_id: data.user_id,
            name: data.name,
            email: data.email,
            role: data.role,
            phone: data.phone
          }));

          if (data.role === 'owner') {
            navigate('/owner');
          } else if (data.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/student');
          }
        } catch (err: any) {
          setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
          setLoading(false);
        }
      } else if (form.id === 'reset-password-form') {
        const newPasswordInput = form.querySelector('#newPasswordInput') as HTMLInputElement | null;
        const confirmPasswordInput = form.querySelector('#confirmPasswordInput') as HTMLInputElement | null;
        const newPassword = newPasswordInput?.value || '';
        const confirmPassword = confirmPasswordInput?.value || '';

        if (!newPassword || !confirmPassword) {
          setError('Please fill in all fields');
          return;
        }

        if (newPassword !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        setError('');
        setLoading(true);
        try {
          const data = await apiFetch('/student-account/password/reset', {
            method: 'POST',
            body: JSON.stringify({
              token: resetToken,
              newPassword,
              confirmPassword
            })
          });
          alert(data.message || 'Password reset successful');
          setResetToken('');
          setResetTokenValid(false);
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate('/login');
        } catch (err: any) {
          setError(err.message || 'Password reset failed');
        } finally {
          setLoading(false);
        }
      }
    };

    // Handle clicks for navigation and links
    const handleClick = async (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href], button, #password-toggle-btn, #toggle-new-password-btn, #toggle-confirm-password-btn');
      if (!target) return;

      // Handle Password Eye Toggles
      if (target.id === 'password-toggle-btn' || target.closest('#password-toggle-btn')) {
        e.preventDefault();
        const input = container.querySelector('#inputPassword') as HTMLInputElement | null;
        const icon = container.querySelector('#password-toggle-btn iconify-icon') as HTMLElement | null;
        if (input && icon) {
          if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('icon', 'solar:eye-closed-bold-duotone');
          } else {
            input.type = 'password';
            icon.setAttribute('icon', 'solar:eye-bold-duotone');
          }
        }
        return;
      }
      if (target.id === 'toggle-new-password-btn' || target.closest('#toggle-new-password-btn')) {
        e.preventDefault();
        const input = container.querySelector('#newPasswordInput') as HTMLInputElement | null;
        const icon = container.querySelector('#toggle-new-password-btn iconify-icon') as HTMLElement | null;
        if (input && icon) {
          if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('icon', 'solar:eye-closed-bold-duotone');
          } else {
            input.type = 'password';
            icon.setAttribute('icon', 'solar:eye-bold-duotone');
          }
        }
        return;
      }
      if (target.id === 'toggle-confirm-password-btn' || target.closest('#toggle-confirm-password-btn')) {
        e.preventDefault();
        const input = container.querySelector('#confirmPasswordInput') as HTMLInputElement | null;
        const icon = container.querySelector('#toggle-confirm-password-btn iconify-icon') as HTMLElement | null;
        if (input && icon) {
          if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('icon', 'solar:eye-closed-bold-duotone');
          } else {
            input.type = 'password';
            icon.setAttribute('icon', 'solar:eye-bold-duotone');
          }
        }
        return;
      }

      const anchor = target as HTMLAnchorElement;
      const href = anchor.getAttribute('href');

      // Intercept routing links
      if (href) {
        if (href === '/' || href === '/signup' || href === '/login') {
          e.preventDefault();
          navigate(href);
          return;
        }
        if (href.endsWith('.html')) {
          e.preventDefault();
          if (href.includes('index')) navigate('/');
          else if (href.includes('sign-up')) navigate('/signup');
          return;
        }
      }

      // Intercept forgot password link
      if (target.id === 'forget-password-link') {
        e.preventDefault();
        const promptEmail = window.prompt("Enter your student email address:");
        if (!promptEmail) return;

        try {
          const data = await apiFetch('/student-account/password/request-reset', {
            method: 'POST',
            body: JSON.stringify({ email: promptEmail })
          });
          if (data.resetLink) {
            alert(`Reset token generated for testing:\n${window.location.origin}${data.resetLink}`);
            navigate(data.resetLink);
          } else {
            alert(data.message || "If the account exists, a reset link has been generated.");
          }
        } catch (err: any) {
          alert(err.message || "Failed to generate password reset request.");
        }
      }
    };

    container.addEventListener('submit', handleSubmit);
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('submit', handleSubmit);
      container.removeEventListener('click', handleClick);
    };
  }, [navigate, resetToken, error, securityAlert]);

  // HTML content for login view
  const LOGIN_HTML = `
    <style>
      .auth-section {
        background: radial-gradient(circle at top left, rgba(124, 58, 237, 0.08), transparent 35%),
                    radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.06), transparent 35%),
                    linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2.5rem 1rem;
        animation: authFadeIn 0.6s ease-out;
      }
      .auth-card {
        backdrop-filter: blur(16px);
        background: rgba(255, 255, 255, 0.88);
        border: 1px solid rgba(226, 232, 240, 0.85);
        border-radius: 24px;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        animation: authCardSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        max-width: 460px;
        width: 100%;
      }
      .auth-card:hover {
        box-shadow: 0 30px 60px rgba(15, 23, 42, 0.1);
        transform: translateY(-2px);
      }
      .auth-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 0.5rem;
        display: block;
      }
      .auth-input-container {
        position: relative;
        margin-bottom: 1.25rem;
      }
      .auth-input {
        width: 100%;
        height: 3.25rem;
        padding: 0 1.25rem;
        padding-right: 3.25rem;
        border-radius: 12px;
        border: 1.5px solid #e2e8f0;
        background-color: #f8fafc;
        color: #0f172a;
        font-size: 0.95rem;
        font-weight: 500;
        transition: all 0.2s ease-in-out;
        outline: none;
      }
      .auth-input:focus {
        background-color: #ffffff;
        border-color: #7c3aed;
        box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.15);
      }
      .auth-input-icon {
        position: absolute;
        right: 1.25rem;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
        cursor: pointer;
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.15s;
        border: none;
        background: transparent;
        padding: 0;
      }
      .auth-input-icon:hover {
        color: #7c3aed;
      }
      .auth-submit-btn {
        width: 100%;
        height: 3.25rem;
        border-radius: 9999px;
        border: none;
        background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
        color: #ffffff;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        margin-top: 1.5rem;
        margin-bottom: 1.25rem;
      }
      .auth-submit-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(124, 58, 237, 0.45);
        background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      }
      .auth-submit-btn:active {
        transform: scale(0.98);
      }
      .auth-submit-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
      }
      .auth-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
      }
      .auth-checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        font-weight: 500;
        color: #475569;
        cursor: pointer;
        user-select: none;
      }
      .auth-checkbox {
        width: 1rem;
        height: 1rem;
        border-radius: 4px;
        border: 1.5px solid #cbd5e1;
        accent-color: #7c3aed;
        cursor: pointer;
      }
      .auth-link {
        font-size: 0.85rem;
        font-weight: 600;
        color: #7c3aed;
        text-decoration: none;
        transition: color 0.15s;
      }
      .auth-link:hover {
        color: #4f46e5;
        text-decoration: underline;
      }
      @keyframes authFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes authCardSlideUp {
        from {
          opacity: 0;
          transform: translateY(24px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>

    <section class="auth-section">
      <div class="auth-card">
        <div class="card-body p-5 p-sm-7">
          <div class="text-center mb-6">
            <a href="/" class="d-inline-flex align-items-center gap-2.5 text-decoration-none">
              <img src="${trineoLogoImg}" alt="Trineo Logo" width="34" height="34" class="img-fluid rounded-circle" style="object-fit: contain;">
              <span class="mb-0 fw-bold" style="font-size: 32px; font-weight: 800; letter-spacing: -1.2px; font-family: 'Manrope', sans-serif; color: #0f172a;">trineo<span class="text-primary">.</span></span>
            </a>
            <p class="text-muted mt-2 mb-0" style="font-size: 0.9rem; font-weight: 500;">Welcome back! Please sign in to your account.</p>
          </div>

          <div id="alert-placeholder"></div>

          <form id="login-form">
            <div class="auth-input-container">
              <label for="exampleInputEmail1" class="auth-label">Email Address</label>
              <input type="email" class="auth-input" id="exampleInputEmail1" placeholder="name@example.com" required>
            </div>
            
            <div class="auth-input-container">
              <label for="inputPassword" class="auth-label">Password</label>
              <input type="password" class="auth-input" id="inputPassword" placeholder="••••••••" required>
              <button type="button" class="auth-input-icon" id="password-toggle-btn" aria-label="Toggle password visibility">
                <iconify-icon icon="solar:eye-bold-duotone"></iconify-icon>
              </button>
            </div>

            <div class="auth-actions">
              <label class="auth-checkbox-label" for="rememberMeCheckbox">
                <input type="checkbox" class="auth-checkbox" id="rememberMeCheckbox">
                Remember Me
              </label>
              <a href="#" class="auth-link" id="forget-password-link">Forgot Password?</a>
            </div>

            <button type="submit" class="auth-submit-btn">
              Sign In
            </button>
          </form>

          <p class="mb-0 text-center text-muted" style="font-size: 0.875rem; font-weight: 500;">
            Not a member yet? <a class="auth-link fw-bold" href="/signup">Sign Up</a>
          </p>
        </div>
      </div>
    </section>
  `;

  // HTML content for password reset view
  const RESET_HTML = `
    <section class="auth-section">
      <div class="auth-card">
        <div class="card-body p-5 p-sm-7">
          <div class="text-center mb-6">
            <a href="/" class="d-inline-flex align-items-center gap-2.5 text-decoration-none">
              <img src="${trineoLogoImg}" alt="Trineo Logo" width="34" height="34" class="img-fluid rounded-circle" style="object-fit: contain;">
              <span class="mb-0 fw-bold" style="font-size: 32px; font-weight: 800; letter-spacing: -1.2px; font-family: 'Manrope', sans-serif; color: #0f172a;">trineo<span class="text-primary">.</span></span>
            </a>
            <h4 class="text-dark fw-bold mt-4 mb-1" style="letter-spacing: -0.5px;">Reset Password</h4>
            <p class="text-muted" style="font-size: 0.9rem;">Please enter your new password below.</p>
          </div>

          <div id="alert-placeholder"></div>

          <form id="reset-password-form">
            <div class="auth-input-container">
              <label for="newPasswordInput" class="auth-label">New Password</label>
              <input type="password" class="auth-input" id="newPasswordInput" placeholder="••••••••" required>
              <button type="button" class="auth-input-icon" id="toggle-new-password-btn" aria-label="Toggle password visibility">
                <iconify-icon icon="solar:eye-bold-duotone"></iconify-icon>
              </button>
            </div>
            
            <div class="auth-input-container">
              <label for="confirmPasswordInput" class="auth-label">Confirm Password</label>
              <input type="password" class="auth-input" id="confirmPasswordInput" placeholder="••••••••" required>
              <button type="button" class="auth-input-icon" id="toggle-confirm-password-btn" aria-label="Toggle password visibility">
                <iconify-icon icon="solar:eye-bold-duotone"></iconify-icon>
              </button>
            </div>

            <button type="submit" class="auth-submit-btn">
              Reset Password
            </button>
          </form>

          <p class="mb-0 text-center text-muted" style="font-size: 0.875rem; font-weight: 500;">
            <a class="auth-link fw-bold" href="/login">Back to Sign In</a>
          </p>
        </div>
      </div>
    </section>
  `;

  return (
    <div
      ref={containerRef}
      className="studiova-scope"
      dangerouslySetInnerHTML={{ __html: resetToken ? RESET_HTML : LOGIN_HTML }}
    />
  );
}
