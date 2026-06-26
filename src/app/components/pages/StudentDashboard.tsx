import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
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
  Camera,
  Shield,
  ShieldAlert,
  CreditCard,
  HelpCircle,
  Trash2,
  Printer,
  EyeOff,
  User,
  ArrowUpDown,
  ChevronDown,
  Volume2,
  Sparkles
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { MobileNav, studentNavItems } from '../MobileNav';
import { ThemeToggleButton } from '../ThemeToggle';
import { apiFetch, getApiUrl } from '../../utils/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPushSubscriptionState, subscribeToPush, unsubscribeFromPush, initializePushNotifications } from '../../utils/pushManager';
import { toast } from 'sonner';

function formatAccessDate(date: any) {
  if (!date) return 'Unlimited Access';

  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

const SecuritySection = lazy(() => import('./settings/SecuritySection'));
const PaymentsSection = lazy(() => import('./settings/PaymentsSection'));
const CertificatesSection = lazy(() => import('./settings/CertificatesSection'));
const HelpSection = lazy(() => import('./settings/HelpSection'));

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

const formatNotificationDate = (dateString: string | Date) => {
  const d = new Date(dateString);
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'AM' : 'PM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  
  return `${day} ${month} ${year}, ${hours}:${minutesStr} ${ampm}`;
};

const getNotificationDetails = (n: any) => {
  const type = n.type || 'system';
  const message = (n.message || '').toLowerCase();
  
  if (type === 'upload') {
    if (message.includes('live class') || message.includes('lecture') || message.includes('live lecture')) {
      return {
        title: 'Live Class Reminder',
        icon: Video,
        bgClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30',
        iconClass: 'text-blue-600 dark:text-blue-400',
        badgeClass: 'bg-violet-50/50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400 border-violet-100/60 dark:border-violet-900/30',
        label: 'Academic'
      };
    }
    return {
      title: 'New Study Material Added',
      icon: FileText,
      bgClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      badgeClass: 'bg-violet-50/50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400 border-violet-100/60 dark:border-violet-900/30',
      label: 'Academic'
    };
  }
  
  if (type === 'completion') {
    return {
      title: 'Certificate Available',
      icon: Award,
      bgClass: 'bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/30',
      iconClass: 'text-teal-600 dark:text-teal-400',
      badgeClass: 'bg-violet-50/50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400 border-violet-100/60 dark:border-violet-900/30',
      label: 'Academic'
    };
  }
  
  if (type === 'enrollment') {
    return {
      title: 'Enrollment Confirmed',
      icon: GraduationCap,
      bgClass: 'bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400 border border-violet-100/50 dark:border-violet-900/30',
      iconClass: 'text-violet-600 dark:text-violet-400',
      badgeClass: 'bg-indigo-50/50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 border-indigo-100/60 dark:border-indigo-900/30',
      label: 'Enrollment'
    };
  }
  
  if (type === 'payment') {
    return {
      title: 'Payment Successful',
      icon: CreditCard,
      bgClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30',
      iconClass: 'text-amber-600 dark:text-amber-400',
      badgeClass: 'bg-amber-50/50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100/60 dark:border-amber-900/30',
      label: 'Payments'
    };
  }
  
  // Default or 'system'
  if (message.includes('login') || message.includes('security') || message.includes('device') || message.includes('ip')) {
    return {
      title: 'Security Alert',
      icon: ShieldCheck,
      bgClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30',
      iconClass: 'text-rose-600 dark:text-rose-400',
      badgeClass: 'bg-rose-50/50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-rose-100/60 dark:border-rose-900/30',
      label: 'System'
    };
  }
  
  return {
    title: 'System Alert',
    icon: Bell,
    bgClass: 'bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400 border border-slate-100/50 dark:border-slate-800/30',
    iconClass: 'text-slate-600 dark:text-slate-400',
    badgeClass: 'bg-rose-50/50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-rose-100/60 dark:border-rose-900/30',
    label: 'System'
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

  const [user, setUser] = useState<any>(() => {
    const cached = localStorage.getItem('user');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch (_) {
      return null;
    }
  });
  const queryClient = useQueryClient();

  const userId = user?._id || user?.id || '';
  const instituteId = user?.institute?._id || user?.institute || '';

  // Queries
  const { data: purchasedCourses = [] } = useQuery({
    queryKey: ['courses', 'purchased', userId],
    queryFn: () => apiFetch('/purchases/my-courses'),
    enabled: !!userId,
  });

  const { data: watchHistory = [] } = useQuery({
    queryKey: ['history', userId],
    queryFn: () => apiFetch('/progress/history'),
    enabled: !!userId,
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ['courses', instituteId],
    queryFn: () => apiFetch('/courses'),
    enabled: !!instituteId,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements', instituteId],
    queryFn: () => apiFetch('/analytics/announcements'),
    enabled: !!instituteId,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => apiFetch('/student-notifications'),
    enabled: !!userId,
  });

  const notifications = notificationsData?.notifications || [];
  const unreadNotifications = notificationsData?.unreadCount || 0;

  const { data: securityStatusRes } = useQuery({
    queryKey: ['status', userId],
    queryFn: () => apiFetch('/security/status', { ignoreAuthError: true }),
    refetchInterval: 5000,
    enabled: !!userId,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => apiFetch('/auth/profile'),
    placeholderData: undefined,
  });

  // Derived loading state
  const loading = false; // We can set this to false, as cached values render instantly.
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

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
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', recoveryEmail: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [settingsSubTab, setSettingsSubTab] = useState('profile');
  const [mobileSettingsExpanded, setMobileSettingsExpanded] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarOffset, setAvatarOffset] = useState({ x: 0, y: 0 });
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [activeCertificate, setActiveCertificate] = useState<any>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  const [notificationFilter, setNotificationFilter] = useState('all');
  const [notificationSort, setNotificationSort] = useState('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushSubscriptionLoading, setPushSubscriptionLoading] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
        const sub = await getPushSubscriptionState();
        setIsPushSubscribed(!!sub);
      }
    };
    checkSubscription();
    initializePushNotifications().then(() => {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
        getPushSubscriptionState().then(sub => setIsPushSubscribed(!!sub));
      }
    });
  }, []);

  useEffect(() => {
    const shouldShow = 
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default' &&
      localStorage.getItem('trineo_push_prompt_dismissed') !== 'true' &&
      !isPushSubscribed;
    setShowPushBanner(shouldShow);
  }, [isPushSubscribed]);

  const togglePushSubscription = async () => {
    setPushSubscriptionLoading(true);
    try {
      if (isPushSubscribed) {
        const success = await unsubscribeFromPush();
        if (success) {
          setIsPushSubscribed(false);
          toast.success('Successfully unsubscribed from push notifications on this device.');
        } else {
          toast.error('Failed to unsubscribe from push notifications.');
        }
      } else {
        const sub = await subscribeToPush();
        if (sub) {
          setIsPushSubscribed(true);
          toast.success('Successfully enabled push notifications on this device!');
        } else {
          toast.error('Could not subscribe. Please check notification permissions.');
        }
      }
    } catch (err: any) {
      console.error('Push toggle error:', err);
      toast.error(err.message || 'Error configuring push notifications.');
    } finally {
      setPushSubscriptionLoading(false);
    }
  };

  const handleFileChange = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedAvatarFile(reader.result as string);
      setAvatarZoom(1);
      setAvatarOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    if (!selectedAvatarFile) return;
    setIsSavingAvatar(true);
    try {
      const res = await apiFetch('/student-account/profile/avatar', {
        method: 'PUT',
        body: JSON.stringify({ image: selectedAvatarFile }),
      });
      if (res && res.avatar) {
        const updatedUser = { ...user, avatar: res.avatar, profileImageUrl: res.profileImageUrl || res.avatar };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success('Profile photo updated successfully!');
        setAvatarModalOpen(false);
        setSelectedAvatarFile(null);
      } else {
        toast.error(res?.message || 'Failed to save profile photo.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred while saving profile photo.');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsSavingAvatar(true);
    try {
      const res = await apiFetch('/student-account/profile/avatar', {
        method: 'DELETE'
      });
      if (res && res.avatar === '') {
        const updatedUser = { ...user, avatar: '', profileImageUrl: '' };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success('Profile photo removed successfully!');
        setAvatarModalOpen(false);
        setSelectedAvatarFile(null);
      } else {
        toast.error(res?.message || 'Failed to remove profile photo.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred while removing profile photo.');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleTogglePreference = async (key: string) => {
    if (!user) return;
    const currentPrefs = user.notificationPreferences || { academic: true, liveClass: true, security: true, announcement: true, certificates: true };
    const updatedPrefs = {
      ...currentPrefs,
      [key]: !currentPrefs[key]
    };
    
    // Update local state first for instant response
    const updatedUser = {
      ...user,
      notificationPreferences: updatedPrefs
    };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));

    try {
      await apiFetch('/student-account/profile', {
        method: 'PUT',
        body: JSON.stringify({
          notificationPreferences: updatedPrefs
        })
      });
      toast.success('Notification preferences updated.');
    } catch (err: any) {
      console.error('Failed to update preferences on backend:', err);
      toast.error('Failed to sync preferences with server.');
      // Revert state on failure
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    }
  };

  const renderNotificationPreferencesContent = () => {
    const prefs = user?.notificationPreferences || { academic: true, liveClass: true, security: true, announcement: true, certificates: true };
    
    return (
      <div className="space-y-6">
        {/* Device Push Notification Registration */}
        <div className="p-4 bg-violet-500/5 border border-violet-500/10 rounded-2xl space-y-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>Device Push Alerts</span>
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
                Enable push notifications on this browser/device to receive real-time updates even when the tab is closed.
              </p>
            </div>
            
            <button
              type="button"
              disabled={pushSubscriptionLoading}
              onClick={togglePushSubscription}
              className={`relative inline-flex h-6.5 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                isPushSubscribed ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-800'
              } ${pushSubscriptionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isPushSubscribed ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground pt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Current Status: {isPushSubscribed ? 'Subscribed on this Device' : 'Not Subscribed'}</span>
          </div>
        </div>

        {/* Categories Preference list */}
        <div className="space-y-4 pt-1">
          <h4 className="font-extrabold text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
            <span>Notification Categories</span>
          </h4>
          
          <div className="divide-y divide-border/40">
            {/* Live Class alerts */}
            <div className="py-4 flex items-center justify-between gap-4 first:pt-0">
              <div className="space-y-1">
                <div className="font-bold text-sm text-foreground">Live Lectures & Reminders</div>
                <div className="text-xs text-muted-foreground">Get notified when a live class starts or 15 minutes before scheduling.</div>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference('liveClass')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  prefs.liveClass ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    prefs.liveClass ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Academic Content Alerts */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-sm text-foreground">Academic Material & Uploads</div>
                <div className="text-xs text-muted-foreground">Get notified when new videos, pdf notes, study packages, or certificates become available.</div>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference('academic')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  prefs.academic ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    prefs.academic ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Announcements alerts */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-sm text-foreground">General Announcements</div>
                <div className="text-xs text-muted-foreground">System alerts, server schedules, administrative notifications, and news.</div>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference('announcement')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  prefs.announcement ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    prefs.announcement ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Certificates alerts */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-sm text-foreground">Certificates Available</div>
                <div className="text-xs text-muted-foreground">Get notified when you complete a course track and your certificate is ready.</div>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference('certificates')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  prefs.certificates !== false ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    prefs.certificates !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Security Alerts */}
            <div className="py-4 flex items-center justify-between gap-4 last:pb-0">
              <div className="space-y-1">
                <div className="font-bold text-sm text-foreground">Security & Login Alerts</div>
                <div className="text-xs text-muted-foreground text-rose-500 font-semibold">Critical security events, concurrent login violations, and password updates cannot be disabled.</div>
              </div>
              <button
                type="button"
                disabled
                className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-not-allowed rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-violet-600 opacity-60"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 translate-x-5"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const notificationCounts = useMemo(() => {
    const counts = {
      all: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      system: notifications.filter(n => n.type === 'system').length,
      academic: notifications.filter(n => n.type === 'upload' || n.type === 'completion').length,
      enrollment: notifications.filter(n => n.type === 'enrollment').length,
      payment: notifications.filter(n => n.type === 'payment').length
    };
    return counts;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    let list = [...notifications];
    
    // Filter
    if (notificationFilter === 'unread') {
      list = list.filter(n => !n.read);
    } else if (notificationFilter === 'system') {
      list = list.filter(n => n.type === 'system');
    } else if (notificationFilter === 'academic') {
      list = list.filter(n => n.type === 'upload' || n.type === 'completion');
    } else if (notificationFilter === 'enrollment') {
      list = list.filter(n => n.type === 'enrollment');
    } else if (notificationFilter === 'payment') {
      list = list.filter(n => n.type === 'payment');
    }
    
    // Sort
    list.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return notificationSort === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    return list;
  }, [notifications, notificationFilter, notificationSort]);

  const selectableNotifications = useMemo(() => {
    return filteredNotifications;
  }, [filteredNotifications]);

  useEffect(() => {
    localStorage.setItem('trineo_student_active_tab', activeTab);
  }, [activeTab]);

  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // Global Security Lock Overlay — syncs with ProtectionManager across tabs
  const [securityLockActive, setSecurityLockActive] = useState(false);
  const [securityLockRemaining, setSecurityLockRemaining] = useState(0);
  const [forceLogout, setForceLogout] = useState(false);
  const [accountLocked, setAccountLocked] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<any>(null);

  const diagToken = localStorage.getItem('token');
  const diagUserStr = localStorage.getItem('user');
  let diagCurrentUser = null;
  try { diagCurrentUser = diagUserStr ? JSON.parse(diagUserStr) : null; } catch (_) {}
  console.log("AUTH TOKEN", diagToken);
  console.log("CURRENT USER", diagCurrentUser);
  console.log("FORCE LOGOUT", forceLogout);
  console.log("ACCOUNT LOCKED", accountLocked);

  // Synchronize query's securityStatus response with component states
  useEffect(() => {
    if (securityStatusRes) {
      setSecurityStatus(securityStatusRes);
      if (securityStatusRes.serverTime) {
        const offset = new Date(securityStatusRes.serverTime).getTime() - Date.now();
        setServerTimeOffset(offset);
        console.log("[SECURITY STUDENT DASHBOARD] Server time sync offset calculated:", offset);
      }
      if (securityStatusRes.penaltyActive && securityStatusRes.penaltyUntil) {
        const penaltyMs = new Date(securityStatusRes.penaltyUntil).getTime();
        localStorage.setItem('trineo_security_lock_until', penaltyMs.toString());
        localStorage.setItem('trineo_lock_requires_manual_resume', 'true');
      }
      setForceLogout(!!securityStatusRes.forceLogout);
      setAccountLocked(!!securityStatusRes.accountLocked);
      if (securityStatusRes.forceLogout || securityStatusRes.accountLocked) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const reason = securityStatusRes.accountLocked ? 'locked' : 'exceeded';
        window.location.href = `/security-lock?reason=${reason}`;
      }
    }
  }, [securityStatusRes]);

  useEffect(() => {
    // Check on mount if a lock is active (from localStorage or server)
    const checkLock = () => {
      const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
      const adjustedNow = Date.now() + serverTimeOffset;

      const isActive = lockUntil > adjustedNow;
      const remaining = isActive ? Math.max(0, Math.ceil((lockUntil - adjustedNow) / 1000)) : 0;

      console.log("[SECURITY STUDENT DASHBOARD] checkLock evaluation:", {
        penaltyUntil: lockUntil > 0 ? new Date(lockUntil).toISOString() : 'none',
        serverTime: new Date(adjustedNow).toISOString(),
        remainingSeconds: remaining,
        securityLockActive: isActive,
        securityLockRemaining: remaining
      });

      if (isActive) {
        setSecurityLockActive(true);
        setSecurityLockRemaining(remaining);
      } else {
        setSecurityLockActive(false);
        setSecurityLockRemaining(0);
      }
    };
    checkLock();

    // Listen for storage events from other tabs (ProtectionManager dispatches these)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'trineo_security_lock_until') {
        console.log("[SECURITY STUDENT DASHBOARD] handleStorage event:", {
          key: e.key,
          newValue: e.newValue
        });
        checkLock();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Countdown interval when lock is active
    const interval = setInterval(() => {
      checkLock();
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [serverTimeOffset]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

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

  const stageDetails = useMemo(() => {
    const count = securityStatus?.violationCount || 0;
    if (securityStatus?.accountLocked || count >= 4) {
      return { label: 'Account Locked', color: 'text-rose-500', icon: '⛔', badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
    }
    if (count === 3) {
      return { label: 'Session Terminated', color: 'text-red-500 animate-pulse', icon: '🔴', badge: 'bg-red-500/10 text-red-500 border-red-500/20 font-semibold' };
    }
    if (count === 2) {
      return { label: 'Final Warning', color: 'text-orange-500 font-semibold', icon: '🟠', badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20' };
    }
    if (count === 1) {
      return { label: 'Warning', color: 'text-yellow-600 dark:text-yellow-400', icon: '🟡', badge: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' };
    }
    return { label: 'Clear', color: 'text-emerald-500', icon: '🟢', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
  }, [securityStatus]);

  const antiPiracyStats = useMemo(() => {
    let screenshots = 0;
    let recordings = 0;
    let printScreens = 0;
    let lastViolationDate: string | null = null;

    violations.forEach((v: any) => {
      const type = (v.eventType || '').toUpperCase();
      const details = (v.details || '').toLowerCase();
      
      if (type === 'SCREENSHOT' || type === 'SCREENSHOT_ATTEMPT' || type === 'SCREENSHOT_VIOLATION') {
        if (details.includes('printscreen') || details.includes('print screen') || details.includes('print_screen')) {
          printScreens += 1;
        } else {
          screenshots += 1;
        }
      } else if (type === 'SCREEN_RECORDING' || type === 'SCREEN_RECORDING_DETECTED') {
        recordings += 1;
      }
      
      const vDate = new Date(v.createdAt || v.timestamp);
      if (!lastViolationDate || vDate.getTime() > new Date(lastViolationDate).getTime()) {
        lastViolationDate = v.createdAt || v.timestamp;
      }
    });

    const totalViolations = screenshots + recordings + printScreens;
    
    let riskLevel = 'Low';
    if (totalViolations >= 3) riskLevel = 'High';
    else if (totalViolations >= 1) riskLevel = 'Medium';

    return {
      screenshots,
      recordings,
      printScreens,
      totalViolations,
      riskLevel,
      lastViolationDate
    };
  }, [violations]);

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

  const profileCompletion = useMemo(() => {
    let completed = 0;
    const checklist = [
      { name: 'Full Name', done: !!user?.name },
      { name: 'Email Address', done: !!user?.email },
      { name: 'Mobile Phone', done: !!user?.phone },
      { name: 'Profile Photo', done: !!user?.avatar },
      { name: 'Recovery Email', done: !!user?.recoveryEmail }
    ];
    checklist.forEach(item => {
      if (item.done) completed += 20;
    });
    return { percent: completed, checklist };
  }, [user]);

  const passwordStrength = useMemo(() => {
    const pw = passwordForm.newPassword;
    if (!pw) return { score: 0, text: '', color: 'bg-zinc-200' };
    let score = 0;
    if (pw.length >= 6) score += 1;
    if (pw.length >= 8) score += 1;
    if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;
    if (pw.length >= 12) score += 1;

    switch (score) {
      case 1: return { score: 25, text: 'Weak', color: 'bg-rose-500' };
      case 2: return { score: 50, text: 'Medium', color: 'bg-amber-500' };
      case 3: return { score: 75, text: 'Strong', color: 'bg-indigo-500' };
      case 4: return { score: 100, text: 'Very Strong', color: 'bg-emerald-500' };
      default: return { score: 10, text: 'Too Short', color: 'bg-rose-500' };
    }
  }, [passwordForm.newPassword]);

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
        const data = await apiFetch('/faculty');
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

    const loadPayments = async () => {
      setPaymentsLoading(true);
      try {
        const data = await apiFetch('/purchases/my-payments');
        setPayments(data || []);
      } catch (err) {
        console.error('Failed to load payments:', err);
      } finally {
        setPaymentsLoading(false);
      }
    };

    if (activeTab === 'materials') loadStudyMaterials();
    if (activeTab === 'faculty') loadFaculty();
    if (activeTab === 'security' || activeTab === 'settings') loadSecurityLogs();
    if (activeTab === 'live-classes' || activeTab === 'home') loadLiveClasses();
    if (activeTab === 'access') loadAccessRules();
    if (activeTab === 'settings') loadPayments();
  }, [activeTab, user, materialsSearch, selectedMaterialType, selectedMaterialCourseId, settingsSubTab]);

  const loadNotifications = async () => {
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  useEffect(() => {
    if (profile) {
      setUser(profile);
      setProfileForm({ 
        name: profile?.name || '', 
        phone: profile?.phone || '', 
        recoveryEmail: profile?.recoveryEmail || '' 
      });
      setResetEmail(profile?.recoveryEmail || profile?.email || '');
      localStorage.setItem('user', JSON.stringify(profile));
    }
  }, [profile]);

  // Fallback to cache or navigate to login
  useEffect(() => {
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      setUser(JSON.parse(cachedUser));
    } else if (profile === null) {
      navigate('/');
    }
  }, [profile, navigate]);

  const loadDashboardData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['courses', instituteId] }),
      queryClient.invalidateQueries({ queryKey: ['courses', 'purchased', userId] }),
      queryClient.invalidateQueries({ queryKey: ['history', userId] }),
      queryClient.invalidateQueries({ queryKey: ['announcements', instituteId] }),
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
    ]);
  };

  const prefetchTab = (tabId: string) => {
    if (tabId === 'courses') {
      queryClient.prefetchQuery({ queryKey: ['courses', 'purchased', userId], queryFn: () => apiFetch('/purchases/my-courses') });
      queryClient.prefetchQuery({ queryKey: ['courses', instituteId], queryFn: () => apiFetch('/courses') });
    } else if (tabId === 'notifications') {
      queryClient.prefetchQuery({ queryKey: ['notifications', userId], queryFn: () => apiFetch('/student-notifications') });
      queryClient.prefetchQuery({ queryKey: ['announcements', instituteId], queryFn: () => apiFetch('/analytics/announcements') });
    } else if (tabId === 'settings' || tabId === 'security') {
      queryClient.prefetchQuery({ queryKey: ['profile', userId], queryFn: () => apiFetch('/auth/profile') });
    } else if (tabId === 'home') {
      queryClient.prefetchQuery({ queryKey: ['courses', 'purchased', userId], queryFn: () => apiFetch('/purchases/my-courses') });
      queryClient.prefetchQuery({ queryKey: ['history', userId], queryFn: () => apiFetch('/progress/history') });
      queryClient.prefetchQuery({ queryKey: ['courses', instituteId], queryFn: () => apiFetch('/courses') });
      queryClient.prefetchQuery({ queryKey: ['announcements', instituteId], queryFn: () => apiFetch('/analytics/announcements') });
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    queryClient.clear();
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    navigate('/login', { replace: true });
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
    <div className="flex min-h-screen overflow-x-hidden bg-background text-foreground pb-safe-nav lg:pb-0">
      {/* Global Security Lock Overlay — blocks all dashboard interaction during active penalty */}
      {securityLockActive && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(0, 0, 0, 0.92)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
        }}>
          <div style={{
            maxWidth: '420px',
            width: '90%',
            textAlign: 'center',
            padding: '40px 32px',
            borderRadius: '20px',
            background: 'rgba(15, 15, 25, 0.9)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 80px rgba(239,68,68,0.08)',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
              border: '2px solid rgba(239,68,68,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Shield style={{ width: '28px', height: '28px', color: '#ef4444' }} />
            </div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#ef4444',
              margin: '0 0 8px 0',
            }}>🛡 Security Violation Active</h3>
            <p style={{
              fontSize: '0.82rem',
              color: 'rgba(255,255,255,0.5)',
              margin: '0 0 20px 0',
              lineHeight: 1.6,
            }}>Video access temporarily suspended due to a screen capture violation.</p>
            {securityLockRemaining > 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '16px',
              }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#ef4444',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>Time Remaining</span>
                <span style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '0.05em',
                }}>{String(Math.floor(securityLockRemaining / 60)).padStart(2, '0')}:{String(securityLockRemaining % 60).padStart(2, '0')}</span>
              </div>
            )}
            <p style={{
              fontSize: '0.72rem',
              color: 'rgba(255,255,255,0.3)',
              margin: 0,
              lineHeight: 1.5,
            }}>Do not attempt screenshots or screen recording. Repeated violations may terminate your session.</p>
          </div>
        </div>
      )}
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
                onMouseEnter={() => prefetchTab(item.id)}
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
        <header className="h-16 lg:h-14 sticky top-0 lg:relative z-40 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 select-none touch-btn">
          {/* Mobile-Only Header */}
          <div className="flex lg:hidden items-center justify-between w-full h-full">
            {/* Left: Student Avatar */}
            <div className="flex items-center gap-2">
              <Avatar className="w-9 h-9 border border-border/80 shadow-sm">
                <AvatarImage src={user?.avatar ? (user.avatar.startsWith('/') ? getApiUrl(user.avatar) : user.avatar) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'student'}`} />
                <AvatarFallback>ST</AvatarFallback>
              </Avatar>
            </div>
            {/* Center: Greeting & Student Name */}
            <div className="flex flex-col items-center text-center justify-center flex-1 min-w-0 px-2">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                {(() => {
                  const hr = new Date().getHours();
                  if (hr < 12) return 'Good Morning 👋';
                  if (hr < 17) return 'Good Afternoon 👋';
                  return 'Good Evening 👋';
                })()}
              </span>
              <span className="text-xs font-black text-foreground truncate max-w-[140px]">{user?.name || 'Student'}</span>
            </div>
            {/* Right: Theme Toggle & Notification Bell with Count */}
            <div className="flex items-center gap-1">
              <ThemeToggleButton />
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setActiveTab('notifications');
                  navigate('/student?tab=notifications');
                }}
              >
                <Bell className="w-5 h-5 text-foreground" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[8px] font-black text-white leading-none shadow-sm">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Desktop-Only Header (Keep original design completely unchanged) */}
          <div className="hidden lg:flex items-center justify-between w-full h-full">
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
          </div>
        </header>
        {isOffline && (
          <div className="sticky top-16 lg:top-14 z-50 bg-red-600 text-white text-xs font-black text-center py-2 animate-in fade-in slide-in-from-top duration-300 shadow-sm select-none">
            📶 Offline Mode - Some features may be unavailable
          </div>
        )}



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
                {showPushBanner && (
                  <div className="bg-gradient-to-br from-violet-650/15 via-indigo-650/10 to-transparent border border-violet-500/25 rounded-2xl p-4.5 sm:p-5 relative overflow-hidden shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 border border-violet-500/20">
                        <Bell className="w-5 h-5 animate-bounce text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm text-foreground">Enable Push Notifications?</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                          Get real-time updates for live classes, reminders, new video lessons, certificates, and administrative announcements right on your device.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3.5 self-end md:self-auto shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground font-bold rounded-xl pr-3 pl-3 h-9 cursor-pointer transition-colors"
                        onClick={() => {
                          localStorage.setItem('trineo_push_prompt_dismissed', 'true');
                          setShowPushBanner(false);
                        }}
                      >
                        Not Now
                      </Button>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-purple-650 to-indigo-650 text-white font-extrabold text-xs px-4.5 rounded-xl h-9 shadow-md shadow-purple-500/10 hover:opacity-95 active:scale-95 transition-all cursor-pointer border-0"
                        onClick={async () => {
                          try {
                            const sub = await subscribeToPush();
                            if (sub) {
                              setIsPushSubscribed(true);
                              setShowPushBanner(false);
                              toast.success('Push notifications enabled successfully!');
                            }
                          } catch (err: any) {
                            console.error('Prompt subscription error:', err);
                            toast.error(err.message || 'Permission denied or error occurred.');
                          }
                        }}
                      >
                        Enable Alerts
                      </Button>
                    </div>
                  </div>
                )}
                {(() => {
                  // Filter out mock data. Always use real database results.
                  const displayAnnouncements = announcements || [];

                  const displayActivities = watchHistory.length > 0 ? watchHistory.slice(0, 3).map((h: any) => {
                    const courseTitle = h.contentId?.lessonId?.unitId?.subjectId?.programId?.name || h.courseId?.title || '';
                    const lessonTitle = h.contentId?.title || h.lessonId?.title || '';
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
                  }) : [];

                  const displayContinueWatching = continueWatching.map(c => ({
                    title: c.title,
                    progress: c.progress || 0,
                    instructor: c.instructor || 'Faculty Instructor',
                    thumbnail: c.thumbnail || 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&q=80',
                    _id: c._id,
                    isMock: false
                  })).slice(0, 3);

                  // Compute stats for mobile
                  const continueLearningWidgetData = (() => {
                    if (watchHistory && watchHistory.length > 0) {
                      const sorted = [...watchHistory].sort((a, b) => {
                        const dateA = new Date(a.lastWatchedAt || a.watchedAt || 0).getTime();
                        const dateB = new Date(b.lastWatchedAt || b.watchedAt || 0).getTime();
                        return dateB - dateA;
                      });
                      const last = sorted[0];
                      const courseTitle = last.contentId?.lessonId?.unitId?.subjectId?.programId?.name || last.courseId?.title || 'C Programming';
                      const lessonTitle = last.contentId?.title || last.lessonId?.title || 'Introduction to pointers';
                      const progress = last.progress || 0;
                      const courseId = last.contentId?.lessonId?.unitId?.subjectId?.programId?._id || last.courseId?._id;
                      const duration = last.contentId?.lessonId?.duration || last.lessonId?.duration || 15;
                      const remaining = Math.max(1, Math.round(duration * (1 - progress / 100)));
                      const unitTitle = last.contentId?.lessonId?.unitId?.title || 'Unit 1';
                      const thumbnail = last.contentId?.lessonId?.unitId?.subjectId?.programId?.thumbnail || 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&q=80';
                      return {
                        courseTitle,
                        lessonTitle,
                        unitTitle,
                        progress,
                        remaining,
                        courseId,
                        thumbnail,
                        hasHistory: true
                      };
                    } else if (purchasedCourses && purchasedCourses.length > 0) {
                      const firstCourse = purchasedCourses[0];
                      return {
                        courseTitle: firstCourse.title || 'C Programming',
                        lessonTitle: 'Introduction to Course',
                        unitTitle: 'Unit 1',
                        progress: 0,
                        remaining: 15,
                        courseId: firstCourse._id,
                        thumbnail: firstCourse.thumbnail || 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&q=80',
                        hasHistory: false
                      };
                    }
                    return null;
                  })();

                  const avgProgress = (() => {
                    if (purchasedCourses.length === 0) return 0;
                    let total = 0;
                    purchasedCourses.forEach(course => {
                      const lessonHistory = watchHistory.filter(h => {
                        const progId = h.contentId?.lessonId?.unitId?.subjectId?.programId?._id || h.courseId?._id;
                        return progId && progId.toString() === course._id.toString();
                      });
                      const progress = lessonHistory.length > 0
                        ? Math.round(lessonHistory.reduce((sum, current) => sum + current.progress, 0) / lessonHistory.length)
                        : 0;
                      total += progress;
                    });
                    return Math.round(total / purchasedCourses.length);
                  })();

                  const completedCoursesCount = purchasedCourses.filter((course) => {
                    const lessonHistory = watchHistory.filter(h => {
                      const progId = h.contentId?.lessonId?.unitId?.subjectId?.programId?._id || h.courseId?._id;
                      return progId && progId.toString() === course._id.toString();
                    });
                    const progress = lessonHistory.length > 0
                      ? Math.round(lessonHistory.reduce((sum, current) => sum + current.progress, 0) / lessonHistory.length)
                      : 0;
                    return progress >= 100;
                  }).length;

                  return (
                    <div className="space-y-8">
                      {/* =========================================== */}
                      {/* MOBILE VIEW */}
                      {/* =========================================== */}
                      <div className="block lg:hidden space-y-6">


                        {/* 3. Continue Learning Hero Card */}
                        {continueLearningWidgetData ? (
                          <div className="w-full max-w-full relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-indigo-900 via-slate-900 to-violet-950 p-5 shadow-xl text-white flex flex-col gap-4">
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
                            
                            <div className="flex items-start gap-4 z-10 w-full max-w-full min-w-0">
                              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/10 shadow-lg">
                                <img 
                                  src={continueLearningWidgetData.thumbnail} 
                                  alt="Course Thumbnail" 
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <Play className="w-6 h-6 text-white fill-white drop-shadow-md" />
                                </div>
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">CONTINUE WATCHING</span>
                                <h4 className="font-extrabold text-sm text-white truncate leading-snug">{continueLearningWidgetData.courseTitle}</h4>
                                <p className="text-[10px] text-slate-300 truncate font-semibold">
                                  {continueLearningWidgetData.unitTitle} → {continueLearningWidgetData.lessonTitle}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-1.5 z-10 w-full">
                              <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
                                <span>{continueLearningWidgetData.progress}% Complete</span>
                                <span className="text-indigo-400 font-black">Remaining: {continueLearningWidgetData.remaining}m</span>
                              </div>
                              <Progress value={continueLearningWidgetData.progress} className="h-2 bg-white/15 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-indigo-500 rounded-full" />
                            </div>

                            <Button 
                              onClick={() => handleVideoClick(continueLearningWidgetData.courseId)}
                              className="w-full h-12 bg-white text-indigo-950 hover:bg-slate-100 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] active:scale-95 transition-all duration-200 touch-btn border-0"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Resume Course</span>
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border p-6 text-center bg-card/45 backdrop-blur-sm">
                            <BookOpen className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                            <p className="text-xs font-bold text-foreground">No active learning batches</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Please enroll in a course to start learning.</p>
                          </div>
                        )}

                        {/* 4. Dashboard Statistics Cards */}
                        <div className="space-y-2.5">
                          <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground pl-1">Dashboard Statistics</h3>
                          <div className="grid grid-cols-2 gap-3 pb-2 select-none">
                            <div className="w-full bg-card/85 border border-border/40 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
                              <div className="w-11 h-11 rounded-xl bg-purple-50/10 border border-purple-50/20 text-purple-650 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <BookOpen className="w-5.5 h-5.5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Active Batches</h4>
                                <p className="text-xs font-black text-foreground mt-0.5">{purchasedCourses.length} Enrolled</p>
                              </div>
                            </div>

                            <div className="w-full bg-card/85 border border-border/40 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
                              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                                <Award className="w-5.5 h-5.5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Certificates</h4>
                                <p className="text-xs font-black text-foreground mt-0.5">{completedCoursesCount} Unlocked</p>
                              </div>
                            </div>

                            <div className="w-full col-span-2 bg-card/85 border border-border/40 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                                securityScore >= 90 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                  : 'bg-destructive/10 border-destructive/20 text-destructive'
                              }`}>
                                <Shield className="w-5.5 h-5.5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Security Score</h4>
                                <p className="text-xs font-black text-foreground mt-0.5">{securityScore} / 100</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 5. Compact 2-column Quick Access Grid */}
                        <div className="space-y-2.5">
                          <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground pl-1">Quick Access</h3>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { id: 'courses', label: 'My Batches', icon: BookOpen, color: 'text-purple-650 bg-purple-50/10 dark:text-purple-400 dark:bg-purple-950/20', path: '/student/courses' },
                              { id: 'live-classes', label: 'Live Classes', icon: Video, color: 'text-rose-500 bg-rose-500/10', path: '/student?tab=live-classes' },
                              { id: 'materials', label: 'Study Materials', icon: FileText, color: 'text-amber-500 bg-amber-500/10', path: '/student?tab=materials' },
                              { id: 'security', label: 'Security Center', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-950/20', path: '/student?tab=security' },
                              { id: 'faculty', label: 'Faculty Contacts', icon: Users, color: 'text-blue-500 bg-blue-500/10', path: '/student?tab=faculty' },
                              { id: 'settings', label: 'Settings', icon: Settings, color: 'text-indigo-500 bg-indigo-500/10', path: '/student?tab=settings' }
                            ].map((item) => {
                              const Icon = item.icon;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    if (item.id === 'courses') {
                                      navigate(item.path);
                                    } else {
                                      setActiveTab(item.id);
                                      navigate(item.path);
                                    }
                                  }}
                                  className="flex items-center gap-3 p-3 bg-card border border-border/40 hover:border-primary/20 rounded-2xl transition-all duration-200 text-left active:scale-[0.98] shadow-sm select-none touch-btn min-h-[48px] min-w-0"
                                >
                                  <div className={`p-2 rounded-xl shrink-0 ${item.color} flex items-center justify-center`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs font-bold text-foreground leading-tight min-w-0 flex-1">{item.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 6. Upcoming Live Class widget with Join button */}
                        <div className="space-y-3">
                          <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground pl-1">Next Lecture</h3>
                          {(() => {
                            const nextLiveClass = (() => {
                              const activeClasses = liveClasses.filter(c => new Date(c.endTime) > new Date() && c.status !== 'cancelled');
                              if (activeClasses.length === 0) return null;
                              return activeClasses.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
                            })();

                            if (nextLiveClass) {
                              const isLive = nextLiveClass.status === 'live' || (new Date(nextLiveClass.startTime) <= new Date() && new Date(nextLiveClass.endTime) >= new Date());
                              return (
                                <div className={`relative overflow-hidden rounded-2xl border ${isLive ? 'border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent' : 'border-border/40 bg-card/65'} p-4 shadow-sm space-y-3`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                                        <Video className="w-5 h-5" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h4 className="text-xs font-extrabold text-foreground truncate">{nextLiveClass.title}</h4>
                                          {isLive && (
                                            <span className="flex h-2 w-2 relative shrink-0">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground truncate">{nextLiveClass.courseId?.name || nextLiveClass.courseId?.title || 'Batch'} · {nextLiveClass.facultyId?.name || 'Faculty Instructor'}</p>
                                      </div>
                                    </div>
                                    <Badge variant="secondary" className="text-[9px] uppercase font-black tracking-wider py-0.5 px-2 bg-muted/65">{nextLiveClass.platform}</Badge>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 pt-1">
                                    <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                                      <span>{new Date(nextLiveClass.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ({new Date(nextLiveClass.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</span>
                                    </div>

                                    <Button
                                      size="sm"
                                      className="bg-primary text-white hover:bg-primary/90 font-bold rounded-xl text-[11px] px-4 h-9 touch-btn"
                                      onClick={async () => {
                                        try {
                                          const res = await apiFetch(`/live-classes/${nextLiveClass._id}/join`, { method: 'POST' });
                                          if (res.meetingUrl) {
                                            toast.success('Attendance recorded!', { description: 'Opening lecture window...' });
                                            window.open(res.meetingUrl, '_blank');
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
                                </div>
                              );
                            }

                            return (
                              <div className="rounded-2xl border border-dashed border-border p-6 text-center bg-card/45 backdrop-blur-sm shadow-sm select-none">
                                <Video className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                                <p className="text-xs font-bold text-foreground">No upcoming live classes scheduled</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Please check back later for updates.</p>
                              </div>
                            );
                          })()}
                        </div>

                        {/* 7. Recent Learning Activity timeline */}
                        <div className="space-y-3">
                          <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground pl-1">Recent Activity</h3>
                          {displayActivities.length > 0 ? (
                            <div className="relative border-l-2 border-border/40 pl-4 ml-3 space-y-4">
                              {displayActivities.slice(0, 3).map((act, index) => (
                                <div key={index} className="relative space-y-1">
                                  <div className="absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full bg-background border-2 border-primary flex items-center justify-center shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                  </div>
                                  <div className="flex justify-between items-start gap-2">
                                    <h4 className="text-xs font-extrabold text-foreground leading-snug">{act.title}</h4>
                                    <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">{act.relativeTime}</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground font-semibold">
                                    {act.courseTitle} · <span className="text-primary font-bold">{act.detail}</span>
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-xs text-muted-foreground font-semibold bg-card/65 backdrop-blur-md rounded-2xl border border-border/45 p-4 shadow-sm">
                              No recent activity recorded.
                            </div>
                          )}
                        </div>

                        {/* 8. Modern Announcement cards with category icons */}
                        <div className="space-y-3">
                          <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground pl-1">Announcements</h3>
                          <div className="space-y-3">
                            {displayAnnouncements.map((ann, index) => {
                              const isQna = ann.title.toLowerCase().includes('live') || ann.title.toLowerCase().includes('q&a');
                              return (
                                <div key={index} className="relative overflow-hidden rounded-2xl border border-border/45 bg-card/65 backdrop-blur-md p-4 shadow-sm space-y-2.5">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isQna ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                      {isQna ? <Volume2 className="w-4.5 h-4.5" /> : <Sparkles className="w-4.5 h-4.5" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-xs font-black text-foreground leading-tight truncate">{ann.title}</h4>
                                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">By {ann.author} · {formatTimelineDateTime(ann.createdAt).date}</p>
                                    </div>
                                  </div>
                                  <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                                    {ann.message}
                                  </p>
                                </div>
                              );
                            })}
                            {displayAnnouncements.length === 0 && (
                              <div className="text-center py-6 text-xs text-muted-foreground font-semibold bg-card/65 backdrop-blur-md rounded-2xl border border-border/45 p-4 shadow-sm">
                                No announcements available.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* =========================================== */}
                      {/* DESKTOP VIEW */}
                      {/* =========================================== */}
                      <div className="hidden lg:block space-y-8">
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
                                    strokeDashoffset={163 - (163 * avgProgress) / 100} 
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
                                  <span className="text-xs font-extrabold tracking-tight">{avgProgress}%</span>
                                </div>
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <h4 className="text-[11px] font-bold tracking-wide uppercase opacity-75">Overall Progress</h4>
                                <h3 className="text-xs font-bold text-white truncate max-w-[130px]" title={continueLearningWidgetData ? continueLearningWidgetData.courseTitle : 'No progress recorded'}>
                                  {continueLearningWidgetData ? `Continue: ${continueLearningWidgetData.courseTitle}` : 'Resume Learning'}
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
                                  <span className="font-extrabold text-white mt-0.5 truncate" title={user?.branchName || user?.institute?.name || 'GFI Institute'}>
                                    {user?.branchName || user?.institute?.name || 'GFI Institute'}
                                  </span>
                                </div>
                                <div className="flex flex-col pt-0.5">
                                  <span className="text-[9px] text-indigo-200 uppercase font-bold tracking-wider">Admission</span>
                                  <span className="font-extrabold text-white mt-0.5 truncate">
                                    {user?.enrollmentDate ? new Date(user.enrollmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '')}
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
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          {
                            label: 'Batches Enrolled',
                            value: totalCourses,
                            icon: <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
                            color: 'from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20 text-purple-650 dark:text-purple-400 hover:border-purple-500/40 shadow-purple-500/5'
                          },
                          {
                            label: 'Watch Hours',
                            value: `${watchHours}h`,
                            icon: <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
                            color: 'from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20 text-blue-600 dark:text-blue-400 hover:border-blue-500/40 shadow-blue-500/5'
                          },
                          {
                            label: 'Topics Completed',
                            value: completedLessons,
                            icon: <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
                            color: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/40 shadow-emerald-500/5'
                          },
                          {
                            label: 'Security Score',
                            value: `${securityScore} / 100`,
                            icon: <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
                            color: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/40 shadow-emerald-500/5'
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
                            {displayAnnouncements.length === 0 && (
                              <div className="text-center py-10 text-xs text-muted-foreground font-semibold border border-dashed rounded-2xl bg-card shadow-sm">
                                No announcements available.
                              </div>
                            )}
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
                            {displayActivities.length === 0 && (
                              <div className="text-center py-10 text-xs text-muted-foreground font-semibold border border-dashed rounded-2xl bg-card shadow-sm">
                                No recent activity recorded.
                              </div>
                            )}
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
                            {displayContinueWatching.length === 0 && (
                              <div className="text-center py-10 text-xs text-muted-foreground font-semibold border border-dashed rounded-2xl bg-card shadow-sm">
                                No courses currently in progress. Start learning from My Batches!
                              </div>
                            )}
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
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 select-none">
                        
                        {/* Screenshot Attempts Card */}
                        <Card className="w-full border border-border/60 bg-card shadow-sm">
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
                        <Card className="w-full border border-border/60 bg-card shadow-sm">
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
                        <Card className="w-full border border-border/60 bg-card shadow-sm">
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
                        <Card className="w-full border border-border/60 bg-card shadow-sm">
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
                        <Card className="col-span-2 md:col-span-1 w-full border border-border/60 bg-card shadow-sm">
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

                    {/* Anti-Piracy Statistics Section */}
                    <Card className="border border-border/60 bg-card/45 backdrop-blur-xl shadow-md rounded-[20px] overflow-hidden">
                      <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          <div>
                            <CardTitle className="text-base font-bold">Anti-Piracy Statistics</CardTitle>
                            <CardDescription className="text-xs">Overview of blocked recording and screen capture occurrences</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
                          {/* Screenshot attempts */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Screenshot Attempts</span>
                            <div className="text-2xl font-black text-foreground">{antiPiracyStats.screenshots}</div>
                          </div>
                          
                          {/* Screen recording attempts */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Screen Recording Attempts</span>
                            <div className="text-2xl font-black text-foreground">{antiPiracyStats.recordings}</div>
                          </div>
                          
                          {/* Print Screen presses */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Print Screen Presses</span>
                            <div className="text-2xl font-black text-foreground">{antiPiracyStats.printScreens}</div>
                          </div>

                          {/* Total Violations */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Violations</span>
                            <div className="text-2xl font-black text-red-600 dark:text-red-400">{antiPiracyStats.totalViolations} / 4</div>
                          </div>

                          {/* Warning Stage */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Warning Stage</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-sm font-bold text-foreground">{stageDetails.icon} {stageDetails.label}</span>
                            </div>
                          </div>

                          {/* Account status */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Account Lock Status</span>
                            <div className="mt-1">
                              <Badge className={
                                securityStatus?.accountLocked 
                                  ? 'bg-rose-500 hover:bg-rose-600 text-white border-none' 
                                  : 'bg-emerald-500 hover:bg-emerald-600 text-white border-none'
                              }>
                                {securityStatus?.accountLocked ? 'Permanently Locked' : 'Active / Clear'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-5 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {/* Risk Level */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
                            <div>
                              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Risk Profile Level</div>
                              <div className="text-sm font-extrabold text-foreground mt-0.5">{antiPiracyStats.riskLevel} Risk</div>
                            </div>
                            <Badge className={
                              antiPiracyStats.riskLevel === 'High' 
                                ? 'bg-rose-500 hover:bg-rose-600 text-white border-none' 
                                : antiPiracyStats.riskLevel === 'Medium'
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-none'
                                  : 'bg-emerald-500 hover:bg-emerald-600 text-white border-none'
                            }>
                              {antiPiracyStats.riskLevel}
                            </Badge>
                          </div>

                          {/* Last Violation */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
                            <div>
                              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Last Violation</div>
                              <div className="text-sm font-extrabold text-foreground mt-0.5">
                                {antiPiracyStats.lastViolationDate 
                                  ? new Date(antiPiracyStats.lastViolationDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                  : 'No incident logged'}
                              </div>
                            </div>
                            <Clock className="w-5 h-5 text-muted-foreground/60" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

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
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold flex items-center gap-2.5">
                      <Bell className="w-6 h-6 text-violet-600 dark:text-violet-400" /> 
                      <span>Notification Center</span>
                    </h2>
                    <p className="text-muted-foreground text-xs font-medium">Stay updated with your activities and important alerts</p>
                  </div>
                  <div className="flex gap-2">
                    {selectableNotifications.length > 0 && !isSelectionMode && (
                      <Button 
                        variant="outline" 
                        className="border-border text-foreground hover:bg-muted/55 flex items-center gap-1.5 px-4 h-9 rounded-full cursor-pointer transition-colors"
                        onClick={() => {
                          setIsSelectionMode(true);
                          setSelectedIds([]);
                        }}
                      >
                        <span>Select</span>
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className="border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800 dark:border-violet-900/40 dark:text-violet-400 dark:hover:bg-violet-950/20 flex items-center gap-1.5 px-4 h-9 rounded-full cursor-pointer transition-colors"
                      onClick={async () => { 
                        await apiFetch('/student-notifications/mark-all-read', { method: 'POST' }); 
                        loadNotifications(); 
                        toast.success('All notifications marked as read');
                      }}
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark All As Read</span>
                    </Button>
                  </div>
                </div>

                {/* Bulk Action Bar (when in selection mode) */}
                {isSelectionMode && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-violet-50/40 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900/30 rounded-2xl p-3.5 px-4 gap-3 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedIds.length > 0 && selectedIds.length === selectableNotifications.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds(selectableNotifications.map(n => n._id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        id="select-all-notifications"
                        className="cursor-pointer border-violet-300 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                      />
                      <label htmlFor="select-all-notifications" className="text-xs font-bold text-foreground cursor-pointer select-none">
                        Select All ({selectableNotifications.length})
                      </label>
                      <span className="text-xs text-muted-foreground/60">|</span>
                      <span className="text-xs font-bold text-violet-700 dark:text-violet-400">
                        {selectedIds.length} Selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedIds.length > 0 && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-900/40 dark:text-violet-400 flex items-center gap-1 px-3 rounded-full cursor-pointer transition-colors"
                            onClick={async () => {
                              await Promise.all(
                                selectedIds.map(id => apiFetch(`/student-notifications/${id}/read`, { method: 'POST' }))
                              );
                              setSelectedIds([]);
                              setIsSelectionMode(false);
                              loadNotifications();
                              toast.success('Selected notifications marked as read');
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Mark Read</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 px-3 rounded-full cursor-pointer transition-colors"
                            onClick={async () => {
                              await Promise.all(
                                selectedIds.map(id => apiFetch(`/student-notifications/${id}`, { method: 'DELETE' }))
                              );
                              setSelectedIds([]);
                              setIsSelectionMode(false);
                              loadNotifications();
                              toast.success('Selected notifications deleted');
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-muted-foreground font-semibold hover:bg-muted rounded-full cursor-pointer px-3 transition-colors"
                        onClick={() => {
                          setSelectedIds([]);
                          setIsSelectionMode(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Filters & Sorting Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 pb-1">
                  <div className="flex flex-wrap gap-2 items-center">
                    {[
                      { id: 'all', label: 'All', count: notificationCounts.all },
                      { id: 'unread', label: 'Unread', count: notificationCounts.unread },
                      { id: 'system', label: 'System', count: notificationCounts.system },
                      { id: 'academic', label: 'Academic', count: notificationCounts.academic },
                      { id: 'enrollment', label: 'Enrollment', count: notificationCounts.enrollment },
                      { id: 'payment', label: 'Payments', count: notificationCounts.payment },
                    ].map((pill) => {
                      const isSelected = notificationFilter === pill.id;
                      return (
                        <button
                          key={pill.id}
                          onClick={() => setNotificationFilter(pill.id)}
                          className={`flex items-center h-8 px-3 rounded-full text-xs font-semibold select-none cursor-pointer transition-all duration-200 border ${
                            isSelected 
                              ? 'bg-violet-600 text-white shadow-sm border-violet-600' 
                              : 'bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          <span>{pill.label}</span>
                          <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground/80'
                          }`}>
                            {pill.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <Select value={notificationSort} onValueChange={setNotificationSort}>
                      <SelectTrigger className="w-[145px] bg-card border-border/80 text-foreground font-semibold flex items-center justify-between text-xs h-8 px-3 rounded-full select-none cursor-pointer">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <ArrowUpDown className="w-3.5 h-3.5" />
                          <span className="text-foreground font-semibold text-xs">
                            {notificationSort === 'newest' ? 'Newest First' : 'Oldest First'}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-border bg-card shadow-lg">
                        <SelectItem value="newest" className="text-xs rounded-lg cursor-pointer">Newest First</SelectItem>
                        <SelectItem value="oldest" className="text-xs rounded-lg cursor-pointer">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Notifications Cards List */}
                <div className="space-y-3.5">
                  {filteredNotifications.map((n) => {
                    const details = getNotificationDetails(n);
                    const isSelected = selectedIds.includes(n._id);
                    return (
                      <Card 
                        key={n._id} 
                        className={`border shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/85 relative rounded-2xl overflow-hidden ${
                          isSelectionMode
                            ? isSelected
                              ? 'border-violet-500 bg-violet-50/10 dark:bg-violet-950/10 hover:bg-violet-50/20 dark:hover:bg-violet-950/15 cursor-pointer'
                              : 'border-border/40 bg-card hover:bg-card/85 dark:hover:bg-card/45 cursor-pointer'
                            : 'border-border/40 bg-card hover:bg-card/85 dark:hover:bg-card/45'
                        }`}
                        onClick={() => {
                          if (isSelectionMode) {
                            setSelectedIds(prev => 
                              prev.includes(n._id) 
                                ? prev.filter(id => id !== n._id) 
                                : [...prev, n._id]
                            );
                          }
                        }}
                      >
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                            {/* Checkbox or Unread indicator dot */}
                            <div className="w-5 h-full flex items-center justify-center shrink-0 mt-2.5 sm:mt-0">
                              {isSelectionMode ? (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedIds(prev => [...prev, n._id]);
                                    } else {
                                      setSelectedIds(prev => prev.filter(id => id !== n._id));
                                    }
                                  }}
                                  className="cursor-pointer border-violet-300 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                !n.read && (
                                  <span className="w-2 h-2 bg-violet-600 dark:bg-violet-400 rounded-full shadow-sm" />
                                )
                              )}
                            </div>

                            {/* Icon with colored circle */}
                            <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center border ${details.bgClass}`}>
                              <details.icon className={`w-5 h-5 ${details.iconClass}`} />
                            </div>

                            {/* Text contents */}
                            <div className="min-w-0 space-y-0.5 flex-1">
                              <h4 className="text-sm font-bold text-foreground leading-snug">{details.title}</h4>
                              <p className="text-xs text-muted-foreground/90 font-medium leading-relaxed max-w-4xl">{n.message}</p>
                              <div className="text-[10px] text-muted-foreground/75 font-medium pt-0.5">
                                {formatNotificationDate(n.createdAt)}
                              </div>
                            </div>
                          </div>

                          {/* Right section: Badge + Action Button */}
                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                            <span className={`text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${details.badgeClass}`}>
                              {details.label}
                            </span>
                            
                            <div className="flex items-center gap-2">
                              <div className="w-[84px] flex justify-end">
                                {!n.read ? (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 text-xs border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800 dark:border-violet-900/40 dark:text-violet-400 flex items-center gap-1 px-3 rounded-full cursor-pointer transition-colors shadow-none"
                                    onClick={async (e) => { 
                                      e.stopPropagation();
                                      await apiFetch(`/student-notifications/${n._id}/read`, { method: 'POST' }); 
                                      loadNotifications(); 
                                    }}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Read</span>
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 text-xs text-muted-foreground/50 font-semibold hover:bg-transparent cursor-default select-none pr-3"
                                    disabled
                                  >
                                    Read
                                  </Button>
                                )}
                              </div>

                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-full cursor-pointer transition-colors shrink-0 animate-fade-in"
                                onClick={async (e) => { 
                                  e.stopPropagation();
                                  await apiFetch(`/student-notifications/${n._id}`, { method: 'DELETE' }); 
                                  loadNotifications(); 
                                  toast.success('Notification deleted');
                                }}
                                title="Delete notification"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {/* Empty state */}
                  {filteredNotifications.length === 0 && (
                    <Card className="border-dashed border-border/80 bg-card/20 rounded-2xl">
                      <CardContent className="p-12 text-center flex flex-col items-center justify-center">
                        <Bell className="w-10 h-10 text-muted-foreground/35 mb-3" />
                        <p className="text-sm font-semibold text-muted-foreground">No notifications available in this category.</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Footer indicator */}
                  {filteredNotifications.length > 0 && (
                    <div className="flex items-center justify-center gap-1.5 py-6 text-xs text-muted-foreground/60 font-semibold select-none">
                      <CheckCircle className="w-4 h-4 text-emerald-500/80" />
                      <span>No more notifications to show</span>
                    </div>
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
                                    <div className="text-xs text-muted-foreground truncate mt-0.5">{lc.courseId?.name || lc.courseId?.title || 'Batch'} · {lc.facultyId?.name || 'Faculty Instructor'}</div>
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
                                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{lc.courseId?.name || lc.courseId?.title || 'Batch'} · {lc.facultyId?.name || 'Faculty Instructor'}</div>
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
                      <div className="p-5 rounded-2xl border bg-gradient-to-br from-violet-600/5 to-indigo-600/5 border-violet-500/20 space-y-4">
                        <div className="flex items-center justify-between gap-4 border-b border-violet-500/10 pb-3">
                          <div className="flex items-center gap-2.5">
                            <Package className="w-5 h-5 text-violet-500" />
                            <h4 className="font-bold text-sm text-foreground">Content Package</h4>
                          </div>
                          {user?.assignedPackage ? (
                            <span className="text-sm font-extrabold text-violet-950 dark:text-violet-400">{user.assignedPackage.name}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic font-medium">None Assigned</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 pt-0.5">
                          <Clock className="w-5 h-5 text-violet-500" />
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Access Expiry Status</div>
                            <div className="text-xs font-semibold text-foreground">
                              {user?.packageExpiryDate ? (
                                <>Access Expires On: <span className="font-extrabold text-violet-600 dark:text-violet-400">{formatAccessDate(user.packageExpiryDate)}</span></>
                              ) : (
                                <span className="text-emerald-500 font-bold">Lifetime Access (No Expiry)</span>
                              )}
                            </div>
                          </div>
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
                                      {formatAccessDate(rule.expiryDate)}
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
              <motion.div 
                initial={{ opacity: 0, y: 16 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.4 }} 
                className="space-y-6 max-w-6xl mx-auto"
              >
                
                {/* =========================================== */}
                {/* MOBILE ACCORDION VIEW */}
                {/* =========================================== */}
                <div className="block lg:hidden space-y-6">
                  
                  {/* Premium Student Profile Card */}
                  <div className="bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/25 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none"></div>
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16 border-2 border-primary/25 shadow-md">
                        <AvatarImage src={user?.avatar ? (user.avatar.startsWith('/') ? getApiUrl(user.avatar) : user.avatar) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'student'}`} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg font-black">AJ</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <h2 className="text-sm font-black text-foreground leading-none truncate max-w-full">👤 {user?.name || 'Anal Joseph'}</h2>
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase rounded-md tracking-wider py-0.5 px-1.5 leading-none shrink-0">🟢 Active Student</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-semibold">ID: {user?.user_id || '484613'}</p>
                        <div className="text-[11px] font-semibold text-foreground/80 flex flex-col gap-0.5 pt-1">
                          <span className="truncate">🎓 {user?.institute?.name || 'GFI Institute'}</span>
                          <span className="truncate text-muted-foreground">📘 {user?.program?.name || 'BCA E2E Test Program'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Settings Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search profile, security, enrollments..."
                      className="pl-10 bg-background/50 h-10 rounded-xl text-xs border-border/60"
                    />
                  </div>

                  {/* Learning Progress Card */}
                  <Card className="border border-border/40 bg-card rounded-2xl shadow-sm overflow-hidden">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Learning Progress</span>
                        <span className="font-black text-purple-600 dark:text-purple-400">82% Complete</span>
                      </div>
                      <Progress value={82} className="h-2 bg-slate-100 dark:bg-zinc-800 [&>div]:bg-gradient-to-r [&>div]:from-purple-600 [&>div]:to-indigo-600 rounded-full" />
                      
                      <div className="grid grid-cols-3 gap-2 pt-2 text-center border-t border-border/40">
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Active</p>
                          <p className="text-xs font-black text-foreground">3 Batches</p>
                        </div>
                        <div className="space-y-0.5 border-x border-border/40">
                          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Certificates</p>
                          <p className="text-xs font-black text-foreground">12 Awards</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Security</p>
                          <p className="text-xs font-black text-emerald-500">Score 100</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Mobile Quick Access Shortcuts */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground pl-1">
                      Quick Access
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'live-classes', label: 'Live Classes', icon: Video, color: 'text-rose-500 bg-rose-500/10' },
                        { id: 'materials', label: 'Study Materials', icon: FileText, color: 'text-purple-600 bg-purple-50/10 dark:text-purple-400 dark:bg-purple-950/20' },
                        { id: 'access', label: 'Access Management', icon: Key, color: 'text-amber-500 bg-amber-500/10' },
                        { id: 'security', label: 'Security & Devices', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-950/20' },
                        { id: 'faculty', label: 'Faculty Contacts', icon: Users, color: 'text-blue-500 bg-blue-500/10' },
                        { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-indigo-500 bg-indigo-500/10' }
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(item.id);
                              navigate(`/student?tab=${item.id}`);
                            }}
                            className="flex items-center gap-3 p-3 bg-card border border-border/40 hover:border-primary/20 rounded-2xl transition-all duration-200 text-left active:scale-[0.98] shadow-sm select-none touch-btn min-h-[48px] min-w-0"
                          >
                            <div className={`p-2 rounded-xl shrink-0 ${item.color} flex items-center justify-center`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-foreground leading-tight min-w-0 flex-1">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-border/40 my-2" />
                  
                  {/* Row 1: Profile Settings */}
                  <div className="border border-border/45 rounded-2xl bg-card overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setMobileSettingsExpanded(mobileSettingsExpanded === 'profile' ? null : 'profile')}
                      className="w-full flex items-center justify-between p-4 font-black text-xs text-foreground bg-muted/20 hover:bg-muted/40 transition-all duration-200"
                    >
                      <span className="flex items-center gap-2.5">
                        <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <span>Profile Settings</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileSettingsExpanded === 'profile' ? 'rotate-180' : ''}`} />
                    </button>
                    {mobileSettingsExpanded === 'profile' && (
                      <div className="p-4 border-t border-border/45 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Profile completion / details */}
                        <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-border/40">
                          <div className="relative w-24 h-24 group">
                            <div className="w-full h-full rounded-full overflow-hidden border-4 border-purple-500/20 bg-muted flex items-center justify-center relative shadow-inner">
                              <img 
                                src={user?.avatar ? (user.avatar.startsWith('/') ? getApiUrl(user.avatar) : user.avatar) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'student'}`} 
                                alt="Student Avatar" 
                                className="w-full h-full object-cover" 
                              />
                            </div>
                            <button 
                              onClick={() => setAvatarModalOpen(true)}
                              className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            >
                              <Camera className="w-5 h-5 mb-0.5" />
                              <span className="text-[9px] font-black uppercase tracking-wider">Change</span>
                            </button>
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-foreground truncate">{user?.name || 'Student Name'}</h3>
                            <span className="text-[10px] font-bold text-muted-foreground">ID: {user?.user_id} · {user?.courseName || 'BCA'}</span>
                          </div>
                          <Button size="sm" variant="outline" className="text-[10px] font-bold h-8 rounded-xl touch-btn" onClick={() => setAvatarModalOpen(true)}>
                            Change Profile Photo
                          </Button>
                        </div>

                        {/* Profile form */}
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Name</label>
                            <Input 
                              className="rounded-xl bg-background/50 border-border/50 text-xs" 
                              value={profileForm.name} 
                              onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone Number</label>
                            <Input 
                              className="rounded-xl bg-background/50 border-border/50 text-xs" 
                              value={profileForm.phone} 
                              onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Academic Campus</label>
                            <Input className="rounded-xl bg-muted border-border/50 text-xs text-muted-foreground" value={String(user?.branchName || '')} disabled />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Enrolled Cohort</label>
                            <Input className="rounded-xl bg-muted border-border/50 text-xs text-muted-foreground" value={String(user?.courseName || '')} disabled />
                          </div>
                          <div className="flex justify-end">
                            <Button 
                              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md shadow-purple-500/10 touch-btn"
                              onClick={async () => {
                                try {
                                  const updated = await apiFetch('/student-account/profile', { method: 'PUT', body: JSON.stringify(profileForm) });
                                  localStorage.setItem('user', JSON.stringify(updated));
                                  setUser(updated);
                                  toast.success('Profile details saved!');
                                } catch (e: any) { toast.error(e.message || 'Failed to update profile'); }
                              }}
                            >
                              Save Details
                            </Button>
                          </div>
                        </div>

                        {/* Account Recovery */}
                        <div className="pt-4 border-t border-border/40 space-y-4">
                          <h4 className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-purple-650" />
                            <span>Account Recovery</span>
                          </h4>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Recovery Email</label>
                            <Input 
                              type="email" 
                              className="rounded-xl bg-background/50 border-border/50 text-xs" 
                              value={profileForm.recoveryEmail} 
                              onChange={(e) => setProfileForm((f) => ({ ...f, recoveryEmail: e.target.value }))} 
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline"
                              className="rounded-xl text-xs h-9 touch-btn"
                              onClick={async () => {
                                if (!profileForm.recoveryEmail) {
                                  toast.error('Specify a recovery email first.');
                                  return;
                                }
                                try {
                                  const resp = await apiFetch('/student-account/password/request-reset', { method: 'POST', body: JSON.stringify({ email: profileForm.recoveryEmail }) });
                                  toast.success('Reset link dispatched!', { description: `Token (dev): ${resp.resetToken}` });
                                } catch (e: any) { toast.error(e.message || 'Failed to dispatch reset link'); }
                              }}
                            >
                              Send Reset Link
                            </Button>
                            <Button 
                              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl text-xs h-9 touch-btn"
                              onClick={async () => {
                                try {
                                  const updated = await apiFetch('/student-account/profile', { method: 'PUT', body: JSON.stringify({ recoveryEmail: profileForm.recoveryEmail }) });
                                  localStorage.setItem('user', JSON.stringify(updated));
                                  setUser(updated);
                                  toast.success('Recovery settings saved.');
                                } catch (e: any) { toast.error(e.message || 'Failed to update recovery email'); }
                              }}
                            >
                              Save Recovery
                            </Button>
                          </div>
                        </div>

                        {/* Change Password */}
                        <div className="pt-4 border-t border-border/40 space-y-4">
                          <h4 className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                            <Lock className="w-4 h-4 text-purple-650" />
                            <span>Change Password</span>
                          </h4>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Password</label>
                              <Input 
                                type="password" 
                                className="rounded-xl bg-background/50 border-border/50 text-xs" 
                                value={passwordForm.currentPassword} 
                                onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))} 
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">New Password</label>
                              <Input 
                                type="password" 
                                className="rounded-xl bg-background/50 border-border/50 text-xs" 
                                value={passwordForm.newPassword} 
                                onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))} 
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Confirm New Password</label>
                              <Input 
                                type="password" 
                                className="rounded-xl bg-background/50 border-border/50 text-xs" 
                                value={passwordForm.confirmPassword} 
                                onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))} 
                              />
                            </div>
                            <div className="flex justify-end pt-2">
                              <Button 
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl text-xs touch-btn"
                                onClick={async () => {
                                  try {
                                    const resp = await apiFetch('/student-account/password/change', { method: 'POST', body: JSON.stringify(passwordForm) });
                                    toast.success('Password changed successfully!');
                                    setTimeout(() => {
                                      localStorage.removeItem('token');
                                      localStorage.removeItem('user');
                                      navigate('/');
                                    }, 1500);
                                  } catch (e: any) { toast.error(e.message || 'Failed to change password'); }
                                }}
                              >
                                Change Password
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Security & Devices */}
                  <div className="border border-border/45 rounded-2xl bg-card overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setMobileSettingsExpanded(mobileSettingsExpanded === 'security' ? null : 'security')}
                      className="w-full flex items-center justify-between p-4 font-black text-xs text-foreground bg-muted/20 hover:bg-muted/40 transition-all duration-200"
                    >
                      <span className="flex items-center gap-2.5">
                        <Shield className="w-5 h-5 text-rose-500" />
                        <span>Security Center</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileSettingsExpanded === 'security' ? 'rotate-180' : ''}`} />
                    </button>
                    {mobileSettingsExpanded === 'security' && (
                      <Suspense fallback={<div className="p-4 text-center text-xs text-muted-foreground animate-pulse">Loading Security Center...</div>}>
                        <SecuritySection
                          isMobile
                          categorizedEvents={categorizedEvents}
                          securityScore={securityScore}
                          violations={violations}
                          securityLogs={securityLogs}
                          parseUserAgentDetails={parseUserAgentDetails}
                          formatLastActive={formatLastActive}
                          passwordForm={passwordForm}
                          setPasswordForm={setPasswordForm}
                          showCurrentPassword={showCurrentPassword}
                          setShowCurrentPassword={setShowCurrentPassword}
                          showNewPassword={showNewPassword}
                          setShowNewPassword={setShowNewPassword}
                          showConfirmPassword={showConfirmPassword}
                          setShowConfirmPassword={setShowConfirmPassword}
                          passwordStrength={passwordStrength}
                          apiFetch={apiFetch}
                          setUser={setUser}
                          user={user}
                          setSecurityLogs={setSecurityLogs}
                          navigate={navigate}
                        />
                      </Suspense>
                    )}
                  </div>

                  {/* Row 2.5: Notification Preferences */}
                  <div className="border border-border/45 rounded-2xl bg-card overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setMobileSettingsExpanded(mobileSettingsExpanded === 'notification-preferences' ? null : 'notification-preferences')}
                      className="w-full flex items-center justify-between p-4 font-black text-xs text-foreground bg-muted/20 hover:bg-muted/40 transition-all duration-200"
                    >
                      <span className="flex items-center gap-2.5">
                        <Bell className="w-5 h-5 text-violet-500" />
                        <span>Notification Preferences</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileSettingsExpanded === 'notification-preferences' ? 'rotate-180' : ''}`} />
                    </button>
                    {mobileSettingsExpanded === 'notification-preferences' && (
                      <div className="p-4 border-t border-border/45 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200 bg-card">
                        {renderNotificationPreferencesContent()}
                      </div>
                    )}
                  </div>

                  {/* Row 3: Enrollments */}
                  <div className="border border-border/45 rounded-2xl bg-card overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setMobileSettingsExpanded(mobileSettingsExpanded === 'enrollments' ? null : 'enrollments')}
                      className="w-full flex items-center justify-between p-4 font-black text-xs text-foreground bg-muted/20 hover:bg-muted/40 transition-all duration-200"
                    >
                      <span className="flex items-center gap-2.5">
                        <BookOpen className="w-5 h-5 text-purple-650" />
                        <span>My Enrollments</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileSettingsExpanded === 'enrollments' ? 'rotate-180' : ''}`} />
                    </button>
                    {mobileSettingsExpanded === 'enrollments' && (
                      <div className="p-4 border-t border-border/45 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        {purchasedCourses.map((course) => (
                          <div key={course._id} className="p-3 bg-muted/20 rounded-xl border border-border/20 space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold">
                              <span className="text-foreground">{course.title}</span>
                              <span className="text-primary">{continueWatching.find(c => c._id === course._id)?.progress || 0}%</span>
                            </div>
                            <Progress value={continueWatching.find(c => c._id === course._id)?.progress || 0} className="h-1 bg-muted [&>div]:bg-primary" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Row 4: Payments */}
                  <div className="border border-border/45 rounded-2xl bg-card overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setMobileSettingsExpanded(mobileSettingsExpanded === 'payments' ? null : 'payments')}
                      className="w-full flex items-center justify-between p-4 font-black text-xs text-foreground bg-muted/20 hover:bg-muted/40 transition-all duration-200"
                    >
                      <span className="flex items-center gap-2.5">
                        <CreditCard className="w-5 h-5 text-blue-500" />
                        <span>Payment History</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileSettingsExpanded === 'payments' ? 'rotate-180' : ''}`} />
                    </button>
                    {mobileSettingsExpanded === 'payments' && (
                      <Suspense fallback={<div className="p-4 text-center text-xs text-muted-foreground animate-pulse">Loading Payments...</div>}>
                        <PaymentsSection
                          isMobile
                          paymentsLoading={paymentsLoading}
                          payments={payments}
                          setActiveReceipt={setActiveReceipt}
                          setReceiptModalOpen={setReceiptModalOpen}
                          setActiveInvoice={setActiveInvoice}
                          setInvoiceModalOpen={setInvoiceModalOpen}
                        />
                      </Suspense>
                    )}
                  </div>

                  {/* Row 5: Certificates */}
                  <div className="border border-border/45 rounded-2xl bg-card overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setMobileSettingsExpanded(mobileSettingsExpanded === 'certificates' ? null : 'certificates')}
                      className="w-full flex items-center justify-between p-4 font-black text-xs text-foreground bg-muted/20 hover:bg-muted/40 transition-all duration-200"
                    >
                      <span className="flex items-center gap-2.5">
                        <Award className="w-5 h-5 text-amber-500" />
                        <span>Certificates</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileSettingsExpanded === 'certificates' ? 'rotate-180' : ''}`} />
                    </button>
                    {mobileSettingsExpanded === 'certificates' && (
                      <Suspense fallback={<div className="p-4 text-center text-xs text-muted-foreground animate-pulse">Loading Certificates...</div>}>
                        <CertificatesSection
                          isMobile
                          purchasedCourses={purchasedCourses}
                          watchHistory={watchHistory}
                          setActiveCertificate={setActiveCertificate}
                          setCertificateModalOpen={setCertificateModalOpen}
                        />
                      </Suspense>
                    )}
                  </div>

                  {/* Row 6: Help & Support */}
                  <div className="border border-border/45 rounded-2xl bg-card overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setMobileSettingsExpanded(mobileSettingsExpanded === 'support' ? null : 'support')}
                      className="w-full flex items-center justify-between p-4 font-black text-xs text-foreground bg-muted/20 hover:bg-muted/40 transition-all duration-200"
                    >
                      <span className="flex items-center gap-2.5">
                        <HelpCircle className="w-5 h-5 text-indigo-500" />
                        <span>Help & FAQ</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileSettingsExpanded === 'support' ? 'rotate-180' : ''}`} />
                    </button>
                    {mobileSettingsExpanded === 'support' && (
                      <Suspense fallback={<div className="p-4 text-center text-xs text-muted-foreground animate-pulse">Loading Help Center...</div>}>
                        <HelpSection isMobile />
                      </Suspense>
                    )}
                  </div>

                  {/* Premium Logout Button */}
                  <div className="pt-4 pb-8 flex justify-center">
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full h-12 border-red-500/30 text-red-650 hover:bg-red-500/10 dark:text-red-400 dark:border-red-900/40 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-none select-none touch-btn"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Log Out of Account</span>
                    </Button>
                  </div>

                </div>

                {/* =========================================== */}
                {/* DESKTOP VIEW */}
                {/* =========================================== */}
                <div className="hidden lg:block space-y-6">
                  
                  {/* Horizontal Navigation Chips for Mobile */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-3 snap-x scrollbar-none [&::-webkit-scrollbar]:hidden lg:hidden border-b border-border/40 mb-2">
                   {[
                    { id: 'profile', label: 'Profile', icon: User },
                    { id: 'notification-preferences', label: 'Notifications', icon: Bell },
                    { id: 'security', label: 'Security & Devices', icon: Shield },
                    { id: 'enrollments', label: 'Enrollments', icon: BookOpen },
                    { id: 'payments', label: 'Payments', icon: CreditCard },
                    { id: 'certificates', label: 'Certificates', icon: Award },
                    { id: 'support', label: 'Support', icon: HelpCircle }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSettingsSubTab(tab.id)}
                      className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap snap-center transition-all duration-200 flex items-center gap-1.5 border ${
                        settingsSubTab === tab.id
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md shadow-purple-500/10'
                          : 'bg-card text-muted-foreground border-border hover:bg-muted/50'
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  
                  {/* Left Column Profile Card / Completions / Stats */}
                  <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
                    {/* Premium Profile Card */}
                    <Card className="border-border/40 shadow-sm rounded-[24px] overflow-hidden bg-card">
                      <CardContent className="p-6 text-center space-y-5">
                        
                        {/* Avatar container */}
                        <div className="relative w-32 h-32 mx-auto group">
                          <div className="w-full h-full rounded-full overflow-hidden border-4 border-purple-500/20 bg-muted flex items-center justify-center relative shadow-inner">
                            <img 
                              src={user?.avatar ? (user.avatar.startsWith('/') ? getApiUrl(user.avatar) : user.avatar) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'student'}`} 
                              alt="Student Avatar" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <button 
                            onClick={() => setAvatarModalOpen(true)}
                            className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            aria-label="Change Profile Photo"
                          >
                            <Camera className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold tracking-wider uppercase">Change Photo</span>
                          </button>
                        </div>

                        {/* Name & ID & Active Badge */}
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-lg text-foreground truncate">{user?.name || 'Student Name'}</h3>
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">ID: {user?.user_id || 'N/A'}</span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/10 text-[10px] uppercase font-bold py-0.5 px-2">Active Student</Badge>
                          </div>
                        </div>

                        {/* Course & Institute Detail List */}
                        <div className="pt-2 border-t border-border/40 space-y-2 text-left text-xs text-muted-foreground font-semibold">
                          <div className="flex justify-between items-center">
                            <span>Course/Batch</span>
                            <span className="text-foreground truncate max-w-[150px] font-extrabold">{user?.courseName || user?.batchName || 'BCA Student'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Institute</span>
                            <span className="text-foreground truncate max-w-[150px] font-extrabold">{user?.institute?.name || 'GFI Institute'}</span>
                          </div>
                        </div>

                      </CardContent>
                    </Card>

                    {/* Profile Completion Card */}
                    <Card className="border-border/40 shadow-sm rounded-[24px] bg-card">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-extrabold text-foreground">Profile Completion</span>
                          <span className="text-xs font-black text-purple-600 dark:text-purple-400">{profileCompletion.percent}%</span>
                        </div>
                        <Progress value={profileCompletion.percent} className="h-2 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-purple-600 [&>div]:to-indigo-600" />
                        
                        <div className="pt-1.5 space-y-2">
                          {profileCompletion.checklist.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs font-semibold">
                              {item.done ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-dashed border-muted-foreground/45 shrink-0" />
                              )}
                              <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Account Statistics Card */}
                    <Card className="border-border/40 shadow-sm rounded-[24px] bg-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-extrabold">Learning Statistics</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-2 grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase">Student Since</div>
                          <div className="text-xs font-extrabold text-foreground mt-1">
                            {user?.enrollmentDate 
                              ? new Date(user.enrollmentDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                              : new Date(user?.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase">Courses</div>
                          <div className="text-xs font-extrabold text-foreground mt-1">{purchasedCourses.length}</div>
                        </div>
                        <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase">Certificates</div>
                          <div className="text-xs font-extrabold text-foreground mt-1">
                            {purchasedCourses.filter(c => {
                              const hist = watchHistory.filter(h => {
                                const progId = h.contentId?.lessonId?.unitId?.subjectId?.programId?._id || h.courseId?._id;
                                return progId && progId.toString() === c._id.toString();
                              });
                              const prog = hist.length > 0
                                ? Math.round(hist.reduce((sum, current) => sum + current.progress, 0) / hist.length)
                                : 0;
                              return prog >= 100;
                            }).length}
                          </div>
                        </div>
                        <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase">Watch Hours</div>
                          <div className="text-xs font-extrabold text-foreground mt-1">{watchHours}h</div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sidebar navigation for desktop */}
                    <Card className="border-border/40 shadow-sm rounded-[24px] overflow-hidden bg-card hidden lg:block">
                      <CardContent className="p-3 space-y-1">
                        {[
                          { id: 'profile', label: 'Profile Settings', icon: User },
                          { id: 'notification-preferences', label: 'Notification Preferences', icon: Bell },
                          { id: 'security', label: 'Security & Devices', icon: Shield },
                          { id: 'enrollments', label: 'My Enrollments', icon: BookOpen },
                          { id: 'payments', label: 'Payment History', icon: CreditCard },
                          { id: 'certificates', label: 'Certificates', icon: Award },
                          { id: 'support', label: 'Help & Support', icon: HelpCircle }
                        ].map(item => (
                          <button
                            key={item.id}
                            onClick={() => setSettingsSubTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                              settingsSubTab === item.id
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/15 border border-transparent'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
                            }`}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </CardContent>
                    </Card>

                  </div>

                  {/* Right Column: Selected Panel Content */}
                  <div className="flex-1 w-full space-y-6">
                    
                    {/* 👤 PROFILE SETTINGS SUB-TAB */}
                    {settingsSubTab === 'profile' && (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        
                        <Card className="border-border/40 shadow-sm rounded-[24px] bg-card overflow-hidden">
                          <CardHeader className="border-b border-border/40 pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                              <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              <span>Profile Settings</span>
                            </CardTitle>
                            <CardDescription>Manage your personal profile and basic identity info.</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Name</label>
                                <div className="relative">
                                  <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                                  <Input 
                                    className="pl-10 rounded-xl bg-background/50 border-border/50 focus:border-purple-500 text-xs" 
                                    placeholder="Name" 
                                    value={profileForm.name} 
                                    onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} 
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Address (Registered)</label>
                                <div className="relative">
                                  <Mail className="w-4 h-4 text-muted-foreground/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                  <Input 
                                    className="pl-10 rounded-xl bg-muted/30 border-border/40 text-muted-foreground text-xs" 
                                    value={user?.email || ''} 
                                    disabled 
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mobile Number</label>
                                <div className="relative">
                                  <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                                  <Input 
                                    className="pl-10 rounded-xl bg-background/50 border-border/50 focus:border-purple-500 text-xs" 
                                    placeholder="Phone" 
                                    value={profileForm.phone} 
                                    onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} 
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Student ID (Internal)</label>
                                <div className="relative">
                                  <Key className="w-4 h-4 text-muted-foreground/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                  <Input 
                                    className="pl-10 rounded-xl bg-muted/30 border-border/40 text-muted-foreground text-xs" 
                                    value={String(user?.user_id || '')} 
                                    disabled 
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Registered Institute</label>
                                <div className="relative">
                                  <Building2 className="w-4 h-4 text-muted-foreground/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                  <Input 
                                    className="pl-10 rounded-xl bg-muted/30 border-border/40 text-muted-foreground text-xs" 
                                    value={String(user?.institute?.name || '')} 
                                    disabled 
                                  />
                                </div>
                              </div>

                            </div>
                            
                            <div className="pt-2 flex justify-end">
                              <Button 
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-95 shadow-md shadow-purple-500/10 text-xs"
                                onClick={async () => {
                                  try {
                                    const updated = await apiFetch('/student-account/profile', { method: 'PUT', body: JSON.stringify(profileForm) });
                                    localStorage.setItem('user', JSON.stringify(updated));
                                    setUser(updated);
                                    toast.success('Profile details saved successfully!');
                                  } catch (e: any) { toast.error(e.message || 'Failed to update profile'); }
                                }}
                              >
                                Save Profile
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Account Recovery Email */}
                        <Card className="border-border/40 shadow-sm rounded-[24px] bg-card overflow-hidden">
                          <CardHeader className="border-b border-border/40 pb-4">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                              <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              <span>Account Recovery Configuration</span>
                            </CardTitle>
                            <CardDescription>Enter a secondary recovery email address to securely reset credentials.</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-5 space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Recovery Email</label>
                              <div className="relative">
                                <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <Input 
                                  type="email" 
                                  placeholder="recovery@email.com" 
                                  className="pl-10 rounded-xl bg-background/50 border-border/50 focus:border-purple-500 text-xs" 
                                  value={profileForm.recoveryEmail} 
                                  onChange={(e) => setProfileForm((f) => ({ ...f, recoveryEmail: e.target.value }))} 
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                              <Button 
                                variant="outline" 
                                className="rounded-xl text-xs" 
                                onClick={async () => {
                                  if (!profileForm.recoveryEmail) {
                                    toast.error('Please specify a recovery email address first.');
                                    return;
                                  }
                                  try {
                                    const resp = await apiFetch('/student-account/password/request-reset', { method: 'POST', body: JSON.stringify({ email: profileForm.recoveryEmail }) });
                                    toast.success('Reset link dispatched!', { description: `Token (dev): ${resp.resetToken}` });
                                  } catch (e: any) { toast.error(e.message || 'Failed to dispatch reset link'); }
                                }}
                              >
                                Send Reset Link
                              </Button>
                              <Button 
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl text-xs" 
                                onClick={async () => {
                                  try {
                                    const updated = await apiFetch('/student-account/profile', { method: 'PUT', body: JSON.stringify({ recoveryEmail: profileForm.recoveryEmail }) });
                                    localStorage.setItem('user', JSON.stringify(updated));
                                    setUser(updated);
                                    toast.success('Recovery settings saved.');
                                  } catch (e: any) { toast.error(e.message || 'Failed to update recovery email'); }
                                }}
                              >
                                Save Recovery Settings
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                      </motion.div>
                    )}

                    {/* 🔔 NOTIFICATION SETTINGS SUB-TAB */}
                    {settingsSubTab === 'notification-preferences' && (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <Card className="border-border/40 shadow-sm rounded-[24px] bg-card overflow-hidden">
                          <CardHeader className="border-b border-border/40 pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                              <Bell className="w-5 h-5 text-purple-650" />
                              <span>Notification Preferences</span>
                            </CardTitle>
                            <CardDescription>Manage how you receive alerts about classes, uploads, and system events.</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-6 bg-card">
                            {renderNotificationPreferencesContent()}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {/* 🛡 SECURITY & DEVICES SUB-TAB */}
                    {settingsSubTab === 'security' && (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        
                        {/* Piracy statistics card row */}
                        <Card className="border-border/40 shadow-sm rounded-[24px] bg-card overflow-hidden">
                          <CardHeader className="border-b border-border/40 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              <span>Anti-Piracy & Integrity Dashboard</span>
                            </CardTitle>
                            <CardDescription>Review your compliance audit records and integrity events.</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-6 space-y-5">
                            
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                              <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl text-center">
                                <Camera className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                                <div className="text-[9px] font-bold text-muted-foreground uppercase">Screenshots</div>
                                <div className="text-lg font-black text-foreground mt-1">{categorizedEvents.screenshot.length}</div>
                              </div>
                              <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl text-center">
                                <Video className="w-5 h-5 text-rose-500 mx-auto mb-1" />
                                <div className="text-[9px] font-bold text-muted-foreground uppercase">Recordings</div>
                                <div className="text-lg font-black text-foreground mt-1">{categorizedEvents.recording.length}</div>
                              </div>
                              <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl text-center">
                                <RefreshCw className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                                <div className="text-[9px] font-bold text-muted-foreground uppercase">Tab Switches</div>
                                <div className="text-lg font-black text-foreground mt-1">{categorizedEvents.tab.length}</div>
                              </div>
                              <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl text-center">
                                <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                                <div className="text-[9px] font-bold text-muted-foreground uppercase font-semibold">Login Conflicts</div>
                                <div className="text-lg font-black text-foreground mt-1">{categorizedEvents.concurrent.length}</div>
                              </div>
                              <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl text-center col-span-2 sm:col-span-1">
                                <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                                <div className="text-[9px] font-bold text-muted-foreground uppercase">Security Score</div>
                                <div className="text-lg font-black text-emerald-600 mt-1">{securityScore}%</div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/30">
                              <span>Last Recorded Compliance Alert:</span>
                              <span className="text-foreground font-extrabold">
                                {violations[0]?.createdAt 
                                  ? new Date(violations[0].createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                  : 'No alerts recorded'}
                              </span>
                            </div>

                          </CardContent>
                        </Card>

                        {/* Change Password Card */}
                        <Card className="border-border/40 shadow-sm rounded-[24px] bg-card overflow-hidden">
                          <CardHeader className="border-b border-border/40 pb-4">
                            <CardTitle className="text-xs font-bold flex items-center gap-2">
                              <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              <span>Change Account Password</span>
                            </CardTitle>
                            <CardDescription>Update your password securely. Changing password terminates active sessions.</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-6 space-y-4">
                            
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Password</label>
                              <div className="relative">
                                <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <Input 
                                  type={showCurrentPassword ? "text" : "password"} 
                                  placeholder="••••••••" 
                                  className="pl-10 pr-10 rounded-xl bg-background/50 border-border/50 focus:border-purple-500 text-xs" 
                                  value={passwordForm.currentPassword} 
                                  onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))} 
                                />
                                <button 
                                  type="button"
                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                                >
                                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">New Password</label>
                              <div className="relative">
                                <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <Input 
                                  type={showNewPassword ? "text" : "password"} 
                                  placeholder="••••••••" 
                                  className="pl-10 pr-10 rounded-xl bg-background/50 border-border/50 focus:border-purple-500 text-xs" 
                                  value={passwordForm.newPassword} 
                                  onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))} 
                                />
                                <button 
                                  type="button"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                                >
                                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                              {/* Password Strength Indicator */}
                              {passwordForm.newPassword && (
                                <div className="space-y-1 pt-1.5">
                                  <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span className="text-muted-foreground">Password Strength:</span>
                                    <span className="text-foreground">{passwordStrength.text}</span>
                                  </div>
                                  <Progress value={passwordStrength.score} className={`h-1.5 bg-muted rounded-full ${passwordStrength.color}`} />
                                </div>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Confirm New Password</label>
                              <div className="relative">
                                <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <Input 
                                  type={showConfirmPassword ? "text" : "password"} 
                                  placeholder="••••••••" 
                                  className="pl-10 pr-10 rounded-xl bg-background/50 border-border/50 focus:border-purple-500 text-xs" 
                                  value={passwordForm.confirmPassword} 
                                  onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))} 
                                />
                                <button 
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                                >
                                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            <div className="pt-2 flex justify-end">
                              <Button 
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-95 shadow-md shadow-purple-500/10 text-xs"
                                onClick={async () => {
                                  try {
                                    const resp = await apiFetch('/student-account/password/change', { method: 'POST', body: JSON.stringify(passwordForm) });
                                    toast.success('Password changed successfully!', { description: 'Please login again to verify credentials.' });
                                    setTimeout(() => {
                                      localStorage.removeItem('token');
                                      localStorage.removeItem('user');
                                      navigate('/');
                                    }, 1500);
                                  } catch (e: any) { toast.error(e.message || 'Failed to change password'); }
                                }}
                              >
                                Change Password
                              </Button>
                            </div>

                          </CardContent>
                        </Card>

                        {/* Re-incorporating active sessions and security audits */}
                        {securityLogs && (
                          <div className="space-y-6 pt-2">
                            {/* Device lists */}
                            <Card className="border-border/40 bg-card rounded-[24px]">
                              <CardHeader className="pb-3 border-b border-border/30">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                  <Laptop className="w-4.5 h-4.5 text-primary" />
                                  <span>Active Sign-in Device Sessions</span>
                                </CardTitle>
                                <CardDescription>Managing other sessions lets you force-disconnect anomalous connections.</CardDescription>
                              </CardHeader>
                              <CardContent className="pt-5 space-y-4">
                                <div className="divide-y divide-border/40">
                                  {securityLogs.activeSessions?.map((session: any) => {
                                    const { os, browser } = parseUserAgentDetails(session.userAgent);
                                    const isCurrent = session.tokenSuffix && user?.activeSessionToken?.endsWith(session.tokenSuffix);
                                    
                                    return (
                                      <div key={session._id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-xl bg-muted border flex items-center justify-center text-muted-foreground shrink-0 shadow-inner">
                                            {os.includes('iPhone') || os.includes('Android') ? <Smartphone className="w-5 h-5 text-indigo-500" /> : <Laptop className="w-5 h-5 text-purple-500" />}
                                          </div>
                                          <div className="min-w-0 leading-tight">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-bold text-xs text-foreground">{os}</span>
                                              <span className="text-[10px] text-muted-foreground">({browser})</span>
                                              {isCurrent && <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] uppercase font-bold py-0">Current</Badge>}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground/80 mt-1">IP: {session.ipAddress} · {formatLastActive(session.lastSeenAt, isCurrent)}</div>
                                          </div>
                                        </div>
                                        {!isCurrent && (
                                          <Button 
                                            variant="ghost" 
                                            className="text-destructive hover:bg-destructive/10 text-[10px] h-8 rounded-xl font-bold"
                                            onClick={async () => {
                                              try {
                                                await apiFetch(`/student-account/sessions/${session._id}/terminate`, { method: 'POST' });
                                                toast.success('Session terminated successfully.');
                                                // Reload logs
                                                const data = await apiFetch('/auth/security-logs');
                                                setSecurityLogs(data);
                                              } catch (err: any) {
                                                toast.error('Failed to terminate session', { description: err.message });
                                              }
                                            }}
                                          >
                                            Disconnect
                                          </Button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                {securityLogs.activeSessions?.length > 1 && (
                                  <div className="pt-2 flex justify-end">
                                    <Button 
                                      variant="outline" 
                                      className="text-destructive border-destructive/20 hover:bg-destructive/5 text-xs rounded-xl"
                                      onClick={async () => {
                                        try {
                                          await apiFetch('/student-account/sessions/terminate-others', { method: 'POST' });
                                          toast.success('All other sessions terminated successfully.');
                                          const data = await apiFetch('/auth/security-logs');
                                          setSecurityLogs(data);
                                        } catch (err: any) {
                                          toast.error('Failed to terminate other sessions', { description: err.message });
                                        }
                                      }}
                                    >
                                      Terminate All Other Devices
                                    </Button>
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Security Events list */}
                            <div className="space-y-3 pt-2">
                              <h3 className="font-bold text-xs flex items-center gap-2">
                                <History className="w-4 h-4 text-purple-600" />
                                <span>Security Compliance Audits</span>
                              </h3>
                              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                                {violations.map((event: any) => renderTimelineItem(event))}
                                {violations.length === 0 && (
                                  <div className="p-8 text-center border border-dashed border-border/50 rounded-2xl bg-card">
                                    <ShieldCheck className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                                    <p className="text-xs text-muted-foreground font-semibold">Your account has maintained perfect integrity. No compliance violations detected.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                      </motion.div>
                    )}

                    {/* 📚 MY ENROLLMENTS SUB-TAB */}
                    {settingsSubTab === 'enrollments' && (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <Card className="border-border/40 shadow-sm rounded-[24px] bg-card overflow-hidden">
                          <CardHeader className="border-b border-border/40 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              <span>Your Enrolled Batches</span>
                            </CardTitle>
                            <CardDescription>Access your study tracks, modules, and track lesson progression.</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-6 space-y-4">
                            
                            <div className="grid gap-4">
                              {purchasedCourses.map((course) => {
                                // Calculate course progress
                                const lessonHistory = watchHistory.filter(h => {
                                  const progId = h.contentId?.lessonId?.unitId?.subjectId?.programId?._id || h.courseId?._id;
                                  return progId && progId.toString() === course._id.toString();
                                });
                                const progress = lessonHistory.length > 0
                                  ? Math.round(lessonHistory.reduce((sum, current) => sum + current.progress, 0) / lessonHistory.length)
                                  : 0;

                                return (
                                  <Card key={course._id} className="border border-border/45 bg-muted/10 rounded-2xl overflow-hidden hover:border-purple-500/20 transition-all duration-200">
                                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                      <div className="flex items-center gap-4 min-w-0">
                                        <img 
                                          src={course.thumbnail || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=200'} 
                                          alt={course.title} 
                                          className="w-16 h-16 rounded-xl object-cover border border-border/40 bg-card shrink-0" 
                                        />
                                        <div className="min-w-0 space-y-1">
                                          <span className="font-extrabold text-sm text-foreground truncate block">{course.title}</span>
                                          <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-2 flex-wrap">
                                            <span>Instructor: {course.instructor || 'Staff'}</span>
                                            <span>·</span>
                                            <span>{course.duration || 'N/A'}</span>
                                            <span>·</span>
                                            <span>{course.category}</span>
                                          </div>
                                          <div className="flex items-center gap-2 pt-1">
                                            <Progress value={progress} className="h-1.5 w-32 bg-muted [&>div]:bg-purple-600" />
                                            <span className="text-[10px] font-bold text-muted-foreground">{progress}% complete</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="shrink-0 self-stretch sm:self-auto flex items-center justify-end">
                                        <Button 
                                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl px-4 py-2"
                                          onClick={() => handleVideoClick(course._id)}
                                        >
                                          Study Batch
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                              
                              {purchasedCourses.length === 0 && (
                                <div className="text-center py-12 border border-dashed border-border/50 rounded-2xl bg-card">
                                  <BookOpen className="w-10 h-10 text-muted-foreground/60 mx-auto mb-2" />
                                  <p className="text-xs text-muted-foreground font-bold">No enrolled batches found.</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">Please request course access or contact your administrator.</p>
                                </div>
                              )}
                            </div>

                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {/* 💳 PAYMENT HISTORY SUB-TAB */}
                    {settingsSubTab === 'payments' && (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <Card className="border-border/40 shadow-sm rounded-[24px] bg-card overflow-hidden">
                          <CardHeader className="border-b border-border/40 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                              <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              <span>Your Payment History & Receipts</span>
                            </CardTitle>
                            <CardDescription>Review manual checkouts, online transactions, and download official invoices.</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-6 space-y-4">
                            
                            {paymentsLoading ? (
                              <div className="text-center py-12 text-xs font-semibold text-muted-foreground">Loading payment logs...</div>
                            ) : (
                              <div className="border border-border/40 rounded-2xl overflow-hidden shadow-sm">
                                <Table className="w-full">
                                  <TableHeader>
                                    <TableRow className="bg-muted/40 text-xs">
                                      <TableHead className="font-bold py-2.5 px-4 text-foreground">Purchased Item</TableHead>
                                      <TableHead className="font-bold py-2.5 px-4 text-foreground">Transaction ID</TableHead>
                                      <TableHead className="font-bold py-2.5 px-4 text-foreground text-center">Status</TableHead>
                                      <TableHead className="font-bold py-2.5 px-4 text-foreground text-right">Amount</TableHead>
                                      <TableHead className="font-bold py-2.5 px-4 text-foreground text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody className="text-xs font-semibold">
                                    {payments.map((pm) => (
                                      <TableRow key={pm._id} className="hover:bg-muted/10 border-b border-border/40 last:border-b-0">
                                        <TableCell className="py-3 px-4 font-bold text-foreground">
                                          {pm.purchaseId?.courseId?.title || 'Program Access Enrollment'}
                                          <div className="text-[9px] text-muted-foreground/80 font-medium mt-0.5">{new Date(pm.createdAt).toLocaleString()}</div>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 text-muted-foreground font-mono text-[10px]">{pm.transactionId}</TableCell>
                                        <TableCell className="py-3 px-4 text-center">
                                          <Badge 
                                            className={`text-[9px] uppercase font-bold tracking-wide px-2 py-0.5 border ${
                                              pm.status === 'success' 
                                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25' 
                                                : pm.status === 'pending'
                                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/25'
                                                  : 'bg-rose-500/10 text-rose-600 border-rose-500/25'
                                            }`}
                                            variant="outline"
                                          >
                                            {pm.status}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 text-right font-extrabold text-foreground">${pm.amount}</TableCell>
                                        <TableCell className="py-3 px-4 text-right">
                                          <div className="flex justify-end gap-1.5">
                                            <Button 
                                              variant="ghost" 
                                              className="h-8 text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-500/10 font-bold px-2 rounded-lg"
                                              onClick={() => {
                                                setActiveReceipt(pm);
                                                setReceiptModalOpen(true);
                                              }}
                                            >
                                              Receipt
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              className="h-8 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/10 font-bold px-2 rounded-lg"
                                              onClick={() => {
                                                setActiveInvoice(pm);
                                                setInvoiceModalOpen(true);
                                              }}
                                            >
                                              Invoice
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    {payments.length === 0 && (
                                      <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-semibold">
                                          <CreditCard className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                                          <div>No payment records found.</div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            )}

                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {/* 🏆 CERTIFICATES SUB-TAB */}
                    {settingsSubTab === 'certificates' && (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <Card className="border-border/40 shadow-sm rounded-[24px] bg-card overflow-hidden">
                          <CardHeader className="border-b border-border/40 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                              <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              <span>Official Course Certificates</span>
                            </CardTitle>
                            <CardDescription>Earn certificates of completion by completing 100% of the lessons in a batch.</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-6 space-y-4">
                            
                            <div className="grid gap-4">
                              {purchasedCourses.map((course) => {
                                // Calculate course progress
                                const lessonHistory = watchHistory.filter(h => {
                                  const progId = h.contentId?.lessonId?.unitId?.subjectId?.programId?._id || h.courseId?._id;
                                  return progId && progId.toString() === course._id.toString();
                                });
                                const progress = lessonHistory.length > 0
                                  ? Math.round(lessonHistory.reduce((sum, current) => sum + current.progress, 0) / lessonHistory.length)
                                  : 0;
                                const isCompleted = progress >= 100;

                                return (
                                  <Card key={course._id} className={`border rounded-2xl overflow-hidden hover:shadow-sm transition-all duration-200 ${
                                    isCompleted ? 'border-amber-500/25 bg-amber-500/[0.02]' : 'border-border/45 bg-muted/10'
                                  }`}>
                                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                      <div className="flex items-center gap-4 min-w-0">
                                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 shadow-inner ${
                                          isCompleted ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-muted border-border text-muted-foreground/60'
                                        }`}>
                                          <Award className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                          <span className="font-extrabold text-sm text-foreground truncate block">{course.title}</span>
                                          <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 flex-wrap">
                                            {isCompleted ? (
                                              <>
                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                <span className="text-emerald-600 font-extrabold">Certificate Unlocked!</span>
                                              </>
                                            ) : (
                                              <>
                                                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                <span>In Progress · {progress}% Complete</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="shrink-0 self-stretch sm:self-auto flex items-center justify-end">
                                        {isCompleted ? (
                                          <Button 
                                            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 text-white font-bold text-xs rounded-xl px-4 py-2 shadow-md shadow-amber-500/10"
                                            onClick={() => {
                                              setActiveCertificate(course);
                                              setCertificateModalOpen(true);
                                            }}
                                          >
                                            View Certificate
                                          </Button>
                                        ) : (
                                          <Button 
                                            variant="ghost" 
                                            disabled 
                                            className="text-[10px] font-extrabold text-muted-foreground bg-muted/30 rounded-xl"
                                          >
                                            Complete Course to Unlock
                                          </Button>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                              
                              {purchasedCourses.length === 0 && (
                                <div className="text-center py-12 border border-dashed border-border/50 rounded-2xl bg-card">
                                  <Award className="w-10 h-10 text-muted-foreground/60 mx-auto mb-2" />
                                  <p className="text-xs text-muted-foreground font-bold">No courses available to generate certificates.</p>
                                </div>
                              )}
                            </div>

                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {/* ❓ HELP & SUPPORT SUB-TAB */}
                    {settingsSubTab === 'support' && (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        
                        {/* FAQ Accordion */}
                        <Card className="border-border/40 shadow-sm rounded-[24px] bg-card overflow-hidden">
                          <CardHeader className="border-b border-border/40 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                              <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              <span>Frequently Asked Questions</span>
                            </CardTitle>
                            <CardDescription>Quick solutions to common queries regarding account limits, video loading, and devices.</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="faq-1" className="border-b border-border/30">
                                <AccordionTrigger className="text-xs font-bold hover:no-underline">How many devices can I log in from simultaneously?</AccordionTrigger>
                                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                                  To ensure platform security, your institute restricts login to one active browser session at any time. Logging in from a second device will terminate the previous connection. Review device sessions under the <strong>Security & Devices</strong> settings page.
                                </AccordionContent>
                              </AccordionItem>
                              <AccordionItem value="faq-2" className="border-b border-border/30">
                                <AccordionTrigger className="text-xs font-bold hover:no-underline">Why did I receive a compliance security warning?</AccordionTrigger>
                                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                                  Our LMS anti-piracy algorithms monitor screenshots, screen recordings, and tab switches during video playback. Accumulating violations lowers your Security Compliance Score and may automatically lock access. Keep third-party recording software closed when learning.
                                </AccordionContent>
                              </AccordionItem>
                              <AccordionItem value="faq-3" className="border-b border-border/30">
                                <AccordionTrigger className="text-xs font-bold hover:no-underline">How do I unlock my course completion certificate?</AccordionTrigger>
                                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                                  Certificates are generated automatically the moment a course progress bar reaches 100% completion (meaning all video lessons have been watched in full). Click "View Certificate" under the <strong>Certificates</strong> panel to print or save a verified PDF copy.
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </CardContent>
                        </Card>

                        {/* Submit ticket form */}
                        <Card className="border-border/40 shadow-sm rounded-[24px] bg-card overflow-hidden">
                          <CardHeader className="border-b border-border/40 pb-4">
                            <CardTitle className="text-sm font-bold">Submit a Support Request</CardTitle>
                            <CardDescription>Need assistance? File a ticket and a representative will reply shortly.</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Subject</label>
                                <Input className="rounded-xl bg-background/50 border-border/50 text-xs" placeholder="e.g. Video loading issues, payment discrepancy" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description of the Issue</label>
                                <textarea 
                                  className="w-full min-h-24 p-3 text-xs bg-background/50 border border-border/50 rounded-xl focus:border-purple-500 outline-none" 
                                  placeholder="Provide as much detail as possible to help our team resolve your query..." 
                                />
                              </div>
                            </div>
                            <div className="pt-2 flex justify-end">
                              <Button 
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-95 shadow-md shadow-purple-500/10 text-xs"
                                onClick={() => {
                                  toast.success('Support ticket submitted successfully!', { description: 'Our support team will follow up via email.' });
                                }}
                              >
                                Submit Request
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                      </motion.div>
                    )}

                  </div>

                </div>
                </div>

                {/* =========================================== */}
                {/* SETTINGS POPUP MODALS                       */}
                {/* =========================================== */}

                {/* Avatar Zoom/Crop Modal */}
                {avatarModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md border-border/40 shadow-2xl rounded-3xl bg-card overflow-hidden">
                      <CardHeader className="pb-4 border-b border-border/40">
                        <CardTitle className="text-base font-bold">Edit Profile Photo</CardTitle>
                        <CardDescription>Upload a photo, drag to reposition, and zoom to crop.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        {!selectedAvatarFile ? (
                          /* Drag and Drop Zone */
                          <div 
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
                            }}
                            className="border-2 border-dashed border-border/60 hover:border-purple-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-muted/20"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e: any) => {
                                if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                              };
                              input.click();
                            }}
                          >
                            <Camera className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                            <p className="text-xs font-bold text-foreground">Click to upload or drag & drop</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Supports PNG, JPG, or WEBP formats</p>
                          </div>
                        ) : (
                          /* Crop Preview Area */
                          <div className="space-y-4">
                            <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-2 border-purple-500 bg-muted cursor-move flex items-center justify-center">
                              <div 
                                className="absolute inset-0 flex items-center justify-center select-none"
                                style={{
                                  transform: `scale(${avatarZoom}) translate(${avatarOffset.x}px, ${avatarOffset.y}px)`,
                                  transition: isSavingAvatar ? 'none' : 'transform 0.1s ease-out'
                                }}
                                onTouchStart={(e) => {
                                  if (e.touches.length === 1) {
                                    const touch = e.touches[0];
                                    const startX = touch.clientX - avatarOffset.x;
                                    const startY = touch.clientY - avatarOffset.y;
                                    const onTouchMove = (moveEvent: TouchEvent) => {
                                      if (moveEvent.touches.length === 1) {
                                        const moveTouch = moveEvent.touches[0];
                                        setAvatarOffset({
                                          x: moveTouch.clientX - startX,
                                          y: moveTouch.clientY - startY
                                        });
                                      }
                                    };
                                    const onTouchEnd = () => {
                                      document.removeEventListener('touchmove', onTouchMove);
                                      document.removeEventListener('touchend', onTouchEnd);
                                    };
                                    document.addEventListener('touchmove', onTouchMove, { passive: false });
                                    document.addEventListener('touchend', onTouchEnd);
                                  }
                                }}
                                onMouseDown={(e) => {
                                  const startX = e.clientX - avatarOffset.x;
                                  const startY = e.clientY - avatarOffset.y;
                                  const onMouseMove = (moveEvent: MouseEvent) => {
                                    setAvatarOffset({
                                      x: moveEvent.clientX - startX,
                                      y: moveEvent.clientY - startY
                                    });
                                  };
                                  const onMouseUp = () => {
                                    document.removeEventListener('mousemove', onMouseMove);
                                    document.removeEventListener('mouseup', onMouseUp);
                                  };
                                  document.addEventListener('mousemove', onMouseMove);
                                  document.addEventListener('mouseup', onMouseUp);
                                }}
                              >
                                <img src={selectedAvatarFile} alt="Crop preview" className="w-full h-full object-contain pointer-events-none" />
                              </div>
                              {/* Circle Overlay Grid Guide */}
                              <div className="absolute inset-0 rounded-full border border-white/40 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                            </div>

                            {/* Zoom Slider */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                                <span>Zoom</span>
                                <span>{Math.round(avatarZoom * 100)}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="1" 
                                max="3" 
                                step="0.05" 
                                value={avatarZoom} 
                                onChange={(e) => setAvatarZoom(parseFloat(e.target.value))}
                                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-600" 
                              />
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-between items-center gap-3 pt-4 border-t border-border/40">
                          <div className="flex gap-2">
                            {user?.avatar && (
                              <Button variant="ghost" className="text-destructive hover:bg-destructive/10 text-xs px-3" onClick={handleRemoveAvatar}>
                                <Trash2 className="w-4 h-4 mr-1.5" /> Remove
                              </Button>
                            )}
                            {selectedAvatarFile && (
                              <Button variant="ghost" className="text-xs px-3" onClick={() => setSelectedAvatarFile(null)}>
                                Clear
                              </Button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setAvatarModalOpen(false); setSelectedAvatarFile(null); }}>
                              Cancel
                            </Button>
                            {selectedAvatarFile && (
                              <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs" size="sm" onClick={handleSaveAvatar} disabled={isSavingAvatar}>
                                {isSavingAvatar ? 'Saving...' : 'Save Photo'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Invoice PDF Print Modal */}
                {invoiceModalOpen && activeInvoice && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <Card className="w-full max-w-2xl border-border/40 shadow-2xl rounded-3xl bg-card overflow-hidden my-8 print-allowed-area">
                      <CardContent className="p-6 sm:p-8 space-y-6 bg-white text-slate-900 dark:bg-white dark:text-slate-900">
                        
                        {/* Header / Brand */}
                        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm">T</div>
                              <span className="font-extrabold text-base tracking-tight text-slate-900">Trineo Stream LMS</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-semibold">{user?.institute?.name || 'GFI Institute'}</p>
                            <p className="text-[10px] text-slate-500 font-semibold">{user?.institute?.email || 'billing@gfi.edu'}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <h2 className="text-2xl font-black tracking-tight text-purple-600">INVOICE</h2>
                            <p className="text-xs font-bold text-slate-800">#{activeInvoice.transactionId?.replace('TXN-', 'INV-') || 'INV-00000'}</p>
                            <div className="text-[10px] text-slate-500 font-semibold">
                              <div>Date: {new Date(activeInvoice.createdAt).toLocaleDateString()}</div>
                              <div>Due: Paid upon purchase</div>
                            </div>
                          </div>
                        </div>

                        {/* Billed To / From */}
                        <div className="grid grid-cols-2 gap-6 text-xs font-semibold">
                          <div>
                            <div className="text-slate-400 uppercase text-[10px] tracking-wider mb-1">Billed To</div>
                            <div className="text-slate-900 font-extrabold">{user?.name}</div>
                            <div className="text-slate-500">ID: {user?.user_id}</div>
                            <div className="text-slate-500">{user?.email}</div>
                            {user?.phone && <div className="text-slate-500">{user.phone}</div>}
                          </div>
                          <div>
                            <div className="text-slate-400 uppercase text-[10px] tracking-wider mb-1">Payment Method</div>
                            <div className="text-slate-900 font-extrabold">{activeInvoice.paymentMethod || 'Online Payment'}</div>
                            <div className="text-slate-500">Txn ID: {activeInvoice.transactionId}</div>
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 text-[9px] uppercase font-bold tracking-wider">
                              Paid
                            </div>
                          </div>
                        </div>

                        {/* Item Ledger */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                          <Table className="w-full">
                            <TableHeader>
                              <TableRow className="bg-slate-50 text-xs border-b border-slate-200">
                                <TableHead className="font-bold py-2.5 px-4 text-slate-800">Course Description</TableHead>
                                <TableHead className="font-bold py-2.5 px-4 text-center text-slate-800">Qty</TableHead>
                                <TableHead className="font-bold py-2.5 px-4 text-right text-slate-800">Rate</TableHead>
                                <TableHead className="font-bold py-2.5 px-4 text-right text-slate-800">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="text-xs">
                              <TableRow className="hover:bg-transparent border-slate-200">
                                <TableCell className="py-4 px-4 font-bold text-slate-900">
                                  {activeInvoice.purchaseId?.courseId?.title || 'LMS Program Access Enrollment'}
                                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Full access to lectures, study materials, and certifications.</p>
                                </TableCell>
                                <TableCell className="py-4 px-4 text-center font-bold text-slate-900">1</TableCell>
                                <TableCell className="py-4 px-4 text-right font-bold text-slate-900">${activeInvoice.amount || 0}</TableCell>
                                <TableCell className="py-4 px-4 text-right font-bold text-slate-900">${activeInvoice.amount || 0}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>

                        {/* Summary Totals */}
                        <div className="flex justify-end text-xs font-semibold">
                          <div className="w-64 space-y-2 border-t border-slate-200 pt-4">
                            <div className="flex justify-between text-slate-500">
                              <span>Subtotal</span>
                              <span className="text-slate-900 font-extrabold">${activeInvoice.amount || 0}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Tax (0%)</span>
                              <span className="text-slate-900 font-extrabold">$0.00</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-300 pt-2 text-sm font-black">
                              <span>Total Paid</span>
                              <span className="text-purple-600 font-black">${activeInvoice.amount || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer notes */}
                        <div className="text-center pt-6 border-t border-slate-200 space-y-1">
                          <p className="text-[10px] text-slate-500 font-semibold">Thank you for studying with Trineo Stream!</p>
                          <p className="text-[9px] text-slate-400 font-medium">This invoice is generated automatically and serves as proof of purchase.</p>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 print:hidden border-t border-slate-200 pt-4">
                          <Button variant="outline" size="sm" className="text-slate-700 border-slate-300 bg-white" onClick={() => setInvoiceModalOpen(false)}>Close</Button>
                          <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold" size="sm" onClick={triggerPrint}>
                            <Printer className="w-4 h-4 mr-1.5" /> Print Invoice
                          </Button>
                        </div>

                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Receipt Print Modal */}
                {receiptModalOpen && activeReceipt && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-sm border-border/40 shadow-2xl rounded-3xl bg-card overflow-hidden print-allowed-area">
                      <CardContent className="p-6 space-y-6 text-center bg-white text-slate-900 dark:bg-white dark:text-slate-900">
                        
                        {/* Brand / Success Icon */}
                        <div className="space-y-2">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle className="w-6 h-6" />
                          </div>
                          <h3 className="text-lg font-black tracking-tight text-slate-900">Payment Receipt</h3>
                          <p className="text-[10px] text-slate-500 font-semibold">Transaction Successful</p>
                        </div>

                        {/* Amount Paid */}
                        <div className="py-4 border-y border-slate-200 space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Amount Paid</span>
                          <div className="text-3xl font-black text-slate-900">${activeReceipt.amount}</div>
                        </div>

                        {/* Detail list */}
                        <div className="space-y-2.5 text-left text-xs font-semibold text-slate-500 pb-4 border-b border-slate-200">
                          <div className="flex justify-between">
                            <span>Payment Date</span>
                            <span className="text-slate-900 font-extrabold">{new Date(activeReceipt.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Enrolled Course</span>
                            <span className="text-slate-900 font-extrabold truncate max-w-[180px]">
                              {activeReceipt.purchaseId?.courseId?.title || 'Program Access'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Transaction ID</span>
                            <span className="text-slate-900 font-extrabold truncate max-w-[180px]">{activeReceipt.transactionId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Payment Method</span>
                            <span className="text-slate-900 font-extrabold">{activeReceipt.paymentMethod}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Student ID</span>
                            <span className="text-slate-900 font-extrabold">{user?.user_id}</span>
                          </div>
                        </div>

                        <p className="text-[9px] text-slate-400 font-semibold">GFI Institute · Verified Payment Receipt</p>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 print:hidden pt-2">
                          <Button variant="outline" size="sm" className="text-slate-700 border-slate-300 bg-white" onClick={() => setReceiptModalOpen(false)}>Close</Button>
                          <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold" size="sm" onClick={triggerPrint}>
                            <Printer className="w-4 h-4 mr-1.5" /> Print Receipt
                          </Button>
                        </div>

                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Certificate Modal */}
                {certificateModalOpen && activeCertificate && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <Card className="w-full max-w-4xl border-border/40 shadow-2xl rounded-3xl bg-card overflow-hidden my-8 print-allowed-area">
                      <CardContent className="p-0 space-y-6">
                        
                        {/* landscape certificate layout wrapper */}
                        <div className="p-8 sm:p-12 bg-white text-slate-900 border-8 border-double border-amber-500/30 rounded-2xl relative shadow-inner text-center space-y-8 flex flex-col items-center justify-between min-h-[500px] dark:bg-white dark:text-slate-900">
                          
                          {/* Decorative corner patterns */}
                          <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-amber-500/40 pointer-events-none" />
                          <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-amber-500/40 pointer-events-none" />
                          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-amber-500/40 pointer-events-none" />
                          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-amber-500/40 pointer-events-none" />

                          {/* Top Seal / Logo */}
                          <div className="space-y-2">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center mx-auto shadow-md border-2 border-white/20">
                              <GraduationCap className="w-7 h-7" />
                            </div>
                            <span className="text-[10px] font-black tracking-widest text-amber-600 uppercase block">GFI Institute of Technology</span>
                          </div>

                          {/* Header text */}
                          <div className="space-y-2">
                            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif text-slate-800">CERTIFICATE OF COMPLETION</h2>
                            <p className="text-xs italic text-slate-500 font-medium">This certificate is proudly presented to</p>
                          </div>

                          {/* Student Name */}
                          <div className="py-2 border-b-2 border-amber-500/30 w-3/4 max-w-md mx-auto">
                            <h1 className="text-3xl sm:text-4xl font-serif font-black text-amber-600 tracking-wide truncate">{user?.name}</h1>
                          </div>

                          {/* Completion subtext */}
                          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xl mx-auto leading-relaxed">
                            has successfully fulfilled all requirements and completed the certification course of instruction in
                            <br />
                            <span className="font-extrabold text-slate-900 text-base">{activeCertificate.title}</span>
                            <br />
                            with comprehensive evaluation and online practical projects.
                          </p>

                          {/* Details Block (QR Code, Signatures, Seal) */}
                          <div className="grid grid-cols-3 gap-6 items-center w-full max-w-2xl pt-6 border-t border-slate-200 text-left">
                            {/* QR Code Verification */}
                            <div className="flex items-center gap-3">
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`https://stream.trineo.in/verify/cert/${user?.user_id}-${activeCertificate._id}`)}`} 
                                alt="Verification QR" 
                                className="w-16 h-16 object-contain border border-slate-200 p-1 bg-white rounded"
                              />
                              <div className="text-[9px] text-slate-500 font-semibold leading-tight">
                                <div className="font-bold text-slate-700">QR VERIFICATION</div>
                                <div>ID: CERT-{user?.user_id || '00000'}-{activeCertificate._id?.substring(0, 6)?.toUpperCase() || '0000'}</div>
                                <div className="mt-0.5">Scan to verify credentials</div>
                              </div>
                            </div>

                            {/* Golden Seal Badge */}
                            <div className="text-center">
                              <div className="w-16 h-16 mx-auto bg-amber-500/10 border-2 border-dashed border-amber-500/40 rounded-full flex items-center justify-center relative shadow-inner">
                                <Award className="w-8 h-8 text-amber-500" />
                                <div className="absolute inset-0.5 rounded-full border border-amber-500/20" />
                              </div>
                              <span className="text-[8px] font-bold text-amber-600 block mt-1 tracking-wider">OFFICIAL SEAL</span>
                            </div>

                            {/* Signature Block */}
                            <div className="text-right flex flex-col justify-end items-end space-y-1 pr-4">
                              <span className="font-serif italic font-semibold text-lg text-slate-700 select-none tracking-wider">Noel Babu</span>
                              <div className="w-32 border-t border-slate-300" />
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Course Director</span>
                              <span className="text-[8px] text-slate-400 font-semibold block">Date: {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
                            </div>
                          </div>

                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 print:hidden p-4 border-t border-slate-200">
                          <Button variant="outline" size="sm" className="text-slate-700 border-slate-300 bg-white" onClick={() => setCertificateModalOpen(false)}>Close</Button>
                          <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold" size="sm" onClick={triggerPrint}>
                            <Printer className="w-4 h-4 mr-1.5" /> Download / Print PDF
                          </Button>
                        </div>

                      </CardContent>
                    </Card>
                  </div>
                )}

              </motion.div>
            )}

          </div>
        </ScrollArea>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav 
        items={studentNavItems} 
        onItemClick={setActiveTab} 
        unreadCount={0} 
        violationCount={violations.length} 
      />
    </div>
  );
}
