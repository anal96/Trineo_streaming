import { useState } from 'react';
import { useNavigate } from 'react-router';
import { apiFetch } from '../../utils/api';
import trineoLogoImg from '@/images/trineoStream-1.png';
import { KeyRound, ShieldAlert, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch('/student-account/password/change', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      // Update cached user structure
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        try {
          const user = JSON.parse(cachedUser);
          user.mustChangePassword = false;
          localStorage.setItem('user', JSON.stringify(user));
        } catch (err) {
          console.error('Error updating cached user', err);
        }
      }

      setSuccess(res.message || 'Password changed successfully!');
      setTimeout(() => {
        navigate('/student');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-radial from-slate-900 via-slate-950 to-black px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <img src={trineoLogoImg} alt="Trineo Stream Logo" className="h-12 w-auto object-contain mb-4" />
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Change Your Password
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            For security reasons, you must set a new password before continuing.
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 shadow-2xl rounded-2xl p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
              <ShieldAlert className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Current Temporary Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none transition duration-200 pr-10 text-white placeholder-slate-600"
                  placeholder="Enter temporary password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition duration-150 cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none transition duration-200 pr-10 text-white placeholder-slate-600"
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition duration-150 cursor-pointer"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none transition duration-200 pr-10 text-white placeholder-slate-600"
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition duration-150 cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-blue-800 disabled:to-indigo-800 text-white font-semibold rounded-xl px-4 py-3.5 text-sm transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg shadow-blue-500/20 active:translate-y-0 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Save and Continue
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
