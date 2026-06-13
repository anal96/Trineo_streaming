import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Users,
  DollarSign,
  BookOpen,
  TrendingUp,
  Upload,
  Search,
  Filter,
  Plus,
  PencilLine,
  Trash2,
  UserPlus,
  UserMinus,
  Layers3,
  Bell,
  Settings,
  LogOut,
  GraduationCap,
  Video,
  FileText,
  Activity,
  Award,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  ShieldCheck,
  Loader2,
  Palette,
  Building2,
  Save,
  Link2,
  RefreshCw,
  Unlink2,
  Calendar,
  Key
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { apiFetch, getApiUrl } from '../../utils/api';
import { ThemeToggleButton } from '../ThemeToggle';
import { PanelDrawerNav } from '../responsive/PanelDrawerNav';
import { ResponsiveDataView, MobileRecordCard } from '../responsive/ResponsiveDataView';
import StudyMaterialsManagement from './StudyMaterialsManagement';
import LessonManagementSuite from './LessonManagementSuite';
import SecurityCenter from './SecurityCenter';
import StudentImportCenter from './StudentImportCenter';
import AnalyticsUpgrade from './AnalyticsUpgrade';
import LiveClassesManagement from './LiveClassesManagement';
import ContentAccessManager from './ContentAccessManager';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dynamic metrics & statistics from API
  const [metrics, setMetrics] = useState<any>({
    totalStudents: 0,
    totalRevenue: 0,
    activeCourses: 0,
    completionRate: '0%'
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [topCourses, setTopCourses] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<any[]>([]);

  // Enterprise additions
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [videoJobs, setVideoJobs] = useState<any[]>([]);

  // Branding state
  const [brandingInstituteName, setBrandingInstituteName] = useState('');
  const [brandingLogo, setBrandingLogo] = useState('');
  const [brandingFavicon, setBrandingFavicon] = useState('');
  const [brandingBrandColor, setBrandingBrandColor] = useState('#7c3aed');
  const [brandingSecondaryColor, setBrandingSecondaryColor] = useState('#4f46e5');
  const [brandingBranchName, setBrandingBranchName] = useState('');
  const [brandingSupportEmail, setBrandingSupportEmail] = useState('');
  const [brandingSupportPhone, setBrandingSupportPhone] = useState('');
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Course creation state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseInstructor, setNewCourseInstructor] = useState('');
  const [newCourseThumbnail, setNewCourseThumbnail] = useState('');
  const [newCoursePrice, setNewCoursePrice] = useState('');
  const [newCourseDuration, setNewCourseDuration] = useState('');

  // Student management state
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [newStudentStatus, setNewStudentStatus] = useState<'active' | 'inactive'>('active');
  const [newStudentBatch, setNewStudentBatch] = useState('');
  const [newStudentBranch, setNewStudentBranch] = useState('');
  const [newStudentCourseName, setNewStudentCourseName] = useState('');
  const [newStudentEnrollmentDate, setNewStudentEnrollmentDate] = useState('');
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Video upload state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCourseId, setUploadCourseId] = useState('');
  const [uploadDuration, setUploadDuration] = useState('');
  const [uploadIsLocked, setUploadIsLocked] = useState(true);
  const [uploadOrder, setUploadOrder] = useState('1');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadAttachmentUrl, setUploadAttachmentUrl] = useState('');
  const [uploadAttachmentName, setUploadAttachmentName] = useState('');
  
  const [selectedUploadCourseId, setSelectedUploadCourseId] = useState('');
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [selectedUploadModule, setSelectedUploadModule] = useState('');
  const [availableLessons, setAvailableLessons] = useState<any[]>([]);
  const [selectedUploadLessonId, setSelectedUploadLessonId] = useState('');
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [youtubeIntegration, setYoutubeIntegration] = useState<any>({
    youtubeConnected: false,
    youtubeChannelName: '',
    youtubeChannelId: '',
    youtubeConnectedAt: null,
    youtubeLastSync: null,
    videosUploaded: 0
  });
  const [youtubeActionLoading, setYoutubeActionLoading] = useState(false);

  const [studentSearch, setStudentSearch] = useState('');

  // Load CRM details on mount
  const loadCrmData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/analytics/overview');
      setMetrics(data.metrics);
      setRevenueData(data.revenueData);
      setTopCourses(data.topCourses);
      setStudentsList(data.students);
      setRecentActivity(data.recentActivity);

      const courses = await apiFetch('/courses');
      setCoursesList(courses);

      const payments = await apiFetch('/purchases/pending-payments');
      setPendingPayments(payments);

      const jobs = await apiFetch('/videos/jobs');
      setVideoJobs(jobs);
      try {
        const ytStatus = await apiFetch('/videos/youtube/integration/status');
        setYoutubeIntegration(ytStatus);
      } catch (_e) {}

      // Load current institute branding
      try {
        const profile = await apiFetch('/auth/profile');
        if (profile) {
          localStorage.setItem('user', JSON.stringify(profile));
        }
        const institute = profile?.institute;
        if (institute) {
          setBrandingInstituteName(institute.name || '');
          setBrandingLogo(institute.logo || '');
          setBrandingFavicon(institute.favicon || '');
          setBrandingBrandColor(institute.theme?.brandColor || '#7c3aed');
          setBrandingSecondaryColor(institute.theme?.secondaryColor || '#4f46e5');
          setBrandingBranchName(institute.branchName || '');
          setBrandingSupportEmail(institute.supportEmail || '');
          setBrandingSupportPhone(institute.supportPhone || '');
        }
      } catch (_) {}
    } catch (err: any) {
      setError(err.message || 'Failed to load administrator metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCrmData();
  }, []);

  useEffect(() => {
    const onOAuthResult = async (event: MessageEvent) => {
      if (!event?.data || event.data.type !== 'YOUTUBE_CONNECT_RESULT') return;
      if (event.data.success) {
        const status = await apiFetch('/videos/youtube/integration/status');
        setYoutubeIntegration(status);
        toast.success('YouTube Channel Connected', {
          description: `Channel Name: ${event.data.channelName || status.youtubeChannelName || 'Connected Channel'}`
        });
      } else {
        toast.error('Connection Failed', {
          description: event.data.message || 'Unable to connect your YouTube channel.'
        });
      }
    };
    window.addEventListener('message', onOAuthResult);
    return () => window.removeEventListener('message', onOAuthResult);
  }, []);

  // Poll video processing status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTab === 'upload') {
      interval = setInterval(async () => {
        try {
          const jobs = await apiFetch('/videos/jobs');
          setVideoJobs(jobs);
        } catch (e) {}
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  const tabLabels: Record<string, string> = {
    overview: 'Dashboard',
    students: 'Student Management',
    upload: 'Video Library',
    lessons: 'Course Builder',
    materials: 'Study Materials',
    liveClasses: 'Live Classes',
    accessManager: 'Access Management',
    import: 'Student Import',
    securityCenter: 'Security Center',
    payments: 'Analytics',
    announcements: 'Notifications',
    branding: 'Institute Branding',
    youtubeIntegration: 'YouTube Integration'
  };

  const navItems = [
    { icon: Activity, label: 'Dashboard', id: 'overview' },
    { icon: Video, label: 'Video Library', id: 'upload' },
    { icon: BookOpen, label: 'Course Builder', id: 'lessons' },
    { icon: FileText, label: 'Study Materials', id: 'materials' },
    { icon: Calendar, label: 'Live Classes', id: 'liveClasses' },
    { icon: Key, label: 'Access Manager', id: 'accessManager' },
    { icon: Users, label: 'Student Import', id: 'import' },
    { icon: ShieldCheck, label: 'Security Center', id: 'securityCenter' },
    { icon: Users, label: 'Student Management', id: 'students' },
    { icon: TrendingUp, label: 'Analytics', id: 'payments' },
    { icon: Bell, label: 'Notifications', id: 'announcements' },
    { icon: Palette, label: 'Institute Branding', id: 'branding' },
    { icon: Settings, label: 'YouTube Integration', id: 'youtubeIntegration' }
  ];

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

  // Export students to CSV
  const exportStudentsCSV = () => {
    const header = ['ID,Name,Email,Role,Status,Phone'];
    const rows = studentsList.map(s => `"${s.user_id}","${s.name}","${s.email}","${s.role}","${s.status}","${s.phone || ''}"`);
    const csvStr = header.concat(rows).join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_export.csv';
    a.click();
  };

  // Handle manual payment verification
  const verifyPayment = async (paymentId: string, action: 'approve' | 'reject') => {
    if (!window.confirm(`Are you sure you want to ${action} this payment?`)) return;
    try {
      await apiFetch('/purchases/verify-payment', {
        method: 'POST',
        body: JSON.stringify({ paymentId, action })
      });
      loadCrmData();
    } catch (err: any) {
      alert(err.message || 'Payment verification failed.');
    }
  };

  // Toggle student active/inactive status
  const handleToggleStatus = async (studentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await apiFetch('/analytics/student-status', {
        method: 'POST',
        body: JSON.stringify({ studentId, status: nextStatus })
      });
      // reload lists
      loadCrmData();
    } catch (err: any) {
      alert(err.message || 'Status toggle failed.');
    }
  };

  const openCreateCourseModal = () => {
    setEditingCourse(null);
    setNewCourseTitle('');
    setNewCourseDesc('');
    setNewCourseInstructor('');
    setNewCourseThumbnail('');
    setNewCoursePrice('');
    setNewCourseDuration('');
    setShowCourseModal(true);
  };

  const openEditCourseModal = (course: any) => {
    setEditingCourse(course);
    setNewCourseTitle(course.title || '');
    setNewCourseDesc(course.description || '');
    setNewCourseInstructor(course.instructor || '');
    setNewCourseThumbnail(course.thumbnail || '');
    setNewCoursePrice(String(course.price ?? ''));
    setNewCourseDuration(course.duration || '');
    setShowCourseModal(true);
  };

  const handleSubmitCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle || !newCourseInstructor || !newCoursePrice) {
      alert('Please fill in required fields');
      return;
    }

    const payload = {
      title: newCourseTitle,
      description: newCourseDesc,
      instructor: newCourseInstructor,
      thumbnail: newCourseThumbnail || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
      price: Number(newCoursePrice),
      duration: newCourseDuration || '10h',
      status: editingCourse?.status || 'active'
    };

    try {
      if (editingCourse?._id) {
        await apiFetch(`/courses/${editingCourse._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/courses', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setShowCourseModal(false);
      setEditingCourse(null);
      setNewCourseTitle('');
      setNewCourseDesc('');
      setNewCourseInstructor('');
      setNewCourseThumbnail('');
      setNewCoursePrice('');
      setNewCourseDuration('');
      loadCrmData();
    } catch (err: any) {
      alert(err.message || 'Failed to save course');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('Delete this course and its lessons?')) return;
    try {
      await apiFetch(`/courses/${courseId}`, { method: 'DELETE' });
      loadCrmData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete course');
    }
  };

  const handleToggleCourseStatus = async (course: any) => {
    try {
      await apiFetch(`/courses/${course._id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: course.status === 'active' ? 'inactive' : 'active' })
      });
      loadCrmData();
    } catch (err: any) {
      alert(err.message || 'Failed to update course status');
    }
  };

  const openCreateStudentModal = () => {
    setEditingStudent(null);
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentPhone('');
    setNewStudentPassword('');
    setNewStudentStatus('active');
    setNewStudentBatch('');
    setNewStudentBranch('');
    setNewStudentCourseName('');
    setNewStudentEnrollmentDate('');
    setShowStudentModal(true);
  };

  const openEditStudentModal = (student: any) => {
    setEditingStudent(student);
    setNewStudentName(student.name || '');
    setNewStudentEmail(student.email || '');
    setNewStudentPhone(student.phone || '');
    setNewStudentPassword('');
    setNewStudentStatus(student.status === 'inactive' ? 'inactive' : 'active');
    setNewStudentBatch(student.batchName || '');
    setNewStudentBranch(student.branchName || '');
    setNewStudentCourseName(student.courseName || '');
    setNewStudentEnrollmentDate(student.enrollmentDate ? student.enrollmentDate.slice(0, 10) : '');
    setShowStudentModal(true);
  };

  const handleSubmitStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentEmail) {
      alert('Please fill in the student name and email');
      return;
    }

    const payload = {
      name: newStudentName,
      email: newStudentEmail,
      phone: newStudentPhone,
      password: newStudentPassword,
      status: newStudentStatus,
      batchName: newStudentBatch,
      branchName: newStudentBranch,
      courseName: newStudentCourseName,
      enrollmentDate: newStudentEnrollmentDate || undefined
    };

    try {
      if (editingStudent?.id) {
        await apiFetch(`/analytics/students/${editingStudent.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/analytics/students', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setShowStudentModal(false);
      setEditingStudent(null);
      setNewStudentName('');
      setNewStudentEmail('');
      setNewStudentPhone('');
      setNewStudentPassword('');
      setNewStudentStatus('active');
      setNewStudentBatch('');
      setNewStudentBranch('');
      setNewStudentCourseName('');
      setNewStudentEnrollmentDate('');
      loadCrmData();
    } catch (err: any) {
      alert(err.message || 'Failed to save student');
    }
  };

  // Save branding settings
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandingInstituteName) {
      alert('Institute name is required');
      return;
    }
    setBrandingSaving(true);
    setBrandingSuccess('');
    try {
      await apiFetch('/analytics/branding', {
        method: 'PUT',
        body: JSON.stringify({
          name: brandingInstituteName,
          logo: brandingLogo,
          favicon: brandingFavicon,
          branchName: brandingBranchName,
          supportEmail: brandingSupportEmail,
          supportPhone: brandingSupportPhone,
          theme: {
            brandColor: brandingBrandColor,
            secondaryColor: brandingSecondaryColor
          }
        })
      });
      setBrandingSuccess('Institute branding updated successfully!');
      
      // Update local storage and trigger live updates immediately
      try {
        const profile = await apiFetch('/auth/profile');
        if (profile) {
          localStorage.setItem('user', JSON.stringify(profile));
        }
      } catch (_) {}
    } catch (err: any) {
      alert(err.message || 'Failed to save branding settings');
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm('Delete this student and related records?')) return;
    try {
      await apiFetch(`/analytics/students/${studentId}`, { method: 'DELETE' });
      setSelectedStudentIds((current) => current.filter((id) => id !== studentId));
      loadCrmData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete student');
    }
  };

  const handleAssignCourse = async (studentId: string) => {
    if (!selectedCourseForEnrollment) {
      alert('Select a course first.');
      return;
    }
    try {
      await apiFetch('/purchases/admin/assign-course', {
        method: 'POST',
        body: JSON.stringify({ studentId, courseId: selectedCourseForEnrollment })
      });
      loadCrmData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign course');
    }
  };

  const handleRemoveCourse = async (studentId: string) => {
    if (!selectedCourseForEnrollment) {
      alert('Select a course first.');
      return;
    }
    try {
      await apiFetch('/purchases/admin/remove-course', {
        method: 'POST',
        body: JSON.stringify({ studentId, courseId: selectedCourseForEnrollment })
      });
      loadCrmData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove course');
    }
  };

  const handleBulkEnroll = async () => {
    if (!selectedCourseForEnrollment || selectedStudentIds.length === 0) {
      alert('Select a course and at least one student.');
      return;
    }
    try {
      await apiFetch('/purchases/admin/bulk-enroll', {
        method: 'POST',
        body: JSON.stringify({ courseId: selectedCourseForEnrollment, studentIds: selectedStudentIds })
      });
      setSelectedStudentIds([]);
      loadCrmData();
    } catch (err: any) {
      alert(err.message || 'Bulk enrollment failed');
    }
  };

  // Create course action
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle || !newCourseInstructor || !newCoursePrice) {
      alert('Please fill in required fields');
      return;
    }

    try {
      await apiFetch('/courses', {
        method: 'POST',
        body: JSON.stringify({
          title: newCourseTitle,
          description: newCourseDesc,
          instructor: newCourseInstructor,
          thumbnail: newCourseThumbnail || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
          price: Number(newCoursePrice),
          duration: newCourseDuration || '10h'
        })
      });

      setShowCourseModal(false);
      // Reset form
      setNewCourseTitle('');
      setNewCourseDesc('');
      setNewCourseInstructor('');
      setNewCourseThumbnail('');
      setNewCoursePrice('');
      setNewCourseDuration('');

      loadCrmData();
    } catch (err: any) {
      alert(err.message || 'Failed to create course');
    }
  };

  // OAuth YouTube Authorization flow
  const handleAuthorizeYouTube = async () => {
    try {
      const data = await apiFetch('/videos/youtube/auth');
      if (data.authUrl) {
        const popup = window.open(
          data.authUrl,
          'youtube-auth',
          'width=600,height=700,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
        );
        if (!popup) {
          toast.error('Please allow popups to connect your YouTube channel.');
          return;
        }
        popup.focus();
      } else {
        toast.error('Could not start YouTube connection.');
      }
    } catch (err: any) {
      toast.error(err.message || 'YouTube authorization failed');
    }
  };

  const syncYouTubeChannel = async () => {
    try {
      setYoutubeActionLoading(true);
      await apiFetch('/videos/youtube/integration/sync', { method: 'POST' });
      const status = await apiFetch('/videos/youtube/integration/status');
      setYoutubeIntegration(status);
    } catch (err: any) {
      alert(err.message || 'Failed to sync YouTube channel');
    } finally {
      setYoutubeActionLoading(false);
    }
  };

  const disconnectYouTubeChannel = async () => {
    if (!window.confirm('Disconnect channel? Existing lesson metadata will remain intact.')) return;
    try {
      setYoutubeActionLoading(true);
      await apiFetch('/videos/youtube/integration/disconnect', { method: 'POST' });
      const status = await apiFetch('/videos/youtube/integration/status');
      setYoutubeIntegration(status);
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect YouTube channel');
    } finally {
      setYoutubeActionLoading(false);
    }
  };

  const handleReplaceVideoAsset = async (assetId: string, file: File) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('video', file);
      const res = await apiFetch(`/videos/assets/${assetId}/replace-video`, {
        method: 'POST',
        body: formData
      });
      toast.success(res.message || 'Video replacement started in the background.');
      loadCrmData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to replace video.');
    }
  };

  const handleRetryVideoAsset = async (assetId: string) => {
    try {
      const res = await apiFetch(`/videos/assets/${assetId}/retry-upload`, {
        method: 'POST'
      });
      toast.success(res.message || 'Video upload retried.');
      loadCrmData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to retry upload.');
    }
  };

  const handleCancelVideoAsset = async (assetId: string) => {
    if (!window.confirm('Are you sure you want to cancel this upload?')) return;
    try {
      const res = await apiFetch(`/videos/assets/${assetId}/cancel-upload`, {
        method: 'POST'
      });
      toast.success(res.message || 'Video upload cancelled.');
      loadCrmData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel upload.');
    }
  };

  const handleUploadCourseChange = async (courseId: string) => {
    setSelectedUploadCourseId(courseId);
    setSelectedUploadModule('');
    setAvailableModules([]);
    setSelectedUploadLessonId('');
    setAvailableLessons([]);
    
    if (!courseId) return;
    
    try {
      const data = await apiFetch(`/lessons/course/${courseId}`);
      const uniqueModules: string[] = [];
      data.forEach((lesson: any) => {
        const title = lesson.moduleTitle || 'Module 1';
        if (!uniqueModules.includes(title)) {
          uniqueModules.push(title);
        }
      });
      setAvailableModules(uniqueModules);
    } catch (err: any) {
      toast.error('Failed to load modules for selected course.');
    }
  };

  const handleUploadModuleChange = async (moduleTitle: string) => {
    setSelectedUploadModule(moduleTitle);
    setSelectedUploadLessonId('');
    setAvailableLessons([]);
    
    if (!moduleTitle || !selectedUploadCourseId) return;
    
    try {
      const data = await apiFetch(`/lessons/course/${selectedUploadCourseId}`);
      const filtered = data.filter((lesson: any) => (lesson.moduleTitle || 'Module 1') === moduleTitle);
      setAvailableLessons(filtered);
    } catch (err: any) {
      toast.error('Failed to load lessons for selected module.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Auto-extract video duration
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          const durationSec = Math.round(video.duration);
          if (durationSec) {
            const minutes = Math.floor(durationSec / 60);
            const seconds = durationSec % 60;
            const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            setUploadDuration(formatted);
          }
        };
        video.src = URL.createObjectURL(file);
      }
    }
  };

  // Upload video file using XHR to track real progress
  const handleVideoUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadCourseId) {
      alert('Please select a course.');
      return;
    }
    if (!selectedUploadModule) {
      alert('Please select a module.');
      return;
    }
    if (!selectedUploadLessonId) {
      alert('Please select a lesson.');
      return;
    }
    if (!uploadTitle || !uploadTitle.trim()) {
      alert('Please select a video title.');
      return;
    }
    if (!selectedFile) {
      alert('Please select a video file.');
      return;
    }

    const targetLesson = availableLessons.find(l => l._id === selectedUploadLessonId);
    if (targetLesson && (targetLesson.youtubeVideoId || targetLesson.videoAssetId)) {
      const confirmReplace = window.confirm(
        `Warning: The lesson "${targetLesson.title}" already has an associated video. Uploading a new video will replace it. Do you want to proceed?`
      );
      if (!confirmReplace) {
        return;
      }
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('video', selectedFile);
    formData.append('title', uploadTitle.trim());
    formData.append('courseId', selectedUploadCourseId);
    formData.append('lessonId', selectedUploadLessonId);
    formData.append('duration', uploadDuration || '15:00');
    formData.append('attachmentUrl', uploadAttachmentUrl);
    formData.append('attachmentName', uploadAttachmentName);

    const xhr = new XMLHttpRequest();
    const token = localStorage.getItem('token');

    xhr.open('POST', getApiUrl('/videos/youtube/upload'));
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 202 || xhr.status === 200) {
        setUploadSuccess('Video uploaded successfully! Streaming and processing on YouTube in the background.');
        setUploadTitle('');
        setSelectedFile(null);
        setUploadDuration('');
        setUploadAttachmentUrl('');
        setUploadAttachmentName('');
        setSelectedUploadCourseId('');
        setSelectedUploadModule('');
        setAvailableModules([]);
        setSelectedUploadLessonId('');
        setAvailableLessons([]);
        loadCrmData();
      } else {
        const resp = JSON.parse(xhr.responseText || '{}');
        alert(resp.message || 'Upload failed');
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      alert('Network error during upload');
    };

    xhr.send(formData);
  };

  // Dispatch announcement broadcast
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle || !announcementMsg) return alert('Fill in all fields');
    try {
      await apiFetch('/analytics/announcement', {
        method: 'POST',
        body: JSON.stringify({ title: announcementTitle, message: announcementMsg })
      });
      alert('Announcement dispatched successfully!');
      setAnnouncementTitle('');
      setAnnouncementMsg('');
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch announcement.');
    }
  };

  const filteredStudents = studentsList.filter(student =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
    String(student.user_id).includes(studentSearch)
  );

  return (
    <div className="flex min-h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-sidebar border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-none">Trineo</h1>
              <p className="text-xs text-violet-500 font-semibold tracking-wide mt-0.5">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="mb-3">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-widest rounded-full border text-muted-foreground bg-muted border-border">Navigation</span>
          </div>
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
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
        <header className="min-h-14 border-b border-border bg-card/80 backdrop-blur-xl flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <PanelDrawerNav
              title="Trineo Admin"
              subtitle="Institute Manager"
              items={navItems}
              activeId={activeTab}
              onSelect={setActiveTab}
              footer={
                <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive min-h-11" onClick={handleLogout}>
                  <LogOut className="w-5 h-5" />
                  Logout
                </Button>
              }
            />
            <h2 className="text-sm font-semibold text-foreground/70 truncate">{tabLabels[activeTab] || 'Dashboard'} Panel</h2>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggleButton />
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11"
                title="Announcements"
                onClick={() => setActiveTab('announcements')}
              >
                <Bell className="w-5 h-5" />
              </Button>
            </div>
            <Button
              size="icon"
              className="sm:hidden h-11 w-11 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
              onClick={() => setShowCourseModal(true)}
              aria-label="Create course"
            >
              <Plus className="w-5 h-5" />
            </Button>
            <Button 
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20 hidden sm:inline-flex min-h-11"
              onClick={() => setShowCourseModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span>Create Course</span>
            </Button>

            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-border">
              <Avatar>
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <div className="text-sm font-medium">Administrator</div>
                <div className="text-xs text-muted-foreground">Institute Manager</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content View */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="panel-content space-y-6">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <>
                {/* Stats Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      {
                        title: 'Total Students',
                        value: metrics.totalStudents,
                        icon: Users,
                        color: 'text-primary',
                        bgColor: 'bg-primary/5',
                      },
                      {
                        title: 'Active Courses',
                        value: metrics.activeCourses,
                        icon: BookOpen,
                        color: 'text-slate-700',
                        bgColor: 'bg-slate-100',
                      },
                      {
                        title: 'Watch Hours',
                        value: metrics.watchHours ?? 0,
                        icon: Video,
                        color: 'text-primary',
                        bgColor: 'bg-primary/5',
                      },
                      {
                        title: 'New Enrollments',
                        value: metrics.newEnrollments ?? 0,
                        icon: TrendingUp,
                        color: 'text-green-600',
                        bgColor: 'bg-green-500/10',
                      },
                      {
                        title: 'Revenue',
                        value: `$${metrics.totalRevenue}`,
                        icon: DollarSign,
                        color: 'text-slate-700',
                        bgColor: 'bg-slate-100',
                      },
                      {
                        title: 'Completion Rate',
                        value: `${metrics.completionRate}%`,
                        icon: Award,
                        color: 'text-slate-700',
                        bgColor: 'bg-slate-100',
                      },
                    ].map((stat, index) => (
                      <Card key={index} className="border-border/50 bg-card">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                              <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <Badge variant="outline" className="text-green-400 border-green-500/20 bg-green-500/10">
                              +10% vs last month
                            </Badge>
                          </div>
                          <div className="text-3xl font-bold mb-1">{stat.value}</div>
                          <div className="text-sm text-muted-foreground">{stat.title}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-border/50 bg-card">
                    <CardHeader>
                      <CardTitle>Institute Revenue Analytics</CardTitle>
                      <CardDescription>Monthly growth indices</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={revenueData}>
                            <defs>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                            <XAxis dataKey="month" stroke="#666" />
                            <YAxis stroke="#666" />
                            <Area
                              type="monotone"
                              dataKey="revenue"
                              stroke="#8b5cf6"
                              fillOpacity={1}
                              fill="url(#colorRevenue)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card">
                    <CardHeader>
                      <CardTitle>Course Popularity</CardTitle>
                      <CardDescription>Active enrollments per course</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topCourses}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                            <XAxis dataKey="name" stroke="#666" />
                            <YAxis stroke="#666" />
                            <Bar dataKey="enrollments" fill="#6366f1" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Notifications logs */}
                <Card className="border-border/50 bg-card">
                  <CardHeader>
                    <CardTitle>Recent Activity Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0">
                          <div className="p-2 bg-primary/5 rounded-lg">
                            <Activity className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-medium text-foreground">{activity.user}</span>{' '}
                              <span className="text-muted-foreground">{activity.action}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* TAB 2: STUDENTS */}
            {activeTab === 'students' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <Card className="border-border/50 bg-card">
                    <CardHeader>
                      <CardTitle>{editingStudent ? 'Edit Student' : 'Add Student'}</CardTitle>
                      <CardDescription>Create or update student profiles and access status.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form className="space-y-4" onSubmit={handleSubmitStudent}>
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="Student name" />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} placeholder="student@school.edu" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input value={newStudentPhone} onChange={(e) => setNewStudentPhone(e.target.value)} placeholder="Phone number" />
                          </div>
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newStudentStatus} onChange={(e) => setNewStudentStatus(e.target.value as 'active' | 'inactive')}>
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Batch Name</Label>
                            <Input value={newStudentBatch} onChange={(e) => setNewStudentBatch(e.target.value)} placeholder="e.g. Batch 2024-A" />
                          </div>
                          <div className="space-y-2">
                            <Label>Branch</Label>
                            <Input value={newStudentBranch} onChange={(e) => setNewStudentBranch(e.target.value)} placeholder="e.g. Main Campus" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Program / Course Name</Label>
                            <Input value={newStudentCourseName} onChange={(e) => setNewStudentCourseName(e.target.value)} placeholder="e.g. BSc Computer Science" />
                          </div>
                          <div className="space-y-2">
                            <Label>Enrollment Date</Label>
                            <Input type="date" value={newStudentEnrollmentDate} onChange={(e) => setNewStudentEnrollmentDate(e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Password {editingStudent ? '(leave blank to keep current)' : ''}</Label>
                          <Input type="password" value={newStudentPassword} onChange={(e) => setNewStudentPassword(e.target.value)} placeholder="Temp password" />
                        </div>
                        <Button type="submit" className="w-full bg-primary hover:bg-[#1f5fa7] text-white">
                          {editingStudent ? 'Save Student' : 'Add Student'}
                        </Button>
                        {editingStudent && (
                          <Button type="button" variant="outline" className="w-full" onClick={() => { setEditingStudent(null); openCreateStudentModal(); }}>
                            Reset Form
                          </Button>
                        )}
                      </form>
                    </CardContent>
                  </Card>

                  <Card className="xl:col-span-2 border-border/50 bg-card">
                    <CardHeader>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <CardTitle>Enrollment Control</CardTitle>
                          <CardDescription>Assign, remove, or bulk enroll selected students into a course.</CardDescription>
                        </div>
                        <Button variant="outline" onClick={openCreateStudentModal}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          New Student
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Target Course</Label>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedCourseForEnrollment} onChange={(e) => setSelectedCourseForEnrollment(e.target.value)}>
                            <option value="">Select a course</option>
                            {coursesList.map((course) => (
                              <option key={course._id} value={course._id}>{course.title}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Selected Students</Label>
                          <div className="h-10 rounded-md border border-border bg-muted/20 px-3 flex items-center text-sm text-muted-foreground">
                            {selectedStudentIds.length} selected
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline" onClick={handleBulkEnroll}>
                          <Layers3 className="w-4 h-4 mr-2" />
                          Bulk Enroll
                        </Button>
                        <Button variant="outline" onClick={() => setSelectedStudentIds([])}>
                          Clear Selection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-border/50 bg-card">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle>Student Access Control</CardTitle>
                        <CardDescription>Manage status, profile details, and course enrollment permissions.</CardDescription>
                      </div>
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by name, email, ID..."
                            className="pl-10 bg-background/50"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                          />
                        </div>
                        <Button variant="outline" onClick={exportStudentsCSV} className="whitespace-nowrap">
                          <FileText className="w-4 h-4 mr-2" />
                          Export CSV
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveDataView
                      desktop={
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">Select</TableHead>
                              <TableHead>User ID</TableHead>
                              <TableHead>Student</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Assigned Courses</TableHead>
                              <TableHead>Avg Progress</TableHead>
                              <TableHead>Joined Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredStudents.map((student) => {
                              const checked = selectedStudentIds.includes(student.id);
                              return (
                                <TableRow key={student.id}>
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        setSelectedStudentIds((current) =>
                                          e.target.checked
                                            ? [...current, student.id]
                                            : current.filter((id) => id !== student.id)
                                        );
                                      }}
                                      className="h-4 w-4 rounded border-border"
                                    />
                                  </TableCell>
                                  <TableCell className="font-mono text-primary">{student.user_id}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <Avatar className="w-8 h-8">
                                        <AvatarImage src={student.avatar} />
                                        <AvatarFallback>ST</AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium">{student.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{student.email}</TableCell>
                                  <TableCell>{student.courses} courses</TableCell>
                                  <TableCell>{student.progress}%</TableCell>
                                  <TableCell className="text-muted-foreground">{student.joined}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={student.status === 'active' ? 'text-green-400 border-green-500/20 bg-green-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10'}
                                    >
                                      {student.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2 flex-wrap">
                                      <Button variant="outline" size="sm" className="min-h-11" onClick={() => openEditStudentModal(student)}><PencilLine className="w-4 h-4 mr-1" />Edit</Button>
                                      <Button variant="outline" size="sm" className="min-h-11" onClick={() => handleAssignCourse(student.id)}><UserPlus className="w-4 h-4 mr-1" />Assign</Button>
                                      <Button variant="outline" size="sm" className="min-h-11" onClick={() => handleRemoveCourse(student.id)}><UserMinus className="w-4 h-4 mr-1" />Remove</Button>
                                      <Button variant="ghost" size="sm" className="min-h-11 text-xs text-primary" onClick={() => handleToggleStatus(student.id, student.status)}>
                                        {student.status === 'active' ? <><ToggleRight className="w-5 h-5 text-green-400" /><span>Suspend</span></> : <><ToggleLeft className="w-5 h-5" /><span>Activate</span></>}
                                      </Button>
                                      <Button variant="outline" size="sm" className="min-h-11 border-red-500/30 text-red-500" onClick={() => handleDeleteStudent(student.id)}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      }
                      mobile={filteredStudents.map((student) => (
                        <MobileRecordCard
                          key={student.id}
                          title={student.name}
                          subtitle={student.email}
                          badges={
                            <Badge variant="outline" className={student.status === 'active' ? 'text-green-600 border-green-500/30' : 'text-red-600 border-red-500/30'}>
                              {student.status}
                            </Badge>
                          }
                          rows={[
                            { label: 'User ID', value: student.user_id },
                            { label: 'Courses', value: `${student.courses} enrolled` },
                            { label: 'Progress', value: `${student.progress}%` },
                            { label: 'Joined', value: student.joined },
                          ]}
                          actions={
                            <>
                              <Button variant="outline" size="sm" className="min-h-11 flex-1" onClick={() => openEditStudentModal(student)}>Edit</Button>
                              <Button variant="outline" size="sm" className="min-h-11 flex-1" onClick={() => handleAssignCourse(student.id)}>Assign</Button>
                              <Button variant="outline" size="sm" className="min-h-11" onClick={() => handleToggleStatus(student.id, student.status)}>
                                {student.status === 'active' ? 'Suspend' : 'Activate'}
                              </Button>
                              <Button variant="outline" size="sm" className="min-h-11 text-red-500" onClick={() => handleDeleteStudent(student.id)}>Delete</Button>
                            </>
                          }
                        />
                      ))}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 3: UPLOAD VIDEO */}
            {activeTab === 'upload' && (
              <div className="space-y-8">
                <Card className="border-border/50 bg-card">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle>Course Catalog</CardTitle>
                        <CardDescription>Create, edit, delete, publish, or unpublish institute courses.</CardDescription>
                      </div>
                      <Button onClick={openCreateCourseModal} className="bg-primary hover:bg-[#1f5fa7] text-white shadow-sm shadow-primary/10">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Course
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-hidden rounded-2xl border border-border/50">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course</TableHead>
                            <TableHead>Instructor</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {coursesList.map((course) => (
                            <TableRow key={course._id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <img src={course.thumbnail} alt={course.title} className="h-10 w-10 rounded-lg object-cover border border-border" />
                                  <div>
                                    <div className="font-medium">{course.title}</div>
                                    <div className="text-xs text-muted-foreground line-clamp-1">{course.duration || 'Self-paced'}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{course.instructor}</TableCell>
                              <TableCell>${course.price}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={course.status === 'active' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 'text-amber-500 border-amber-500/20 bg-amber-500/10'}>
                                  {course.status === 'active' ? 'Published' : 'Unpublished'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openEditCourseModal(course)}>
                                    <PencilLine className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleToggleCourseStatus(course)}>
                                    {course.status === 'active' ? <ToggleLeft className="w-4 h-4 mr-1" /> : <ToggleRight className="w-4 h-4 mr-1" />}
                                    {course.status === 'active' ? 'Unpublish' : 'Publish'}
                                  </Button>
                                  <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteCourse(course._id)}>
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Form column */}
                <Card className="lg:col-span-2 border-border/50 bg-card">
                  <CardHeader>
                    <CardTitle>Upload & Link Lesson Video</CardTitle>
                    <CardDescription>Upload video files and assign them directly to lessons during upload.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleVideoUpload} className="space-y-4">
                      {uploadSuccess && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          <span>{uploadSuccess}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="video-course">Course *</Label>
                          <select
                            id="video-course"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedUploadCourseId}
                            onChange={(e) => handleUploadCourseChange(e.target.value)}
                            required
                          >
                            <option value="">-- Choose Course --</option>
                            {coursesList.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="video-module">Module *</Label>
                          <select
                            id="video-module"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedUploadModule}
                            onChange={(e) => handleUploadModuleChange(e.target.value)}
                            required
                            disabled={!selectedUploadCourseId}
                          >
                            <option value="">-- Choose Module --</option>
                            {availableModules.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="video-lesson">Lesson / Unit *</Label>
                          <select
                            id="video-lesson"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedUploadLessonId}
                            onChange={(e) => setSelectedUploadLessonId(e.target.value)}
                            required
                            disabled={!selectedUploadModule}
                          >
                            <option value="">-- Choose Lesson --</option>
                            {availableLessons.map((l) => {
                              const isReady = l.youtubeVideoId && l.uploadStatus === 'ready';
                              const isProcessing = l.videoAssetId && l.uploadStatus !== 'ready';
                              const labelSuffix = isReady ? ' (✓ Video Linked)' : isProcessing ? ' (⏳ Processing)' : ' (🔴 Video Missing)';
                              return (
                                <option key={l._id} value={l._id}>
                                  {l.title}{labelSuffix}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="video-title">Video Title *</Label>
                          <Input
                            id="video-title"
                            placeholder="e.g. useState and useEffect deep-dive"
                            value={uploadTitle}
                            onChange={(e) => setUploadTitle(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="video-duration">Video Duration</Label>
                          <Input
                            id="video-duration"
                            placeholder="e.g. 14:25"
                            value={uploadDuration}
                            onChange={(e) => setUploadDuration(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="video-attachment-name">Attachment Name</Label>
                          <Input
                            id="video-attachment-name"
                            placeholder="e.g. Class 12 Cost Accounting Notes (PDF)"
                            value={uploadAttachmentName}
                            onChange={(e) => setUploadAttachmentName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="video-attachment-url">Attachment URL</Label>
                        <Input
                          id="video-attachment-url"
                          placeholder="e.g. https://drive.google.com/file/d/..."
                          value={uploadAttachmentUrl}
                          onChange={(e) => setUploadAttachmentUrl(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Select MP4 Video File *</Label>
                        <div className="border border-dashed border-border/80 rounded-2xl p-6 text-center hover:border-primary/30 transition-colors">
                          <input
                            type="file"
                            accept="video/*"
                            id="file-input"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                          <label htmlFor="file-input" className="cursor-pointer space-y-2 block">
                            <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                            <div className="text-sm font-medium">
                              {selectedFile ? selectedFile.name : 'Click to select MP4 file'}
                            </div>
                            <div className="text-xs text-muted-foreground">Supports files up to 3GB</div>
                          </label>
                        </div>
                      </div>

                      {uploading && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>{uploadProgress === 100 ? 'Streaming to YouTube...' : 'Uploading video file...'}</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-slate-700 transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-[#1f5fa7] text-white shadow-sm shadow-primary/10"
                        disabled={uploading}
                      >
                        {uploading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{uploadProgress === 100 ? 'Processing...' : 'Uploading...'}</span>
                          </div>
                        ) : (
                          <span>Upload & Link</span>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Info Card column */}
                <Card className="border-border/50 bg-card">
                  <CardHeader>
                    <CardTitle>Categories & Integrations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 text-sm text-muted-foreground leading-relaxed">
                    <div className="flex flex-wrap gap-2">
                      {['Accounting', 'AI', 'Data Science', 'Programming'].map((category) => (
                        <Badge key={category} variant="outline" className="rounded-full border-border/60 bg-muted/20 px-3 py-1 text-foreground">
                          {category}
                        </Badge>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <p>
                        When you submit a lesson, Trineo Stream streams it to your institute’s YouTube channel as an <strong>unlisted</strong> video.
                      </p>
                      <p>
                        <strong>Zero server storage:</strong> no permanent video files are stored locally.
                      </p>
                      <p>
                        <strong>HLS ready:</strong> the same lesson pipeline can support HLS manifests when you attach a stream URL.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border space-y-3">
                      <h4 className="font-semibold text-foreground">YouTube Connection</h4>
                      <p className="text-xs">
                        Manage channel connection from Settings → YouTube Integration. Uploads are blocked until a channel is connected.
                      </p>
                      <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/5" onClick={() => setActiveTab('youtubeIntegration')}>
                        Open YouTube Integration Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Video Processing Status Table */}
              <Card className="mt-8 border-border/50 bg-card">
                <CardHeader>
                  <CardTitle>Video Library Assets</CardTitle>
                  <CardDescription>Manage independent video library assets, track YouTube processing, or replace video files.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Video Title</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>System Message</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {videoJobs.map((job) => {
                        const progress = job.uploadStatus === 'ready' ? 100 : job.uploadProgressPercent || 0;
                        const isUploaded = job.uploadStatus === 'ready' || (job.uploadStatus === 'youtube_processing' && progress >= 100);

                        return (
                          <TableRow key={job._id}>
                            <TableCell className="font-medium">{job.title}</TableCell>
                            <TableCell className="text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</TableCell>
                            <TableCell>
                              {job.uploadStatus === 'pending' && <Badge variant="outline" className="text-muted-foreground bg-muted/10">Pending</Badge>}
                              {job.uploadStatus === 'uploading' && <Badge variant="outline" className="text-amber-400 border-amber-500/20 bg-amber-500/10">Uploading</Badge>}
                              {job.uploadStatus === 'youtube_processing' && !isUploaded && <Badge variant="outline" className="text-blue-400 border-blue-500/20 bg-blue-500/10 animate-pulse">YouTube Processing</Badge>}
                              {isUploaded && <Badge variant="outline" className="text-green-400 border-green-500/20 bg-green-500/10">Uploaded</Badge>}
                              {job.uploadStatus === 'failed' && <Badge variant="outline" className="text-red-400 border-red-500/20 bg-red-500/10">Failed</Badge>}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${job.uploadStatus === 'failed' ? 'bg-red-500' : isUploaded ? 'bg-green-500' : 'bg-blue-500'}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-xs">{progress}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {job.uploadStatus === 'failed' ? job.errorMessage : isUploaded ? 'Uploaded successfully' : job.uploadStatus === 'youtube_processing' ? 'YouTube is processing video metadata...' : 'Streaming video to YouTube...'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {(job.uploadStatus === 'uploading' || job.uploadStatus === 'youtube_processing') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCancelVideoAsset(job._id)}
                                    className="text-xs min-h-9 px-2.5 border-red-500/30 text-red-500 hover:bg-red-500/5"
                                  >
                                    Cancel
                                  </Button>
                                )}
                                {job.uploadStatus === 'failed' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRetryVideoAsset(job._id)}
                                    className="text-xs min-h-9 px-2.5"
                                  >
                                    Retry
                                  </Button>
                                )}
                                <div className="inline-block">
                                  <input
                                    type="file"
                                    accept="video/*"
                                    id={`replace-file-${job._id}`}
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleReplaceVideoAsset(job._id, file);
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => document.getElementById(`replace-file-${job._id}`)?.click()}
                                    className="text-xs min-h-9 px-2.5"
                                    disabled={job.uploadStatus === 'uploading'}
                                  >
                                    Replace
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            )}

            {activeTab === 'materials' && (
              <StudyMaterialsManagement />
            )}

            {activeTab === 'liveClasses' && (
              <LiveClassesManagement />
            )}

            {activeTab === 'lessons' && (
              <LessonManagementSuite />
            )}

            {activeTab === 'import' && (
              <StudentImportCenter />
            )}

            {activeTab === 'securityCenter' && (
              <SecurityCenter />
            )}

            {activeTab === 'payments' && (
              <AnalyticsUpgrade />
            )}

            {activeTab === 'accessManager' && (
              <ContentAccessManager />
            )}

            {/* TAB 4: ANALYTICS */}
            {false && activeTab === 'payments' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {[
                    { title: 'Watch Hours', value: metrics.watchHours ?? 0, icon: Video, bg: 'bg-primary/5', color: 'text-primary' },
                    { title: 'Completion Rate', value: `${metrics.completionRate}%`, icon: Award, bg: 'bg-slate-100', color: 'text-slate-700' },
                    { title: 'New Enrollments', value: metrics.newEnrollments ?? 0, icon: TrendingUp, bg: 'bg-green-500/10', color: 'text-green-600' },
                    { title: 'Revenue', value: `$${metrics.totalRevenue}`, icon: DollarSign, bg: 'bg-slate-100', color: 'text-slate-700' }
                  ].map((stat) => (
                    <Card key={stat.title} className="border-border/50 bg-card">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`p-3 rounded-xl ${stat.bg}`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                          </div>
                        </div>
                        <div className="text-3xl font-bold mb-1">{stat.value}</div>
                        <div className="text-sm text-muted-foreground">{stat.title}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-border/50 bg-card">
                    <CardHeader>
                      <CardTitle>Revenue Analytics</CardTitle>
                      <CardDescription>Monthly growth and institute revenue signals.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={revenueData}>
                            <defs>
                              <linearGradient id="colorRevenueAnalytics" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#286BBD" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#286BBD" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" stroke="#64748b" />
                            <YAxis stroke="#64748b" />
                            <Area type="monotone" dataKey="revenue" stroke="#286BBD" fillOpacity={1} fill="url(#colorRevenueAnalytics)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card">
                    <CardHeader>
                      <CardTitle>Student Activity</CardTitle>
                      <CardDescription>Recent actions, enrollments, and learning momentum.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {recentActivity.slice(0, 6).map((activity) => (
                          <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0">
                            <div className="p-2 bg-primary/5 rounded-lg">
                              <Activity className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-medium text-foreground">{activity.user}</span>{' '}
                                <span className="text-muted-foreground">{activity.action}</span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-border/50 bg-card">
                  <CardHeader>
                    <CardTitle>Course Popularity</CardTitle>
                    <CardDescription>Enrollment volume by course.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topCourses}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Bar dataKey="enrollments" fill="#286BBD" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card">
                  <CardHeader>
                    <CardTitle>Manual Payment Verification</CardTitle>
                    <CardDescription>Approve or reject pending offline wire transfers and cheque payments.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pendingPayments.length === 0 ? (
                      <div className="text-center py-12 border border-dashed rounded-xl border-border/50 bg-background/30">
                        <CheckCircle className="w-10 h-10 mx-auto text-green-400 mb-2 opacity-50" />
                        <p className="text-muted-foreground">No pending payments. You are all caught up!</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Slip ID</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Course ID</TableHead>
                            <TableHead>Date Logged</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingPayments.map((p) => (
                            <TableRow key={p._id}>
                              <TableCell className="font-mono text-xs">{p._id}</TableCell>
                              <TableCell>{p.studentId}</TableCell>
                              <TableCell>{p.courseId}</TableCell>
                              <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-amber-400 border-amber-500/20 bg-amber-500/10">Pending</Badge>
                              </TableCell>
                              <TableCell className="text-right flex items-center justify-end gap-2">
                                <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => verifyPayment(p._id, 'approve')}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => verifyPayment(p._id, 'reject')}>
                                  Reject
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 5: ANNOUNCEMENTS */}
            {activeTab === 'announcements' && (
              <Card className="max-w-2xl border-border/50 bg-card">
                <CardHeader>
                  <CardTitle>Broadcast Announcement</CardTitle>
                  <CardDescription>Dispatch a high-priority system notification to all active students.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBroadcast} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ann-title">Subject Line</Label>
                      <Input
                        id="ann-title"
                        placeholder="e.g. Server Maintenance Notice"
                        value={announcementTitle}
                        onChange={(e) => setAnnouncementTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ann-msg">Message Body</Label>
                      <textarea
                        id="ann-msg"
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Compose your global message here..."
                        value={announcementMsg}
                        onChange={(e) => setAnnouncementMsg(e.target.value)}
                        required
                      ></textarea>
                    </div>
                    <Button type="submit" className="w-full bg-primary hover:bg-[#1f5fa7] text-white shadow-sm shadow-primary/10">
                      <Bell className="w-4 h-4 mr-2" />
                      Dispatch Broadcast
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* TAB 6: INSTITUTE BRANDING */}
            {activeTab === 'branding' && (
              <div className="space-y-6 max-w-3xl">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="border-border/50 bg-card">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle>Institute Identity</CardTitle>
                          <CardDescription>Configure how your institute appears to all enrolled students.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSaveBranding} className="space-y-6">
                        {brandingSuccess && (
                          <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 text-sm rounded-xl flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            <span>{brandingSuccess}</span>
                          </div>
                        )}

                        {/* Identity */}
                        <div>
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            Institute Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="brand-name">Institute Name <span className="text-destructive">*</span></Label>
                              <Input
                                id="brand-name"
                                value={brandingInstituteName}
                                onChange={(e) => setBrandingInstituteName(e.target.value)}
                                placeholder="e.g. GFI Institute"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="brand-branch">Branch / Campus Name</Label>
                              <Input
                                id="brand-branch"
                                value={brandingBranchName}
                                onChange={(e) => setBrandingBranchName(e.target.value)}
                                placeholder="e.g. Main Campus, Karachi"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="brand-support-email">Support Email</Label>
                              <Input
                                id="brand-support-email"
                                type="email"
                                value={brandingSupportEmail}
                                onChange={(e) => setBrandingSupportEmail(e.target.value)}
                                placeholder="support@institute.com"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="brand-support-phone">Support Phone</Label>
                              <Input
                                id="brand-support-phone"
                                value={brandingSupportPhone}
                                onChange={(e) => setBrandingSupportPhone(e.target.value)}
                                placeholder="+1 (555) 000-0000"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Logos */}
                        <div className="pt-2 border-t border-border/60">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                            Logos & Icons
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="brand-logo">Logo Image URL</Label>
                              <Input
                                id="brand-logo"
                                value={brandingLogo}
                                onChange={(e) => setBrandingLogo(e.target.value)}
                                placeholder="https://cdn.example.com/logo.png"
                              />
                              {brandingLogo && (
                                <div className="mt-2 flex items-center gap-3">
                                  <img src={brandingLogo} alt="Logo preview" className="w-12 h-12 rounded-xl object-contain border border-border" />
                                  <span className="text-xs text-muted-foreground">Preview</span>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="brand-favicon">Favicon URL</Label>
                              <Input
                                id="brand-favicon"
                                value={brandingFavicon}
                                onChange={(e) => setBrandingFavicon(e.target.value)}
                                placeholder="https://cdn.example.com/favicon.ico"
                              />
                              {brandingFavicon && (
                                <div className="mt-2 flex items-center gap-3">
                                  <img src={brandingFavicon} alt="Favicon preview" className="w-6 h-6 rounded object-contain border border-border" />
                                  <span className="text-xs text-muted-foreground">Preview</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Theme Colors */}
                        <div className="pt-2 border-t border-border/60">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-muted-foreground" />
                            Brand Theme Colors
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="brand-primary">Primary Brand Color</Label>
                              <div className="flex items-center gap-3">
                                <input
                                  id="brand-primary"
                                  type="color"
                                  value={brandingBrandColor}
                                  onChange={(e) => setBrandingBrandColor(e.target.value)}
                                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                                />
                                <Input
                                  value={brandingBrandColor}
                                  onChange={(e) => setBrandingBrandColor(e.target.value)}
                                  placeholder="#7c3aed"
                                  className="flex-1 font-mono text-sm"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">Applied to buttons, links, and active states.</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="brand-secondary">Secondary / Accent Color</Label>
                              <div className="flex items-center gap-3">
                                <input
                                  id="brand-secondary"
                                  type="color"
                                  value={brandingSecondaryColor}
                                  onChange={(e) => setBrandingSecondaryColor(e.target.value)}
                                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                                />
                                <Input
                                  value={brandingSecondaryColor}
                                  onChange={(e) => setBrandingSecondaryColor(e.target.value)}
                                  placeholder="#4f46e5"
                                  className="flex-1 font-mono text-sm"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">Used for gradients and sidebar highlights.</p>
                            </div>
                          </div>

                          {/* Live preview swatch */}
                          <div className="mt-4 p-4 rounded-xl border border-border/60 bg-background/50">
                            <p className="text-xs text-muted-foreground mb-3">Color Preview</p>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full shadow-inner" style={{ background: brandingBrandColor }} />
                              <div className="w-8 h-8 rounded-full shadow-inner" style={{ background: brandingSecondaryColor }} />
                              <div
                                className="flex-1 h-8 rounded-xl"
                                style={{ background: `linear-gradient(to right, ${brandingBrandColor}, ${brandingSecondaryColor})` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                          <Button
                            type="submit"
                            className="bg-primary hover:bg-[#1f5fa7] text-white shadow-sm shadow-primary/10 min-w-[160px]"
                            disabled={brandingSaving}
                          >
                            {brandingSaving ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Saving...</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Save className="w-4 h-4" />
                                <span>Save Branding</span>
                              </div>
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            )}

            {/* TAB 7: YOUTUBE INTEGRATION */}
            {activeTab === 'youtubeIntegration' && (
              <div className="space-y-6 max-w-3xl">
                <Card className="border-border/50 bg-card">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <Link2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>YouTube Integration</CardTitle>
                        <CardDescription>Connect your institute YouTube channel in one click. No Google Cloud setup required.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {!youtubeIntegration.youtubeConnected ? (
                      <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-3">
                        <p className="font-semibold text-amber-500">YouTube Channel Not Connected</p>
                        <p className="text-sm text-muted-foreground">Connect your YouTube channel to upload and manage videos through Trineo Stream.</p>
                        <Button className="bg-primary hover:bg-[#1f5fa7] text-white" onClick={handleAuthorizeYouTube}>
                          Connect YouTube Channel
                        </Button>
                      </div>
                    ) : (
                      <div className="p-5 rounded-xl border border-green-500/30 bg-green-500/10 space-y-4">
                        <div className="flex items-center gap-2 text-green-600 font-semibold">
                          <CheckCircle className="w-4 h-4" />
                          Connected
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div><span className="text-muted-foreground">Channel Name:</span> {youtubeIntegration.youtubeChannelName || 'N/A'}</div>
                          <div><span className="text-muted-foreground">Channel ID:</span> {youtubeIntegration.youtubeChannelId || 'N/A'}</div>
                          <div><span className="text-muted-foreground">Connected Date:</span> {youtubeIntegration.youtubeConnectedAt ? new Date(youtubeIntegration.youtubeConnectedAt).toLocaleString() : 'N/A'}</div>
                          <div><span className="text-muted-foreground">Videos Uploaded:</span> {youtubeIntegration.videosUploaded || 0}</div>
                          <div><span className="text-muted-foreground">Last Sync:</span> {youtubeIntegration.youtubeLastSync ? new Date(youtubeIntegration.youtubeLastSync).toLocaleString() : 'N/A'}</div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button variant="outline" onClick={handleAuthorizeYouTube} disabled={youtubeActionLoading}>
                            <Link2 className="w-4 h-4 mr-2" />
                            Reconnect Channel
                          </Button>
                          <Button variant="outline" onClick={syncYouTubeChannel} disabled={youtubeActionLoading}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Sync Channel
                          </Button>
                          <Button variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={disconnectYouTubeChannel} disabled={youtubeActionLoading}>
                            <Unlink2 className="w-4 h-4 mr-2" />
                            Disconnect Channel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* CREATE COURSE DIALOG MODAL */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg max-h-[92dvh] bg-card border border-border shadow-2xl rounded-2xl overflow-y-auto"
          >
            <CardHeader>
              <CardTitle>{editingCourse ? 'Edit Course' : 'Create Premium Course'}</CardTitle>
              <CardDescription>{editingCourse ? 'Update the course details and publishing status.' : 'Add a new course curriculum module to the institute catalogue.'}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitCourse} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course-title">Course Title</Label>
                  <Input
                    id="course-title"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="e.g. Master React in 30 Days"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course-desc">Description</Label>
                  <Input
                    id="course-desc"
                    value={newCourseDesc}
                    onChange={(e) => setNewCourseDesc(e.target.value)}
                    placeholder="Detailed syllabus outline..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="course-instructor">Instructor Name</Label>
                    <Input
                      id="course-instructor"
                      value={newCourseInstructor}
                      onChange={(e) => setNewCourseInstructor(e.target.value)}
                      placeholder="e.g. John Smith"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="course-price">Price ($)</Label>
                    <Input
                      id="course-price"
                      type="number"
                      value={newCoursePrice}
                      onChange={(e) => setNewCoursePrice(e.target.value)}
                      placeholder="99"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="course-duration">Syllabus Hours</Label>
                    <Input
                      id="course-duration"
                      value={newCourseDuration}
                      onChange={(e) => setNewCourseDuration(e.target.value)}
                      placeholder="e.g. 14h 20m"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="course-thumbnail">Thumbnail Image URL</Label>
                    <Input
                      id="course-thumbnail"
                      value={newCourseThumbnail}
                      onChange={(e) => setNewCourseThumbnail(e.target.value)}
                      placeholder="Unsplash image URL..."
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3 pt-4 sticky bottom-0 bg-card pb-1">
                  <Button variant="ghost" type="button" className="min-h-11 w-full sm:w-auto" onClick={() => setShowCourseModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="min-h-11 w-full sm:w-auto bg-primary hover:bg-[#1f5fa7] text-white shadow-sm shadow-primary/10">
                    {editingCourse ? 'Save Changes' : 'Submit'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </motion.div>
        </div>
      )}
    </div>
  );
}
