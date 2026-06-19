import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from './ui/button';

export function ThemeToggleButton({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={className} aria-label="Toggle theme">
        <Moon className="w-5 h-5" />
      </Button>
    );
  }

  const isDark = theme !== 'light';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
    </Button>
  );
}

export function ThemeToggle() {
  const { pathname } = useLocation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hideFloating =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/student') ||
    pathname.startsWith('/watch') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/course') ||
    pathname.startsWith('/program') ||
    pathname === '/owner';

  if (!mounted || hideFloating) return null;

  const isDark = theme !== 'light';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="fixed bottom-5 right-5 z-[80] flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3.5 py-2 text-xs font-semibold text-foreground shadow-lg shadow-black/10 backdrop-blur-xl transition-all hover:border-primary/40 hover:text-primary"
    >
      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
      <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  );
}
