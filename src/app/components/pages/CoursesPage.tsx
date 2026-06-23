import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Search,
  Star,
  Clock,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Award,
  TrendingUp,
  Sparkles,
  AlertCircle,
  Home,
  Settings,
  Bell,
  LogOut,
  GraduationCap,
  Video,
  Building2,
  Users,
  ShieldCheck,
  FileText,
  Key,
  Bookmark
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ThemeToggleButton } from '../ThemeToggle';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { MobileNav, studentNavItems } from '../MobileNav';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { apiFetch } from '../../utils/api';
import { initializePushNotifications } from '../../utils/pushManager';

const categories = ['All', 'Development', 'Data Science', 'Design', 'Cloud', 'Business'];
const levels = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];

export default function CoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All Levels');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('enrolled');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [user, setUser] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [violationCount, setViolationCount] = useState(0);
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const freshUser = await apiFetch('/auth/profile');
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
        
        // Load unread notifications count
        const notifData = await apiFetch('/student-notifications');
        setUnreadNotifications(notifData.unreadCount || 0);

        // Load security status
        const securityRes = await apiFetch('/security/status', { ignoreAuthError: true });
        if (securityRes) {
          setViolationCount(securityRes.violationCount || 0);
        }
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

  const loadCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/courses');
      setCourses(data);

      const history = await apiFetch('/progress/history');
      setWatchHistory(history);
    } catch (err: any) {
      setError(err.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    initializePushNotifications().catch(err => console.error('Push init failed:', err));
  }, []);

  const handleAccessRequest = async (courseId: string) => {
    try {
      await apiFetch('/purchases/checkout', {
        method: 'POST',
        body: JSON.stringify({ courseId })
      });
      alert('Access request submitted successfully!');
      loadCourses();
    } catch (err: any) {
      alert(err.message || 'Failed to request access');
    }
  };

  const handleCourseClick = async (course: any) => {
    if (course.slug && course.slug !== 'undefined') {
      navigate(`/program/${course.slug}`);
    } else {
      try {
        const data = await apiFetch(`/courses/${course._id}`);
        if (data?.slug && data.slug !== 'undefined') {
          navigate(`/program/${data.slug}`);
        } else {
          alert('Course path could not be resolved.');
        }
      } catch (err) {
        console.error('Failed to fetch course slug:', err);
        alert('Failed to resolve course path.');
      }
    }
  };

  const filteredCourses = courses.filter((course) => {
    const courseCategory = course.category || 'Development';
    const courseLevel = course.level || 'Beginner';

    const matchesCategory = selectedCategory === 'All' || courseCategory === selectedCategory;
    const matchesLevel = selectedLevel === 'All Levels' || courseLevel === selectedLevel;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (course.instructor || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // course.isPurchased is added in backend for student role
    const matchesTab = activeTab === 'all' || (activeTab === 'enrolled' && course.isPurchased);
    return matchesCategory && matchesLevel && matchesSearch && matchesTab;
  });

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

  return (
    <div className="flex min-h-screen overflow-hidden bg-background text-foreground pb-safe-nav lg:pb-0">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-sidebar border-r border-sidebar-border shrink-0">
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
                    // Already here
                  } else {
                    localStorage.setItem('trineo_student_active_tab', item.id);
                    navigate(`/student?tab=${item.id}`);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  item.id === 'courses'
                    ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/10 text-foreground border border-violet-500/30 shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.id === 'notifications' && unreadNotifications > 0 && (
                  <span className="ml-auto w-5 h-5 bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400 text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                    {unreadNotifications}
                  </span>
                )}
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
            {/* Search Placeholder */}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 relative">
            <ThemeToggleButton />
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

        {/* Content Scroll Area */}
        <ScrollArea className="flex-1">
          <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
            
            {/* Illustration Banner */}
            <div className="relative bg-gradient-to-r from-blue-50/60 via-indigo-50/20 to-purple-50/40 dark:from-indigo-950/10 dark:via-purple-950/5 dark:to-transparent border border-border/60 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center gap-6 overflow-hidden">
              <div className="max-w-xl space-y-4 relative z-10 flex-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <BookOpen className="w-3.5 h-3.5" />
                  My Learning Batches
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  My Learning Batches
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                  Access your enrolled training cohorts and continue learning
                </p>

                {/* Search Input */}
                <div className="relative max-w-md w-full pt-2">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search your batches, instructors, topics..."
                    className="pl-12 h-12 bg-card/80 border-border/60 backdrop-blur"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Laptop Student Illustration */}
              <div className="relative shrink-0 z-10 pr-4">
                <img 
                  src="/student_laptop_beanbag.png" 
                  alt="Student on beanbag with laptop" 
                  className="w-52 sm:w-60 md:w-64 h-auto object-contain drop-shadow-md"
                />
              </div>
            </div>

            {/* Error handling */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}



            {/* Course cards grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-80 bg-muted rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {/* Desktop layout: grid cards */}
                <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredCourses.map((course, index) => {
                    const lessonsForCourse = watchHistory.filter(h => h.courseId?._id === course._id);
                    const progressVal = lessonsForCourse.length > 0 
                      ? Math.round(lessonsForCourse.reduce((sum, curr) => sum + curr.progress, 0) / lessonsForCourse.length)
                      : 0;

                    // Dynamic gradient backgrounds for card banners matching mockup
                    const gradientBanners = [
                      'from-amber-400 to-yellow-500 text-amber-950',
                      'from-indigo-600 via-purple-600 to-pink-600 text-white',
                      'from-slate-900 via-slate-800 to-indigo-900 text-white',
                      'from-emerald-500 via-teal-600 to-cyan-600 text-white'
                    ];
                    const bannerGradient = course.title.toLowerCase().includes('bca')
                      ? 'from-yellow-200 via-yellow-100 to-amber-200 border border-amber-500/20 text-amber-950'
                      : gradientBanners[index % gradientBanners.length];

                    return (
                      <motion.div
                        key={course._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.4) }}
                      >
                        <Card 
                          className="group cursor-pointer overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all bg-card flex flex-col h-full rounded-2xl"
                          onClick={() => handleCourseClick(course)}
                        >
                          <div className={`relative aspect-video flex flex-col justify-between p-4 overflow-hidden bg-gradient-to-br ${bannerGradient}`}>
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            <div className="flex justify-between items-start w-full z-10">
                              {course.isLocked ? (
                                <Badge className="bg-red-500/90 text-white border-0 font-bold text-[10px]">
                                  🔒 Locked
                                </Badge>
                              ) : (
                                <Badge className="bg-white/20 backdrop-blur-md text-foreground font-bold border-0 text-[10px]">
                                  🟢 Active
                                </Badge>
                              )}
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center text-center z-10 py-2">
                              {course.title.toLowerCase().includes('bca') ? (
                                <div className="space-y-0.5">
                                  <h1 className="text-4xl font-black text-red-600 tracking-wider">BCA</h1>
                                  <p className="text-[10px] text-amber-900 font-bold">Bachelor of Computer Applications</p>
                                </div>
                              ) : (
                                <h2 className="text-base font-black px-2 line-clamp-2 leading-snug tracking-wide text-center">
                                  {course.title}
                                </h2>
                              )}
                            </div>

                            {course.isPurchased && !course.isLocked && (
                              <div className="w-full bg-black/40 backdrop-blur-md rounded-lg p-2 z-10">
                                <div className="flex items-center justify-between mb-1 text-[10px] text-white font-bold">
                                  <span>Your Progress</span>
                                  <span>{progressVal}%</span>
                                </div>
                                <Progress value={progressVal} className="h-1 bg-white/20" />
                              </div>
                            )}

                            {course.isPurchased && !course.isLocked && (
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center">
                                  <PlayCircle className="w-8 h-8 text-white fill-current" />
                                </div>
                              </div>
                            )}
                          </div>

                          <CardContent className="p-4 flex-1 flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] font-semibold">
                                  {course.category || 'Development'}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-semibold">
                                  {course.level || 'Beginner'}
                                </Badge>
                              </div>

                              <h3 className="font-bold text-sm text-foreground line-clamp-1 leading-snug">
                                {course.title}
                              </h3>

                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{course.instructor || 'GFI Faculty'}</span>
                                <div className="flex items-center gap-0.5">
                                  <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                                  <span className="font-bold text-foreground">{(course.rating || 4.5).toFixed(1)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {course.duration || '12h 30m'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3.5 h-3.5" />
                                  {course.lessonsCount !== undefined ? `${course.lessonsCount} Topics` : '2 Topics'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-8 w-8 border-border/60 flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    alert('Bookmarked!');
                                  }}
                                >
                                  <Bookmark className="w-3.5 h-3.5" />
                                </Button>

                                {course.isLocked ? (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="text-muted-foreground flex items-center gap-1 bg-muted font-bold text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCourseClick(course);
                                    }}
                                  >
                                    <span>🔒 Locked</span>
                                  </Button>
                                ) : course.isPurchased ? (
                                  <Button
                                    size="sm"
                                    className="bg-primary hover:bg-[#1f5fa7] text-white shadow-sm shadow-primary/10 font-bold text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCourseClick(course);
                                    }}
                                  >
                                    Continue Learning
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-xs font-semibold border-primary/30"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAccessRequest(course._id);
                                    }}
                                  >
                                    <Sparkles className="w-3.5 h-3.5 mr-1 text-primary" />
                                    Request
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Mobile layout: horizontal stacked list */}
                <div className="flex flex-col gap-4 lg:hidden">
                  {filteredCourses.map((course, index) => {
                    const lessonsForCourse = watchHistory.filter(h => {
                      const progId = h.contentId?.lessonId?.unitId?.subjectId?.programId?._id || h.courseId?._id;
                      return progId && progId.toString() === course._id.toString();
                    });
                    const progressVal = lessonsForCourse.length > 0 
                      ? Math.round(lessonsForCourse.reduce((sum, curr) => sum + curr.progress, 0) / lessonsForCourse.length)
                      : 0;

                    // Compute completion estimate based on progress or mock completed topics
                    const lessonsCount = course.lessonsCount || 10;
                    const completedCount = lessonsForCourse.filter(h => h.completed).length;
                    const completionEst = lessonsCount > 0 ? Math.min(100, Math.round((completedCount / lessonsCount) * 100)) : progressVal;

                    return (
                      <motion.div
                        key={course._id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                        onClick={() => handleCourseClick(course)}
                        className="flex gap-3 bg-card border border-border/50 rounded-2xl p-3 h-[112px] min-h-[112px] hover:shadow-md transition-all active:scale-[0.98] cursor-pointer relative overflow-hidden group select-none touch-btn animate-in fade-in-50 duration-200"
                      >
                        {/* Thumbnail Icon */}
                        <div className="w-24 h-full rounded-xl overflow-hidden flex-shrink-0 relative border border-border/10 bg-muted">
                          {course.thumbnail ? (
                            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-violet-600 to-indigo-650 flex flex-col items-center justify-center font-black text-white text-xs text-center p-1">
                              {course.title.toLowerCase().includes('bca') ? (
                                <>
                                  <span className="text-lg font-black tracking-wider text-white">BCA</span>
                                  <span className="text-[7px] text-indigo-200 font-bold uppercase">Cohort</span>
                                </>
                              ) : (
                                <span className="text-[10px] line-clamp-3 leading-snug px-1 text-center font-extrabold">{course.title}</span>
                              )}
                            </div>
                          )}
                          
                          {/* Play overlay */}
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                            <PlayCircle className="w-6 h-6 text-white fill-white drop-shadow" />
                          </div>
                        </div>

                        {/* Right Content Column */}
                        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-extrabold text-[13px] text-foreground truncate leading-none">
                                {course.title}
                              </h3>
                              {course.isLocked ? (
                                <span className="text-[9px] font-bold text-red-500 shrink-0">🔒 Locked</span>
                              ) : (
                                <span className="text-[9px] font-bold text-emerald-500 shrink-0">🟢 Active</span>
                              )}
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-[10px] text-muted-foreground truncate font-medium">Instructor: {course.instructor || 'GFI Faculty'}</p>
                              <span className="text-[9px] font-black text-primary flex items-center gap-0.5">
                                Continue Learning <ChevronRight className="w-2.5 h-2.5" />
                              </span>
                            </div>
                          </div>

                          {/* Progress slider & estimate */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] font-bold">
                              <span className="text-muted-foreground">{completedCount} of {lessonsCount} Topics Completed</span>
                              <span className="text-primary font-black font-extrabold">Est. progress: {completionEst}%</span>
                            </div>
                            <Progress value={progressVal} className="h-1 bg-muted [&>div]:bg-primary" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Bottom info banner */}
            {!loading && courses.length > 0 && (
              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-center gap-2 text-center text-xs sm:text-sm font-semibold text-primary">
                <Star className="w-4 h-4 fill-primary text-primary" />
                Keep learning! Complete your batches and unlock new achievements.
              </div>
            )}

            {/* Empty State */}
            {!loading && courses.length === 0 && (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No Batches Assigned</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  You have not been assigned to a batch yet. Please contact your institute administrator.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav 
        items={studentNavItems} 
        unreadCount={unreadNotifications} 
        violationCount={violationCount} 
      />
    </div>
  );
}
