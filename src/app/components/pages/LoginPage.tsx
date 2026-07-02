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

  const [lastInstitute, setLastInstitute] = useState(() => localStorage.getItem('trineo_last_institute') || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState('');
  const [resetTokenValid, setResetTokenValid] = useState(false);

  const diagToken = localStorage.getItem('token');
  const diagUserStr = localStorage.getItem('user');
  let diagCurrentUser = null;
  try { diagCurrentUser = diagUserStr ? JSON.parse(diagUserStr) : null; } catch (_) {}
  console.log("AUTH TOKEN", diagToken);
  console.log("CURRENT USER", diagCurrentUser);
  console.log("FORCE LOGOUT", false);
  console.log("ACCOUNT LOCKED", false);

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
            if (freshUser.institute?.name) {
              localStorage.setItem('trineo_last_institute', freshUser.institute.name);
              setLastInstitute(freshUser.institute.name);
            }
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
      setSecurityAlert(`
        <div class="p-4 border border-danger/30 bg-danger-subtle rounded-4 text-center mb-4 shadow-sm relative">
          <button type="button" class="btn-close position-absolute" data-bs-dismiss="alert" aria-label="Close" style="top: 1rem; right: 1rem; font-size: 0.75rem; border: none; background: transparent;"></button>
          <div class="d-flex justify-content-center mb-3">
            <div class="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
              <iconify-icon icon="solar:shield-warning-bold-duotone" class="fs-1"></iconify-icon>
            </div>
          </div>
          <h4 class="text-danger fw-black mb-1" style="font-size: 1.1rem; letter-spacing: -0.5px;">🚫 Account Security Lock</h4>
          <div class="badge bg-danger text-white mb-2 px-2.5 py-1 text-[10px] uppercase font-bold">Attempt 3 of 3</div>
          <p class="text-secondary text-xs mb-3" style="line-height: 1.5;">Your session has been terminated due to repeated screen capture attempts.</p>
          <div class="text-[10px] text-muted font-semibold" style="line-height: 1.4;">Please contact your institute administrator if you believe this is an error.</div>
        </div>
      `);
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
      if (activeMessage.trim().startsWith('<div')) {
        placeholder.innerHTML = activeMessage;
      } else {
        placeholder.innerHTML = `
          <div class="alert alert-${isError ? 'danger' : 'warning'} alert-dismissible fade show border-0 shadow-sm" role="alert" style="border-radius: 12px; font-size: 0.9rem; padding: 1rem 1.25rem;">
            <div class="d-flex align-items-start gap-2">
              <iconify-icon icon="${isError ? 'solar:danger-triangle-bold' : 'solar:bell-bing-bold'}" class="fs-5 mt-0.5 text-${isError ? 'danger' : 'warning'}"></iconify-icon>
              <div style="flex: 1; font-weight: 500;">${activeMessage}</div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" style="top: 0.75rem; right: 0.75rem; font-size: 0.75rem;"></button>
          </div>
        `;
      }
      
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
        console.log('Student login started');
        try {
          const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
          });

          console.log('Student login successful');

          localStorage.setItem('token', 'session_active');
          localStorage.setItem('user', JSON.stringify({
            id: data._id,
            user_id: data.user_id,
            name: data.name,
            email: data.email,
            role: data.role,
            phone: data.phone,
            institute: data.institute
          }));

          if (data.institute?.name) {
            localStorage.setItem('trineo_last_institute', data.institute.name);
            setLastInstitute(data.institute.name);
          }

          const win = window as any;
          if (win.AndroidApp && typeof win.AndroidApp.onLoginSuccess === "function") {
            console.log('Calling Android native bridge');
            console.log("[Android] Calling native login bridge...");
            win.AndroidApp.onLoginSuccess();
            console.log('Android bridge invoked');
          } else {
            console.log('Android bridge not available (Web Browser)');
          }

          if (data.role === 'owner') {
            navigate('/owner');
          } else if (data.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/student');
          }
        } catch (err: any) {
          setError(err.message || 'Login failed. Please check your credentials.');
          if (err.message && (err.message.toLowerCase().includes('locked') || err.message.toLowerCase().includes('violation'))) {
            navigate('/security-lock?reason=locked');
          }
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

        // Use a proper inline prompt modal instead of window.prompt
        const existingModal = container.querySelector('#forgot-password-modal');
        if (existingModal) { existingModal.remove(); return; }

        const modal = document.createElement('div');
        modal.id = 'forgot-password-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
        modal.innerHTML = `
          <div style="background:#1a1030;border:1px solid rgba(139,92,246,0.3);border-radius:20px;padding:36px;width:100%;max-width:420px;box-shadow:0 24px 60px rgba(0,0,0,0.5);">
            <h3 style="color:#fff;font-size:18px;font-weight:700;margin:0 0 8px;">Forgot Password?</h3>
            <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 24px;line-height:1.6;">Enter your registered student email address and we'll send you a secure reset link.</p>
            <div id="forgot-success-msg" style="display:none;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:10px;padding:14px 16px;margin-bottom:16px;">
              <p style="color:#4ade80;font-size:13px;font-weight:600;margin:0;">✅ Reset email sent!</p>
              <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:4px 0 0;">Check your inbox for the reset link. It will expire in 30 minutes.</p>
            </div>
            <div id="forgot-form-wrap">
              <input id="forgot-email-input" type="email" placeholder="your@email.com" autocomplete="email"
                style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(139,92,246,0.25);border-radius:10px;padding:12px 16px;color:#fff;font-size:14px;margin-bottom:12px;box-sizing:border-box;outline:none;" />
              <div id="forgot-error" style="color:#f87171;font-size:12px;margin-bottom:10px;display:none;"></div>
              <button id="forgot-submit-btn" type="button"
                style="width:100%;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:10px;">
                Send Reset Link
              </button>
            </div>
            <button id="forgot-close-btn" type="button"
              style="width:100%;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.5);border:none;border-radius:10px;padding:11px;font-size:13px;cursor:pointer;">
              Cancel
            </button>
          </div>`;
        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        modal.querySelector('#forgot-close-btn')!.addEventListener('click', closeModal);
        modal.addEventListener('click', (ev) => { if (ev.target === modal) closeModal(); });

        const submitBtn = modal.querySelector('#forgot-submit-btn') as HTMLButtonElement;
        const emailInput = modal.querySelector('#forgot-email-input') as HTMLInputElement;
        const errorDiv = modal.querySelector('#forgot-error') as HTMLElement;
        const successDiv = modal.querySelector('#forgot-success-msg') as HTMLElement;
        const formWrap = modal.querySelector('#forgot-form-wrap') as HTMLElement;

        submitBtn.addEventListener('click', async () => {
          const email = emailInput.value.trim();
          if (!email) {
            errorDiv.textContent = 'Please enter your email address.';
            errorDiv.style.display = 'block';
            return;
          }
          errorDiv.style.display = 'none';
          submitBtn.disabled = true;
          submitBtn.textContent = 'Sending…';
          try {
            await apiFetch('/student-account/password/request-reset', {
              method: 'POST',
              body: JSON.stringify({ email })
            });
            formWrap.style.display = 'none';
            successDiv.style.display = 'block';
            setTimeout(closeModal, 4000);
          } catch (err: any) {
            errorDiv.textContent = err.message || 'Failed to send reset email.';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Reset Link';
          }
        });
        return;
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
        background: radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.04), transparent 45%),
                    radial-gradient(circle at 90% 80%, rgba(124, 58, 237, 0.04), transparent 45%),
                    linear-gradient(135deg, #f5f7ff 0%, #fcfcff 100%);
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2.5rem 1rem;
        position: relative;
        overflow: hidden;
        font-family: 'Outfit', 'Inter', sans-serif;
      }
      .bg-blob {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        z-index: 0;
        pointer-events: none;
      }
      .blob-1 {
        width: 250px;
        height: 250px;
        background: rgba(99, 102, 241, 0.15);
        top: 20%;
        left: 5%;
      }
      .blob-2 {
        width: 300px;
        height: 300px;
        background: rgba(124, 58, 237, 0.12);
        bottom: 15%;
        right: 5%;
      }
      .auth-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border: 1.5px solid rgba(226, 232, 240, 0.8);
        border-radius: 32px;
        box-shadow: 0 24px 64px rgba(99, 102, 241, 0.05), 0 8px 24px rgba(99, 102, 241, 0.01);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        width: 100%;
        max-width: 440px;
        z-index: 10;
        overflow: hidden;
      }
      .auth-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 32px 80px rgba(99, 102, 241, 0.08);
      }
      .auth-label {
        font-size: 0.825rem;
        font-weight: 700;
        color: #334155;
        margin-bottom: 0.4rem;
        display: block;
      }
      .auth-input-container {
        position: relative;
        margin-bottom: 1.25rem;
      }
      .auth-input {
        width: 100%;
        height: 3.25rem;
        padding-left: 3rem;
        padding-right: 3rem;
        border-radius: 16px;
        border: 1.5px solid #eef0f6;
        background-color: #f4f5fc;
        color: #0f172a;
        font-size: 0.95rem;
        font-weight: 600;
        transition: all 0.25s ease-in-out;
        outline: none;
      }
      .auth-input:focus {
        background-color: #ffffff;
        border-color: #4f46e5;
        box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12);
      }
      .auth-input::placeholder {
        color: #94a3b8;
        font-weight: 500;
      }
      .auth-prefix-icon {
        position: absolute;
        left: 1.15rem;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
        font-size: 1.2rem;
        pointer-events: none;
        display: flex;
        align-items: center;
      }
      .auth-input-icon {
        position: absolute;
        right: 1.15rem;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
        cursor: pointer;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        border: none;
        background: transparent;
        padding: 0;
        transition: color 0.2s;
      }
      .auth-input-icon:hover {
        color: #4f46e5;
      }
      .auth-submit-btn {
        width: 100%;
        height: 3.25rem;
        border-radius: 16px;
        border: none;
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        color: #ffffff;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        box-shadow: 0 8px 24px rgba(99, 102, 241, 0.25);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        margin-top: 1.5rem;
        margin-bottom: 1.25rem;
      }
      .auth-submit-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 28px rgba(99, 102, 241, 0.35);
        background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
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
        font-weight: 600;
        color: #475569;
        cursor: pointer;
        user-select: none;
      }
      .auth-checkbox {
        width: 1rem;
        height: 1rem;
        border-radius: 6px;
        border: 1.5px solid #cbd5e1;
        accent-color: #4f46e5;
        cursor: pointer;
      }
      .auth-link {
        font-size: 0.85rem;
        font-weight: 700;
        color: #4f46e5;
        text-decoration: none;
        transition: color 0.2s;
      }
      .auth-link:hover {
        color: #3730a3;
        text-decoration: underline;
      }
      .sso-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-top: 1rem;
      }
      .sso-btn {
        flex: 1;
        height: 3.25rem;
        border-radius: 16px;
        border: 1.5px solid #eef0f6;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .sso-btn:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        transform: translateY(-1px);
      }
      .divider-container {
        display: flex;
        align-items: center;
        color: #94a3b8;
        font-size: 0.8rem;
        font-weight: 600;
        margin: 1.5rem 0;
      }
      .divider-line {
        flex: 1;
        height: 1px;
        background: #e2e8f0;
      }
      .divider-text {
        padding: 0 0.75rem;
      }
      .footer-info {
        text-align: center;
        margin-top: 2rem;
        color: #94a3b8;
        font-size: 0.75rem;
        font-weight: 600;
        z-index: 10;
      }
      @keyframes authFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    </style>

    <section class="auth-section">
      <div class="bg-blob blob-1"></div>
      <div class="bg-blob blob-2"></div>

      <div class="auth-card">
        <div class="card-body p-5 p-sm-6">
          <div class="text-center mb-5">
            <a href="/" class="d-inline-flex align-items-center gap-2.5 text-decoration-none justify-content-center">
              <img src="${trineoLogoImg}" alt="Trineo Logo" width="36" height="36" class="img-fluid rounded-xl" style="object-fit: contain;">
              <span class="mb-0 fw-bold" style="font-size: 28px; font-weight: 900; letter-spacing: -1px; font-family: 'Outfit', sans-serif; color: #0f172a;">Trineo<span style="color: #4f46e5;">Stream</span></span>
            </a>
            <div style="display:inline-flex; align-items:center; background:#eef2ff; color:#4f46e5; border-radius:9999px; padding:6px 16px; font-size:11px; font-weight:750; margin-top:12px; font-family:'Manrope', sans-serif;">Learning Platform by Trineo Stream</div>
            <h2 class="text-dark fw-bold mt-4 mb-1" style="font-size: 24px; font-weight: 800; letter-spacing: -0.75px; color: #0f172a;">
              ${lastInstitute ? `Welcome back to ${lastInstitute}` : 'Welcome Back!'}
            </h2>
            <p class="text-muted mt-1 mb-0" style="font-size: 13px; font-weight: 500; color: #64748b;">Sign in to continue your learning journey</p>
          </div>

          <div id="alert-placeholder"></div>

          <form id="login-form" onsubmit="event.preventDefault();">
            <div class="auth-input-container">
              <label for="exampleInputEmail1" class="auth-label">Email Address</label>
              <div style="position: relative; width: 100%;">
                <iconify-icon icon="solar:letter-bold" class="auth-prefix-icon"></iconify-icon>
                <input type="email" class="auth-input" id="exampleInputEmail1" placeholder="admin@institute.com" required autocomplete="email">
                <iconify-icon icon="solar:check-circle-bold" class="position-absolute text-success" style="right: 1.15rem; top: 50%; transform: translateY(-50%); font-size: 1.25rem; pointer-events: none;"></iconify-icon>
              </div>
            </div>
            
            <div class="auth-input-container">
              <label for="inputPassword" class="auth-label">Password</label>
              <div style="position: relative; width: 100%;">
                <iconify-icon icon="solar:lock-password-unlocked-bold" class="auth-prefix-icon"></iconify-icon>
                <input type="password" class="auth-input" id="inputPassword" placeholder="••••••••" required autocomplete="current-password">
                <button type="button" class="auth-input-icon" id="password-toggle-btn" aria-label="Toggle password visibility">
                  <iconify-icon icon="solar:eye-bold-duotone"></iconify-icon>
                </button>
              </div>
            </div>

            <div class="auth-actions">
              <label class="auth-checkbox-label" for="rememberMeCheckbox">
                <input type="checkbox" class="auth-checkbox" id="rememberMeCheckbox">
                Remember Me
              </label>
              <a href="#" class="auth-link" id="forget-password-link">Forgot Password?</a>
            </div>

            <button type="submit" class="auth-submit-btn">
              <span>Sign In</span>
              <iconify-icon icon="solar:arrow-right-bold" style="font-size: 1.15rem; margin-top: 1px;"></iconify-icon>
            </button>
          </form>





        </div>
      </div>

      <div class="footer-info">
        <div style="display:flex; align-items:center; justify-content:center; gap:0.4rem; color: #475569; font-weight:700;">
          <iconify-icon icon="solar:shield-check-bold" style="font-size: 1.15rem; color:#4f46e5;"></iconify-icon>
          <span>Secure • Private • Trusted</span>
        </div>
        <p style="margin-top: 6px; margin-bottom: 0; color: #94a3b8; font-weight:550;">Your learning, our priority.</p>
      </div>
    </section>
  `;

  // HTML content for password reset view
  const RESET_HTML = `
    <section class="auth-section">
      <div class="bg-blob blob-1"></div>
      <div class="bg-blob blob-2"></div>

      <div class="auth-card">
        <div class="card-body p-5 p-sm-6">
          <div class="text-center mb-5">
            <a href="/" class="d-inline-flex align-items-center gap-2.5 text-decoration-none justify-content-center">
              <img src="${trineoLogoImg}" alt="Trineo Logo" width="36" height="36" class="img-fluid rounded-xl" style="object-fit: contain;">
              <span class="mb-0 fw-bold" style="font-size: 28px; font-weight: 900; letter-spacing: -1px; font-family: 'Outfit', sans-serif; color: #0f172a;">Trineo<span style="color: #4f46e5;">Stream</span></span>
            </a>
            <h4 class="text-dark fw-bold mt-4 mb-1" style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Reset Password</h4>
            <p class="text-muted" style="font-size: 0.9rem; font-weight: 500; color: #64748b;">Please enter your new password below.</p>
          </div>

          <div id="alert-placeholder"></div>

          <form id="reset-password-form" onsubmit="event.preventDefault();">
            <div class="auth-input-container">
              <label for="newPasswordInput" class="auth-label">New Password</label>
              <div style="position: relative; width: 100%;">
                <iconify-icon icon="solar:lock-password-unlocked-bold" class="auth-prefix-icon"></iconify-icon>
                <input type="password" class="auth-input" id="newPasswordInput" placeholder="••••••••" required autocomplete="new-password">
                <button type="button" class="auth-input-icon" id="toggle-new-password-btn" aria-label="Toggle password visibility">
                  <iconify-icon icon="solar:eye-bold-duotone"></iconify-icon>
                </button>
              </div>
            </div>
            
            <div class="auth-input-container">
              <label for="confirmPasswordInput" class="auth-label">Confirm Password</label>
              <div style="position: relative; width: 100%;">
                <iconify-icon icon="solar:lock-password-unlocked-bold" class="auth-prefix-icon"></iconify-icon>
                <input type="password" class="auth-input" id="confirmPasswordInput" placeholder="••••••••" required autocomplete="new-password">
                <button type="button" class="auth-input-icon" id="toggle-confirm-password-btn" aria-label="Toggle password visibility">
                  <iconify-icon icon="solar:eye-bold-duotone"></iconify-icon>
                </button>
              </div>
            </div>

            <button type="submit" class="auth-submit-btn">
              Reset Password
            </button>
          </form>

          <p class="mb-0 text-center text-muted" style="font-size: 0.875rem; font-weight: 550;">
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
