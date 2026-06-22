import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

export default function BrandingManager() {
  const location = useLocation();
  const lastUserStrRef = useRef<string | null>(null);

  useEffect(() => {
    const checkAndApplyBranding = () => {
      // 1. Force the favicon globally to /favicon.ico
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      if (link.getAttribute('href') !== '/favicon.ico') {
        link.href = '/favicon.ico';
      }

      // 2. Determine and update the page title
      let suffix = '';
      const pathname = location.pathname;

      if (pathname.startsWith('/student')) {
        if (pathname === '/student/courses') {
          suffix = 'My Batches';
        } else {
          const studentTab = localStorage.getItem('trineo_student_active_tab') || 'home';
          const studentTabLabels: Record<string, string> = {
            home: 'Student Portal',
            'live-classes': 'Live Classes',
            materials: 'Study Materials',
            access: 'Access Center',
            faculty: 'Faculty Directory',
            security: 'Security Center',
            settings: 'Settings'
          };
          suffix = studentTabLabels[studentTab] || 'Student Portal';
        }
      } else if (pathname.startsWith('/admin')) {
        if (pathname === '/admin/institutes') {
          suffix = 'Institutes Management';
        } else {
          const adminTab = localStorage.getItem('trineo_admin_active_tab') || 'overview';
          const adminTabLabels: Record<string, string> = {
            overview: 'Analytics',
            students: 'Students',
            upload: 'Video Library',
            youtube: 'YouTube Integration',
            lessons: 'Course Builder',
            materials: 'Study Materials',
            liveClasses: 'Live Classes',
            accessManager: 'Access Management',
            import: 'Students',
            securityCenter: 'Security Center',
            payments: 'Analytics',
            announcements: 'Notifications',
            branding: 'Institute Branding'
          };
          suffix = adminTabLabels[adminTab] || 'Institute Dashboard';
        }
      } else if (pathname.startsWith('/course') || pathname.startsWith('/program') || pathname.startsWith('/watch')) {
        suffix = 'Video Player';
      } else if (pathname === '/owner') {
        suffix = 'Owner Console';
      }

      const expectedTitle = suffix ? `Trineo Stream | ${suffix}` : 'Trineo Stream';
      if (document.title !== expectedTitle) {
        document.title = expectedTitle;
      }

      // 3. Apply/Clear theme brand colors in style tag depending on the logged-in user
      const cachedUser = localStorage.getItem('user');
      if (cachedUser === lastUserStrRef.current) return;
      lastUserStrRef.current = cachedUser;

      if (!cachedUser) {
        document.documentElement.style.removeProperty('--primary');
        document.documentElement.style.removeProperty('--sidebar-primary');
        document.documentElement.style.removeProperty('--ring');
        document.documentElement.style.removeProperty('--sidebar-ring');
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
        } else {
          document.documentElement.style.removeProperty('--primary');
          document.documentElement.style.removeProperty('--sidebar-primary');
          document.documentElement.style.removeProperty('--ring');
          document.documentElement.style.removeProperty('--sidebar-ring');
        }
      } catch (e) {
        console.error('Error applying branding:', e);
      }
    };

    // Run immediately
    checkAndApplyBranding();

    // Check periodically to catch dynamic updates to localStorage active tabs
    const interval = setInterval(checkAndApplyBranding, 1000);

    return () => clearInterval(interval);
  }, [location.pathname]);

  return null;
}
