import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ShieldAlert, Lock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../../utils/api';

export default function SecurityLockPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason') || 'exceeded';
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    // Clear session tokens to prevent bypass
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('trineo_violation_count');
    localStorage.removeItem('trineo_security_lock_until');
    localStorage.removeItem('trineo_lock_requires_manual_resume');

    // Clear sessionStorage
    sessionStorage.clear();

    // Call logout endpoint to invalidate session
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});

    // Trigger entry animation
    requestAnimationFrame(() => setAnimateIn(true));
  }, []);

  const isAccountLocked = reason === 'locked';

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a1e 30%, #0f0a1a 60%, #0a0a0f 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Animated background particles */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${120 + i * 60}px`,
              height: `${120 + i * 60}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${i % 2 === 0 ? 'rgba(239,68,68,0.06)' : 'rgba(168,85,247,0.05)'} 0%, transparent 70%)`,
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `securityFloat${i % 3} ${8 + i * 2}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes securityFloat0 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -30px) scale(1.1); }
        }
        @keyframes securityFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-15px, 25px) scale(0.95); }
        }
        @keyframes securityFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(25px, 15px) scale(1.05); }
        }
        @keyframes shieldPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3), 0 0 60px rgba(239,68,68,0.1); }
          50% { box-shadow: 0 0 0 12px rgba(239,68,68,0), 0 0 80px rgba(239,68,68,0.15); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lockSpin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
      `}</style>

      <div
        style={{
          maxWidth: '480px',
          width: '90%',
          textAlign: 'center',
          padding: '48px 36px',
          borderRadius: '24px',
          background: 'rgba(15, 15, 25, 0.85)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 120px rgba(239,68,68,0.08)',
          opacity: animateIn ? 1 : 0,
          transform: animateIn ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Shield Icon */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '28px',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
            border: '2px solid rgba(239,68,68,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'shieldPulse 2.5s ease-in-out infinite',
            position: 'relative',
          }}>
            {isAccountLocked ? (
              <Lock style={{ width: '36px', height: '36px', color: '#ef4444' }} />
            ) : (
              <ShieldAlert style={{ width: '36px', height: '36px', color: '#ef4444' }} />
            )}
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '1.65rem',
          fontWeight: 800,
          color: '#ef4444',
          margin: '0 0 8px 0',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        }}>
          {isAccountLocked ? '🔒 Account Security Lock' : '🚫 Session Terminated'}
        </h1>

        <p style={{
          fontSize: '0.9rem',
          color: 'rgba(255,255,255,0.5)',
          margin: '0 0 28px 0',
          lineHeight: 1.6,
        }}>
          {isAccountLocked
            ? 'Your account has been locked due to repeated content protection violations.'
            : 'Repeated screen-capture violations detected. Your session has been terminated.'}
        </p>

        {/* Violation Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          borderRadius: '100px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          marginBottom: '28px',
        }}>
          <AlertTriangle style={{ width: '14px', height: '14px', color: '#ef4444' }} />
          <span style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#f87171',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            {isAccountLocked ? 'Account Permanently Locked' : 'Violation Count: 3 of 3'}
          </span>
        </div>

        {/* Info Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '28px',
          textAlign: 'left',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '14px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Lock style={{ width: '14px', height: '14px', color: '#a855f7' }} />
            </div>
            <span style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.8)',
            }}>
              Content Protection Policy
            </span>
          </div>
          <p style={{
            fontSize: '0.78rem',
            color: 'rgba(255,255,255,0.4)',
            margin: 0,
            lineHeight: 1.7,
          }}>
            For content protection, screen capture, recording, and unauthorized
            sharing tools are strictly prohibited. Multiple violations result in
            automatic session termination and account review.
          </p>
        </div>

        {/* Contact Info */}
        <p style={{
          fontSize: '0.78rem',
          color: 'rgba(255,255,255,0.35)',
          margin: '0 0 24px 0',
          lineHeight: 1.6,
        }}>
          If you believe this is an error, please contact your institute administrator for assistance.
        </p>

        {/* Return Button */}
        <button
          onClick={() => navigate('/login')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 28px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: '#fff',
            fontSize: '0.88rem',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(124, 58, 237, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 58, 237, 0.3)';
          }}
        >
          <ArrowLeft style={{ width: '16px', height: '16px' }} />
          Return to Login
        </button>
      </div>
    </div>
  );
}
