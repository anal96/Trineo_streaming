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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-slate-200/50 dark:border-zinc-800/50 pb-[env(safe-area-inset-bottom)] h-[72px] shadow-[0_-4px_24px_rgba(0,0,0,0.04)] no-select">
      <div className="flex items-center justify-around h-full px-2 max-w-full">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item)}
              className={`flex flex-col items-center justify-center gap-1 min-h-[48px] min-w-[56px] px-3 py-1 rounded-xl transition-all duration-200 touch-btn ${
                active 
                  ? 'text-primary dark:text-violet-400 scale-105 font-semibold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                {item.id === 'notifications' && unreadCount !== undefined && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white leading-none">
                    {unreadCount}
                  </span>
                )}
                {item.id === 'settings' && violationCount !== undefined && violationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                )}
              </div>
              <span className="text-[10px] tracking-wide">
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
  { icon: Bell, label: 'Notifications', path: '/student?tab=notifications', id: 'notifications' },
  { icon: Download, label: 'Resources', path: '/student?tab=materials', id: 'materials' },
  { icon: User, label: 'Me', path: '/student?tab=settings', id: 'settings' },
];
