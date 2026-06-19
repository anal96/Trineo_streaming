import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import {
  Home,
  BookOpen,
  PlayCircle,
  Award,
  Settings,
  Bell,
  Search,
  TrendingUp,
  Clock,
  Star,
  ChevronRight,
  LogOut,
  GraduationCap,
  Video,
  AlertCircle,
  Building2,
  Users,
  ShieldCheck,
  FileText,
  Smartphone,
  History,
  Lock,
  Laptop,
  CheckCircle,
  Eye,
  RefreshCw,
  Download,
  Mail,
  Phone,
  Key,
  Package,
  Calendar,
  Flame,
  Trophy,
  Play,
  Plus,
  Check,
  ExternalLink,
  Camera
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { MobileNav, studentNavItems } from '../MobileNav';
import { ThemeToggleButton } from '../ThemeToggle';
import { apiFetch, getApiUrl } from '../../utils/api';

const LOCAL_AUDIT_KEY = 'trineo_security_audit';

const getLocalSecurityViolations = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_AUDIT_KEY) || '[]');
  } catch (_e) {
    return [];
  }
};

const formatSecurityDetails = (details: string) => {
  try {
    const parsed = JSON.parse(details);
    const attempt = parsed.attemptNumber ? `Attempt ${parsed.attemptNumber}: ` : '';
    return `${attempt}${parsed.additionalInfo || parsed.violationType || details}`;
  } catch (_e) {
    return details;
  }
};

const parseUserAgentDetails = (ua: string) => {
  if (!ua) return { os: 'Unknown Device', browser: 'Browser' };
  
  let os = 'Device';
  if (ua.includes('Windows')) os = 'Windows PC';
  else if (ua.includes('iPhone')) os = 'iPhone';
  else if (ua.includes('iPad')) os = 'iPad';
  else if (ua.includes('Android')) os = 'Android Phone';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) os = 'Mac';
  else if (ua.includes('Linux')) os = 'Linux PC';

  let browser = 'Browser';
  const chromeMatch = ua.match(/Chrome\/([0-9]+)/);
  const firefoxMatch = ua.match(/Firefox\/([0-9]+)/);
  const safariMatch = ua.match(/Version\/([0-9]+).*Safari/);
  const edgeMatch = ua.match(/Edg\/([0-9]+)/);

  if (edgeMatch) browser = `Edge ${edgeMatch[1]}`;
  else if (chromeMatch) browser = `Chrome ${chromeMatch[1]}`;
  else if (firefoxMatch) browser = `Firefox ${firefoxMatch[1]}`;
  else if (safariMatch) browser = `Safari ${safariMatch[1]}`;

  return { os, browser };
};

const formatLastActive = (dateString: string | Date, isCurrent: boolean) => {
  if (isCurrent) return 'Active now';
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Active just now';
  if (mins < 60) return `Active ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Active ${days}d ago`;
};

