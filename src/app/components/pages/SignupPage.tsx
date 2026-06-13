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

export default function SignupPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auth guard: redirect authenticated users
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
    }
  }, [navigate]);

  // Sync loading state and button text with spinner support
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (submitBtn) {
      submitBtn.disabled = loading;
      if (loading) {
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style="width: 1rem; height: 1rem; border-width: 0.15em;"></span>Creating Account...`;
      } else {
        submitBtn.innerHTML = 'Sign Up';
      }
    }
  }, [loading]);

  // Render error/alert message to the DOM placeholder
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const placeholder = container.querySelector('#alert-placeholder');
    if (!placeholder) return;

    if (error) {
      placeholder.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show border-0 shadow-sm" role="alert" style="border-radius: 12px; font-size: 0.9rem; padding: 1rem 1.25rem;">
          <div class="d-flex align-items-start gap-2">
            <iconify-icon icon="solar:danger-triangle-bold" class="fs-5 mt-0.5 text-danger"></iconify-icon>
            <div style="flex: 1; font-weight: 500;">${error}</div>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" style="top: 0.75rem; right: 0.75rem; font-size: 0.75rem;"></button>
        </div>
      `;
      // Bind event listener to manual close button
      const closeBtn = placeholder.querySelector('.btn-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          setError('');
        });
      }
    } else {
      placeholder.innerHTML = '';
    }
  }, [error]);

  // Load Vendor JS files
  useEffect(() => {
    async function loadAssets() {
      try {
        await loadScript(`${ASSET_BASE}/libs/jquery/dist/jquery.min.js`);
        await loadScript(`${ASSET_BASE}/libs/bootstrap/dist/js/bootstrap.bundle.min.js`);
        await loadScript('https://cdn.jsdelivr.net/npm/iconify-icon@1.0.8/dist/iconify-icon.min.js');
      } catch (err) {
        console.error('Failed to load libraries on signup page', err);
      }
    }
    loadAssets();
  }, []);

  // Event handlers and delegation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkPasswordStrength = (password: string) => {
      let score = 0;
      if (!password) return { score, label: '', color: 'transparent', width: '0%' };
      if (password.length >= 6) score++;
      if (password.length >= 8) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;

      let label = 'Weak';
      let color = '#ef4444'; // Red
      let width = '33%';

      if (score >= 4) {
        label = 'Strong';
        color = '#10b981'; // Green
        width = '100%';
      } else if (score >= 2) {
        label = 'Medium';
        color = '#f59e0b'; // Amber
        width = '66%';
      }

      return { score, label, color, width };
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.id === 'inputPassword') {
        const password = target.value;
        const strength = checkPasswordStrength(password);
        
        const strengthBar = container.querySelector('#password-strength-bar') as HTMLElement | null;
        const strengthText = container.querySelector('#password-strength-text') as HTMLElement | null;
        
        if (strengthBar && strengthText) {
          strengthBar.style.width = strength.width;
          strengthBar.style.backgroundColor = strength.color;
          strengthText.innerText = strength.label ? `Password strength: ${strength.label}` : '';
          strengthText.style.color = strength.color;
        }
      }
    };

    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;

      if (form.id === 'signup-form') {
        const nameInput = form.querySelector('#inputName') as HTMLInputElement | null;
        const emailInput = form.querySelector('#exampleInputEmail1') as HTMLInputElement | null;
        const phoneInput = form.querySelector('#inputPhone') as HTMLInputElement | null;
        const passwordInput = form.querySelector('#inputPassword') as HTMLInputElement | null;
        const confirmPasswordInput = form.querySelector('#inputConfirmPassword') as HTMLInputElement | null;

        const name = nameInput?.value || '';
        const email = emailInput?.value || '';
        const phone = phoneInput?.value || '';
        const password = passwordInput?.value || '';
        const confirmPassword = confirmPasswordInput?.value || '';

        if (!name || !email || !password || !confirmPassword) {
          setError('Please fill in all fields');
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        setError('');
        setLoading(true);
        try {
          const data = await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              name,
              email,
              password,
              phone,
              role: 'student'
            })
          });

          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify({
            id: data._id,
            user_id: data.user_id,
            name: data.name,
            email: data.email,
            role: data.role,
            phone: data.phone
          }));

          navigate('/student');
        } catch (err: any) {
          setError(err.message || 'Registration failed. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href], #password-toggle-btn, #confirm-password-toggle-btn');
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
      if (target.id === 'confirm-password-toggle-btn' || target.closest('#confirm-password-toggle-btn')) {
        e.preventDefault();
        const input = container.querySelector('#inputConfirmPassword') as HTMLInputElement | null;
        const icon = container.querySelector('#confirm-password-toggle-btn iconify-icon') as HTMLElement | null;
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

      if (href) {
        if (href === '/' || href === '/login' || href === '/signup') {
          e.preventDefault();
          navigate(href);
          return;
        }
        if (href.endsWith('.html')) {
          e.preventDefault();
          if (href.includes('index')) navigate('/');
          else if (href.includes('sign-in')) navigate('/login');
          return;
        }
      }
    };

    container.addEventListener('submit', handleSubmit);
    container.addEventListener('click', handleClick);
    container.addEventListener('input', handleInput);

    return () => {
      container.removeEventListener('submit', handleSubmit);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('input', handleInput);
    };
  }, [navigate, error]);

  const SIGNUP_HTML = `
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
        max-width: 480px;
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
      .auth-input-with-icon {
        padding-right: 3.25rem;
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
      .strength-meter-container {
        height: 4px;
        width: 100%;
        background-color: #e2e8f0;
        border-radius: 2px;
        margin-top: 0.5rem;
        overflow: hidden;
      }
      .strength-meter-bar {
        height: 100%;
        width: 0%;
        background-color: transparent;
        transition: all 0.3s ease;
      }
      .strength-text {
        font-size: 0.75rem;
        font-weight: 600;
        margin-top: 0.25rem;
        display: block;
        height: 1rem;
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
            <p class="text-muted mt-2 mb-0" style="font-size: 0.9rem; font-weight: 500;">Create your account to start learning today.</p>
          </div>

          <div id="alert-placeholder"></div>

          <form id="signup-form">
            <div class="auth-input-container">
              <label for="inputName" class="auth-label">Full Name</label>
              <input type="text" class="auth-input" id="inputName" placeholder="John Doe" required>
            </div>

            <div class="auth-input-container">
              <label for="exampleInputEmail1" class="auth-label">Email Address</label>
              <input type="email" class="auth-input" id="exampleInputEmail1" placeholder="name@example.com" required>
            </div>

            <div class="auth-input-container">
              <label for="inputPhone" class="auth-label">Phone Number</label>
              <input type="tel" class="auth-input" id="inputPhone" placeholder="+1 (555) 000-0000">
            </div>
            
            <div class="auth-input-container">
              <label for="inputPassword" class="auth-label">Password</label>
              <input type="password" class="auth-input auth-input-with-icon" id="inputPassword" placeholder="••••••••" required>
              <button type="button" class="auth-input-icon" id="password-toggle-btn" aria-label="Toggle password visibility">
                <iconify-icon icon="solar:eye-bold-duotone"></iconify-icon>
              </button>
              <div class="strength-meter-container">
                <div class="strength-meter-bar" id="password-strength-bar"></div>
              </div>
              <span class="strength-text" id="password-strength-text"></span>
            </div>

            <div class="auth-input-container">
              <label for="inputConfirmPassword" class="auth-label">Confirm Password</label>
              <input type="password" class="auth-input auth-input-with-icon" id="inputConfirmPassword" placeholder="••••••••" required>
              <button type="button" class="auth-input-icon" id="confirm-password-toggle-btn" aria-label="Toggle password visibility">
                <iconify-icon icon="solar:eye-bold-duotone"></iconify-icon>
              </button>
            </div>

            <p class="text-center text-muted mb-4" style="font-size: 0.8rem; font-weight: 500; line-height: 1.4;">
              By creating an account, you agree with our <a class="auth-link fw-semibold" href="/privacy">Privacy Policy</a> and <a class="auth-link fw-semibold" href="/terms">Terms of Service</a>.
            </p>

            <button type="submit" class="auth-submit-btn">
              Sign Up
            </button>
          </form>

          <p class="mb-0 text-center text-muted" style="font-size: 0.875rem; font-weight: 500;">
            Already have an account? <a class="auth-link fw-bold" href="/login">Sign In</a>
          </p>
        </div>
      </div>
    </section>
  `;

  return (
    <div
      ref={containerRef}
      className="studiova-scope"
      dangerouslySetInnerHTML={{ __html: SIGNUP_HTML }}
    />
  );
}
