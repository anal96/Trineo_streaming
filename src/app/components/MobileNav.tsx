import { useNavigate, useLocation } from 'react-router';
import { Home, BookOpen, FileText, Users, ShieldCheck, MoreHorizontal, Video, Key } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';

interface MobileNavProps {
  items: Array<{
    icon: any;
    label: string;
    path: string;
    id: string;
  }>;
  onItemClick?: (id: string) => void;
}

export function MobileNav({ items, onItemClick }: MobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = items.slice(0, 4);
  const overflow = items.slice(4);

  const handleClick = (item: (typeof items)[0]) => {
    if (item.path) {
      navigate(item.path);
      if (item.path.startsWith('/student') && onItemClick) {
        onItemClick(item.id);
      }
    } else if (onItemClick) {
      onItemClick(item.id);
    }
    setMoreOpen(false);
  };

  const isActive = (item: (typeof items)[0]) => {
    if (item.path) {
      if (item.id === 'courses') {
        return location.pathname === '/student/courses';
      }
      if (location.pathname === '/student') {
        const params = new URLSearchParams(location.search);
        const currentTab = params.get('tab') || 'home';
        return currentTab === item.id;
      }
    }
    return false;
  };

  const renderItem = (item: (typeof items)[0], inSheet = false) => {
    const Icon = item.icon;
    const active = isActive(item);
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleClick(item)}
        className={`flex flex-col items-center justify-center gap-1 min-h-11 min-w-[4.5rem] px-2 py-2 rounded-xl transition-all ${
          inSheet ? 'w-full flex-row justify-start gap-3 px-4' : ''
        } ${
          active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className={`text-xs font-medium ${inSheet ? 'text-sm' : 'max-w-[4.5rem] truncate'}`}>
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="flex items-center justify-around min-h-[4rem] px-1 max-w-full">
        {primary.map((item) => renderItem(item))}
        {overflow.length > 0 && (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex flex-col items-center justify-center gap-1 min-h-11 min-w-[4.5rem] px-2 py-2 rounded-xl text-muted-foreground hover:text-foreground"
                aria-label="More navigation"
              >
                <MoreHorizontal className="w-5 h-5" />
                <span className="text-xs font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-safe-nav">
              <SheetHeader>
                <SheetTitle className="text-left text-base">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 py-2">
                {overflow.map((item) => renderItem(item, true))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}

export const studentNavItems = [
  { icon: Home, label: 'Home', path: '/student?tab=home', id: 'home' },
  { icon: BookOpen, label: 'My Batches', path: '/student/courses', id: 'courses' },
  { icon: Video, label: 'Live Classes', path: '/student?tab=live-classes', id: 'live-classes' },
  { icon: FileText, label: 'Materials', path: '/student?tab=materials', id: 'materials' },
  { icon: Key, label: 'Access', path: '/student?tab=access', id: 'access' },
  { icon: Users, label: 'Faculty', path: '/student?tab=faculty', id: 'faculty' },
  { icon: ShieldCheck, label: 'Security', path: '/student?tab=security', id: 'security' },
];