const formatTimelineDateTime = (dateString: string | Date) => {
  const d = new Date(dateString);
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampmString = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  
  return {
    date: `${day} ${month} ${year}`,
    time: `${hours}:${minutesStr} ${ampmString}`
  };
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) return tabParam;
    }
    return localStorage.getItem('trineo_student_active_tab') || 'home';
  });

  useEffect(() => {
    localStorage.setItem('trineo_student_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [location.search]);
  const [user, setUser] = useState<any>(null);

  const [purchasedCourses, setPurchasedCourses] = useState<any[]>([]);
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const [studyMaterials, setStudyMaterials] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [securityLogs, setSecurityLogs] = useState<any>(null);

  const violations = securityLogs?.securityViolations || [];

  const categorizedEvents = useMemo(() => {
    const screenshot: any[] = [];
    const recording: any[] = [];
    const tab: any[] = [];
    const concurrent: any[] = [];
    const other: any[] = [];

    violations.forEach((v: any) => {
      const type = (v.eventType || '').toUpperCase();
      if (type === 'SCREENSHOT' || type === 'SCREENSHOT_ATTEMPT') {
        screenshot.push(v);
      } else if (type === 'SCREEN_RECORDING' || type === 'SCREEN_RECORDING_DETECTED') {
        recording.push(v);
      } else if (type === 'TAB_HIDDEN' || type === 'TAB_SWITCHING') {
        tab.push(v);
      } else if (type === 'CONCURRENT_LOGIN' || type === 'MULTIPLE_DEVICE_LOGIN' || type === 'CONCURRENT_SESSION_VIOLATION') {
        concurrent.push(v);
      } else {
        other.push(v);
      }
    });

    return { screenshot, recording, tab, concurrent, other };
  }, [violations]);

  const securityScore = useMemo(() => {
    let score = 100;
    score -= categorizedEvents.screenshot.length * 5;
    score -= categorizedEvents.recording.length * 10;
    score -= categorizedEvents.tab.length * 3;
    score -= categorizedEvents.concurrent.length * 5;
    return Math.max(0, score);
  }, [categorizedEvents]);

  const scoreRating = useMemo(() => {
    if (securityScore >= 80) return { text: 'Excellent', color: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-500/20', progressColor: '[&>div]:bg-emerald-500' };
    if (securityScore >= 50) return { text: 'Warning', color: 'bg-amber-500/10 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-500/20', progressColor: '[&>div]:bg-amber-500' };
    return { text: 'Critical', color: 'bg-rose-500/10 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-500/20', progressColor: '[&>div]:bg-rose-500' };
  }, [securityScore]);

  const renderTimelineItem = (event: any) => {
    const { date, time } = formatTimelineDateTime(event.createdAt);
    const parsed = parseUserAgentDetails(event.userAgent);
    
    let icon = <Camera className="w-4 h-4 text-purple-500" />;
    let label = 'Screenshot Attempt';
    let isPlaybackEvent = true;

    const type = (event.eventType || '').toUpperCase();
    if (type === 'SCREENSHOT' || type === 'SCREENSHOT_ATTEMPT') {
      icon = <Camera className="w-4 h-4 text-purple-500" />;
      label = 'Screenshot Attempt';
    } else if (type === 'SCREEN_RECORDING' || type === 'SCREEN_RECORDING_DETECTED') {
      icon = <Video className="w-4 h-4 text-rose-500" />;
      label = 'Screen Recording Detected';
    } else if (type === 'TAB_HIDDEN' || type === 'TAB_SWITCHING') {
      icon = <RefreshCw className="w-4 h-4 text-amber-500" />;
      label = 'Tab Switching';
    } else if (type === 'CONCURRENT_LOGIN' || type === 'MULTIPLE_DEVICE_LOGIN' || type === 'CONCURRENT_SESSION_VIOLATION') {
      icon = <Users className="w-4 h-4 text-blue-500" />;
      label = 'Concurrent Login';
      isPlaybackEvent = false;
    }

    return (
      <div key={event._id} className="relative pl-6 border-l border-border/80 pb-3 last:pb-0">
        <div className="absolute -left-2.5 top-1 w-5 h-5 rounded-full bg-background border-2 border-border flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        </div>
        <div className="bg-muted/40 rounded-xl p-3.5 border border-border/40 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {icon}
              <span className="font-bold text-sm text-foreground">{label}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {isPlaybackEvent ? (
                <>Topic: <span className="font-semibold text-foreground">{event.topicTitle || 'C Programming'}</span></>
              ) : (
                <>Device: <span className="font-semibold text-foreground">{parsed.os} ({parsed.browser})</span></>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1.5 mt-1">
              <span>IP: {event.ipAddress}</span>
              <span>·</span>
              <span>{event.details || `Action Taken: ${event.actionTaken || 'logged'}`}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-semibold text-foreground">{date}</div>
            <div className="text-[10px] text-muted-foreground/85 font-medium mt-0.5">{time}</div>
          </div>
        </div>
      </div>
    );
  };
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [liveClassesLoading, setLiveClassesLoading] = useState(false);
  const [materialsSearch, setMaterialsSearch] = useState('');
  const [selectedMaterialType, setSelectedMaterialType] = useState('All');
  const [selectedMaterialCourseId, setSelectedMaterialCourseId] = useState('');
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [rules, setRules] = useState<any[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadStudyMaterials = async () => {
      setMaterialsLoading(true);
      try {
        const params = new URLSearchParams();
        if (materialsSearch) params.set('search', materialsSearch);
        if (selectedMaterialType !== 'All') params.set('type', selectedMaterialType);
        if (selectedMaterialCourseId) params.set('courseId', selectedMaterialCourseId);
        const query = params.toString();
        const data = await apiFetch(`/student/materials${query ? `?${query}` : ''}`);
        setStudyMaterials(data);
      } catch (err) {
        console.error('Failed to load study materials', err);
      } finally {
        setMaterialsLoading(false);
      }
    };

    const loadFaculty = async () => {
      setFacultyLoading(true);
      try {
        const data = await apiFetch('/student/faculty');
        setFacultyList(data);
      } catch (err) {
        console.error('Failed to load faculty profiles', err);
      } finally {
        setFacultyLoading(false);
      }
    };

    const loadSecurityLogs = async () => {
      setSecurityLoading(true);
      try {
        const data = await apiFetch('/auth/security-logs');
        const localViolations = getLocalSecurityViolations();
        const seen = new Set((data.securityViolations || []).map((log: any) => log._id));
        setSecurityLogs({
          ...data,
          securityViolations: [
            ...localViolations.filter((log: any) => !seen.has(log._id)),
            ...(data.securityViolations || [])
          ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        });
      } catch (err) {
        console.error('Failed to load security logs', err);
        setSecurityLogs({
          currentDevice: null,
          loginHistory: [],
          securityViolations: getLocalSecurityViolations(),
          activeSessions: []
        });
      } finally {
        setSecurityLoading(false);
      }
    };

    const loadLiveClasses = async () => {
      setLiveClassesLoading(true);
      try {
        const data = await apiFetch('/live-classes');
        setLiveClasses(data || []);
      } catch (err) {
        console.error('Failed to load live classes', err);
      } finally {
        setLiveClassesLoading(false);
      }
    };

    const loadAccessRules = async () => {
      if (!user?._id) return;
      setRulesLoading(true);
      try {
        const data = await apiFetch(`/access/student/${user._id}`);
        if (data && !Array.isArray(data)) {
          setRules((data as any).restrictions || []);
        } else {
          setRules(data || []);
        }
      } catch (err) {
        console.error('Failed to load student access rules:', err);
        setRules([]);
      } finally {
        setRulesLoading(false);
      }
    };

    if (activeTab === 'materials') loadStudyMaterials();
    if (activeTab === 'faculty') loadFaculty();
    if (activeTab === 'security') loadSecurityLogs();
    if (activeTab === 'live-classes') loadLiveClasses();
    if (activeTab === 'access') loadAccessRules();
  }, [activeTab, user, materialsSearch, selectedMaterialType, selectedMaterialCourseId]);

  const loadNotifications = async () => {
    try {
      const data = await apiFetch('/student-notifications');
      setNotifications(data.notifications || []);
      setUnreadNotifications(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const freshUser = await apiFetch('/auth/profile');
        setUser(freshUser);
        setProfileForm({ name: freshUser?.name || '', phone: freshUser?.phone || '' });
        setResetEmail(freshUser?.email || '');
        localStorage.setItem('user', JSON.stringify(freshUser));
        loadNotifications();
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
        } else {
          navigate('/');
        }
      }
    };
    fetchProfile();
  }, [navigate]);



  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch purchased courses
        const myCourses = await apiFetch('/purchases/my-courses');
        setPurchasedCourses(myCourses);

        // Fetch watch history progress logs
        const history = await apiFetch('/progress/history');
        setWatchHistory(history);

        // Fetch all courses for "recently added" suggestions
        const courses = await apiFetch('/courses');
        setAllCourses(courses);

        // Fetch announcements
        const annList = await apiFetch('/analytics/announcements');
        setAnnouncements(annList);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleVideoClick = async (courseId: string) => {
    // Navigate to the program page
    const selectedCourse = purchasedCourses.find((course: any) => course._id === courseId) ||
      allCourses.find((course: any) => course._id === courseId);
    if (selectedCourse?.slug && selectedCourse.slug !== 'undefined') {
      navigate(`/program/${selectedCourse.slug}`);
    } else if (selectedCourse?._id) {
      // Fallback: fetch program to resolve slug
      try {
        const program = await apiFetch(`/programs/${selectedCourse._id}`);
        if (program?.slug && program.slug !== 'undefined') {
          navigate(`/program/${program.slug}`);
        } else {
          alert('Program path could not be resolved.');
        }
      } catch (err) {
        console.error('Failed to resolve program slug:', err);
        alert('Failed to resolve program path.');
      }
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      await apiFetch('/enrollments', {
        method: 'POST',
        body: JSON.stringify({ programId: courseId })
      });
      // reload
      const myCourses = await apiFetch('/purchases/my-courses');
      setPurchasedCourses(myCourses);
      const courses = await apiFetch('/courses');
      setAllCourses(courses);
    } catch (err: any) {
      alert(err.message || 'Enrollment failed');
    }
  };

  const filteredPurchased = purchasedCourses.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const newCourses = allCourses.filter(c =>
    !purchasedCourses.some(p => p._id === c._id)
  );

  // Compute metrics
  const totalCourses = purchasedCourses.length;
  const watchHours = Math.round(watchHistory.length * 0.4 * 10) / 10;
  const completedLessons = watchHistory.filter(h => h.completed).length;
  const continueWatching = filteredPurchased.slice(0, 3).map((course) => {
    const lessonHistory = watchHistory.filter(h => {
      const progId = h.contentId?.lessonId?.unitId?.subjectId?.programId?._id || h.courseId?._id;
      return progId && progId.toString() === course._id.toString();
    });
    const progress = lessonHistory.length > 0
      ? Math.round(lessonHistory.reduce((sum, current) => sum + current.progress, 0) / lessonHistory.length)
      : 0;
    return { ...course, progress };
  });
  const recentlyAddedLessons = newCourses.slice(0, 3);

  return (
    <div className="flex min-h-screen overflow-hidden bg-background text-foreground pb-safe-nav lg:pb-0">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-sidebar border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {user?.institute?.logo ? (
                <img src={user.institute.logo} alt="Institute" className="w-9 h-9 rounded-xl object-contain border border-border/50" />
              ) : (
                <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-base font-bold leading-none">Trineo Stream</h1>
                <p className="text-[10px] text-muted-foreground mt-0.5">Student Portal</p>
              </div>
            </div>
            {user?.institute?.name && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pl-1">
                <span className="text-primary text-base leading-none">•</span>
                <span>{user.institute.name}</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="mb-3">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-widest rounded-full border text-muted-foreground bg-muted border-border">Navigation</span>
          </div>
          <div className="space-y-1">
            {[
              { icon: Home, label: 'Dashboard', id: 'home' },
              { icon: BookOpen, label: 'My Batches', id: 'courses' },
              { icon: Video, label: 'Live Classes', id: 'live-classes' },
              { icon: FileText, label: 'Study Materials', id: 'materials' },
              { icon: Key, label: 'Access Management', id: 'access' },
              { icon: Bell, label: 'Notifications', id: 'notifications' },
              { icon: Users, label: 'Faculty Contacts', id: 'faculty' },
              { icon: ShieldCheck, label: 'Security & Devices', id: 'security' },
              { icon: Settings, label: 'Settings', id: 'settings' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'courses') {
                    navigate('/student/courses');
                  } else {
                    setActiveTab(item.id);
                    navigate(`/student?tab=${item.id}`);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${activeTab === item.id
                    ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/10 text-foreground border border-violet-500/30 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            {user?.institute?.logo ? (
              <img src={user.institute.logo} alt="Institute" className="w-7 h-7 rounded-lg object-contain" />
            ) : (
              <div className="w-7 h-7 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
            )}
            <h1 className="text-lg font-bold truncate max-w-[150px]">Trineo Stream</h1>
          </div>

          <div className="hidden lg:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search your assigned batches..."
                className="pl-10 bg-background/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 relative">
            <ThemeToggleButton />
            <Button
              variant="ghost"
              size="icon"
              className="relative h-11 w-11"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
              )}
            </Button>

            {showNotifications && (
              <div className="absolute right-0 top-12 z-50 w-[calc(100vw-1.5rem)] max-w-80 bg-card border border-border shadow-2xl rounded-2xl p-4 space-y-3">
                <h4 className="font-semibold text-sm">Notifications</h4>
                <p className="text-xs text-muted-foreground">New lessons and recent learning activity</p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {notifications.slice(0, 5).map((n) => (
                    <button
                      key={n._id}
                      className="w-full text-left text-xs border-b border-border/40 pb-2"
                      onClick={async () => {
                        try {
                          if (n.userId) await apiFetch(`/student-notifications/${n._id}/read`, { method: 'POST' });
                          loadNotifications();
                        } catch (_e) { }
                      }}
                    >
                      <span className="text-primary font-medium">{n.type}: </span>
                      {n.message}
                    </button>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center">No notifications yet</p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={async () => { await apiFetch('/student-notifications/mark-all-read', { method: 'POST' }); loadNotifications(); }}>
                    Mark all read
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setActiveTab('notifications'); navigate('/student?tab=notifications'); }}>
                    Open Center
                  </Button>
                </div>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-border">
              <Avatar>
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'student'}`} />
                <AvatarFallback>ST</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <div className="text-sm font-medium">{user?.name || 'Student'}</div>
                <div className="text-xs text-muted-foreground">ID: {user?.user_id || 'N/A'}</div>
              </div>
            </div>

            <Avatar className="lg:hidden w-8 h-8">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'student'}`} />
              <AvatarFallback>ST</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Mobile Search Bar */}
        <div className="lg:hidden px-4 py-3 border-b border-border bg-card/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search batches..."
              className="pl-10 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="panel-content space-y-6">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* =========================================== */}
            {/* HOME TAB */}
            {/* =========================================== */}
            {activeTab === 'home' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-8">
                {(() => {
                  // Fallbacks for mockup alignment
                  const mockAnnouncements = [
                    { title: "Upcoming Live Q&A Session", message: "Join our live doubt clearing session with Mr. Noel Babu tomorrow at 5:00 PM.", author: "Noel Babu", createdAt: new Date().toISOString() },
                    { title: "Welcome to GFI Institute!", message: "We are thrilled to welcome you to the BCA C Programming module. Check your learning path below to begin.", author: "GFI Admin", createdAt: new Date(Date.now() - 86400000).toISOString() }
                  ];
                  const displayAnnouncements = announcements.length > 0 ? announcements : mockAnnouncements;

                  const mockActivities = [
                    { type: 'pdf', title: 'Intro Notes.pdf', courseTitle: 'C Programming', detail: 'Downloaded successfully', progress: 100, relativeTime: '2h ago' },
                    { type: 'video', title: 'Introduction to pointers', courseTitle: 'C Programming', detail: 'Watched 78%', progress: 78, relativeTime: '1d ago' },
                    { type: 'reading', title: 'Arrays vs Pointers Overview', courseTitle: 'C Programming', detail: 'Completed reading', progress: 100, relativeTime: '2d ago' }
                  ];

                  const displayActivities = watchHistory.length > 0 ? watchHistory.slice(0, 3).map((h: any) => {
                    const courseTitle = h.contentId?.lessonId?.unitId?.subjectId?.programId?.name || h.courseId?.title || 'C Programming';
                    const lessonTitle = h.contentId?.title || h.lessonId?.title || 'Introduction to pointers';
                    const progress = h.progress || 0;
                    const watchedAt = h.lastWatchedAt ? new Date(h.lastWatchedAt) : (h.watchedAt ? new Date(h.watchedAt) : new Date());
                    const relativeTime = (() => {
                      const diff = Date.now() - watchedAt.getTime();
                      const mins = Math.floor(diff / 60000);
                      if (mins < 60) return `${mins}m ago`;
                      const hrs = Math.floor(mins / 60);
                      if (hrs < 24) return `${hrs}h ago`;
                      return watchedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                    })();
                    const isPdf = lessonTitle.toLowerCase().includes('pdf') || lessonTitle.toLowerCase().includes('notes');
                    return {
                      type: isPdf ? 'pdf' : 'video',
                      title: lessonTitle,
                      courseTitle,
                      detail: progress === 100 ? 'Completed' : `Watched ${progress}%`,
                      progress,
                      relativeTime,
                      programSlug: h.contentId?.lessonId?.unitId?.subjectId?.programId?.slug || h.courseId?.slug,
                      lessonSlug: h.contentId?.lessonId?.slug || h.lessonId?.slug
                    };
                  }) : mockActivities;

                  const continueWatchingList = [
                    { title: 'C Programming', progress: 78, instructor: 'Noel Babu', thumbnail: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&q=80', isMock: true },
                    { title: 'Data Structures', progress: 45, instructor: 'Jane Smith', thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80', isMock: true },
                    { title: 'Database Systems', progress: 20, instructor: 'John Doe', thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&q=80', isMock: true }
                  ];

                  const displayContinueWatching = continueWatching.length > 0
                    ? [
                      ...continueWatching.map(c => ({
                        title: c.title,
                        progress: c.progress || 78,
                        instructor: c.instructor || 'Noel Babu',
                        thumbnail: c.thumbnail || 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&q=80',
                        _id: c._id,
                        isMock: false
                      })),
                      ...continueWatchingList.filter(m => !continueWatching.some(c => c.title.toLowerCase() === m.title.toLowerCase()))
                    ].slice(0, 3)
                    : continueWatchingList;

                  return (
                    <div className="space-y-8">
                      {/* 1️⃣ HERO BANNER SECTION */}
                      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 shadow-xl shadow-indigo-500/10">
                        {/* Glowing shapes */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-12 translate-x-12 pointer-events-none" />
                        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/30 rounded-full blur-2xl pointer-events-none" />
                        
                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-5 md:p-6 text-white items-center">
                          {/* Greeting info */}
                          <div className="lg:col-span-6 space-y-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 text-white/95 text-[10px] font-semibold backdrop-blur-md border border-white/10 shadow-inner">
                              ✨ Welcome Back
                            </span>
                            <div className="space-y-1">
                              <h2 className="text-sm sm:text-base font-semibold opacity-90 flex items-center gap-1.5">
                                Good Evening 👋
                              </h2>
                              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-sm">
                                {user?.name || 'Anal joseph'}
                              </h1>
                            </div>
                            <p className="text-indigo-100/90 text-xs sm:text-sm max-w-sm leading-relaxed font-medium">
                              Your learning path is active and updated. Continue your BCA pointers module today to maintain your daily streak!
                            </p>
                            <Button 
                              className="bg-white text-indigo-700 hover:bg-white/90 font-bold px-4 py-2 rounded-xl transition-all shadow-md text-xs sm:text-sm flex items-center gap-2 w-fit hover:scale-105 active:scale-95 duration-200"
                              onClick={() => {
                                if (purchasedCourses.length > 0) {
                                  handleVideoClick(purchasedCourses[0]._id);
                                } else {
                                  navigate('/student/courses');
                                }
                              }}
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Resume Learning
                            </Button>
                          </div>

                          {/* Profile stats & Spec Cards */}
                          <div className="lg:col-span-6 flex flex-col sm:flex-row gap-4 items-stretch justify-end w-full lg:max-w-xl lg:ml-auto">
                            {/* Circular progress card */}
                            <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-white flex items-center gap-4 shadow-lg relative group hover:border-white/30 transition-all duration-300">
                              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                              
                              <div className="relative flex items-center justify-center flex-shrink-0">
                                <svg className="w-16 h-16 transform -rotate-90">
                                  <circle cx="32" cy="32" r="26" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="5" fill="transparent" />
                                  <circle 
                                    cx="32" 
                                    cy="32" 
                                    r="26" 
                                    stroke="url(#heroProgressGradient)" 
                                    strokeWidth="5" 
                                    fill="transparent" 
                                    strokeDasharray="163" 
                                    strokeDashoffset={163 - (163 * 78) / 100} 
                                    strokeLinecap="round" 
                                    className="transition-all duration-1000 ease-out"
                                  />
                                  <defs>
                                    <linearGradient id="heroProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="#38bdf8" />
                                      <stop offset="100%" stopColor="#818cf8" />
                                    </linearGradient>
                                  </defs>
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                  <span className="text-xs font-extrabold tracking-tight">78%</span>
                                </div>
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <h4 className="text-[11px] font-bold tracking-wide uppercase opacity-75">Overall Progress</h4>
                                <h3 className="text-xs font-bold text-white truncate max-w-[130px]" title={purchasedCourses[0]?.title || 'C Programming'}>
                                  Continue: {purchasedCourses[0]?.title || 'C Programming'}
                                </h3>
                              </div>
                            </div>

                            {/* Spec card */}
                            <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-white shadow-lg flex flex-col justify-center hover:border-white/30 transition-all duration-300">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                                <div className="flex flex-col border-b border-white/10 pb-1">
                                  <span className="text-[9px] text-indigo-200 uppercase font-bold tracking-wider">Batch</span>
                                  <span className="font-extrabold text-white mt-0.5 truncate">{user?.program || user?.courseName || 'BCA'}</span>
                                </div>
                                <div className="flex flex-col border-b border-white/10 pb-1">
                                  <span className="text-[9px] text-indigo-200 uppercase font-bold tracking-wider">Campus</span>
                                  <span className="font-extrabold text-white mt-0.5 truncate" title={user?.branchName || user?.institute?.branchName || 'GFI Institute'}>
                                    {user?.branchName || user?.institute?.branchName || 'GFI Institute'}
                                  </span>
                                </div>
                                <div className="flex flex-col pt-0.5">
                                  <span className="text-[9px] text-indigo-200 uppercase font-bold tracking-wider">Admission</span>
                                  <span className="font-extrabold text-white mt-0.5 truncate">
                                    {user?.enrollmentDate ? new Date(user.enrollmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '15 Jan 2026'}
                                  </span>
                                </div>
                                <div className="flex flex-col pt-0.5">
                                  <span className="text-[9px] text-indigo-200 uppercase font-bold tracking-wider">Status</span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 mt-0.5">
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    Active
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2️⃣ KPI STATS ROW */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[
                          {
                            label: 'Batches Enrolled',
                            value: totalCourses,
                            icon: <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
                            color: 'from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20 text-purple-600 dark:text-purple-400 hover:border-purple-500/40 shadow-purple-500/5'
                          },
                          {
                            label: 'Watch Hours',
                            value: `${watchHours > 0 ? watchHours : 12.4}h`,
                            icon: <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
                            color: 'from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20 text-blue-600 dark:text-blue-400 hover:border-blue-500/40 shadow-blue-500/5'
                          },
                          {
                            label: 'Topics Completed',
                            value: completedLessons > 0 ? completedLessons : 31,
                            icon: <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
                            color: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/40 shadow-emerald-500/5'
                          },
                          {
                            label: 'Day Streak',
                            value: '12 Days',
                            icon: <Flame className="w-5 h-5 text-orange-500 animate-pulse" />,
                            color: 'from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/20 text-orange-500 dark:text-orange-400 hover:border-orange-500/40 shadow-orange-500/5'
                          },
                          {
                            label: 'Rank in Batch',
                            value: '#4',
                            icon: <Trophy className="w-5 h-5 text-rose-500" />,
                            color: 'from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/20 text-rose-600 dark:text-rose-400 hover:border-rose-500/40 shadow-rose-500/5'
                          },
                        ].map((stat, i) => (
                          <Card
                            key={i}
                            className={`bg-gradient-to-br ${stat.color} border rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-default group`}
                          >
                            <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform duration-300">
                              {stat.icon}
                            </div>
                            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{stat.value}</div>
                            <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
                          </Card>
                        ))}
                      </div>

                      {/* 3️⃣ TWO-COLUMN GRID PART 1: MY BATCHES + ANNOUNCEMENTS */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* My Batches Column */}
                        <div className="lg:col-span-7 space-y-4">
                          <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            My Batches
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* BCA Batch Card */}
                            <Card
                              className="bg-gradient-to-br from-amber-50/60 via-amber-100/10 to-yellow-50/20 dark:from-amber-950/20 dark:via-yellow-950/5 dark:to-stone-900 border border-amber-500/35 rounded-2xl p-5 hover:shadow-xl hover:border-amber-500/50 transition-all duration-300 group cursor-pointer"
                              onClick={() => {
                                if (purchasedCourses.length > 0) {
                                  handleVideoClick(purchasedCourses[0]._id);
                                } else {
                                  navigate('/student/courses');
                                }
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center font-black text-red-600 dark:text-red-400 text-lg border border-red-500/20 shadow-sm">
                                  BCA
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-foreground">BCA Batch</h4>
                                  <p className="text-xs text-muted-foreground font-medium">{user?.branchName || user?.institute?.name || 'GFI Institute'}</p>
                                </div>
                              </div>

                              <div className="mt-6 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-muted-foreground font-medium">Completion Progress</span>
                                  <span className="font-semibold text-amber-600 dark:text-amber-400">0% complete</span>
                                </div>
                                <Progress value={0} className="h-2 bg-amber-200/20 dark:bg-amber-900/10" />
                                <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                                  <span className="font-medium">1 / 31 Topics Completed</span>
                                  <span className="flex items-center gap-1 text-primary group-hover:text-primary/80 font-bold group-hover:underline transition-colors">
                                    Resume <ChevronRight className="w-3.5 h-3.5" />
                                  </span>
                                </div>
                              </div>
                            </Card>

                            {/* Explorer Card */}
                            <Card
                              className="border-2 border-dashed border-border/80 hover:border-primary/50 bg-muted/10 hover:bg-primary/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group min-h-[178px] hover:shadow-md"
                              onClick={() => navigate('/student/courses')}
                            >
                              <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center border border-border group-hover:bg-primary/10 group-hover:border-primary/20 transition-all mb-3">
                                <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <h4 className="font-bold text-sm text-foreground">Explore More Batches</h4>
                              <p className="text-xs text-muted-foreground mt-1 max-w-[160px] leading-relaxed">
                                Enroll in additional courses or check available programs.
                              </p>
                            </Card>
                          </div>
                        </div>

                        {/* Institute Announcements Column */}
                        <div className="lg:col-span-5 space-y-4">
                          <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                            <Bell className="w-5 h-5 text-primary" />
                            Institute Announcements
                          </h3>
                          <div className="space-y-3 max-h-[178px] overflow-y-auto pr-1 scrollbar-thin">
                            {displayAnnouncements.map((ann: any, index: number) => (
                              <Card key={index} className="border-border/60 bg-card hover:border-primary/20 transition-all duration-200 shadow-sm">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <Bell className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs sm:text-sm font-semibold text-foreground mb-0.5 truncate">{ann.title}</div>
                                      <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{ann.message}</div>
                                      <div className="flex items-center justify-between mt-2.5 text-[10px] text-muted-foreground/60">
                                        <span className="font-medium">By: {ann.author}</span>
                                        <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 4️⃣ TWO-COLUMN GRID PART 2: RECENT ACTIVITY + CONTINUE WATCHING */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Recent Activity Column */}
                        <div className="lg:col-span-7 space-y-4">
                          <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                            <History className="w-5 h-5 text-primary" />
                            Recent Activity
                          </h3>
                          <div className="space-y-3">
                            {displayActivities.map((entry: any, i: number) => (
                              <Card key={i} className="border-border/60 bg-card hover:border-primary/20 transition-all duration-200 group">
                                <CardContent className="p-4 flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    {entry.type === 'pdf' ? (
                                      <FileText className="w-5 h-5 text-red-500" />
                                    ) : (
                                      <PlayCircle className="w-5 h-5 text-violet-500" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-xs sm:text-sm truncate text-foreground">{entry.title}</div>
                                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate mb-2">
                                      {entry.courseTitle} · {entry.relativeTime}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Progress value={entry.progress} className="h-1.5 flex-1" />
                                      <span className="text-xs font-bold text-primary shrink-0">{entry.progress}%</span>
                                    </div>
                                  </div>
                                  {entry.programSlug && entry.lessonSlug && (
                                    <Button
                                      size="sm"
                                      className="shrink-0 bg-primary hover:bg-primary/95 text-white text-xs px-3 min-h-9 transition-all hover:scale-105 active:scale-95 duration-150"
                                      onClick={() => navigate(`/program/${entry.programSlug}/lesson/${entry.lessonSlug}`)}
                                    >
                                      Resume
                                    </Button>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>

                        {/* Continue Watching Column */}
                        <div className="lg:col-span-5 space-y-4">
                          <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                            <PlayCircle className="w-5 h-5 text-primary" />
                            Continue Watching
                          </h3>
                          <div className="space-y-3">
                            {displayContinueWatching.map((course: any, i: number) => (
                              <Card
                                key={i}
                                className="border-border/60 bg-card hover:border-primary/30 cursor-pointer transition-all duration-200 group overflow-hidden"
                                onClick={() => {
                                  if (course.isMock) {
                                    if (purchasedCourses.length > 0) {
                                      handleVideoClick(purchasedCourses[0]._id);
                                    } else {
                                      navigate('/student/courses');
                                    }
                                  } else {
                                    handleVideoClick(course._id);
                                  }
                                }}
                              >
                                <CardContent className="p-3 flex items-center gap-3">
                                  <div className="relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <PlayCircle className="w-5 h-5 text-white fill-current" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs sm:text-sm font-bold truncate text-foreground">{course.title}</div>
                                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{course.instructor}</div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <Progress value={course.progress} className="h-1 flex-1" />
                                      <span className="text-[10px] font-bold text-primary shrink-0">{course.progress}%</span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 5️⃣ LEARNING PATH FLOW */}
                      <div className="space-y-4">
                        <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          Your Learning Path
                        </h3>

                        <Card className="border border-border/60 bg-card p-6 shadow-sm overflow-hidden">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 md:gap-4 relative">
                            {/* Connector line for desktop */}
                            <div className="hidden md:block absolute top-6 left-16 right-16 h-0.5 bg-border z-0" />

                            {/* Step 1: Batch */}
                            <div className="flex-1 flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-3 relative z-10">
                              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center border-4 border-emerald-100 dark:border-emerald-950/60 shadow-md">
                                <Check className="w-5 h-5" />
                              </div>
                              <div className="space-y-0.5">
                                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Step 1: Batch</div>
                                <div className="text-sm font-bold text-foreground">BCA Batch</div>
                                <div className="text-xs text-muted-foreground">Enrollment Active</div>
                              </div>
                            </div>

                            {/* Step 2: Subject */}
                            <div className="flex-1 flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-3 relative z-10">
                              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center border-4 border-emerald-100 dark:border-emerald-950/60 shadow-md">
                                <Check className="w-5 h-5" />
                              </div>
                              <div className="space-y-0.5">
                                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Step 2: Subject</div>
                                <div className="text-sm font-bold text-foreground">C Programming</div>
                                <div className="text-xs text-muted-foreground">MCS011 Subject</div>
                              </div>
                            </div>

                            {/* Step 3: Unit */}
                            <div className="flex-1 flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-3 relative z-10">
                              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center border-4 border-indigo-100 dark:border-indigo-950/60 shadow-md relative animate-pulse">
                                <span className="text-xs font-bold">3/5</span>
                              </div>
                              <div className="space-y-0.5">
                                <div className="text-xs text-indigo-500 dark:text-indigo-400 uppercase font-bold tracking-wider">Step 3: Unit</div>
                                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Pointers</div>
                                <div className="text-xs text-muted-foreground">3 of 5 topics done</div>
                              </div>
                            </div>

                            {/* Step 4: Next Topic */}
                            <div
                              className="flex-1 flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-3 relative z-10 group cursor-pointer"
                              onClick={() => {
                                if (purchasedCourses.length > 0) {
                                  handleVideoClick(purchasedCourses[0]._id);
                                } else {
                                  navigate('/student/courses');
                                }
                              }}
                            >
                              <div className="w-12 h-12 rounded-full bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white flex items-center justify-center border-4 border-border group-hover:border-primary/20 transition-all duration-300 shadow-sm shadow-black/5">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </div>
                              <div className="space-y-0.5">
                                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider group-hover:text-primary transition-colors">Step 4: Next Topic</div>
                                <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Pointer Arithmetic</div>
                                <div className="text-xs text-muted-foreground">Click to start learning</div>
                              </div>
                            </div>

                          </div>
                        </Card>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* =========================================== */}
            {/* 4️⃣ STUDY MATERIALS TAB */}
            {/* =========================================== */}
            {activeTab === 'materials' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6 text-primary" /> Study Materials</h2>
                    <p className="text-muted-foreground text-sm mt-1">Batch documents, notes, and resources from your faculty</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative md:col-span-2">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      value={materialsSearch}
                      onChange={(e) => setMaterialsSearch(e.target.value)}
                      placeholder="Search materials by title or description"
                    />
                  </div>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedMaterialCourseId}
                    onChange={(e) => setSelectedMaterialCourseId(e.target.value)}
                  >
                    <option value="">All Assigned Batches</option>
                    {purchasedCourses.map((course) => (
                      <option key={course._id} value={course._id}>{course.title}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  {['All', 'pdf'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedMaterialType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${selectedMaterialType === type
                          ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                        }`}
                    >
                      {type === 'All' ? 'All Types' : type.toUpperCase()}
                    </button>
                  ))}
                </div>

                {materialsLoading ? (
                  <div className="grid gap-4">
                    {[1, 2, 3].map((n) => <div key={n} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {studyMaterials.map((material: any) => {
                      const iconMap: Record<string, any> = {
                        pdf: <FileText className="w-5 h-5 text-red-500" />,
                        docx: <FileText className="w-5 h-5 text-blue-500" />,
                        pptx: <FileText className="w-5 h-5 text-orange-500" />,
                        mp4: <Video className="w-5 h-5 text-violet-500" />,
                      };
                      return (
                        <Card key={material.id} className="border-border/60 bg-card hover:border-primary/30 transition-all group">
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                              {iconMap[material.fileType] || <FileText className="w-5 h-5 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">{material.title}</div>
                              {material.description && (
                                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{material.description}</div>
                              )}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-red-500/10 text-red-600 border-red-500/20">
                                  {String(material.fileType || 'pdf').toUpperCase()}
                                </span>
                                <span className="text-xs text-muted-foreground">{material.courseTitle || 'Unknown Batch'}</span>
                                <span className="text-xs text-muted-foreground">· {material.uploaderName || 'Faculty'}</span>
                                <span className="text-xs text-muted-foreground">· {((material.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB</span>
                                <span className="text-xs text-muted-foreground">· {new Date(material.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity gap-1.5"
                              onClick={async () => {
                                const isProtected =
                                  (material.title || '').toLowerCase().includes('protected') ||
                                  (material.title || '').toLowerCase().includes('restricted') ||
                                  (material.title || '').toLowerCase().includes('notes') ||
                                  (material.downloadUrl || '').toLowerCase().includes('protected') ||
                                  (material.downloadUrl || '').toLowerCase().includes('restricted') ||
                                  (material.downloadUrl || '').toLowerCase().includes('notes');

                                if (isProtected) {
                                  try {
                                    await apiFetch('/security/audit', {
                                      method: 'POST',
                                      body: JSON.stringify({
                                        eventType: 'download_attempt',
                                        details: `Student downloaded protected study material: ${material.title} (${material.fileType})`,
                                        batchId: material.courseId || null,
                                        deviceFingerprint: navigator.userAgent
                                      })
                                    });
                                  } catch (e) {
                                    console.error('Failed to log download security event', e);
                                  }
                                }

                                const token = localStorage.getItem('token');
                                const url = token
                                  ? `${getApiUrl(material.downloadUrl)}?token=${encodeURIComponent(token)}`
                                  : getApiUrl(material.downloadUrl);
                                window.open(url, '_blank');
                              }}
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {studyMaterials.length === 0 && (
                      <div className="p-12 text-center border border-dashed border-border rounded-2xl">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                        <h4 className="font-semibold">No materials found</h4>
                        <p className="text-muted-foreground text-sm mt-1">Try changing search or filters.</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* =========================================== */}
            {/* 5️⃣ FACULTY TAB */}
            {/* =========================================== */}
            {activeTab === 'faculty' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Faculty & Contacts</h2>
                  <p className="text-muted-foreground text-sm mt-1">Meet your batch instructors and reach out directly</p>
                </div>

                {facultyLoading ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((n) => <div key={n} className="h-48 bg-muted rounded-2xl animate-pulse" />)}
                  </div>
                ) : facultyList.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-border rounded-2xl">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                    <h4 className="font-semibold">No faculty profiles available yet</h4>
                    <p className="text-muted-foreground text-sm mt-1">Activate batch access to see your assigned faculty.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {facultyList.map((faculty: any) => (
                      <Card key={faculty.id} className="border-border/60 bg-card hover:border-primary/20 transition-all">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-14 h-14 border-2 border-border flex-shrink-0">
                              <AvatarImage src={faculty.avatar} />
                              <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">{faculty.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base">{faculty.name}</h3>
                              <p className="text-xs text-primary font-semibold">{faculty.role}</p>
                              <p className="text-xs text-muted-foreground">{faculty.department}</p>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-2">{faculty.bio}</p>

                          <div className="mt-3 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <BookOpen className="w-3.5 h-3.5 text-primary/60" />
                              <span className="truncate font-medium">{faculty.courseName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3.5 h-3.5 text-primary/60" />
                              <span>Office Hours: {faculty.officeHours}</span>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                            <a
                              href={`mailto:${faculty.email}`}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              Email Faculty
                            </a>
                          </div>

                          {faculty.lastUpdate && (
                            <div className="mt-3 px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">📢 Update:</span> {faculty.lastUpdate}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* =========================================== */}
            {/* 6️⃣ SECURITY & DEVICES TAB */}
            {/* =========================================== */}
            {activeTab === 'security' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" /> Security Center</h2>
                  <p className="text-muted-foreground text-sm mt-1">Manage active sessions, view login history, and review account security events</p>
                </div>

                {securityLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((n) => <div key={n} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 1. Security Overview Section */}
                    <div className="space-y-3">
                      <h3 className="font-bold text-base">Security Overview</h3>
                      <div className="flex md:grid md:grid-cols-5 gap-4 overflow-x-auto md:overflow-visible snap-x pb-4 md:pb-0 scrollbar-none">
                        
                        {/* Screenshot Attempts Card */}
                        <Card className="snap-start shrink-0 w-[240px] md:w-auto border border-border/60 bg-card shadow-sm">
                          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-950/20 flex items-center justify-center">
                                <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              </div>
                            </div>
                            <div>
                              <div className="text-2xl font-black tracking-tight">
                                {categorizedEvents.screenshot.length} Event{categorizedEvents.screenshot.length !== 1 ? 's' : ''}
                              </div>
                              <div className="text-xs font-semibold text-muted-foreground mt-0.5">Screenshot Attempts</div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Recording Attempts Card */}
                        <Card className="snap-start shrink-0 w-[240px] md:w-auto border border-border/60 bg-card shadow-sm">
                          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-950/20 flex items-center justify-center">
                                <Video className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                              </div>
                            </div>
                            <div>
                              <div className="text-2xl font-black tracking-tight">
                                {categorizedEvents.recording.length} Event{categorizedEvents.recording.length !== 1 ? 's' : ''}
                              </div>
                              <div className="text-xs font-semibold text-muted-foreground mt-0.5">Recording Attempts</div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Tab Switching Card */}
                        <Card className="snap-start shrink-0 w-[240px] md:w-auto border border-border/60 bg-card shadow-sm">
                          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-950/20 flex items-center justify-center">
                                <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                              </div>
                            </div>
                            <div>
                              <div className="text-2xl font-black tracking-tight">
                                {categorizedEvents.tab.length} Event{categorizedEvents.tab.length !== 1 ? 's' : ''}
                              </div>
                              <div className="text-xs font-semibold text-muted-foreground mt-0.5">Tab Switching</div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Concurrent Logins Card */}
                        <Card className="snap-start shrink-0 w-[240px] md:w-auto border border-border/60 bg-card shadow-sm">
                          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-950/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                            </div>
                            <div>
                              <div className="text-2xl font-black tracking-tight">
                                {categorizedEvents.concurrent.length} Event{categorizedEvents.concurrent.length !== 1 ? 's' : ''}
                              </div>
                              <div className="text-xs font-semibold text-muted-foreground mt-0.5">Concurrent Logins</div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Security Score Card */}
                        <Card className="snap-start shrink-0 w-[240px] md:w-auto border border-border/60 bg-card shadow-sm">
                          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-primary" />
                              </div>
                              <Badge className={`${scoreRating.color} border text-[10px] font-bold py-0.5 px-2`}>
                                {scoreRating.text}
                              </Badge>
                            </div>
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black tracking-tight">{securityScore}%</span>
                                <span className="text-[10px] font-bold text-muted-foreground">Score</span>
                              </div>
                              <Progress value={securityScore} className={`h-1.5 mt-1.5 ${scoreRating.progressColor} rounded-full`} />
                            </div>
                          </CardContent>
                        </Card>

                      </div>
                    </div>

                    {/* 2. Categorized Security Events Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                          Security Events
                        </h3>
                        <Badge variant="outline" className="font-semibold text-xs">
                          {violations.length} Total Event{violations.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {violations.length === 0 ? (
                        <Card className="border-emerald-500/30 bg-emerald-500/5">
                          <CardContent className="p-5 flex items-center gap-4">
                            <CheckCircle className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                            <div>
                              <div className="font-semibold text-emerald-700">No security violations detected</div>
                              <div className="text-xs text-muted-foreground mt-0.5">Your account has a clean security record. Keep it up!</div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                          {/* Warning Banner */}
                          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <span className="font-semibold text-red-600">Security warnings detected on your account.</span>
                              <span className="text-muted-foreground ml-1">These events were recorded by our anti-piracy system. Repeated violations may result in account suspension.</span>
                            </div>
                          </div>

                          <Accordion type="single" collapsible className="w-full space-y-2 border-0">
                            {/* Screenshots Category */}
                            <AccordionItem value="screenshots" className="border border-border/60 bg-card rounded-xl px-4 overflow-hidden">
                              <AccordionTrigger className="hover:no-underline py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <Camera className="w-4 h-4 text-purple-500" />
                                  <span className="font-semibold text-sm">Screenshot Attempts</span>
                                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 ml-2">
                                    {categorizedEvents.screenshot.length} Attempts
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2 pb-4">
                                {categorizedEvents.screenshot.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-4">No screenshot attempts recorded.</p>
                                ) : (
                                  <div className="space-y-3 pt-2">
                                    {categorizedEvents.screenshot.map((v) => renderTimelineItem(v))}
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>

                            {/* Screen Recording Category */}
                            <AccordionItem value="recordings" className="border border-border/60 bg-card rounded-xl px-4 overflow-hidden">
                              <AccordionTrigger className="hover:no-underline py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <Video className="w-4 h-4 text-rose-500" />
                                  <span className="font-semibold text-sm">Screen Recording Detection</span>
                                  <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 ml-2">
                                    {categorizedEvents.recording.length} Attempts
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2 pb-4">
                                {categorizedEvents.recording.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-4">No screen recording attempts recorded.</p>
                                ) : (
                                  <div className="space-y-3 pt-2">
                                    {categorizedEvents.recording.map((v) => renderTimelineItem(v))}
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>

                            {/* Tab Switching Category */}
                            <AccordionItem value="tabs" className="border border-border/60 bg-card rounded-xl px-4 overflow-hidden">
                              <AccordionTrigger className="hover:no-underline py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <RefreshCw className="w-4 h-4 text-amber-500" />
                                  <span className="font-semibold text-sm">Tab Switching</span>
                                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 ml-2">
                                    {categorizedEvents.tab.length} Violations
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2 pb-4">
                                {categorizedEvents.tab.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-4">No tab switching events recorded.</p>
                                ) : (
                                  <div className="space-y-3 pt-2">
                                    {categorizedEvents.tab.map((v) => renderTimelineItem(v))}
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>

                            {/* Concurrent Logins Category */}
                            <AccordionItem value="concurrent" className="border border-border/60 bg-card rounded-xl px-4 overflow-hidden">
                              <AccordionTrigger className="hover:no-underline py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <Users className="w-4 h-4 text-blue-500" />
                                  <span className="font-semibold text-sm">Concurrent Login</span>
                                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 ml-2">
                                    {categorizedEvents.concurrent.length} Violations
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2 pb-4">
                                {categorizedEvents.concurrent.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-4">No concurrent login events recorded.</p>
                                ) : (
                                  <div className="space-y-3 pt-2">
                                    {categorizedEvents.concurrent.map((v) => renderTimelineItem(v))}
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      )}
                    </div>

                    {/* 3. Login History Section */}
                    <div>
                      <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                        <History className="w-4 h-4 text-primary" />
                        Login History
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(securityLogs?.loginHistory || []).slice(0, 6).map((log: any, i: number) => {
                          const parsed = parseUserAgentDetails(log.userAgent);
                          const { date, time } = formatTimelineDateTime(log.createdAt);
                          const isCurrent = i === 0;
                          return (
                            <Card key={log._id || i} className={`border-border/60 bg-card ${isCurrent ? 'border-primary/40 bg-primary/5' : ''}`}>
                              <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                                    {log.userAgent?.toLowerCase().includes('mobile') ? <Smartphone className="w-5 h-5 text-muted-foreground" /> : <Laptop className="w-5 h-5 text-muted-foreground" />}
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="text-sm font-bold text-foreground">{parsed.os}</div>
                                    <div className="text-xs font-semibold text-muted-foreground">{parsed.browser}</div>
                                    <div className="text-xs text-muted-foreground">IP: {log.ipAddress}</div>
                                  </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1.5">
                                  {isCurrent && <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">Current Device</Badge>}
                                  <div className="text-xs font-semibold text-foreground">Last Active: {time}</div>
                                  <div className="text-[10px] text-muted-foreground/80">{date}</div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Active Sessions Section */}
                    <div>
                      <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                        <Smartphone className="w-4 h-4 text-primary" />
                        Active Devices
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(securityLogs?.activeSessions || []).map((session: any, i: number) => {
                          const parsed = parseUserAgentDetails(session.userAgent);
                          const lastActiveStr = formatLastActive(session.lastActive || new Date(), session.isCurrent);
                          return (
                            <Card key={session.id || i} className={`border-border/60 bg-card ${session.isCurrent ? 'border-primary/40 bg-primary/5' : ''}`}>
                              <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    {session.userAgent?.toLowerCase().includes('mobile') ? <Smartphone className="w-5 h-5 text-primary" /> : <Laptop className="w-5 h-5 text-primary" />}
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="text-sm font-bold text-foreground">{parsed.os}</div>
                                    <div className="text-xs font-semibold text-muted-foreground">{parsed.browser}</div>
                                    <div className="text-xs text-muted-foreground">IP: {session.ipAddress}</div>
                                  </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1.5">
                                  {session.isCurrent ? (
                                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">Current Device</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground border-border text-[10px] font-semibold">Active Session</Badge>
                                  )}
                                  <div className="text-xs text-muted-foreground/85 font-medium">Last Active: {lastActiveStr}</div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={async () => {
                            try {
                              await apiFetch('/student-account/sessions/terminate-others', { method: 'POST' });
                              const data = await apiFetch('/auth/security-logs');
                              setSecurityLogs(data);
                            } catch (e: any) { alert(e.message || 'Failed to terminate other sessions'); }
                          }}
                        >
                          Logout Other Devices
                        </Button>
                      </div>
                    </div>

                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6 text-primary" /> Notification Center</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={async () => { await apiFetch('/student-notifications/mark-all-read', { method: 'POST' }); loadNotifications(); }}>
                      Mark All As Read
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <Card key={n._id} className={`border ${n.read ? 'border-border/50' : 'border-primary/40 bg-primary/5'}`}>
                      <CardContent className="p-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{n.type?.toUpperCase() || 'SYSTEM'}</div>
                          <div className="text-xs text-muted-foreground mt-1">{n.message}</div>
                          <div className="text-xs text-muted-foreground mt-2">{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="flex gap-2">
                          {!n.read && (
                            <Button size="sm" variant="outline" onClick={async () => { await apiFetch(`/student-notifications/${n._id}/read`, { method: 'POST' }); loadNotifications(); }}>
                              Read
                            </Button>
                          )}
                          {n.userId && (
                            <Button size="sm" variant="outline" onClick={async () => { await apiFetch(`/student-notifications/${n._id}`, { method: 'DELETE' }); loadNotifications(); }}>
                              Delete
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {notifications.length === 0 && (
                    <Card><CardContent className="p-8 text-center text-muted-foreground">No notifications available.</CardContent></Card>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'live-classes' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2"><Video className="w-6 h-6 text-primary" /> Live Classes</h2>
                  <p className="text-muted-foreground text-sm mt-1">Join scheduled virtual classes for your assigned batches</p>
                </div>

                {liveClassesLoading ? (
                  <div className="grid gap-4">
                    {[1, 2].map((n) => <div key={n} className="h-28 bg-muted rounded-2xl animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Upcoming Classes */}
                    <div className="space-y-3">
                      <h3 className="font-bold text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        Upcoming & Live Lectures
                      </h3>
                      <div className="grid gap-3">
                        {liveClasses.filter(c => new Date(c.endTime) > new Date() && c.status !== 'cancelled').sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map((lc) => {
                          const isLive = lc.status === 'live' || (new Date(lc.startTime) <= new Date() && new Date(lc.endTime) >= new Date());
                          return (
                            <Card key={lc._id} className={`border-border/60 bg-card hover:border-primary/20 transition-all ${isLive ? 'border-primary/50 shadow-md shadow-primary/5' : ''}`}>
                              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 min-w-0">
                                  <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-border/50">
                                    <img src={lc.courseId?.thumbnail || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800'} alt="Course" className="w-full h-full object-cover" />
                                    {isLive && (
                                      <div className="absolute inset-0 bg-red-600/20 backdrop-blur-[1px] flex items-center justify-center">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-sm truncate">{lc.title}</span>
                                      {isLive ? (
                                        <Badge className="bg-red-500/15 text-red-500 border border-red-500/30 text-[10px] uppercase font-bold tracking-wider animate-pulse">Live Now</Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-blue-500 border-blue-500/30 text-[10px] uppercase">Upcoming</Badge>
                                      )}
                                      {lc.hasAttended && (
                                        <Badge className="bg-green-500/15 text-green-500 border border-green-500/30 text-[10px] uppercase font-semibold">Attended</Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate mt-0.5">{lc.courseId?.title || 'Batch'} · {lc.facultyId?.name || 'Faculty Instructor'}</div>
                                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                                      <Clock className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                                      <span>Start: {new Date(lc.startTime).toLocaleString()}</span>
                                      <span>· End: {new Date(lc.endTime).toLocaleTimeString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-end">
                                  <Badge variant="secondary" className="px-2.5 py-1 text-xs">{lc.platform}</Badge>
                                  <Button
                                    className="bg-primary hover:bg-[#1f5fa7] text-white text-xs px-4 h-9 min-h-9"
                                    onClick={async () => {
                                      try {
                                        const res = await apiFetch(`/live-classes/${lc._id}/join`, { method: 'POST' });
                                        if (res.meetingUrl) {
                                          toast.success('Attendance recorded!', { description: 'Opening lecture window...' });
                                          window.open(res.meetingUrl, '_blank');
                                          // Reload list to update attended badge
                                          const refreshed = await apiFetch('/live-classes');
                                          setLiveClasses(refreshed || []);
                                        }
                                      } catch (err: any) {
                                        toast.error('Failed to join live class', { description: err.message });
                                      }
                                    }}
                                  >
                                    Join Class
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                        {liveClasses.filter(c => new Date(c.endTime) > new Date() && c.status !== 'cancelled').length === 0 && (
                          <div className="p-8 text-center border border-dashed border-border rounded-xl">
                            <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                            <p className="text-sm text-muted-foreground">No upcoming live classes scheduled.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Past Classes */}
                    <div className="space-y-3 pt-2">
                      <h3 className="font-bold text-base flex items-center gap-2">
                        <History className="w-4 h-4 text-muted-foreground" />
                        Completed Lectures History
                      </h3>
                      <div className="grid gap-3">
                        {liveClasses.filter(c => new Date(c.endTime) <= new Date() || c.status === 'completed' || c.status === 'cancelled').sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()).map((lc) => (
                          <Card key={lc._id} className="border-border/60 bg-muted/10 opacity-75">
                            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border/50 bg-background">
                                  <img src={lc.courseId?.thumbnail || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800'} alt="Course" className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm truncate">{lc.title}</span>
                                    <Badge variant="outline" className={lc.status === 'cancelled' ? 'text-red-500 border-red-500/20 bg-red-500/5' : 'text-green-500 border-green-500/20 bg-green-500/5'}>
                                      {lc.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                                    </Badge>
                                    {lc.hasAttended && (
                                      <Badge className="bg-green-500/15 text-green-500 border-green-500/30 text-[10px] font-semibold">Attended</Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{lc.courseId?.title || 'Batch'} · {lc.facultyId?.name || 'Faculty Instructor'}</div>
                                  <div className="text-xs text-muted-foreground mt-1">Held: {new Date(lc.startTime).toLocaleString()}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-end text-xs text-muted-foreground font-medium">
                                <span>{lc.platform}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {liveClasses.filter(c => new Date(c.endTime) <= new Date() || c.status === 'completed' || c.status === 'cancelled').length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">No past live classes recorded.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'access' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
                <Card className="border-border/50 bg-card shadow-sm">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Key className="w-5 h-5 text-primary" />
                      <span>Access & Subscription Status</span>
                    </CardTitle>
                    <CardDescription>
                      View your manually assigned content packages and active enrollment details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div>
                      {/* Package details */}
                      <div className="p-5 rounded-2xl border bg-gradient-to-br from-violet-600/5 to-indigo-600/5 border-violet-500/20 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <Package className="w-5 h-5 text-violet-500" />
                          <h4 className="font-bold text-sm text-foreground">Content Package</h4>
                        </div>
                        {user?.assignedPackage ? (
                          <div className="space-y-2">
                            <div className="text-sm font-extrabold text-violet-950">{user.assignedPackage.name}</div>
                            {user.packageExpiryDate && (
                              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-violet-500" />
                                <span>Expires on: {new Date(user.packageExpiryDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic font-medium">No custom content packages assigned by your institute.</p>
                        )}
                      </div>
                    </div>

                    {/* Custom Permissions Overrides List */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Key className="w-4 h-4 text-primary" />
                        <span>Direct Permission Rules & Locks</span>
                      </h4>

                      {rulesLoading ? (
                        <div className="text-center py-6 text-xs text-muted-foreground">Loading rules...</div>
                      ) : (
                        <div className="border border-border/40 rounded-2xl overflow-hidden bg-card shadow-sm">
                          <Table className="w-full">
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead className="text-xs font-bold px-4 py-2">Granted Target</TableHead>
                                <TableHead className="text-xs font-bold px-4 py-2">Scope Level</TableHead>
                                <TableHead className="text-xs font-bold px-4 py-2">Status</TableHead>
                                <TableHead className="text-xs font-bold px-4 py-2">Valid Until</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rules.map(rule => {
                                const targetDetail =
                                  rule.accessType === 'lesson' && rule.lessonId ? `Topic: ${rule.lessonId.title}` :
                                    rule.accessType === 'module' ? `Module: ${rule.moduleId}` :
                                      rule.accessType === 'subject' ? `Subject: ${rule.subjectId}` :
                                        rule.courseId?.title || 'Unknown Batch';

                                return (
                                  <TableRow key={rule._id} className="hover:bg-muted/10">
                                    <TableCell className="font-semibold text-xs text-foreground px-4 py-3">
                                      {targetDetail}
                                    </TableCell>
                                    <TableCell className="text-xs capitalize font-medium text-slate-500 px-4 py-3">
                                      {rule.accessType === 'course' ? 'batch' : rule.accessType === 'lesson' ? 'topic' : rule.accessType}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                      <Badge
                                        variant={rule.status === 'active' ? 'default' : 'destructive'}
                                        className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 ${rule.status === 'active' ? 'bg-green-500/10 text-green-600 border border-green-500/30' :
                                            rule.status === 'locked' ? 'bg-red-500/15 text-red-500 border border-red-500/25' :
                                              'bg-yellow-500/10 text-yellow-600 border border-yellow-500/30'
                                          }`}
                                      >
                                        {rule.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs font-semibold text-slate-500 px-4 py-3">
                                      {rule.expiryDate ? new Date(rule.expiryDate).toLocaleDateString() : 'Lifetime'}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              {rules.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground font-semibold">
                                    No custom overrides. Your access is mapped directly via your batch and package.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6 max-w-2xl">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input placeholder="Name" value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} />
                      <Input value={user?.email || ''} disabled />
                      <Input placeholder="Phone" value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} />
                      <Input value={String(user?.user_id || '')} disabled />
                      <Input value={String(user?.institute?.name || '')} disabled />
                    </div>
                    <Button onClick={async () => {
                      try {
                        const updated = await apiFetch('/student-account/profile', { method: 'PUT', body: JSON.stringify(profileForm) });
                        localStorage.setItem('user', JSON.stringify(updated));
                        setUser(updated);
                      } catch (e: any) { alert(e.message || 'Failed to update profile'); }
                    }}>Save Profile</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Input type="password" placeholder="Current Password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))} />
                    <Input type="password" placeholder="New Password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))} />
                    <Input type="password" placeholder="Confirm Password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))} />
                    <div className="text-xs text-muted-foreground">Strength: {passwordForm.newPassword.length >= 12 ? 'Strong' : passwordForm.newPassword.length >= 8 ? 'Medium' : 'Weak'}</div>
                    <Button onClick={async () => {
                      try {
                        const resp = await apiFetch('/student-account/password/change', { method: 'POST', body: JSON.stringify(passwordForm) });
                        alert(resp.message || 'Password changed. Please login again.');
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        navigate('/');
                      } catch (e: any) { alert(e.message || 'Failed to change password'); }
                    }}>Change Password</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Account Recovery</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Input type="email" placeholder="Email for recovery" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                    <Button variant="outline" onClick={async () => {
                      try {
                        const resp = await apiFetch('/student-account/password/request-reset', { method: 'POST', body: JSON.stringify({ email: resetEmail }) });
                        alert(`Reset link generated. Token (dev): ${resp.resetToken}`);
                      } catch (e: any) { alert(e.message || 'Failed to request reset'); }
                    }}>
                      Send Reset Link
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

          </div>
        </ScrollArea>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav items={studentNavItems} onItemClick={setActiveTab} />
    </div>
  );
}
