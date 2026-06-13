import { ReactNode, useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';

export type PanelNavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function PanelDrawerNav({
  title,
  subtitle,
  items,
  activeId,
  onSelect,
  footer,
}: {
  title: string;
  subtitle?: string;
  items: PanelNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  footer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden h-11 w-11 shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100vw-2rem,320px)] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border text-left">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
          )}
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 min-h-11 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/15 text-foreground border border-primary/30'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>
        {footer && <div className="p-3 border-t border-border">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}
