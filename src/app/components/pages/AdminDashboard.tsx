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
  Youtube,
  Loader2,
  Palette,
  Building2,
  Save,
  Link2,
  RefreshCw,
  Unlink2,
  Calendar,
  Key,
  Mail,
  Lock,
  Unlock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserX,
  MoreVertical,
  XCircle
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import trineoLogoImg from '@/images/trineoStream-1.png';

const tabLabels: Record<string, string> = {
  overview: 'Dashboard',
  students: 'Student Management',
  upload: 'Video Library',
  youtube: 'YouTube Integration',
  lessons: 'Course Builder',
  materials: 'Study Materials',
  liveClasses: 'Live Classes',
  accessManager: 'Access Management',
  import: 'Student Import',
  securityCenter: 'Security Center',
  payments: 'Analytics',
  announcements: 'Notifications',
  branding: 'Institute Branding'
};

const navItems = [
  { icon: Activity, label: 'Dashboard', id: 'overview' },
  { icon: Video, label: 'Video Library', id: 'upload' },
  { icon: Youtube, label: 'YouTube Integration', id: 'youtube' },
  { icon: BookOpen, label: 'Course Builder', id: 'lessons' },
  { icon: FileText, label: 'Study Materials', id: 'materials' },
  { icon: Calendar, label: 'Live Classes', id: 'liveClasses' },
  { icon: Key, label: 'Access Manager', id: 'accessManager' },
  { icon: Users, label: 'Student Import', id: 'import' },
  { icon: ShieldCheck, label: 'Security Center', id: 'securityCenter' },
  { icon: Users, label: 'Student Management', id: 'students' },
  { icon: Bell, label: 'Notifications', id: 'announcements' },
  { icon: Palette, label: 'Institute Branding', id: 'branding' }
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    localStorage.setItem('trineo_admin_active_tab', activeTab);
  }, [activeTab]);
  const [curriculumBuilderProgramId, setCurriculumBuilderProgramId] = useState<string | undefined>(undefined);
  
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
  
  // Course/Program creation state has been removed - unified under Curriculum Builder

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
  const [studentPage, setStudentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);
  const [studentBatchFilter, setStudentBatchFilter] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('');
  const [studentExpiryFilter, setStudentExpiryFilter] = useState('');
  const [studentActionsOpenId, setStudentActionsOpenId] = useState<string | null>(null);

  // Video upload state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCourseId, setUploadCourseId] = useState('');
  const [uploadDuration, setUploadDuration] = useState('');
  const [uploadIsLocked, setUploadIsLocked] = useState(true);
  const [uploadOrder, setUploadOrder] = useState('1');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadAttachmentUrl, setUploadAttachmentUrl] = useState('');
  const [uploadAttachmentName, setUploadAttachmentName] = useState('');
  
  const [selectedUploadProgramId, setSelectedUploadProgramId] = useState('');
  const [availableUploadSubjects, setAvailableUploadSubjects] = useState<any[]>([]);
  const [selectedUploadSubjectId, setSelectedUploadSubjectId] = useState('');
  const [availableUploadUnits, setAvailableUploadUnits] = useState<any[]>([]);
  const [selectedUploadUnitId, setSelectedUploadUnitId] = useState('');
  const [availableLessons, setAvailableLessons] = useState<any[]>([]);
  const [selectedUploadLessonId, setSelectedUploadLessonId] = useState('');
  const [programsList, setProgramsList] = useState<any[]>([]);
  
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

      const programs = await apiFetch('/programs');
      setProgramsList(programs);

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
          setNewStudentBranch(prev => prev || institute.name || '');
        }
      } catch (_) {}
    } catch (err: any) {
      setError(err.message || 'Failed to load administrator metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'students' || activeTab === 'overview') {
      loadCrmData();
    }
  }, [activeTab]);

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

  // Course creation and edit modal functions removed - unified under Curriculum Builder

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

  const handleToggleCourseLock = async (course: any) => {
    try {
      await apiFetch(`/courses/${course._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isLocked: !course.isLocked })
      });
      loadCrmData();
    } catch (err: any) {
      alert(err.message || 'Failed to update lock status');
    }
  };

  const handleEditBatchFromDashboard = (courseId: string) => {
    setCurriculumBuilderProgramId(courseId);
    setActiveTab('lessons');
  };

  const openCreateStudentModal = () => {
    setEditingStudent(null);
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentPhone('');
    setNewStudentPassword('');
    setNewStudentStatus('active');
    setNewStudentBatch('');
    setNewStudentBranch(brandingInstituteName || '');
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
    setNewStudentBranch(brandingInstituteName || '');
    setNewStudentCourseName(student.courseName || '');
    setNewStudentEnrollmentDate(student.enrollmentDate ? student.enrollmentDate.slice(0, 10) : '');
    setShowStudentModal(true);
  };

  const handleSubmitStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName) {
      alert('Student Name is required');
      return;
    }
    if (!newStudentEmail) {
      alert('Email Address is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStudentEmail)) {
      alert('Invalid Email Address format. Please enter a valid email address (e.g. student@school.edu).');
      return;
    }
    if (!newStudentPhone) {
      alert('Phone Number is required');
      return;
    }
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(newStudentPhone)) {
      alert('Invalid Phone Number. It must contain only digits (optionally starting with +) and be between 10 and 15 digits long.');
      return;
    }
    if (!newStudentCourseName) {
      alert('Batch is required');
      return;
    }
    if (!newStudentBranch) {
      alert('Campus is required');
      return;
    }
    if (!newStudentEnrollmentDate) {
      alert('Admission Date is required');
      return;
    }
    if (!newStudentStatus) {
      alert('Status is required');
      return;
    }

    const payload = {
      name: newStudentName,
      email: newStudentEmail,
      phone: newStudentPhone,
      password: newStudentPassword,
      status: newStudentStatus,
      batchName: '', // cohort completely removed
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
      setNewStudentBranch(brandingInstituteName || '');
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

    const handleResendWelcome = async (studentId: string) => {
      try {
        await apiFetch(`/analytics/students/${studentId}/resend-welcome`, { method: 'POST' });
        toast.success('Welcome email resent successfully.');
      } catch (err: any) {
        toast.error(err.message || 'Failed to resend welcome email.');
      }
    };

    const handleResetPassword = async (studentId: string) => {
      if (!window.confirm('Are you sure you want to reset this student\'s password? A new temporary password will be sent via email.')) return;
      try {
        await apiFetch(`/analytics/students/${studentId}/reset-password`, { method: 'POST' });
        toast.success('Password reset successfully. Email sent to student.');
      } catch (err: any) {
        toast.error(err.message || 'Failed to reset password.');
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

  // handleCreateCourse action removed - unified under Curriculum Builder

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

  const handleUploadProgramChange = async (programId: string) => {
    setSelectedUploadProgramId(programId);
    setSelectedUploadSubjectId('');
    setAvailableUploadSubjects([]);
    setSelectedUploadUnitId('');
    setAvailableUploadUnits([]);
    setSelectedUploadLessonId('');
    setAvailableLessons([]);
    
    if (!programId) return;
    
    try {
      const data = await apiFetch(`/subjects?programId=${programId}`);
      setAvailableUploadSubjects(data);
    } catch (err: any) {
      toast.error('Failed to load subjects for selected program.');
    }
  };

  const handleUploadSubjectChange = async (subjectId: string) => {
    setSelectedUploadSubjectId(subjectId);
    setSelectedUploadUnitId('');
    setAvailableUploadUnits([]);
    setSelectedUploadLessonId('');
    setAvailableLessons([]);
    
    if (!subjectId) return;
    
    try {
      const data = await apiFetch(`/units?subjectId=${subjectId}`);
      setAvailableUploadUnits(data);
    } catch (err: any) {
      toast.error('Failed to load units for selected subject.');
    }
  };

  const handleUploadUnitChange = async (unitId: string) => {
    setSelectedUploadUnitId(unitId);
    setSelectedUploadLessonId('');
    setAvailableLessons([]);
    
    if (!unitId) return;
    
    try {
      const data = await apiFetch(`/lessons?unitId=${unitId}`);
      setAvailableLessons(data);
    } catch (err: any) {
      toast.error('Failed to load lessons for selected unit.');
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
    if (!selectedUploadProgramId) {
      alert('Please select a program.');
      return;
    }
    if (!selectedUploadSubjectId) {
      alert('Please select a subject.');
      return;
    }
    if (!selectedUploadUnitId) {
      alert('Please select a unit.');
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
    formData.append('courseId', selectedUploadProgramId);
    formData.append('lessonId', selectedUploadLessonId);
    formData.append('duration', uploadDuration || '15:00');
    formData.append('attachmentUrl', uploadAttachmentUrl);
    formData.append('attachmentName', uploadAttachmentName);

    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    const token = localStorage.getItem('token');

    xhr.open('POST', getApiUrl('/videos/youtube/upload'));
    if (token && token !== 'session_active') {
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
        setUploadSuccess('Video uploaded successfully. The video will be available shortly.');
        setUploadTitle('');
        setSelectedFile(null);
        setUploadDuration('');
        setUploadAttachmentUrl('');
        setUploadAttachmentName('');
        setSelectedUploadProgramId('');
        setSelectedUploadSubjectId('');
        setAvailableUploadSubjects([]);
        setSelectedUploadUnitId('');
        setAvailableUploadUnits([]);
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

  const getAccessExpiry = (joinedDate: string, packageExpiryDate?: string | null) => {
    if (!packageExpiryDate) {
      return { date: 'Lifetime', relative: 'No Expiry' };
    }
    const expiry = new Date(packageExpiryDate);
    if (isNaN(expiry.getTime())) {
      return { date: 'Lifetime', relative: 'No Expiry' };
    }
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const relativeStr = diffDays < 0 ? 'Expired' : months > 0 ? `in ${months} month${months > 1 ? 's' : ''}` : `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    return { date: expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), relative: relativeStr };
  };

  const getStatusDetails = (status: string) => {
    const isSuspended = status === 'inactive' || status === 'suspended';
    return {
      label: isSuspended ? 'Suspended' : 'Active',
      badgeClass: isSuspended 
        ? 'text-red-400 border-red-500/20 bg-red-500/10' 
        : 'text-green-400 border-green-500/20 bg-green-500/10',
      dotClass: isSuspended ? 'bg-red-400' : 'bg-green-400'
    };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filteredStudents = studentsList.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
      String(student.user_id).includes(studentSearch);
    const matchesBatch = !studentBatchFilter || (student.courseName || '').toLowerCase() === studentBatchFilter.toLowerCase();
    const matchesStatus = !studentStatusFilter || student.status === studentStatusFilter;
    
    let matchesExpiry = true;
    if (studentExpiryFilter) {
      const expiry = getAccessExpiry(student.joined || student.enrollmentDate || new Date().toISOString(), student.packageExpiryDate);
      if (studentExpiryFilter === 'expired') {
        matchesExpiry = expiry.relative === 'Expired';
      } else if (studentExpiryFilter === 'active') {
        matchesExpiry = expiry.relative !== 'Expired';
      } else if (studentExpiryFilter === '30') {
        if (!student.packageExpiryDate) {
          matchesExpiry = false;
        } else {
          const expiryDate = new Date(student.packageExpiryDate);
          const diffMs = expiryDate.getTime() - new Date().getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          matchesExpiry = diffDays >= 0 && diffDays <= 30;
        }
      }
    }
    
    return matchesSearch && matchesBatch && matchesStatus && matchesExpiry;
  });

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / studentsPerPage));
  const paginatedStudents = filteredStudents.slice(
    (studentPage - 1) * studentsPerPage,
    studentPage * studentsPerPage
  );
  const uniqueBatches = [...new Set(studentsList.map(s => s.courseName).filter(Boolean))];
  const activeStudentsCount = studentsList.filter(s => s.status === 'active').length;
  const suspendedStudentsCount = studentsList.filter(s => s.status === 'inactive' || s.status === 'suspended').length;
  const inactiveStudentsCount = 0; // inactive database mapping represents suspended cohort-wise

  const resetStudentFilters = () => { setStudentSearch(''); setStudentBatchFilter(''); setStudentStatusFilter(''); setStudentExpiryFilter(''); setStudentPage(1); };

  const handleBulkToggleStatus = async (status: 'active' | 'inactive') => {
    if (selectedStudentIds.length === 0) return alert('Select at least one student.');
    try {
      await Promise.all(
        selectedStudentIds.map(studentId =>
          apiFetch('/analytics/student-status', {
            method: 'POST',
            body: JSON.stringify({ studentId, status })
          })
        )
      );
      setSelectedStudentIds([]);
      loadCrmData();
      toast.success(`Selected students updated to ${status === 'active' ? 'Active' : 'Suspended'}.`);
    } catch (err: any) {
      alert(err.message || 'Bulk status update failed.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return alert('Select at least one student.');
    if (!window.confirm(`Are you sure you want to delete the ${selectedStudentIds.length} selected students and their related records?`)) return;
    try {
      await Promise.all(
        selectedStudentIds.map(studentId =>
          apiFetch(`/analytics/students/${studentId}`, { method: 'DELETE' })
        )
      );
      setSelectedStudentIds([]);
      loadCrmData();
      toast.success('Selected students deleted successfully.');
    } catch (err: any) {
      alert(err.message || 'Bulk delete failed.');
    }
  };

  const handleBulkAssignBatch = async () => {
    if (selectedStudentIds.length === 0) return alert('Select at least one student.');
    const batchName = window.prompt("Available Batches:\n" + coursesList.map(c => c.title).join(", ") + "\n\nEnter the Batch Name to assign to all selected students:");
    if (!batchName) return;
    const course = coursesList.find(c => c.title.toLowerCase() === batchName.trim().toLowerCase());
    if (!course) return alert(`Batch "${batchName}" not found.`);

    try {
      await apiFetch('/purchases/admin/bulk-enroll', {
        method: 'POST',
        body: JSON.stringify({ courseId: course._id, studentIds: selectedStudentIds })
      });
      setSelectedStudentIds([]);
      loadCrmData();
      toast.success(`Selected students enrolled in Batch ${course.title}.`);
    } catch (err: any) {
      alert(err.message || 'Bulk batch assignment failed.');
    }
  };

  const handleBulkRemoveBatch = async () => {
    if (selectedStudentIds.length === 0) return alert('Select at least one student.');
    const batchName = window.prompt("Available Batches:\n" + coursesList.map(c => c.title).join(", ") + "\n\nEnter the Batch Name to remove from all selected students:");
    if (!batchName) return;
    const course = coursesList.find(c => c.title.toLowerCase() === batchName.trim().toLowerCase());
    if (!course) return alert(`Batch "${batchName}" not found.`);

    try {
      await Promise.all(
        selectedStudentIds.map(studentId =>
          apiFetch('/purchases/admin/remove-course', {
            method: 'POST',
            body: JSON.stringify({ studentId, courseId: course._id })
          })
        )
      );
      setSelectedStudentIds([]);
      loadCrmData();
      toast.success(`Selected students removed from Batch ${course.title}.`);
    } catch (err: any) {
      alert(err.message || 'Bulk batch removal failed.');
    }
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-sidebar border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {brandingLogo ? (
                <img src={brandingLogo} alt="Institute" className="w-9 h-9 rounded-xl object-contain border border-border/50" />
              ) : (
                <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-base font-bold leading-none">Trineo Stream</h1>
                <p className="text-[10px] text-muted-foreground mt-0.5">Institute Dashboard</p>
              </div>
            </div>
            {brandingInstituteName && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pl-1">
                <span className="text-primary text-base leading-none">•</span>
                <span>{brandingInstituteName}</span>
              </div>
            )}
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
              <AnalyticsUpgrade />
            )}

            {/* TAB 2: STUDENTS */}
            {activeTab === 'students' && (
              <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Student Access Control</h2>
                    <p className="text-muted-foreground text-sm">Manage student status, profile details, and batch access.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={exportStudentsCSV} className="border-border bg-card">
                      <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                      Export CSV
                    </Button>
                    <Button onClick={() => setActiveTab('import')} className="bg-[#4f46e5] hover:bg-[#4338ca] text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Import Students
                    </Button>
                    <Button onClick={openCreateStudentModal} className="bg-[#4f46e5] hover:bg-[#4338ca] text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      New Student
                    </Button>
                  </div>
                </div>

                {/* Stats Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Students Card */}
                  <Card className="border-border/50 bg-card">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3 bg-violet-500/10 rounded-xl text-violet-500">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Total Students</p>
                        <h3 className="text-2xl font-bold mt-0.5">{studentsList.length}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">All students</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Active Students Card */}
                  <Card className="border-border/50 bg-card">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3 bg-green-500/10 rounded-xl text-green-500">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Active Students</p>
                        <h3 className="text-2xl font-bold mt-0.5">{activeStudentsCount}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Currently active</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Suspended Students Card */}
                  <Card className="border-border/50 bg-card">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                        <UserX className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Suspended Students</p>
                        <h3 className="text-2xl font-bold mt-0.5">{suspendedStudentsCount}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Temporarily suspended</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Inactive Students Card */}
                  <Card className="border-border/50 bg-card">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                        <XCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Inactive Students</p>
                        <h3 className="text-2xl font-bold mt-0.5">{inactiveStudentsCount}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Inactive accounts</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Filters, Table and Pagination Card */}
                <Card className="border-border/50 bg-card">
                  <CardContent className="p-6 space-y-6">
                    {/* Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      {/* Search Bar */}
                      <div className="md:col-span-5 space-y-1.5">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by name, email, or user ID..."
                            className="pl-10 bg-background/50 border-border"
                            value={studentSearch}
                            onChange={(e) => { setStudentSearch(e.target.value); setStudentPage(1); }}
                          />
                        </div>
                      </div>

                      {/* Batch Select */}
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Batch</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          value={studentBatchFilter}
                          onChange={(e) => { setStudentBatchFilter(e.target.value); setStudentPage(1); }}
                        >
                          <option value="">All Batches</option>
                          {uniqueBatches.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>

                      {/* Status Select */}
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          value={studentStatusFilter}
                          onChange={(e) => { setStudentStatusFilter(e.target.value); setStudentPage(1); }}
                        >
                          <option value="">All Status</option>
                          <option value="active">Active</option>
                          <option value="inactive">Suspended</option>
                        </select>
                      </div>

                      {/* Access Expiry Select */}
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Access Expiry</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          value={studentExpiryFilter}
                          onChange={(e) => { setStudentExpiryFilter(e.target.value); setStudentPage(1); }}
                        >
                          <option value="">All</option>
                          <option value="active">Active Access</option>
                          <option value="30">Expiring soon (30 days)</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>

                      {/* Reset Button */}
                      <div className="md:col-span-1">
                        <Button variant="outline" onClick={resetStudentFilters} className="w-full border-border bg-card">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reset
                        </Button>
                      </div>
                    </div>

                    {/* Table View */}
                    <ResponsiveDataView
                      desktop={
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                <input
                                  type="checkbox"
                                  checked={selectedStudentIds.length > 0 && selectedStudentIds.length === paginatedStudents.length}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedStudentIds(paginatedStudents.map(s => s.id));
                                    } else {
                                      setSelectedStudentIds([]);
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-border"
                                />
                              </TableHead>
                              <TableHead>User ID</TableHead>
                              <TableHead>Student</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Batch</TableHead>
                              <TableHead>Joined Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Access Expiry</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedStudents.map((student) => {
                              const checked = selectedStudentIds.includes(student.id);
                              const expiry = getAccessExpiry(student.joined || student.enrollmentDate || new Date().toISOString(), student.packageExpiryDate);
                              const statusDetails = getStatusDetails(student.status);
                              
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
                                  <TableCell className="font-mono text-primary font-medium">{student.user_id}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <Avatar className="w-10 h-10 border border-border">
                                        <AvatarImage src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                                        <AvatarFallback>ST</AvatarFallback>
                                      </Avatar>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-foreground">{student.name}</span>
                                        <Badge variant="outline" className={`${statusDetails.badgeClass} text-[10px] px-1.5 py-0`}>
                                          {statusDetails.label}
                                        </Badge>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground font-medium">{student.email}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-blue-400 border-blue-500/20 bg-blue-500/5 font-semibold">
                                      {student.courseName || 'Not Assigned'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground font-medium">{formatDate(student.joined)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={`${statusDetails.badgeClass} gap-1.5 font-medium`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${statusDetails.dotClass}`} />
                                      {statusDetails.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-foreground text-sm">{expiry.date}</span>
                                      <span className="text-xs text-muted-foreground">{expiry.relative}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button variant="outline" size="sm" onClick={() => openEditStudentModal(student)} className="border-border">
                                        <PencilLine className="w-3.5 h-3.5 mr-1" />
                                        Edit
                                      </Button>
                                      
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="outline" size="sm" className="border-border gap-1 bg-card">
                                            Actions
                                            <ChevronDown className="w-3 h-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-card border-border">
                                          <DropdownMenuItem onClick={() => handleResendWelcome(student.id)}>
                                            <Mail className="w-4 h-4 mr-2" />
                                            Resend Welcome Email
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleResetPassword(student.id)}>
                                            <Key className="w-4 h-4 mr-2" />
                                            Reset Password
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={async () => {
                                            const batchName = window.prompt("Available Batches:\n" + coursesList.map(c => c.title).join(", ") + "\n\nEnter Batch Name to assign:");
                                            if (batchName) {
                                              const course = coursesList.find(c => c.title.toLowerCase() === batchName.trim().toLowerCase());
                                              if (course) {
                                                await apiFetch('/purchases/admin/assign-course', {
                                                  method: 'POST',
                                                  body: JSON.stringify({ studentId: student.id, courseId: course._id })
                                                });
                                                loadCrmData();
                                                toast.success(`Assigned to Batch ${course.title}`);
                                              } else {
                                                alert(`Batch "${batchName}" not found.`);
                                              }
                                            }
                                          }}>
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            Assign Batch
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={async () => {
                                            const batchName = window.prompt("Enter Batch Name to remove:", student.courseName || '');
                                            if (batchName) {
                                              const course = coursesList.find(c => c.title.toLowerCase() === batchName.trim().toLowerCase());
                                              if (course) {
                                                await apiFetch('/purchases/admin/remove-course', {
                                                  method: 'POST',
                                                  body: JSON.stringify({ studentId: student.id, courseId: course._id })
                                                });
                                                loadCrmData();
                                                toast.success(`Removed from Batch ${course.title}`);
                                              } else {
                                                alert(`Batch "${batchName}" not found.`);
                                              }
                                            }
                                          }}>
                                            <UserMinus className="w-4 h-4 mr-2" />
                                            Remove Batch
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleToggleStatus(student.id, student.status)}>
                                            <AlertCircle className="w-4 h-4 mr-2" />
                                            {student.status === 'active' ? 'Suspend Student' : 'Activate Student'}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem variant="destructive" onClick={() => handleDeleteStudent(student.id)} className="text-red-500 focus:text-red-500">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete Student
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>

                                      <Button variant="outline" size="sm" className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-500" onClick={() => handleDeleteStudent(student.id)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      }
                      mobile={paginatedStudents.map((student) => {
                        const statusDetails = getStatusDetails(student.status);
                        return (
                          <MobileRecordCard
                            key={student.id}
                            title={student.name}
                            subtitle={student.email}
                            badges={
                              <Badge variant="outline" className={statusDetails.badgeClass}>
                                {statusDetails.label}
                              </Badge>
                            }
                            rows={[
                              { label: 'User ID', value: student.user_id },
                              { label: 'Batch', value: student.courseName || 'Not Assigned' },
                              { label: 'Joined', value: formatDate(student.joined) },
                            ]}
                            actions={
                              <>
                                <Button variant="outline" size="sm" className="min-h-11 flex-1 border-border bg-card" onClick={() => openEditStudentModal(student)}>Edit</Button>
                                <Button variant="outline" size="sm" className="min-h-11 flex-1 border-border text-blue-400 bg-card" onClick={() => handleResendWelcome(student.id)}>Resend Welcome</Button>
                                <Button variant="outline" size="sm" className="min-h-11 flex-1 border-border text-amber-400 bg-card" onClick={() => handleResetPassword(student.id)}>Reset Password</Button>
                                <Button variant="outline" size="sm" className="min-h-11 border-border bg-card" onClick={() => handleToggleStatus(student.id, student.status)}>
                                  {student.status === 'active' ? 'Suspend' : 'Activate'}
                                </Button>
                                <Button variant="outline" size="sm" className="min-h-11 border-red-500/30 text-red-500 bg-card" onClick={() => handleDeleteStudent(student.id)}>Delete</Button>
                              </>
                            }
                          />
                        );
                      })}
                    />

                    {/* Footer Row: Bulk Actions & Pagination */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-border/50">
                      {/* Bulk Actions */}
                      <div className="flex items-center gap-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" disabled={selectedStudentIds.length === 0} className="border-border gap-1 text-sm bg-card">
                              Bulk Actions
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="bg-card border-border">
                            <DropdownMenuItem onClick={handleBulkAssignBatch}>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Bulk Assign Batch
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleBulkRemoveBatch}>
                              <UserMinus className="w-4 h-4 mr-2" />
                              Bulk Remove Batch
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkToggleStatus('inactive')}>
                              <UserX className="w-4 h-4 mr-2" />
                              Bulk Suspend
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkToggleStatus('active')}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Bulk Activate
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={handleBulkDelete} className="text-red-500 focus:text-red-500">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Bulk Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <span className="text-xs text-muted-foreground font-medium">
                          {selectedStudentIds.length} selected
                        </span>
                      </div>

                      {/* Rows per page & Pagination Controls */}
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Rows per page</span>
                          <select
                            className="flex h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
                            value={studentsPerPage}
                            onChange={(e) => { setStudentsPerPage(Number(e.target.value)); setStudentPage(1); }}
                          >
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 p-0"
                            disabled={studentPage <= 1}
                            onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <div className="w-8 h-8 flex items-center justify-center border border-border rounded-md bg-card text-sm font-semibold">
                            {studentPage}
                          </div>
                          <span className="text-sm text-muted-foreground">of {totalStudentPages}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 p-0"
                            disabled={studentPage >= totalStudentPages}
                            onClick={() => setStudentPage((p) => Math.min(totalStudentPages, p + 1))}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Edit/Add Dialog Modal */}
                <Dialog open={showStudentModal} onOpenChange={setShowStudentModal}>
                  <DialogContent className="sm:max-w-[500px] bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">{editingStudent ? 'Edit Student' : 'Add Student'}</DialogTitle>
                      <DialogDescription>Create or update student profiles and access status.</DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4 mt-2" onSubmit={handleSubmitStudent}>
                      <div className="space-y-2">
                        <Label>Student Name *</Label>
                        <Input value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="Student name" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address *</Label>
                        <Input type="email" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} placeholder="student@school.edu" required />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Phone Number *</Label>
                          <Input value={newStudentPhone} onChange={(e) => setNewStudentPhone(e.target.value)} placeholder="Phone number" required />
                        </div>
                        <div className="space-y-2">
                          <Label>Status *</Label>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newStudentStatus} onChange={(e) => setNewStudentStatus(e.target.value as 'active' | 'inactive')} required>
                            <option value="active">ACTIVE</option>
                            <option value="inactive">SUSPENDED</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Batch *</Label>
                          <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                            value={newStudentCourseName} 
                            onChange={(e) => setNewStudentCourseName(e.target.value)}
                            required
                          >
                            <option value="">Select a Batch</option>
                            {coursesList.map((course) => (
                              <option key={course._id} value={course.title}>{course.title}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Campus *</Label>
                          <Input value={newStudentBranch} disabled placeholder="e.g. Main Campus" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Admission Date *</Label>
                        <Input type="date" value={newStudentEnrollmentDate} onChange={(e) => setNewStudentEnrollmentDate(e.target.value)} required />
                      </div>
                      <div className="flex gap-3 justify-end pt-4">
                        <Button type="button" variant="outline" onClick={() => setShowStudentModal(false)}>Cancel</Button>
                        <Button type="submit" className="bg-primary hover:bg-[#1f5fa7] text-white">
                          {editingStudent ? 'Save Student' : 'Add Student'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* TAB 3: UPLOAD VIDEO */}
            {activeTab === 'upload' && (
              <div className="space-y-8">
                <Card className="border-border/50 bg-card">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle>Batch Catalog</CardTitle>
                        <CardDescription>View, edit, delete, publish, or unpublish institute batches.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-hidden rounded-2xl border border-border/50">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Batch</TableHead>
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
                                    <div className="font-medium">{course.title || course.name}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={course.status === 'active' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 'text-amber-500 border-amber-500/20 bg-amber-500/10'}>
                                    {course.status === 'active' ? 'Published' : 'Unpublished'}
                                  </Badge>
                                  {course.isLocked && (
                                    <Badge variant="outline" className="text-red-500 border-red-500/20 bg-red-50/10">
                                      Locked
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleEditBatchFromDashboard(course._id)}>
                                    <PencilLine className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleToggleCourseStatus(course)}>
                                    {course.status === 'active' ? <ToggleLeft className="w-4 h-4 mr-1" /> : <ToggleRight className="w-4 h-4 mr-1" />}
                                    {course.status === 'active' ? 'Unpublish' : 'Publish'}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleToggleCourseLock(course)}>
                                    {course.isLocked ? <Unlock className="w-4 h-4 mr-1" /> : <Lock className="w-4 h-4 mr-1" />}
                                    {course.isLocked ? 'Unlock' : 'Lock'}
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

                <div>
                  {/* Form column */}
                <Card className="border-border/50 bg-card">
                  <CardHeader>
                    <CardTitle>Upload & Link Topic Content</CardTitle>
                    <CardDescription>Upload videos and PDF resources and link them to a topic within the selected Batch hierarchy.</CardDescription>
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
                          <Label htmlFor="video-program">Choose Batch *</Label>
                          <select
                            id="video-program"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedUploadProgramId}
                            onChange={(e) => handleUploadProgramChange(e.target.value)}
                            required
                          >
                            <option value="">-- Choose Batch --</option>
                            {programsList.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="video-subject">Choose Subject *</Label>
                          <select
                            id="video-subject"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedUploadSubjectId}
                            onChange={(e) => handleUploadSubjectChange(e.target.value)}
                            required
                            disabled={!selectedUploadProgramId}
                          >
                            <option value="">-- Choose Subject --</option>
                            {availableUploadSubjects.map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.subjectCode} - {s.subjectName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="video-unit">Choose Unit *</Label>
                          <select
                            id="video-unit"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedUploadUnitId}
                            onChange={(e) => handleUploadUnitChange(e.target.value)}
                            required
                            disabled={!selectedUploadSubjectId}
                          >
                            <option value="">-- Choose Unit --</option>
                            {availableUploadUnits.map((u) => (
                              <option key={u._id} value={u._id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="video-lesson">Choose Topic *</Label>
                          <select
                            id="video-lesson"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedUploadLessonId}
                            onChange={(e) => setSelectedUploadLessonId(e.target.value)}
                            required
                            disabled={!selectedUploadUnitId}
                          >
                            <option value="">-- Choose Topic --</option>
                             {availableLessons.map((l) => {
                               const hasVideo = l.contents && Array.isArray(l.contents)
                                 ? l.contents.some((item: any) => item.type === 'video' && item.isDeleted !== true)
                                 : (!!l.videoAssetId || !!l.youtubeVideoId);
                               
                               const videoContent = l.contents && Array.isArray(l.contents)
                                 ? l.contents.find((item: any) => item.type === 'video' && item.isDeleted !== true)
                                 : null;
                               
                               const uploadStatus = videoContent ? videoContent.uploadStatus : l.uploadStatus;
                               const youtubeVideoId = videoContent ? videoContent.youtubeVideoId : l.youtubeVideoId;

                               const isReady = youtubeVideoId && uploadStatus === 'ready';
                               
                               let labelSuffix = ' (🔴 Video Missing)';
                               if (hasVideo) {
                                 if (isReady) {
                                   labelSuffix = ' (🟢 Video Linked)';
                                 } else {
                                   labelSuffix = ' (⏳ Upload Processing)';
                                 }
                               }

                               // ROOT CAUSE AUDIT DEBUG:
                               console.log(`[DEBUG] Topic: ${l.title} | topicId: ${l._id} | contentCount: ${l.contentCount} | videoCount: ${l.videoCount} | contents:`, l.contents, `| uploadStatus: ${uploadStatus} | labelSuffix: ${labelSuffix}`);

                               return (
                                 <option key={l._id} value={l._id}>
                                   {l.title}{labelSuffix}
                                 </option>
                               );
                             })}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="video-title">Video Title *</Label>
                          <Input
                            id="video-title"
                            placeholder="e.g. useState and useEffect deep-dive"
                            value={uploadTitle}
                            onChange={(e) => setUploadTitle(e.target.value)}
                            required
                            disabled={!selectedUploadLessonId}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="video-duration">Duration</Label>
                          <Input
                            id="video-duration"
                            placeholder="e.g. 14:25"
                            value={uploadDuration}
                            onChange={(e) => setUploadDuration(e.target.value)}
                            disabled={!selectedUploadLessonId}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="video-attachment-name">PDF Title</Label>
                          <Input
                            id="video-attachment-name"
                            placeholder="e.g. Pointer Notes PDF"
                            value={uploadAttachmentName}
                            onChange={(e) => setUploadAttachmentName(e.target.value)}
                            disabled={!selectedUploadLessonId}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="video-attachment-url">PDF URL</Label>
                          <Input
                            id="video-attachment-url"
                            placeholder="e.g. https://drive.google.com/file/d/..."
                            value={uploadAttachmentUrl}
                            onChange={(e) => setUploadAttachmentUrl(e.target.value)}
                            disabled={!selectedUploadLessonId}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Select MP4 Video File *</Label>
                        <div className={`border border-dashed border-border/80 rounded-2xl p-6 text-center hover:border-primary/30 transition-colors ${!selectedUploadLessonId ? 'opacity-50' : ''}`}>
                          <input
                            type="file"
                            accept="video/*"
                            id="file-input"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={!selectedUploadLessonId}
                          />
                          <label htmlFor="file-input" className={`space-y-2 block ${selectedUploadLessonId ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
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
                            <span>{uploadProgress === 100 ? 'Preparing Video...' : 'Uploading Video...'}</span>
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
                        disabled={uploading || !selectedUploadProgramId || !selectedUploadSubjectId || !selectedUploadUnitId || !selectedUploadLessonId}
                      >
                        {uploading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{uploadProgress === 100 ? 'Preparing Video...' : 'Uploading Video...'}</span>
                          </div>
                        ) : (
                          <span>Upload & Link</span>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

              </div>

              {/* Video Processing Status Table */}
              <Card className="mt-8 border-border/50 bg-card">
                <CardHeader>
                  <CardTitle>Video Library</CardTitle>
                  <CardDescription>Manage independent video library videos, track video status, or replace video files.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Video Title</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>Video Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>System Message</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {videoJobs.map((job) => {
                        const progress = job.uploadStatus === 'ready' ? 100 : job.uploadProgressPercent || 0;
                        const isUploaded = job.uploadStatus === 'ready';

                        return (
                          <TableRow key={job._id}>
                            <TableCell className="font-medium">{job.title}</TableCell>
                            <TableCell className="text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</TableCell>
                            <TableCell>
                              {job.uploadStatus === 'pending' && <Badge variant="outline" className="text-muted-foreground bg-muted/10">Waiting</Badge>}
                              {job.uploadStatus === 'uploading' && <Badge variant="outline" className="text-amber-400 border-amber-500/20 bg-amber-500/10">Uploading {progress}%</Badge>}
                              {(job.uploadStatus === 'processing' || job.uploadStatus === 'youtube_processing') && <Badge variant="outline" className="text-blue-400 border-blue-500/20 bg-blue-500/10 animate-pulse">Preparing Video</Badge>}
                              {isUploaded && <Badge variant="outline" className="text-green-400 border-green-500/20 bg-green-500/10">Uploaded Successfully</Badge>}
                              {job.uploadStatus === 'failed' && <Badge variant="outline" className="text-red-400 border-red-500/20 bg-red-500/10">Upload Failed</Badge>}
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
                              {job.uploadStatus === 'failed' ? (job.errorMessage || 'Upload failed') : isUploaded ? 'Uploaded successfully' : (job.uploadStatus === 'processing' || job.uploadStatus === 'youtube_processing') ? 'Preparing Video...' : `Uploading Video... (${progress}%)`}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {(job.uploadStatus === 'uploading' || job.uploadStatus === 'processing' || job.uploadStatus === 'youtube_processing') && (
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
                                    Replace Video
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
              <LessonManagementSuite
                initialSelectedProgramId={curriculumBuilderProgramId}
                onClearInitialProgram={() => setCurriculumBuilderProgramId(undefined)}
              />
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
            {activeTab === 'youtube' && (
              <div className="space-y-6 max-w-3xl">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="border-border/50 bg-card overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-transparent pointer-events-none" />
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-600/10 rounded-xl flex items-center justify-center text-red-600">
                          <Youtube className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold">YouTube Channel Integration</CardTitle>
                          <CardDescription>Link your YouTube channel to manage and stream secure video lectures.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {youtubeIntegration?.youtubeConnected ? (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-4 rounded-xl border border-red-500/10 bg-red-500/5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-foreground">{youtubeIntegration.youtubeChannelName || 'Connected Channel'}</span>
                              <Badge className="bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/10 text-[10px]">Connected 🟢</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">Channel ID: <span className="font-mono">{youtubeIntegration.youtubeChannelId || 'N/A'}</span></p>
                            {youtubeIntegration.youtubeLastSync && (
                              <p className="text-[10px] text-muted-foreground">Last Synced: {new Date(youtubeIntegration.youtubeLastSync).toLocaleString()}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs min-h-9" 
                              onClick={syncYouTubeChannel}
                              disabled={youtubeActionLoading}
                            >
                              {youtubeActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                              Sync Videos
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs min-h-9 border-red-500/30 text-red-500 hover:bg-red-500/5" 
                              onClick={disconnectYouTubeChannel}
                              disabled={youtubeActionLoading}
                            >
                              Disconnect
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-4 rounded-xl border border-border bg-muted/20">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">No YouTube Channel Connected</span>
                              <Badge variant="outline" className="text-muted-foreground text-[10px]">Not Connected 🔴</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">Link your channel to allow course and topic videos to stream via the player.</p>
                          </div>
                          <Button 
                            size="sm" 
                            className="bg-red-600 hover:bg-red-700 text-white text-xs min-h-9" 
                            onClick={handleAuthorizeYouTube}
                            disabled={youtubeActionLoading}
                          >
                            {youtubeActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Video className="w-3.5 h-3.5 mr-1" />}
                            Connect YouTube Account
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            )}


          </div>
        </div>
      </div>


    </div>
  );
}
