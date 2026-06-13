import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Search,
  Filter,
  Star,
  Clock,
  PlayCircle,
  ChevronLeft,
  BookOpen,
  Award,
  TrendingUp,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ThemeToggleButton } from '../ThemeToggle';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { MobileNav, studentNavItems } from '../MobileNav';
import { apiFetch } from '../../utils/api';

const categories = ['All', 'Development', 'Data Science', 'Design', 'Cloud', 'Business'];
const levels = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];

export default function CoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All Levels');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      navigate(`/course/${course.slug}`);
    } else {
      try {
        const data = await apiFetch(`/courses/${course._id}`);
        if (data?.slug && data.slug !== 'undefined') {
          navigate(`/course/${data.slug}`);
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
                          course.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    
    // course.isPurchased is added in backend for student role
    const matchesTab = activeTab === 'all' || (activeTab === 'enrolled' && course.isPurchased);
    return matchesCategory && matchesLevel && matchesSearch && matchesTab;
  });

  return (
    <div className="min-h-screen bg-background text-foreground pb-safe-nav lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 h-14 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto h-full flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => navigate('/student')}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg sm:text-xl font-bold truncate">Explore Courses</h1>
          </div>
          <ThemeToggleButton />
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative bg-sidebar border-b border-sidebar-border">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-600/10 via-background/0 to-background/0"></div>
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Discover Your Next<br />Learning Adventure
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Access premium courses from world-class instructors and accelerate your career
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search for courses, instructors, topics..."
                className="pl-12 h-14 bg-card/80 border-border/50 backdrop-blur"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-card border border-border w-full max-w-full flex flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="all" className="min-h-11 flex-1 sm:flex-none">
                <BookOpen className="w-4 h-4 mr-2" />
                All Courses
              </TabsTrigger>
              <TabsTrigger value="enrolled" className="min-h-11 flex-1 sm:flex-none">
                <PlayCircle className="w-4 h-4 mr-2" />
                My Courses
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap gap-4 mb-8"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={
                  selectedCategory === category
                    ? 'bg-primary text-white shadow-sm shadow-primary/10'
                    : ''
                }
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Level Filter */}
          <div className="flex flex-wrap gap-2">
            {levels.map((level) => (
              <Button
                key={level}
                variant={selectedLevel === level ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLevel(level)}
                className={
                  selectedLevel === level
                    ? 'bg-primary text-white shadow-sm shadow-primary/10'
                    : ''
                }
              >
                {level}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Course Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
            <div key={n} className="h-80 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course, index) => {
              const lessonsForCourse = watchHistory.filter(h => h.courseId?._id === course._id);
              const progressVal = lessonsForCourse.length > 0 
                ? Math.round(lessonsForCourse.reduce((sum, curr) => sum + curr.progress, 0) / lessonsForCourse.length)
                : 0;

              return (
                <motion.div
                  key={course._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.5) }}
                >
                  <Card 
                    className="group cursor-pointer overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all bg-card"
                    onClick={() => handleCourseClick(course)}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        {course.isLocked && (
                          <Badge className="bg-red-500/90 text-white border-0 font-bold">
                            🔒 Locked
                          </Badge>
                        )}
                        {course.price > 80 && (
                          <Badge className="bg-yellow-500/90 text-black border-0">
                            <Award className="w-3 h-3 mr-1" />
                            Bestseller
                          </Badge>
                        )}
                      </div>

                      {/* Enrolled Progress */}
                      {course.isPurchased && !course.isLocked && (
                        <div className="absolute bottom-3 left-3 right-3">
                          <div className="bg-black/50 backdrop-blur-xl rounded-lg p-2">
                            <div className="flex items-center justify-between mb-1 text-xs text-white">
                              <span>Your Progress</span>
                              <span>{progressVal}%</span>
                            </div>
                            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-slate-700"
                                style={{ width: `${progressVal}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Play Button Overlay */}
                      {course.isPurchased && !course.isLocked && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
                            <PlayCircle className="w-10 h-10 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {course.category || 'Development'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {course.level || 'Beginner'}
                        </Badge>
                      </div>

                      <h3 className="font-semibold mb-2 line-clamp-2 min-h-[3rem]">
                        {course.title}
                      </h3>

                      <p className="text-sm text-muted-foreground mb-3">{course.instructor}</p>

                      <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                          <span className="font-medium text-foreground">{(course.rating || 0).toFixed(1)}</span>
                          <span>Rating</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {course.duration || '12h 30m'}
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {course.lessonsCount !== undefined ? `${course.lessonsCount} Lesson${course.lessonsCount !== 1 ? 's' : ''}` : '0 Lessons'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="text-sm font-semibold text-muted-foreground">Course Access</span>
                        {course.isLocked ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-muted-foreground flex items-center gap-1 bg-muted font-bold"
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
                            className="bg-primary hover:bg-[#1f5fa7] text-white shadow-sm shadow-primary/10 font-bold"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCourseClick(course);
                            }}
                          >
                            ▶ Continue Learning
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAccessRequest(course._id);
                            }}
                          >
                            <Sparkles className="w-4 h-4 mr-1 text-primary" />
                            Request Access
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredCourses.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No courses found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or search query
            </p>
            <Button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedLevel('All Levels');
                setSearchQuery('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav items={studentNavItems} />
    </div>
  );
}
