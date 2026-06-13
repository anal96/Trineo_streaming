import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

export function BrandingManager() {
  const location = useLocation();
  const lastUserStrRef = useRef<string | null>(null);

  useEffect(() => {
    const checkAndApplyBranding = () => {
      const cachedUser = localStorage.getItem('user');
      if (cachedUser === lastUserStrRef.current) return;
      lastUserStrRef.current = cachedUser;

      if (!cachedUser) {
        // Clear properties on public/logged-out pages
        document.documentElement.style.removeProperty('--primary');
        document.documentElement.style.removeProperty('--sidebar-primary');
        document.documentElement.style.removeProperty('--ring');
        document.documentElement.style.removeProperty('--sidebar-ring');
        
        if (location.pathname === '/' || location.pathname === '/login') {
          document.title = 'Trineo Stream';
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (link) {
            link.href = '/src/images/trineoStream-1.png';
          }
        }
        return;
      }

      try {
        const user = JSON.parse(cachedUser);
        if (user?.institute) {
          const brandColor = user.institute.theme?.brandColor || '#7c3aed';
          
          document.documentElement.style.setProperty('--primary', brandColor);
          document.documentElement.style.setProperty('--sidebar-primary', brandColor);
          document.documentElement.style.setProperty('--ring', brandColor);
          document.documentElement.style.setProperty('--sidebar-ring', brandColor);

          // Update favicon and title for student/admin/watch portals
          const isStudentPortal = location.pathname.startsWith('/student');
          const isAdminPortal = location.pathname.startsWith('/admin');
          const isWatchPage = location.pathname.startsWith('/watch');

          if (isStudentPortal || isAdminPortal || isWatchPage) {
            document.title = `${user.institute.name} - Learning Portal`;
            if (user.institute.favicon) {
              let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
              if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
              }
              link.href = user.institute.favicon;
            }
          }
        } else {
          // If logged in but no institute (e.g. owner/admin before fully set), keep default values
          document.documentElement.style.removeProperty('--primary');
          document.documentElement.style.removeProperty('--sidebar-primary');
          document.documentElement.style.removeProperty('--ring');
          document.documentElement.style.removeProperty('--sidebar-ring');
        }
      } catch (e) {
        console.error('Error applying branding:', e);
      }
    };

    // Check immediately
    checkAndApplyBranding();

    // Check periodically to catch changes in localStorage (e.g. state updates)
    const interval = setInterval(checkAndApplyBranding, 1000);

    return () => clearInterval(interval);
  }, [location.pathname]);

  return null;
}
