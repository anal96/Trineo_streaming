import { useNavigate, useLocation } from 'react-router';
import { Home, BookOpen, Bell, Download, User } from 'lucide-react';

interface MobileNavProps {
  items: Array<{
    icon: any;
    label: string;
    path: string;
    id: string;
  }>;
  onItemClick?: (id: string) => void;
  unreadCount?: number;
  violationCount?: number;
}

export function MobileNav({ items, onItemClick, unreadCount, violationCount }: MobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (item: (typeof items)[0]) => {
    if (item.path) {
      navigate(item.path);
      if (item.path.startsWith('/student') && onItemClick) {
        onItemClick(item.id);
      }
    } else if (onItemClick) {
      onItemClick(item.id);
    }
  };

  const isActive = (item: (typeof items)[0]) => {
    if (item.id === 'courses') {
      return location.pathname === '/student/courses';
    }
    if (location.pathname === '/student') {
      const params = new URLSearchParams(location.search);
      const currentTab = params.get('tab') || 'home';
      return currentTab === item.id;
    }
    return false;
  };

  return (
    <nav 
      className="lg:hidden fixed left-3 right-3 z-[999] rounded-[9999px] h-[64px] no-select border"
      style={{
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        background: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
      }}
    >
      <div className="flex items-center justify-around h-full px-3 max-w-full">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item)}
              className="relative flex flex-col items-center justify-center transition-all duration-300 active:scale-95 touch-btn"
              style={{ minWidth: '60px' }}
            >
              <div 
                className={`flex items-center justify-center transition-all duration-300 relative ${
                  active 
                    ? 'w-10 h-10 rounded-full text-white scale-110 shadow-[0_4px_16px_rgba(79,70,229,0.4)]' 
                    : 'w-8 h-8 rounded-full text-slate-500/70 dark:text-zinc-400/60'
                }`}
                style={{
                  background: active ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'transparent',
                }}
              >
                <Icon className={`w-[18px] h-[18px] transition-all duration-300 ${active ? 'stroke-[2.5px]' : 'stroke-[2px] opacity-75'}`} />
                
                {/* Badges */}
                {item.id === 'notifications' && unreadCount !== undefined && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white leading-none shadow-md">
                    {unreadCount}
                  </span>
                )}
                {item.id === 'settings' && violationCount !== undefined && violationCount > 0 && (
                  <span className="absolute top-0 right-0 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white/10 dark:ring-black/20 animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] tracking-wide mt-0.5 transition-all duration-300 ${
                active 
                  ? 'text-primary dark:text-violet-400 font-semibold scale-105' 
                  : 'text-slate-500 dark:text-zinc-400'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export const studentNavItems = [
  { icon: Home, label: 'Home', path: '/student?tab=home', id: 'home' },
  { icon: BookOpen, label: 'Courses', path: '/student/courses', id: 'courses' },
  { icon: Download, label: 'Resources', path: '/student?tab=materials', id: 'materials' },
  { icon: User, label: 'Profile', path: '/student?tab=settings', id: 'settings' },
];
