import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
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
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
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

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
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
        setRules(data || []);
      } catch (err) {
        console.error('Failed to load student access rules:', err);
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
    // Navigate to the video page - default to video index 0
    const selectedCourse = purchasedCourses.find((course: any) => course._id === courseId) ||
                           allCourses.find((course: any) => course._id === courseId);
    if (selectedCourse?.slug && selectedCourse.slug !== 'undefined') {
      navigate(`/course/${selectedCourse.slug}`);
    } else if (selectedCourse?._id) {
      // Fallback: fetch course to resolve slug
      try {
        const course = await apiFetch(`/courses/${selectedCourse._id}`);
        if (course?.slug && course.slug !== 'undefined') {
          navigate(`/course/${course.slug}`);
        } else {
          alert('Course path could not be resolved.');
        }
      } catch (err) {
        console.error('Failed to resolve course slug:', err);
        alert('Failed to resolve course path.');
      }
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      await apiFetch('/purchases/checkout', {
        method: 'POST',
        body: JSON.stringify({ courseId })
      });
      // reload
      const myCourses = await apiFetch('/purchases/my-courses');
      setPurchasedCourses(myCourses);
      const courses = await apiFetch('/courses');
      setAllCourses(courses);
    } catch (err: any) {
      alert(err.message || 'Purchase failed');
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
    const lessonHistory = watchHistory.filter(h => h.courseId?._id === course._id);
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
          <div className="flex items-center gap-3">
            {user?.institute?.logo ? (
              <img
                src={user.institute.logo}
                alt={user.institute.name}
                className="w-10 h-10 object-contain rounded-xl"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold leading-tight truncate">{user?.institute?.name || 'Learning Portal'}</h1>
              <p className="text-xs text-violet-500 font-semibold tracking-wide mt-0.5">Student Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="mb-3">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-widest rounded-full border text-muted-foreground bg-muted border-border">Navigation</span>
          </div>
          <div className="space-y-1">
            {[
              { icon: Home, label: 'Dashboard', id: 'home' },
              { icon: BookOpen, label: 'Explore Courses', id: 'courses' },
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
                  }
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  activeTab === item.id
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
              <img
                src={user.institute.logo}
                alt={user.institute.name}
                className="w-8 h-8 object-contain rounded-lg"
              />
            ) : (
              <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
            )}
            <h1 className="text-lg font-bold truncate max-w-[150px]">{user?.institute?.name || 'Learning Portal'}</h1>
          </div>

          <div className="hidden lg:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search your assigned courses..."
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
                        } catch (_e) {}
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
                  <Button size="sm" variant="outline" onClick={() => setActiveTab('notifications')}>
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
              placeholder="Search courses..."
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">

                {/* 1️⃣ STUDENT PROFILE CARD */}
                <Card className="relative overflow-hidden border-border/50 bg-card">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent pointer-events-none" />
                  <CardContent className="relative p-0">
                    {/* Top banner */}
                    <div className="h-24 bg-gradient-to-r from-primary/80 to-primary/40 rounded-t-xl relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),transparent_60%)]" />
                    </div>
                    {/* Profile info row */}
                    <div className="px-6 pb-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10">
                        <div className="relative">
                          <Avatar className="w-20 h-20 border-4 border-card shadow-xl">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'student'}`} />
                            <AvatarFallback className="text-2xl font-bold bg-primary text-white">{user?.name?.[0] || 'S'}</AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <h2 className="text-xl font-bold truncate">{user?.name || 'Student'}</h2>
                              <p className="text-sm text-muted-foreground">{user?.email}</p>
                              <div className="mt-1 flex items-center gap-1.5 text-xs">
                                {user?.syncStatus === 'success' && (
                                  <span className="text-green-500 font-medium flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Sync Success (Last Sync: {user.lastSyncedAt ? new Date(user.lastSyncedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Today'})
                                  </span>
                                )}
                                {user?.syncStatus === 'failed' && (
                                  <span className="text-destructive font-medium flex items-center gap-1" title={user.lastSyncError || 'CRM API offline'}>
                                    <AlertCircle className="w-3 h-3" /> Sync Failed (Showing Cached Data)
                                  </span>
                                )}
                                {user?.syncStatus === 'pending' && (
                                  <span className="text-amber-500 font-medium flex items-center gap-1 animate-pulse">
                                    <RefreshCw className="w-3 h-3 animate-spin" /> Syncing profile data...
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {user?.institute?.logo ? (
                                <img src={user.institute.logo} alt={user.institute.name} className="w-8 h-8 object-contain rounded-lg" />
                              ) : (
                                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                                  <GraduationCap className="w-4 h-4 text-white" />
                                </div>
                              )}
                              <span className="text-sm font-semibold text-primary">{user?.institute?.name || 'Learning Portal'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ID Card Grid */}
                      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {[
                          { label: 'Student ID', value: user?.crmStudentId || user?.studentId || user?.user_id || 'N/A', icon: <Award className="w-3.5 h-3.5" /> },
                          { label: 'Batch', value: user?.batchName || 'N/A', icon: <Users className="w-3.5 h-3.5" /> },
                          { label: 'Program', value: user?.program || user?.courseName || 'N/A', icon: <BookOpen className="w-3.5 h-3.5" /> },
                          { label: 'Branch', value: user?.branchName || user?.institute?.branchName || 'Main Campus', icon: <Building2 className="w-3.5 h-3.5" /> },
                          { label: 'Enrolled', value: user?.enrollmentDate ? new Date(user.enrollmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A', icon: <Clock className="w-3.5 h-3.5" /> },
                          { label: 'Faculty', value: user?.faculty || purchasedCourses[0]?.instructor || 'N/A', icon: <Users className="w-3.5 h-3.5" /> },
                          { label: 'Courses', value: `${totalCourses} Enrolled`, icon: <PlayCircle className="w-3.5 h-3.5" /> },
                          { label: 'Status', value: 'Active', icon: <CheckCircle className="w-3.5 h-3.5 text-green-500" /> },
                        ].map((item) => (
                          <div key={item.label} className="bg-muted/50 border border-border/60 rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                              {item.icon}
                              <span className="text-xs font-semibold uppercase tracking-wider">{item.label}</span>
                            </div>
                            <div className="text-sm font-semibold truncate">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { label: 'Courses Enrolled', value: totalCourses, icon: <BookOpen className="w-5 h-5" />, color: 'from-violet-500/20 to-violet-600/10 border-violet-500/20' },
                    { label: 'Watch Hours', value: `${watchHours}h`, icon: <Clock className="w-5 h-5" />, color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20' },
                    { label: 'Lessons Done', value: completedLessons, icon: <CheckCircle className="w-5 h-5" />, color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20' },
                  ].map((stat) => (
                    <Card key={stat.label} className={`bg-gradient-to-br ${stat.color} border text-center p-4`}>
                      <div className="flex justify-center mb-2 text-primary">{stat.icon}</div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                    </Card>
                  ))}
                </div>

                {/* 2️⃣ RECENT ACTIVITY — Resume Learning */}
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
                    <History className="w-5 h-5 text-primary" />
                    Recent Activity
                  </h3>
                  {watchHistory.length === 0 ? (
                    <Card className="p-8 text-center border-dashed border-border">
                      <PlayCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">No watch history yet. Start a lesson to see your progress here.</p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {watchHistory.slice(0, 4).map((entry: any, i: number) => {
                        const courseTitle = entry.courseId?.title || 'Course';
                        const lessonTitle = entry.lessonId?.title || 'Lesson';
                        const progress = entry.progress || 0;
                        const watchedAt = entry.watchedAt ? new Date(entry.watchedAt) : new Date();
                        const relativeTime = (() => {
                          const diff = Date.now() - watchedAt.getTime();
                          const mins = Math.floor(diff / 60000);
                          if (mins < 60) return `${mins}m ago`;
                          const hrs = Math.floor(mins / 60);
                          if (hrs < 24) return `${hrs}h ago`;
                          return watchedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                        })();
                         const courseSlug = entry.courseId?.slug;
                         const lessonSlug = entry.lessonId?.slug;
                         return (
                          <Card key={i} className="border-border/60 bg-card hover:border-primary/30 transition-all group">
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <PlayCircle className="w-6 h-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{lessonTitle}</div>
                                <div className="text-xs text-muted-foreground truncate mb-2">{courseTitle} · {relativeTime}</div>
                                <div className="flex items-center gap-2">
                                  <Progress value={progress} className="h-1.5 flex-1" />
                                  <span className="text-xs font-semibold text-primary shrink-0">{progress}%</span>
                                </div>
                              </div>
                               {((courseSlug && lessonSlug) || (entry.courseId?._id && entry.lessonId?._id)) && (
                                 <Button
                                   size="sm"
                                   className="shrink-0 bg-primary hover:bg-primary/80 text-white text-xs px-3 min-h-11 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                   onClick={async () => {
                                     if (courseSlug && lessonSlug && courseSlug !== 'undefined' && lessonSlug !== 'undefined') {
                                       navigate(`/course/${courseSlug}/lesson/${lessonSlug}`);
                                     } else {
                                       try {
                                         const resolvedCourseId = entry.courseId?._id;
                                         const resolvedLessonId = entry.lessonId?._id;
                                         if (!resolvedCourseId) return;

                                         const courseData = await apiFetch(`/courses/${resolvedCourseId}`);
                                         const targetLesson = (courseData.lessons || []).find((l: any) => l._id === resolvedLessonId);
                                         if (courseData.slug && targetLesson?.slug) {
                                           navigate(`/course/${courseData.slug}/lesson/${targetLesson.slug}`);
                                         } else if (courseData.slug) {
                                           navigate(`/course/${courseData.slug}`);
                                         } else {
                                           alert('Failed to resolve course path.');
                                         }
                                       } catch (err) {
                                         console.error('Failed to resolve legacy slugs:', err);
                                         alert('Failed to resolve course path.');
                                       }
                                     }
                                   }}
                                 >
                                   Resume
                                 </Button>
                               )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3️⃣ ANNOUNCEMENTS + CONTINUE WATCHING in a 2-col layout */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Institute Announcements */}
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
                      <Bell className="w-5 h-5 text-primary" />
                      Institute Announcements
                    </h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {announcements.length > 0 ? announcements.map((ann: any, index: number) => (
                        <Card key={index} className="border-border/60 bg-card hover:border-primary/20 transition-all">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Bell className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-primary mb-0.5">{ann.title}</div>
                                <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{ann.message}</div>
                                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground/60">
                                  <span>By: {ann.author}</span>
                                  <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )) : (
                        <Card className="p-6 text-center border-dashed border-border">
                          <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                          <p className="text-sm text-muted-foreground">No announcements yet.</p>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* Continue Watching */}
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
                      <PlayCircle className="w-5 h-5 text-primary" />
                      Continue Watching
                    </h3>
                    <div className="space-y-3">
                      {continueWatching.length > 0 ? continueWatching.map((course: any) => (
                        <Card
                          key={course._id}
                          className="border-border/60 bg-card hover:border-primary/30 cursor-pointer transition-all group"
                          onClick={() => handleVideoClick(course._id)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
                              <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <PlayCircle className="w-5 h-5 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate">{course.title}</div>
                              <Progress value={course.progress} className="h-1 mt-1.5" />
                              <div className="text-xs text-muted-foreground mt-1">{course.progress}% complete</div>
                            </div>
                          </CardContent>
                        </Card>
                      )) : (
                        <Card className="p-6 text-center border-dashed border-border">
                          <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                          <p className="text-sm text-muted-foreground">Please contact your institute to activate course access.</p>
                          <Button size="sm" className="mt-3" onClick={() => navigate('/student/courses')}>View Courses</Button>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>

                {/* My Courses Grid */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Assigned Courses
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/student/courses')}>
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3].map((n) => <div key={n} className="h-48 bg-muted rounded-2xl animate-pulse" />)}
                    </div>
                  ) : filteredPurchased.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-border rounded-2xl">
                      <PlayCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <h4 className="font-semibold text-lg">No courses have been assigned to you yet.</h4>
                      <p className="text-muted-foreground mb-4">Please contact your institute administrator to activate course access.</p>
                      <Button onClick={() => navigate('/student/courses')}>View Courses</Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredPurchased.map((course: any) => {
                        const lessonsForCourse = watchHistory.filter((h: any) => h.courseId?._id === course._id);
                        const avgProgress = lessonsForCourse.length > 0
                          ? Math.round(lessonsForCourse.reduce((sum: number, current: any) => sum + current.progress, 0) / lessonsForCourse.length)
                          : 0;
                        return (
                          <Card
                            key={course._id}
                            className="group cursor-pointer overflow-hidden border-border/50 hover:border-primary/30 transition-all bg-card"
                            onClick={() => handleVideoClick(course._id)}
                          >
                            <div className="relative aspect-video overflow-hidden">
                              <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <div className="absolute bottom-2 left-2 right-2">
                                <Progress value={avgProgress} className="h-1" />
                              </div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
                                  <PlayCircle className="w-8 h-8 text-white" />
                                </div>
                              </div>
                            </div>
                            <CardContent className="p-4">
                              <h4 className="font-semibold mb-1 line-clamp-1">{course.title}</h4>
                              <p className="text-sm text-muted-foreground mb-2">{course.instructor}</p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{avgProgress}% complete</span>
                                <span>{course.duration || 'N/A'}</span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                    <p className="text-muted-foreground text-sm mt-1">Course documents, notes, and resources from your faculty</p>
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
                    <option value="">All Assigned Courses</option>
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
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        selectedMaterialType === type
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
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-red-500/10 text-red-600 border-red-500/20">
                                    {String(material.fileType || 'pdf').toUpperCase()}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{material.courseTitle || 'Unknown Course'}</span>
                                  <span className="text-xs text-muted-foreground">· {material.uploaderName || 'Faculty'}</span>
                                  <span className="text-xs text-muted-foreground">· {((material.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB</span>
                                  <span className="text-xs text-muted-foreground">· {new Date(material.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity gap-1.5"
                                onClick={() => {
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
                  <p className="text-muted-foreground text-sm mt-1">Meet your course instructors and reach out directly</p>
                </div>

                {facultyLoading ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((n) => <div key={n} className="h-48 bg-muted rounded-2xl animate-pulse" />)}
                  </div>
                ) : facultyList.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-border rounded-2xl">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                    <h4 className="font-semibold">No faculty profiles available yet</h4>
                    <p className="text-muted-foreground text-sm mt-1">Activate course access to see your assigned faculty.</p>
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
                  <h2 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" /> Security & Devices</h2>
                  <p className="text-muted-foreground text-sm mt-1">Manage your active sessions and review login history</p>
                </div>

                {securityLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((n) => <div key={n} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Current Device */}
                    <Card className="border-emerald-500/30 bg-emerald-500/5">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <h3 className="font-bold text-sm text-emerald-600 uppercase tracking-wide">Current Session</h3>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <Laptop className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="text-sm font-semibold truncate">{securityLogs?.currentDevice?.userAgent?.split('(')[0]?.trim() || 'Browser'}</div>
                            <div className="text-xs text-muted-foreground">IP: {securityLogs?.currentDevice?.ipAddress || '127.0.0.1'}</div>
                            <div className="text-xs text-muted-foreground">Session: ···{securityLogs?.currentDevice?.sessionId || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">Last Active: {new Date().toLocaleTimeString()}</div>
                          </div>
                          <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 text-xs">Active</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Login History */}
                    <div>
                      <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                        <History className="w-4 h-4 text-primary" />
                        Login History
                      </h3>
                      <div className="space-y-2">
                        {(securityLogs?.loginHistory || []).slice(0, 6).map((log: any, i: number) => {
                          const ua = log.userAgent || '';
                          const isChrome = ua.toLowerCase().includes('chrome');
                          const isSafari = ua.toLowerCase().includes('safari') && !isChrome;
                          const isFirefox = ua.toLowerCase().includes('firefox');
                          const isMobile = ua.toLowerCase().includes('mobile');
                          const browserLabel = isFirefox ? 'Firefox' : isSafari ? 'Safari' : isChrome ? 'Chrome' : 'Browser';
                          const osLabel = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : 'Device';
                          return (
                            <Card key={i} className={`border-border/60 bg-card ${i === 0 ? 'border-primary/30' : ''}`}>
                              <CardContent className="p-4 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                  {isMobile ? <Smartphone className="w-4 h-4 text-muted-foreground" /> : <Laptop className="w-4 h-4 text-muted-foreground" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium">{browserLabel} on {osLabel}</div>
                                  <div className="text-xs text-muted-foreground">IP: {log.ipAddress} · {new Date(log.createdAt).toLocaleString()}</div>
                                </div>
                                {i === 0 && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Current</Badge>}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>

                    {/* Security Violations */}
                    <div>
                      <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-orange-500" />
                        Anti-Piracy Security Log
                        {(securityLogs?.securityViolations || []).length > 0 && (
                          <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-xs ml-1">
                            {(securityLogs?.securityViolations || []).length} Alert{(securityLogs?.securityViolations || []).length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </h3>

                      {(securityLogs?.securityViolations || []).length === 0 ? (
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
                        <div className="space-y-2">
                          {/* Warning banner */}
                          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 mb-3">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <span className="font-semibold text-red-600">Security warnings detected on your account.</span>
                              <span className="text-muted-foreground ml-1">These events were recorded by our anti-piracy system. Repeated violations may result in account suspension.</span>
                            </div>
                          </div>

                          {(securityLogs?.securityViolations || []).slice(0, 5).map((v: any, i: number) => (
                            <Card key={i} className="border-red-500/20 bg-red-500/5">
                              <CardContent className="p-4 flex items-start gap-3">
                                <Lock className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold capitalize text-red-600">
                                    {v.eventType?.replace(/_/g, ' ')}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{formatSecurityDetails(v.details)}</div>
                                  <div className="text-xs text-muted-foreground/60 mt-1">{new Date(v.createdAt).toLocaleString()}</div>
                                </div>
                                <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs shrink-0">Alert</Badge>
                              </CardContent>
                            </Card>
                          ))}

                          {(securityLogs?.securityViolations || []).length > 5 && (
                            <p className="text-xs text-muted-foreground text-center pt-1">
                              +{(securityLogs?.securityViolations || []).length - 5} more recorded events
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Active Sessions */}
                    <div>
                      <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                        <Smartphone className="w-4 h-4 text-primary" />
                        Active Sessions
                      </h3>
                      {(securityLogs?.activeSessions || []).map((session: any, i: number) => (
                        <Card key={i} className={`border-border/60 bg-card ${session.isCurrent ? 'border-primary/30' : ''}`}>
                          <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Laptop className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold">{session.isCurrent ? 'This Device' : 'Other Device'}</div>
                              <div className="text-xs text-muted-foreground">IP: {session.ipAddress} · Active just now</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {session.isCurrent && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Current</Badge>}
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
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
                  <p className="text-muted-foreground text-sm mt-1">Join scheduled virtual classes for your assigned courses</p>
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
                                    <div className="text-xs text-muted-foreground truncate mt-0.5">{lc.courseId?.title || 'Course'} · {lc.facultyId?.name || 'Faculty Instructor'}</div>
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
                                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{lc.courseId?.title || 'Course'} · {lc.facultyId?.name || 'Faculty Instructor'}</div>
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
                      View your manually assigned content packages, batch groups, and active enrollment details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                      {/* Batch Group details */}
                      <div className="p-5 rounded-2xl border bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-blue-500/20 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <Users className="w-5 h-5 text-blue-500" />
                          <h4 className="font-bold text-sm text-foreground">Academic Batch Group</h4>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-extrabold text-blue-950">{user?.batchName || 'General Batch'}</div>
                          <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                            You inherit all content permissions assigned to this batch by your institute coordinators.
                          </p>
                        </div>
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
                                  rule.accessType === 'lesson' && rule.lessonId ? `Lesson: ${rule.lessonId.title}` :
                                  rule.accessType === 'module' ? `Module: ${rule.moduleId}` :
                                  rule.accessType === 'subject' ? `Subject: ${rule.subjectId}` :
                                  rule.courseId?.title || 'Unknown Course';

                                return (
                                  <TableRow key={rule._id} className="hover:bg-muted/10">
                                    <TableCell className="font-semibold text-xs text-foreground px-4 py-3">
                                      {targetDetail}
                                    </TableCell>
                                    <TableCell className="text-xs capitalize font-medium text-slate-500 px-4 py-3">
                                      {rule.accessType}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                      <Badge
                                        variant={rule.status === 'active' ? 'default' : 'destructive'}
                                        className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 ${
                                          rule.status === 'active' ? 'bg-green-500/10 text-green-600 border border-green-500/30' :
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
                      <Input value={String(user?.batchName || '')} disabled />
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
