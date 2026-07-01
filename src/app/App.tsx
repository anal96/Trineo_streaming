import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from './components/ui/sonner';
import { ThemeToggle } from './components/ThemeToggle';
import LandingPage from './components/pages/LandingPage';
import LoginPage from './components/pages/LoginPage';
import SignupPage from './components/pages/SignupPage';
import StudentDashboard from './components/pages/StudentDashboard';
import VideoPlayer from './components/pages/VideoPlayer';
import AdminDashboard from './components/pages/AdminDashboard';
import CoursesPage from './components/pages/CoursesPage';
import OwnerPanel from './components/pages/OwnerPanel';
import InstitutesManagementPage from './components/pages/InstitutesManagementPage';
import ChangePasswordPage from './components/pages/ChangePasswordPage';
import InstituteRegisterPage from './components/pages/InstituteRegisterPage';
import SecurityLockPage from './components/pages/SecurityLockPage';
import BrandingManager from './components/BrandingManager';
import SupportedPlatformGuard from './components/SupportedPlatformGuard';
import { apiFetch, decodeShortId } from './utils/api';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router';
import { initializePushNotifications } from './utils/pushManager';
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      placeholderData: keepPreviousData,
    },
  },
});

function LegacyWatchRedirect() {
  const navigate = useNavigate();
  const { courseId, lessonIndex } = useParams();

  useEffect(() => {
    const redirect = async () => {
      const resolvedCourseId = decodeShortId(courseId || '');
      if (!resolvedCourseId) {
        navigate('/student/courses', { replace: true });
        return;
      }

      try {
        const course = await apiFetch(`/courses/${resolvedCourseId}`);
        const lessons = course.lessons || [];
        const index = Math.max(1, Number(lessonIndex || '1')) - 1;
        const lesson = lessons[index] || lessons[0];

        if (!course.slug || course.slug === 'undefined') {
          navigate('/student/courses', { replace: true });
          return;
        }

        const nextPath = lesson?.slug && lesson.slug !== 'undefined'
          ? `/course/${course.slug}/lesson/${lesson.slug}`
          : `/course/${course.slug}`;

        navigate(nextPath, { replace: true });
      } catch (_error) {
        navigate('/student/courses', { replace: true });
      }
    };

    redirect();
  }, [courseId, lessonIndex, navigate]);

  return null;
}

export default function App() {
  useEffect(() => {
    initializePushNotifications().catch(err => console.error('Push init failed:', err));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <Router>
          <BrandingManager />
          <div className="size-full bg-background text-foreground">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<SupportedPlatformGuard><LoginPage /></SupportedPlatformGuard>} />
              <Route path="/signup" element={<SupportedPlatformGuard><SignupPage /></SupportedPlatformGuard>} />
              <Route path="/register-institute" element={<InstituteRegisterPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/security-lock" element={<SecurityLockPage />} />
              <Route path="/student" element={<SupportedPlatformGuard><StudentDashboard /></SupportedPlatformGuard>} />
              <Route path="/student/courses" element={<SupportedPlatformGuard><CoursesPage /></SupportedPlatformGuard>} />
              <Route path="/course/:courseSlug" element={<SupportedPlatformGuard><VideoPlayer /></SupportedPlatformGuard>} />
              <Route path="/course/:courseSlug/lesson/:lessonSlug" element={<SupportedPlatformGuard><VideoPlayer /></SupportedPlatformGuard>} />
              <Route path="/program/:programSlug" element={<SupportedPlatformGuard><VideoPlayer /></SupportedPlatformGuard>} />
              <Route path="/program/:programSlug/lesson/:lessonSlug" element={<SupportedPlatformGuard><VideoPlayer /></SupportedPlatformGuard>} />
              <Route path="/student/video/:courseId/:lessonIndex?" element={<SupportedPlatformGuard><LegacyWatchRedirect /></SupportedPlatformGuard>} />
              <Route path="/watch/v/:courseId/:lessonIndex?" element={<SupportedPlatformGuard><LegacyWatchRedirect /></SupportedPlatformGuard>} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/owner" element={<OwnerPanel />} />
              <Route path="/admin/institutes" element={<InstitutesManagementPage />} />
            </Routes>
            <ThemeToggle />
            <Toaster />
          </div>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

