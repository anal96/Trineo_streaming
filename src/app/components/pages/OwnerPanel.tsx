import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Building2,
  DollarSign,
  Users,
  Radio,
  ShieldAlert,
  LogOut,
  Plus,
  Trash2,
  Ban,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Cpu,
  Server,
  HardDrive,
  Globe,
  Wifi,
  Eye,
  Monitor,
  Smartphone,
  MapPin,
  Camera,
  UserX,
  Layers,
  Video,
  RefreshCw,
  Crown,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Search,
  Filter,
  MoreVertical,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  Lock,
  Unlock,
  Key,
  AlertCircle,
  ChevronDown,
  BarChart3,
  PieChart,
  Star,
  Settings,
  Bell,
  FileText,
  Flag,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartPie,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { apiFetch } from '../../utils/api';
import { ThemeToggleButton } from '../ThemeToggle';
import { PanelDrawerNav } from '../responsive/PanelDrawerNav';
import { MobileRecordCard } from '../responsive/ResponsiveDataView';
import trineoLogo from '@/images/trineoStream-1.png';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Institute {
  _id: string;
  name: string;
  email: string;
  contactPerson: string;
  phone: string;
  subscription: 'free_trial' | 'starter' | 'growth' | 'enterprise';
  status: 'active' | 'suspended' | 'deleted';
  studentCount: number;
  courseCount: number;
  videoCount: number;
  storageUsedGB: number;
  totalRevenue: number;
  createdAt: string;
  lessonCount?: number;
  materialCount?: number;
  quotas?: {
    maxStudents: number;
    maxCourses: number;
    maxVideos: number;
    maxStorageGB: number;
    maxStudyMaterials: number;
  };
  emergencyLock?: boolean;
  lastActivityAt?: string | null;
  youtubeStatus?: string;
  youtubeChannelName?: string;
  youtubeChannelId?: string;
  youtubeLastSync?: string | null;
  connectionHealth?: string;
}

interface PlatformStats {
  totalStudents: number;
  totalAdmins: number;
  totalInstitutes: number;
  activeInstitutes: number;
  suspendedInstitutes: number;
  totalVideos: number;
  totalCourses: number;
  totalLessons: number;
  totalStudyMaterials: number;
  totalWatchHours: number;
  totalRevenue: number;
  totalStorageGB: number;
  activeSessions: number;
  pendingPayments: number;
  processingJobs: number;
  failedJobs: number;
  revenueByMonth: { month: string; revenue: number; subscriptions: number }[];
  subscriptionBreakdown: Record<string, number>;
}

interface SecurityLog {
  _id: string;
  userId?: { name: string; email: string; user_id: number };
  eventType: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  createdAt: string;
}

interface StreamingData {
  providers: Record<string, { status: string; videos: number; label: string }>;
  queue: { total: number; processing: number; failed: number; completed: number; uploading: number; pending: number };
  bandwidth: { used: number; total: number; unit: string };
  recentJobs: any[];
}

interface BackupStatus {
  services: Array<{
    type: string;
    lastBackupTime: string | null;
    backupStatus: string;
    backupSizeBytes: number;
    backupHealth: string;
    integrityVerified: boolean;
  }>;
  history: any[];
  restorePoints: any[];
}

interface PlatformHealth {
  services: Array<{
    service: string;
    status: string;
    responseTimeMs: number;
    errorCount: number;
    lastFailure: string | null;
    lastRecovery: string | null;
  }>;
  systemHealth: {
    cpuUsagePct: number;
    memoryUsagePct: number;
    diskUsagePct: number;
    bandwidthUsageGB: number;
    queueStatus: { total: number; processing: number; failed: number };
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SUBSCRIPTION_CONFIG = {
  free_trial: { label: 'Free Trial', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: Clock },
  starter:    { label: 'Starter',    color: 'text-sky-400',   bg: 'bg-sky-500/10',   border: 'border-sky-500/20',   icon: Zap },
  growth:     { label: 'Growth',     color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: TrendingUp },
  enterprise: { label: 'Enterprise', color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  icon: Crown }
};

const EVENT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  screenshot:         { label: 'Screenshot Attempt',  color: 'text-orange-400', bg: 'bg-orange-500/10', icon: Camera },
  devtools_open:      { label: 'DevTools Opened',     color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Monitor },
  screen_recording:   { label: 'Screen Recording',    color: 'text-red-400',    bg: 'bg-red-500/10',    icon: Video },
  playback_anomaly:   { label: 'Playback Anomaly',    color: 'text-pink-400',   bg: 'bg-pink-500/10',   icon: AlertTriangle },
  multiple_login:     { label: 'Multiple Logins',     color: 'text-rose-400',   bg: 'bg-rose-500/10',   icon: UserX },
  suspicious_ip:      { label: 'Suspicious IP',       color: 'text-purple-400', bg: 'bg-purple-500/10', icon: MapPin },
  user_report:        { label: 'User Reports',        color: 'text-blue-400',   bg: 'bg-blue-500/10',   icon: Flag }
};

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'];

const fmtRevenue = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const renderDetails = (details: string, eventType: string) => {
  if (!details) return null;
  if (eventType === 'user_report' || (details.startsWith('{') && details.endsWith('}'))) {
    try {
      const parsed = JSON.parse(details);
      return (
        <div className="mt-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] space-y-1.5 max-w-lg">
          {parsed.reportType && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-bold text-white/30 tracking-wider w-16 shrink-0">Type:</span>
              <span className="text-xs font-semibold text-sky-400">{parsed.reportType}</span>
            </div>
          )}
          {parsed.courseTitle && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-bold text-white/30 tracking-wider w-16 shrink-0">Course:</span>
              <span className="text-xs text-white/70 truncate">{parsed.courseTitle}</span>
            </div>
          )}
          {parsed.lessonTitle && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-bold text-white/30 tracking-wider w-16 shrink-0">Lesson:</span>
              <span className="text-xs text-white/70 truncate">{parsed.lessonTitle}</span>
            </div>
          )}
          {parsed.page && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-bold text-white/30 tracking-wider w-16 shrink-0">Page:</span>
              <span className="text-xs text-white/50 font-mono truncate">{parsed.page}</span>
            </div>
          )}
          {parsed.description && (
            <div className="pt-2 mt-2 border-t border-white/[0.04]">
              <span className="text-[9px] uppercase font-bold text-white/30 tracking-wider block mb-1">Description:</span>
              <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed bg-white/[0.01] p-3 rounded-lg border border-white/[0.02]">
                {parsed.description}
              </p>
            </div>
          )}
        </div>
      );
    } catch (e) {
      // Fallback if not valid JSON
    }
  }
  return <div className="text-xs text-white/40 mt-1">{details}</div>;
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({
  icon: Icon, label, value, sub, trend, color, delay = 0, isDark
}: {
  icon: any; label: string; value: string | number; sub?: string; trend?: 'up' | 'down' | null; color: string; delay?: number; isDark?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className={`relative group border rounded-2xl p-5 transition-all overflow-hidden ${
      isDark
        ? 'bg-[#0f0f23] border-white/[0.06] hover:border-white/[0.12]'
        : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300/80'
    }`}
  >
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${color} pointer-events-none`} />
    <div className="relative">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl border ${
          isDark ? 'bg-white/[0.05] border-white/[0.06]' : 'bg-slate-50 border-slate-100'
        }`}>
          <Icon className={`w-5 h-5 ${isDark ? 'text-white/70' : 'text-slate-600'}`} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            trend === 'up' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
          }`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend === 'up' ? '+12%' : '-3%'}
          </span>
        )}
      </div>
      <div className={`text-3xl font-bold tracking-tight mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</div>
      <div className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{label}</div>
      {sub && <div className={`text-xs mt-1 ${isDark ? 'text-white/25' : 'text-slate-400'}`}>{sub}</div>}
    </div>
  </motion.div>
);

const SectionBadge = ({ children, isDark }: { children: React.ReactNode; isDark?: boolean }) => (
  <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-full border ${
    isDark
      ? 'text-white/30 bg-white/[0.04] border-white/[0.06]'
      : 'text-slate-500 bg-slate-100 border-slate-200/60'
  }`}>
    {children}
  </span>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OwnerPanel() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeSubTab, setActiveSubTab]   = useState('');

  // Data states
  const [stats, setStats]         = useState<PlatformStats | null>(null);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [users, setUsers]         = useState<any[]>([]);
  const [revenue, setRevenue]     = useState<any>(null);
  const [streaming, setStreaming] = useState<StreamingData | null>(null);
  const [security, setSecurity]   = useState<{ logs: SecurityLog[]; summary: Record<string, number> } | null>(null);
  const [ownerActions, setOwnerActions] = useState<any[]>([]);
  const [backups, setBackups] = useState<BackupStatus | null>(null);
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [selectedInstituteId, setSelectedInstituteId] = useState('');
  const [instituteDetails, setInstituteDetails] = useState<any>(null);
  const [analyticsRange, setAnalyticsRange] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [securityFilter, setSecurityFilter] = useState('all');

  // Institute create form
  const [showInstForm, setShowInstForm] = useState(false);
  const [instForm, setInstForm] = useState({ name: '', email: '', contactPerson: '', phone: '', domain: '', subscription: 'free_trial' });
  const [instSubmitting, setInstSubmitting] = useState(false);

  // ── Loaders ──────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('range', analyticsRange);
      if (analyticsRange === 'custom') {
        if (customStartDate) params.set('startDate', customStartDate);
        if (customEndDate) params.set('endDate', customEndDate);
      }
      const data = await apiFetch(`/owner/stats?${params.toString()}`);
      setStats(data);
    } catch (e: any) { setError(e.message); }
  }, [analyticsRange, customStartDate, customEndDate]);

  const loadInstitutes = useCallback(async () => {
    try {
      const data = await apiFetch('/owner/institutes');
      setInstitutes(data);
    } catch (e: any) { setError(e.message); }
  }, []);

  const loadUsers = useCallback(async (role = '') => {
    try {
      const q = role ? `?role=${role}` : '';
      const data = await apiFetch(`/owner/users${q}`);
      setUsers(data);
    } catch (e: any) { setError(e.message); }
  }, []);

  const loadRevenue = useCallback(async () => {
    try {
      const data = await apiFetch('/owner/revenue');
      setRevenue(data);
    } catch (e: any) { setError(e.message); }
  }, []);

  const loadStreaming = useCallback(async () => {
    try {
      const data = await apiFetch('/owner/streaming');
      setStreaming(data);
    } catch (e: any) { setError(e.message); }
  }, []);

  const loadSecurity = useCallback(async (type = 'all') => {
    try {
      const data = await apiFetch(`/owner/security?type=${type}`);
      setSecurity(data);
    } catch (e: any) { setError(e.message); }
  }, []);

  const loadOwnerActions = useCallback(async () => {
    try {
      const data = await apiFetch('/owner/owner-actions');
      setOwnerActions(data);
    } catch (e: any) { setError(e.message); }
  }, []);

  const loadBackups = useCallback(async () => {
    try {
      const data = await apiFetch('/owner/backups');
      setBackups(data);
    } catch (e: any) { setError(e.message); }
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      const data = await apiFetch('/owner/health');
      setHealth(data);
    } catch (e: any) { setError(e.message); }
  }, []);

  const loadInstituteDetails = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const data = await apiFetch(`/owner/institutes/${id}/details`);
      setInstituteDetails(data);
    } catch (e: any) { setError(e.message); }
  }, []);

  // Sync local isDark with theme system
  useEffect(() => {
    setIsDark(theme !== 'light');
  }, [theme]);

  useEffect(() => {
    setError('');
    setLoading(true);
    const load = async () => {
      try {
        switch (activeSection) {
          case 'dashboard':    await loadStats(); break;
          case 'institutes':   await Promise.all([loadInstitutes(), loadStats()]); break;
          case 'revenue':      await Promise.all([loadRevenue(), loadStats()]); break;
          case 'users':        await loadUsers(activeSubTab || ''); break;
          case 'streaming':    await loadStreaming(); break;
          case 'security':     await Promise.all([loadSecurity(securityFilter), loadOwnerActions()]); break;
          case 'usage':        await loadInstitutes(); break;
          case 'backups':      await loadBackups(); break;
          case 'health':       await loadHealth(); break;
          case 'instituteDetail':
            await loadInstitutes();
            if (selectedInstituteId) await loadInstituteDetails(selectedInstituteId);
            break;
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === 'users') loadUsers(activeSubTab);
  }, [activeSubTab]);

  useEffect(() => {
    if (activeSection === 'security') loadSecurity(securityFilter);
  }, [securityFilter]);

  useEffect(() => {
    if (activeSection === 'dashboard') loadStats();
  }, [analyticsRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (activeSection === 'instituteDetail' && selectedInstituteId) {
      loadInstituteDetails(selectedInstituteId);
    }
  }, [selectedInstituteId]);

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

  // ── Institute Actions ────────────────────────────────────────────────────
  const handleCreateInstitute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instForm.name || !instForm.email) return;
    setInstSubmitting(true);
    try {
      await apiFetch('/owner/institutes', { method: 'POST', body: JSON.stringify(instForm) });
      setInstForm({ name: '', email: '', contactPerson: '', phone: '', domain: '', subscription: 'free_trial' });
      setShowInstForm(false);
      await loadInstitutes();
    } catch (e: any) {
      alert(e.message || 'Failed to create institute');
    } finally {
      setInstSubmitting(false);
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm('Toggle suspend status for this institute?')) return;
    try {
      await apiFetch(`/owner/institutes/${id}/suspend`, { method: 'PUT' });
      await loadInstitutes();
    } catch (e: any) { alert(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this institute? This cannot be undone.')) return;
    try {
      await apiFetch(`/owner/institutes/${id}`, { method: 'DELETE' });
      await loadInstitutes();
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdatePlan = async (id: string, plan: string) => {
    try {
      await apiFetch(`/owner/institutes/${id}/subscription`, {
        method: 'PUT',
        body: JSON.stringify({ subscription: plan })
      });
      await loadInstitutes();
    } catch (e: any) { alert(e.message); }
  };

  // ── Sidebar config ───────────────────────────────────────────────────────
  const navItems = [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Platform Dashboard',        badge: null },
    { id: 'institutes', icon: Building2,        label: 'Institute Management',       badge: stats?.totalInstitutes ?? null },
    { id: 'usage',      icon: Database,         label: 'Usage & Quotas',             badge: null },
    { id: 'instituteDetail', icon: Eye,         label: 'Institute Detail',            badge: null },
    { id: 'crm_keys',        icon: Key,         label: 'CRM Key Management',          badge: null },
    { id: 'revenue',    icon: DollarSign,       label: 'Revenue',                   badge: stats?.pendingPayments ? `${stats.pendingPayments} pending` : null },
    { id: 'users',      icon: Users,            label: 'User Management',           badge: null },
    { id: 'streaming',  icon: Radio,            label: 'Streaming Infrastructure',  badge: stats?.processingJobs ?? null },
    { id: 'security',   icon: ShieldAlert,      label: 'Security Center',           badge: security?.logs?.length ?? null },
    { id: 'backups',    icon: HardDrive,        label: 'Backup Center',             badge: backups?.history?.length ?? null },
    { id: 'health',     icon: Activity,         label: 'Platform Health',           badge: null }
  ];

  // ── Filtered data ────────────────────────────────────────────────────────
  const filteredInstitutes = institutes.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    String(u.user_id).includes(search)
  );

  const pieData = stats ? [
    { name: 'Free Trial', value: stats.subscriptionBreakdown.free_trial || 0 },
    { name: 'Starter',    value: stats.subscriptionBreakdown.starter    || 0 },
    { name: 'Growth',     value: stats.subscriptionBreakdown.growth     || 0 },
    { name: 'Enterprise', value: stats.subscriptionBreakdown.enterprise || 0 }
  ] : [];

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className={`flex min-h-screen overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-[#06060f] text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`hidden lg:flex flex-col w-72 flex-shrink-0 border-r transition-all duration-300 ${
        isDark ? 'bg-[#0a0a1a] border-white/[0.05]' : 'bg-white border-slate-200/80 shadow-sm'
      }`}>
        {/* Logo */}
        <div className={`p-6 border-b ${isDark ? 'border-white/[0.05]' : 'border-slate-200/60'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-white border border-white/[0.08] shadow-md shadow-violet-500/10">
                <img src={trineoLogo} alt="Trineo Logo" className="w-8 h-8 object-contain" />
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 ${
                isDark ? 'border-[#0a0a1a]' : 'border-white'
              }`} />
            </div>
            <div>
              <div className={`font-bold text-base leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>Trineo</div>
              <div className="text-[11px] text-violet-500 font-semibold tracking-wide mt-0.5">Owner Panel</div>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border ${
            isDark ? 'border-amber-500/20 text-amber-400' : 'border-amber-200 text-amber-600'
          }`}>
            <Lock className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">SUPER ADMINISTRATOR</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="mb-3">
            <SectionBadge isDark={isDark}>Navigation</SectionBadge>
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'crm_keys') {
                    navigate('/admin/institutes');
                    return;
                  }
                  setActiveSection(item.id);
                  setSearch('');
                  setActiveSubTab('');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  active
                    ? isDark
                      ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/10 text-white border border-violet-500/30 shadow-sm'
                      : 'bg-violet-50 text-violet-700 border border-violet-100 shadow-sm'
                    : isDark
                      ? 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-500 rounded-full" />
                )}
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${
                  active 
                    ? 'text-violet-500' 
                    : isDark ? 'text-white/30 group-hover:text-white/60' : 'text-slate-400 group-hover:text-slate-600'
                }`} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== null && item.badge !== undefined && Number(item.badge) > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    active 
                      ? isDark ? 'bg-violet-500/30 text-violet-300' : 'bg-violet-100 text-violet-700'
                      : isDark ? 'bg-white/[0.06] text-white/40' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t ${isDark ? 'border-white/[0.05]' : 'border-slate-200/60'}`}>
          <div className={`flex items-center gap-3 p-3 rounded-xl mb-3 ${
            isDark ? 'bg-white/[0.03]' : 'bg-slate-50 border border-slate-100'
          }`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>Super Admin</div>
              <div className={`text-[10px] ${isDark ? 'text-white/30' : 'text-slate-500'}`}>owner@trineo.io</div>
            </div>
            <Settings className={`w-3.5 h-3.5 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isDark 
                ? 'text-red-400/70 hover:text-red-400 hover:bg-red-500/10'
                : 'text-red-600 hover:bg-red-50 hover:text-red-700'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className={`min-h-14 flex-shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-2 border-b transition-colors duration-300 backdrop-blur-xl ${
          isDark ? 'border-white/[0.05] bg-[#08081a]/80' : 'border-slate-200/60 bg-white/80'
        }`}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <PanelDrawerNav
              title="Trineo Owner"
              subtitle="Platform Control"
              items={navItems}
              activeId={activeSection}
              onSelect={(id) => {
                if (id === 'crm_keys') {
                  navigate('/admin/institutes');
                  return;
                }
                setActiveSection(id);
                setSearch('');
                setActiveSubTab('');
              }}
              footer={
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 px-3 py-3 min-h-11 rounded-xl text-sm font-medium ${
                    isDark ? 'text-white/50 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              }
            />
            <div className={`hidden sm:flex items-center gap-2 text-sm min-w-0 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
              <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Owner Panel</span>
              <ChevronRight className="w-3 h-3 shrink-0" />
              <span className={`font-semibold capitalize truncate ${isDark ? 'text-white/70' : 'text-slate-800'}`}>
                {navItems.find(n => n.id === activeSection)?.label}
              </span>
            </div>
            <p className={`sm:hidden text-sm font-semibold truncate ${isDark ? 'text-white/70' : 'text-slate-800'}`}>
              {navItems.find(n => n.id === activeSection)?.label}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggleButton />
            <button
              type="button"
              title="Platform alerts"
              onClick={() => setActiveSection('security')}
              className={`relative h-11 w-11 inline-flex items-center justify-center rounded-lg transition-all ${
                isDark
                  ? 'hover:bg-white/[0.06] text-white/70'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Bell className="w-5 h-5" />
              {(security?.logs?.length || 0) > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => { setLoading(true); loadStats().finally(() => setLoading(false)); }}
              className={`h-11 w-11 inline-flex items-center justify-center rounded-lg transition-all ${
                isDark 
                  ? 'hover:bg-white/[0.06] text-white/30 hover:text-white/60' 
                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
              }`}
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
            }`}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold">LIVE</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="p-3 sm:p-6 space-y-4 sm:space-y-6"
            >

              {/* ── Error ─────────────────────────────────────────────── */}
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                  <button onClick={() => setError('')} className="ml-auto text-red-400/50 hover:text-red-400">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════
                  SECTION 1: PLATFORM DASHBOARD
              ══════════════════════════════════════════════════════════ */}
              {activeSection === 'dashboard' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Platform Overview</h1>
                      <p className={`text-sm mt-0.5 ${isDark ? 'text-white/30' : 'text-slate-500'}`}>Real-time metrics across all institutes</p>
                    </div>
                    <SectionBadge isDark={isDark}>Dashboard</SectionBadge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {['today', '7d', '30d', '90d', 'custom'].map((r) => (
                      <button
                        key={r}
                        onClick={() => setAnalyticsRange(r)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          analyticsRange === r
                            ? (isDark ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700')
                            : (isDark ? 'bg-white/[0.03] border-white/[0.08] text-white/40' : 'bg-white border-slate-200 text-slate-500')
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                    {analyticsRange === 'custom' && (
                      <div className="flex items-center gap-2">
                        <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className={`px-2 py-1 rounded border text-xs ${isDark ? 'bg-[#0f0f23] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-700'}`} />
                        <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className={`px-2 py-1 rounded border text-xs ${isDark ? 'bg-[#0f0f23] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-700'}`} />
                      </div>
                    )}
                  </div>

                  {/* Stat Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <StatCard icon={Building2}    label="Total Institutes"     value={stats?.totalInstitutes ?? '—'} color="from-violet-600/5 to-transparent" delay={0} isDark={isDark} />
                    <StatCard icon={CheckCircle2} label="Active Institutes"    value={stats?.activeInstitutes ?? '—'} color="from-emerald-600/5 to-transparent" delay={0.03} isDark={isDark} />
                    <StatCard icon={Ban}          label="Suspended Institutes" value={stats?.suspendedInstitutes ?? '—'} color="from-red-600/5 to-transparent" delay={0.06} isDark={isDark} />
                    <StatCard icon={Users}        label="Total Students"       value={stats?.totalStudents ?? '—'} color="from-sky-600/5 to-transparent" delay={0.09} isDark={isDark} />
                    <StatCard icon={Layers}       label="Total Courses"        value={stats?.totalCourses ?? '—'} color="from-indigo-600/5 to-transparent" delay={0.12} isDark={isDark} />
                    <StatCard icon={Video}        label="Total Lessons"        value={stats?.totalLessons ?? '—'} color="from-fuchsia-600/5 to-transparent" delay={0.15} isDark={isDark} />
                    <StatCard icon={Radio}        label="Total Videos"         value={stats?.totalVideos ?? '—'} color="from-cyan-600/5 to-transparent" delay={0.18} isDark={isDark} />
                    <StatCard icon={FileText}     label="Study Materials"      value={stats?.totalStudyMaterials ?? '—'} color="from-amber-600/5 to-transparent" delay={0.21} isDark={isDark} />
                    <StatCard icon={Clock}        label="Watch Hours"          value={stats?.totalWatchHours ?? '—'} color="from-lime-600/5 to-transparent" delay={0.24} isDark={isDark} />
                    <StatCard icon={Activity}     label="Active Sessions"      value={stats?.activeSessions ?? '—'} color="from-pink-600/5 to-transparent" delay={0.27} isDark={isDark} />
                    <StatCard icon={DollarSign}   label="Total Revenue"        value={stats ? fmtRevenue(stats.totalRevenue) : '—'} color="from-emerald-600/5 to-transparent" delay={0.3} isDark={isDark} />
                    <StatCard icon={HardDrive}    label="Storage Used"         value={stats ? `${stats.totalStorageGB} GB` : '—'} color="from-orange-600/5 to-transparent" delay={0.33} isDark={isDark} />
                  </div>

                  {/* Charts row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Revenue chart */}
                    <div className={`border rounded-2xl p-5 transition-all duration-300 ${
                      isDark ? 'bg-[#0f0f23] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-sm'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Platform Revenue</h3>
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-white/30' : 'text-slate-500'}`}>Last 6 months</p>
                        </div>
                        <BarChart3 className={`w-4 h-4 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                      </div>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats?.revenueByMonth ?? []}>
                            <defs>
                              <linearGradient id="ownerRevGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#ffffff08' : '#e2e8f0'} />
                            <XAxis dataKey="month" stroke={isDark ? '#ffffff20' : '#94a3b8'} tick={{ fontSize: 11 }} />
                            <YAxis stroke={isDark ? '#ffffff20' : '#94a3b8'} tick={{ fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{
                                background: isDark ? '#0f0f23' : '#ffffff',
                                border: isDark ? '1px solid #ffffff15' : '1px solid #e2e8f0',
                                borderRadius: 10,
                                fontSize: 12,
                                color: isDark ? '#ffffff' : '#0f172a'
                              }}
                              labelStyle={{ color: isDark ? '#ffffff80' : '#64748b' }}
                              itemStyle={{ color: '#7c3aed' }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} fill="url(#ownerRevGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Subscription breakdown */}
                    <div className={`border rounded-2xl p-5 transition-all duration-300 ${
                      isDark ? 'bg-[#0f0f23] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-sm'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Subscriptions</h3>
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-white/30' : 'text-slate-500'}`}>By plan tier</p>
                        </div>
                        <PieChart className={`w-4 h-4 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                      </div>
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartPie>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                            </Pie>
                            <Tooltip contentStyle={{
                              background: isDark ? '#0f0f23' : '#ffffff',
                              border: isDark ? '1px solid #ffffff15' : '1px solid #e2e8f0',
                              borderRadius: 10,
                              fontSize: 11,
                              color: isDark ? '#ffffff' : '#0f172a'
                            }} />
                          </RechartPie>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 mt-2">
                        {pieData.map((d, i) => (
                          <div key={d.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>{d.name}</span>
                            </div>
                            <span className={`font-medium ${isDark ? 'text-white/70' : 'text-slate-800'}`}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick stats row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Pending Payments',  value: stats?.pendingPayments ?? 0,  icon: Clock,       color: 'text-amber-500', bg: 'bg-amber-500/10'  },
                      { label: 'Processing Videos', value: stats?.processingJobs ?? 0,   icon: RefreshCw,   color: 'text-sky-500',   bg: 'bg-sky-500/10'    },
                      { label: 'Failed Jobs',        value: stats?.failedJobs ?? 0,       icon: AlertTriangle, color: 'text-red-500',   bg: 'bg-red-500/10'    },
                      { label: 'Total Courses',      value: stats?.totalCourses ?? 0,     icon: Layers,      color: 'text-violet-500', bg: 'bg-violet-500/10' }
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${
                        isDark ? 'bg-[#0f0f23] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-sm'
                      }`}>
                        <div className={`p-2.5 rounded-xl ${item.bg}`}>
                          <item.icon className={`w-4 h-4 ${item.color}`} />
                        </div>
                        <div>
                          <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.value}</div>
                          <div className={`text-xs ${isDark ? 'text-white/30' : 'text-slate-500'}`}>{item.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════
                  SECTION 2: INSTITUTE MANAGEMENT
              ══════════════════════════════════════════════════════════ */}
              {activeSection === 'institutes' && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Institute Management</h1>
                      <p className={`text-sm mt-0.5 ${isDark ? 'text-white/30' : 'text-slate-500'}`}>{institutes.length} registered institutes</p>
                    </div>
                    <button
                      onClick={() => setShowInstForm(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Create Institute
                    </button>
                  </div>

                  {/* Subscription tier cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(SUBSCRIPTION_CONFIG).map(([key, cfg]) => {
                      const count = institutes.filter(i => i.subscription === key).length;
                      return (
                        <div key={key} className={`p-4 rounded-xl border transition-all duration-300 ${
                          isDark 
                            ? `bg-[#0f0f23] ${cfg.border}` 
                            : 'bg-white border-slate-200/80 shadow-sm'
                        } group`}>
                          <div className="flex items-center gap-2 mb-2">
                            <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                          </div>
                          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{count}</div>
                          <div className={`text-xs mt-0.5 ${isDark ? 'text-white/25' : 'text-slate-400'}`}>institutes</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      placeholder="Search institutes by name or email…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className={`w-full pl-11 pr-4 py-3 border rounded-xl text-sm transition-colors focus:outline-none ${
                        isDark 
                          ? 'bg-[#0f0f23] border-white/[0.08] text-white placeholder-white/25 focus:border-violet-500/40' 
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-500/60'
                      }`}
                    />
                  </div>

                  {/* Create Institute Form */}
                  <AnimatePresence>
                    {showInstForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={`p-5 rounded-2xl border transition-all ${
                          isDark ? 'bg-[#0f0f23] border-violet-500/20' : 'bg-white border-violet-200 shadow-md'
                        }`}>
                          <h3 className={`font-semibold text-sm mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <Plus className="w-4 h-4 text-violet-500" />
                            New Institute
                          </h3>
                          <form onSubmit={handleCreateInstitute} className="grid grid-cols-2 gap-4">
                            {[
                              { key: 'name',          label: 'Institute Name *', placeholder: 'e.g. TechLearn Academy' },
                              { key: 'email',         label: 'Admin Email *',    placeholder: 'admin@institute.com' },
                              { key: 'contactPerson', label: 'Contact Person',   placeholder: 'Full name' },
                              { key: 'phone',         label: 'Phone',            placeholder: '+1 (555) 000-0000' },
                              { key: 'domain',        label: 'Domain',           placeholder: 'institute.com' }
                            ].map(f => (
                              <div key={f.key}>
                                <label className={`block text-xs mb-1.5 font-semibold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{f.label}</label>
                                <input
                                  type={f.key === 'email' ? 'email' : 'text'}
                                  placeholder={f.placeholder}
                                  value={(instForm as any)[f.key]}
                                  onChange={e => setInstForm(p => ({ ...p, [f.key]: e.target.value }))}
                                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-colors focus:outline-none ${
                                    isDark 
                                      ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/20 focus:border-violet-500/40' 
                                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-500/60'
                                  }`}
                                />
                              </div>
                            ))}
                            <div>
                              <label className={`block text-xs mb-1.5 font-semibold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Subscription Plan</label>
                              <select
                                value={instForm.subscription}
                                onChange={e => setInstForm(p => ({ ...p, subscription: e.target.value }))}
                                className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none appearance-none ${
                                  isDark 
                                    ? 'bg-white/[0.04] border-white/[0.08] text-white focus:border-violet-500/40' 
                                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500/60'
                                }`}
                              >
                                <option value="free_trial" className={isDark ? 'bg-[#0f0f23] text-white' : 'bg-white text-slate-900'}>Free Trial (14 days)</option>
                                <option value="starter" className={isDark ? 'bg-[#0f0f23] text-white' : 'bg-white text-slate-900'}>Starter</option>
                                <option value="growth" className={isDark ? 'bg-[#0f0f23] text-white' : 'bg-white text-slate-900'}>Growth</option>
                                <option value="enterprise" className={isDark ? 'bg-[#0f0f23] text-white' : 'bg-white text-slate-900'}>Enterprise</option>
                              </select>
                            </div>
                            <div className="col-span-2 flex gap-3 justify-end">
                              <button type="button" onClick={() => setShowInstForm(false)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.05]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                              }`}>
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={instSubmitting}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
                              >
                                {instSubmitting ? 'Creating…' : 'Create Institute'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Institutes — mobile cards */}
                  <div className="md:hidden space-y-3">
                    {filteredInstitutes.length === 0 ? (
                      <p className={`text-sm text-center py-8 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>No institutes found</p>
                    ) : filteredInstitutes.map((inst) => {
                      const planCfg = SUBSCRIPTION_CONFIG[inst.subscription];
                      return (
                        <MobileRecordCard
                          key={inst._id}
                          className={isDark ? 'bg-[#0f0f23] border-white/[0.06]' : ''}
                          title={inst.name}
                          subtitle={inst.email}
                          badges={
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${planCfg.color} ${planCfg.bg}`}>
                              {planCfg.label}
                            </span>
                          }
                          rows={[
                            { label: 'Status', value: inst.status },
                            { label: 'Students', value: inst.studentCount },
                            { label: 'Videos', value: inst.videoCount },
                            { label: 'YouTube', value: inst.youtubeStatus === 'connected' ? 'Connected' : 'Not connected' },
                            { label: 'Revenue', value: fmtRevenue(inst.totalRevenue) },
                          ]}
                          actions={
                            <>
                              <button type="button" className="min-h-11 flex-1 rounded-lg border px-3 text-xs font-medium" onClick={() => { setSelectedInstituteId(inst._id); setActiveSection('instituteDetail'); }}>
                                View
                              </button>
                              <button type="button" className="min-h-11 flex-1 rounded-lg border px-3 text-xs font-medium text-amber-600" onClick={() => handleSuspend(inst._id)}>
                                {inst.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                              </button>
                              <button type="button" className="min-h-11 rounded-lg border px-3 text-xs font-medium text-red-500" onClick={() => handleDelete(inst._id)}>
                                Delete
                              </button>
                            </>
                          }
                        />
                      );
                    })}
                  </div>

                  {/* Institutes Table — desktop */}
                  <div className={`hidden md:block border rounded-2xl overflow-hidden transition-all duration-300 ${
                    isDark ? 'bg-[#0f0f23] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-sm'
                  }`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-0">
                        <thead>
                          <tr className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100 bg-slate-50/50'}`}>
                            {['Institute', 'Plan', 'Status', 'Students', 'Videos', 'YouTube', 'Last Sync', 'Revenue', 'Actions'].map(h => (
                              <th key={h} className={`px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider ${
                                isDark ? 'text-white/25' : 'text-slate-400'
                              }`}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-white/[0.04]' : 'divide-slate-100'}`}>
                          {filteredInstitutes.length === 0 ? (
                            <tr>
                              <td colSpan={9} className={`px-5 py-10 text-center text-sm ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
                                No institutes found
                              </td>
                            </tr>
                          ) : filteredInstitutes.map(inst => {
                            const planCfg = SUBSCRIPTION_CONFIG[inst.subscription];
                            return (
                              <tr key={inst._id} className={`transition-colors group ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/50'}`}>
                                <td className="px-5 py-4">
                                  <div className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{inst.name}</div>
                                  <div className={`text-xs mt-0.5 ${isDark ? 'text-white/30' : 'text-slate-500'}`}>{inst.email}</div>
                                  {inst.contactPerson && <div className={`text-xs mt-0.5 ${isDark ? 'text-white/20' : 'text-slate-400'}`}>{inst.contactPerson}</div>}
                                </td>
                                <td className="px-5 py-4">
                                  <div className="relative group/plan">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${planCfg.color} ${planCfg.bg} border ${planCfg.border}`}>
                                      <planCfg.icon className="w-3 h-3" />
                                      {planCfg.label}
                                    </span>
                                    {/* Plan dropdown */}
                                    <div className={`absolute top-full left-0 mt-1 z-10 hidden group-hover/plan:block border rounded-xl overflow-hidden shadow-xl min-w-[160px] ${
                                      isDark ? 'bg-[#1a1a2e] border-white/[0.1]' : 'bg-white border-slate-200'
                                    }`}>
                                      {Object.entries(SUBSCRIPTION_CONFIG).map(([k, c]) => (
                                        <button
                                          key={k}
                                          onClick={() => handleUpdatePlan(inst._id, k)}
                                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                                            isDark 
                                              ? `hover:bg-white/[0.05] ${k === inst.subscription ? c.color : 'text-white/50'}` 
                                              : `hover:bg-slate-50 ${k === inst.subscription ? c.color : 'text-slate-600'}`
                                          }`}
                                        >
                                          <c.icon className="w-3 h-3" />
                                          {c.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    inst.status === 'active'
                                      ? 'text-emerald-500 bg-emerald-500/10'
                                      : 'text-red-500 bg-red-500/10'
                                  }`}>
                                    {inst.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                                    {inst.status === 'active' ? 'Active' : 'Suspended'}
                                  </span>
                                </td>
                                <td className={`px-5 py-4 text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>{inst.studentCount}</td>
                                <td className={`px-5 py-4 text-sm ${isDark ? 'text-white/60' : 'text-slate-600'}`}>{inst.videoCount}</td>
                                <td className={`px-5 py-4 text-xs ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                                  {inst.youtubeStatus === 'connected' ? `Connected (${inst.youtubeChannelName || 'Channel'})` : 'Not Connected'}
                                </td>
                                <td className={`px-5 py-4 text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                                  {inst.youtubeLastSync ? fmtDate(inst.youtubeLastSync) : 'N/A'}
                                </td>
                                <td className={`px-5 py-4 text-sm font-medium ${isDark ? 'text-white/60' : 'text-slate-700'}`}>{fmtRevenue(inst.totalRevenue)}</td>
                                <td className="px-5 py-4">
                                  <div className="flex flex-wrap items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleSuspend(inst._id)}
                                      title={inst.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        inst.status === 'suspended'
                                          ? 'text-emerald-500 hover:bg-emerald-500/10'
                                          : 'text-amber-500 hover:bg-amber-500/10'
                                      }`}
                                    >
                                      {inst.status === 'suspended' ? <Unlock className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                      onClick={() => handleDelete(inst._id)}
                                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'usage' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Institute Usage & Quotas</h1>
                      <p className={`text-sm mt-0.5 ${isDark ? 'text-white/30' : 'text-slate-500'}`}>Monitor usage, thresholds, and governance actions.</p>
                    </div>
                    <SectionBadge isDark={isDark}>Usage Center</SectionBadge>
                  </div>

                  <div className={`border rounded-2xl overflow-hidden ${isDark ? 'bg-[#0f0f23] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-sm'}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100 bg-slate-50/50'}`}>
                            {['Institute', 'Status', 'Plan', 'Students', 'Courses', 'Lessons', 'Videos', 'Materials', 'Storage', 'Last Activity', 'Actions'].map((h) => (
                              <th key={h} className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-white/25' : 'text-slate-400'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-white/[0.04]' : 'divide-slate-100'}`}>
                          {institutes.map((inst) => {
                            const q = inst.quotas || { maxStudents: 500, maxCourses: 50, maxVideos: 2000, maxStorageGB: 1000, maxStudyMaterials: 5000 };
                            const usagePct = {
                              students: Math.round(((inst.studentCount || 0) / Math.max(q.maxStudents, 1)) * 100),
                              courses: Math.round(((inst.courseCount || 0) / Math.max(q.maxCourses, 1)) * 100),
                              videos: Math.round(((inst.videoCount || 0) / Math.max(q.maxVideos, 1)) * 100),
                              materials: Math.round((((inst.materialCount || 0)) / Math.max(q.maxStudyMaterials, 1)) * 100),
                              storage: Math.round((((inst.storageUsedGB || 0)) / Math.max(q.maxStorageGB, 1)) * 100)
                            };
                            return (
                              <tr key={inst._id} className={isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/50'}>
                                <td className="px-4 py-3 font-medium">{inst.name}</td>
                                <td className="px-4 py-3">{inst.status}</td>
                                <td className="px-4 py-3">{inst.subscription}</td>
                                <td className="px-4 py-3">{inst.studentCount}/{q.maxStudents} ({usagePct.students}%)</td>
                                <td className="px-4 py-3">{inst.courseCount}/{q.maxCourses} ({usagePct.courses}%)</td>
                                <td className="px-4 py-3">{inst.lessonCount || 0}</td>
                                <td className="px-4 py-3">{inst.videoCount}/{q.maxVideos} ({usagePct.videos}%)</td>
                                <td className="px-4 py-3">{inst.materialCount || 0}/{q.maxStudyMaterials} ({usagePct.materials}%)</td>
                                <td className="px-4 py-3">{inst.storageUsedGB || 0}GB/{q.maxStorageGB}GB ({usagePct.storage}%)</td>
                                <td className="px-4 py-3 text-xs">{inst.lastActivityAt ? fmtDate(inst.lastActivityAt) : 'N/A'}</td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      className={`px-2 py-1 text-xs rounded border ${isDark ? 'border-white/[0.1] text-white/70' : 'border-slate-200 text-slate-600'}`}
                                      onClick={async () => {
                                        const maxStudents = prompt('Max students', String(q.maxStudents));
                                        const maxCourses = prompt('Max courses', String(q.maxCourses));
                                        const maxVideos = prompt('Max videos', String(q.maxVideos));
                                        const maxStorageGB = prompt('Max storage GB', String(q.maxStorageGB));
                                        const maxStudyMaterials = prompt('Max study materials', String(q.maxStudyMaterials));
                                        if (!maxStudents || !maxCourses || !maxVideos || !maxStorageGB || !maxStudyMaterials) return;
                                        await apiFetch(`/owner/institutes/${inst._id}/quotas`, {
                                          method: 'PUT',
                                          body: JSON.stringify({ maxStudents, maxCourses, maxVideos, maxStorageGB, maxStudyMaterials })
                                        });
                                        await loadInstitutes();
                                      }}
                                    >
                                      Update Quotas
                                    </button>
                                    <button
                                      className={`px-2 py-1 text-xs rounded border ${isDark ? 'border-white/[0.1] text-white/70' : 'border-slate-200 text-slate-600'}`}
                                      onClick={async () => {
                                        await apiFetch(`/owner/institutes/${inst._id}/reset-usage-warnings`, { method: 'POST' });
                                        alert('Usage warnings reset');
                                      }}
                                    >
                                      Reset Warnings
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════
                  SECTION 3: REVENUE
              ══════════════════════════════════════════════════════════ */}
              {activeSection === 'revenue' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-bold text-white">Revenue</h1>
                      <p className="text-sm text-white/30 mt-0.5">Financial overview across the platform</p>
                    </div>
                    <SectionBadge>Finance</SectionBadge>
                  </div>

                  {/* Revenue cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-900/40 to-indigo-900/20 border border-violet-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-semibold text-violet-400">Monthly Revenue</span>
                      </div>
                      <div className="text-3xl font-bold text-white">{fmtRevenue(revenue?.monthlyRevenue ?? 0)}</div>
                      <div className="text-xs text-white/30 mt-1">Current month</div>
                    </div>
                    <div className="p-5 rounded-2xl bg-[#0f0f23] border border-white/[0.06]">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-400">Subscription Revenue</span>
                      </div>
                      <div className="text-3xl font-bold text-white">{fmtRevenue(revenue?.subscriptionRevenue ?? 0)}</div>
                      <div className="text-xs text-white/30 mt-1">All time</div>
                    </div>
                    <div className="p-5 rounded-2xl bg-[#0f0f23] border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-400">Pending Payments</span>
                      </div>
                      <div className="text-3xl font-bold text-white">{revenue?.pendingPayments?.length ?? 0}</div>
                      <div className="text-xs text-white/30 mt-1">Awaiting approval</div>
                    </div>
                  </div>

                  {/* Revenue chart */}
                  <div className="bg-[#0f0f23] border border-white/[0.06] rounded-2xl p-5">
                    <h3 className="font-semibold text-white text-sm mb-4">6-Month Revenue Trend</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.revenueByMonth ?? []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                          <XAxis dataKey="month" stroke="#ffffff20" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#ffffff20" tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ background: '#0f0f23', border: '1px solid #ffffff15', borderRadius: 10, fontSize: 12 }}
                            labelStyle={{ color: '#ffffff80' }}
                          />
                          <Bar dataKey="revenue" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Revenue ($)" />
                          <Bar dataKey="subscriptions" fill="#6366f1" radius={[6, 6, 0, 0]} name="Subscriptions" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Pending Payments table */}
                  {revenue?.pendingPayments?.length > 0 && (
                    <div className="bg-[#0f0f23] border border-amber-500/20 rounded-2xl overflow-hidden">
                      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <h3 className="font-semibold text-white text-sm">Pending Payments</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/[0.04]">
                              {['Student', 'Amount', 'Date', 'Status'].map(h => (
                                <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-white/25 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {revenue.pendingPayments.map((p: any) => (
                              <tr key={p._id} className="hover:bg-white/[0.02]">
                                <td className="px-5 py-3.5">
                                  <div className="text-white/80 text-sm">{p.userId?.name ?? 'Unknown'}</div>
                                  <div className="text-white/30 text-xs">{p.userId?.email}</div>
                                </td>
                                <td className="px-5 py-3.5 font-semibold text-emerald-400">${p.amount}</td>
                                <td className="px-5 py-3.5 text-white/40 text-xs">{fmtDate(p.createdAt)}</td>
                                <td className="px-5 py-3.5">
                                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-amber-400 bg-amber-500/10">
                                    Pending
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════
                  SECTION 4: USER MANAGEMENT
              ══════════════════════════════════════════════════════════ */}
              {activeSection === 'users' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-bold text-white">User Management</h1>
                      <p className="text-sm text-white/30 mt-0.5">All platform users across institutes</p>
                    </div>
                  </div>

                  {/* Sub-tabs */}
                  <div className="flex gap-1 p-1 bg-[#0f0f23] border border-white/[0.06] rounded-xl w-fit">
                    {[
                      { id: '', label: 'All Users', icon: Users },
                      { id: 'student', label: 'Students', icon: Layers },
                      { id: 'admin', label: 'Admins', icon: Crown }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          activeSubTab === tab.id
                            ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                            : 'text-white/40 hover:text-white/70'
                        }`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or ID…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[#0f0f23] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/40 transition-colors"
                    />
                  </div>

                  {/* Users Table */}
                  <div className="bg-[#0f0f23] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                      <span className="text-xs text-white/30 font-medium">{filteredUsers.length} users</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.04]">
                            {['User', 'ID', 'Role', 'Status', 'Phone', 'Joined', 'Actions'].map(h => (
                              <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold text-white/25 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-5 py-10 text-center text-white/20 text-sm">
                                No users found
                              </td>
                            </tr>
                          ) : filteredUsers.map(u => (
                            <tr key={u._id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600/40 to-indigo-600/40 flex items-center justify-center text-xs font-bold text-violet-300 flex-shrink-0">
                                    {u.name?.[0]?.toUpperCase() ?? '?'}
                                  </div>
                                  <div>
                                    <div className="font-medium text-white/80 text-sm">{u.name}</div>
                                    <div className="text-xs text-white/30">{u.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-white/30 text-xs font-mono">{u.user_id}</td>
                              <td className="px-5 py-3.5">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  u.role === 'admin'
                                    ? 'text-amber-400 bg-amber-500/10'
                                    : 'text-sky-400 bg-sky-500/10'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  u.status === 'active'
                                    ? 'text-emerald-400 bg-emerald-500/10'
                                    : 'text-red-400 bg-red-500/10'
                                }`}>
                                  {u.status}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-white/40 text-xs">{u.phone || '—'}</td>
                              <td className="px-5 py-3.5 text-white/30 text-xs">{fmtDate(u.createdAt)}</td>
                              <td className="px-5 py-3.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {u.status === 'active' ? (
                                    <button
                                      className="px-2 py-1 text-[11px] rounded border border-red-500/30 text-red-400"
                                      onClick={async () => { await apiFetch(`/owner/users/${u._id}/disable`, { method: 'POST' }); await loadUsers(activeSubTab || ''); }}
                                    >
                                      Disable
                                    </button>
                                  ) : (
                                    <button
                                      className="px-2 py-1 text-[11px] rounded border border-emerald-500/30 text-emerald-400"
                                      onClick={async () => { await apiFetch(`/owner/users/${u._id}/enable`, { method: 'POST' }); await loadUsers(activeSubTab || ''); }}
                                    >
                                      Enable
                                    </button>
                                  )}
                                  <button
                                    className="px-2 py-1 text-[11px] rounded border border-white/[0.12] text-white/60"
                                    onClick={async () => { await apiFetch(`/owner/users/${u._id}/force-logout`, { method: 'POST' }); }}
                                  >
                                    Force Logout
                                  </button>
                                  <button
                                    className="px-2 py-1 text-[11px] rounded border border-white/[0.12] text-white/60"
                                    onClick={async () => { await apiFetch(`/owner/users/${u._id}/reset-sessions`, { method: 'POST' }); }}
                                  >
                                    Reset Sessions
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════
                  SECTION 5: STREAMING INFRASTRUCTURE
              ══════════════════════════════════════════════════════════ */}
              {activeSection === 'streaming' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-bold text-white">Streaming Infrastructure</h1>
                      <p className="text-sm text-white/30 mt-0.5">Video delivery & processing status</p>
                    </div>
                    <SectionBadge>Infrastructure</SectionBadge>
                  </div>

                  {/* Provider Cards */}
                  <div>
                    <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Video Providers</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {streaming ? Object.entries(streaming.providers).map(([key, p]) => (
                        <div key={key} className={`p-4 rounded-2xl border transition-all ${
                          p.status === 'active'
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-[#0f0f23] border-white/[0.06]'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              p.status === 'active' ? 'bg-emerald-500/20' : 'bg-white/[0.05]'
                            }`}>
                              <Radio className={`w-4 h-4 ${p.status === 'active' ? 'text-emerald-400' : 'text-white/20'}`} />
                            </div>
                            <div className={`w-2 h-2 rounded-full ${p.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-white/10'}`} />
                          </div>
                          <div className="font-semibold text-white/80 text-sm">{p.label}</div>
                          <div className={`text-xs mt-0.5 font-medium ${p.status === 'active' ? 'text-emerald-400' : 'text-white/20'}`}>
                            {p.status === 'active' ? `${p.videos} videos` : 'Inactive'}
                          </div>
                        </div>
                      )) : [1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 rounded-2xl bg-white/[0.03] animate-pulse" />
                      ))}
                    </div>
                  </div>

                  {/* Monitor */}
                  <div>
                    <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Monitor</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {streaming && [
                        { label: 'Total Uploads',     value: streaming.queue.total,      icon: Database,    color: 'text-violet-400', bg: 'bg-violet-500/10' },
                        { label: 'Processing Queue',  value: streaming.queue.processing,  icon: RefreshCw,   color: 'text-sky-400',    bg: 'bg-sky-500/10'    },
                        { label: 'Uploading',          value: streaming.queue.uploading,  icon: ArrowUpRight, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                        { label: 'Completed',          value: streaming.queue.completed,  icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                        { label: 'Failed Jobs',        value: streaming.queue.failed,     icon: AlertTriangle, color: 'text-red-400',  bg: 'bg-red-500/10' },
                        { label: 'Bandwidth Used',     value: `${streaming.bandwidth.used} / ${streaming.bandwidth.total} ${streaming.bandwidth.unit}`, icon: Wifi, color: 'text-cyan-400', bg: 'bg-cyan-500/10' }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-[#0f0f23] border border-white/[0.06]">
                          <div className={`p-3 rounded-xl ${item.bg}`}>
                            <item.icon className={`w-4 h-4 ${item.color}`} />
                          </div>
                          <div>
                            <div className="text-xl font-bold text-white">{item.value}</div>
                            <div className="text-xs text-white/30">{item.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bandwidth bar */}
                  {streaming && (
                    <div className="p-5 rounded-2xl bg-[#0f0f23] border border-white/[0.06]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-white">Bandwidth Usage</span>
                        <span className="text-xs text-white/30">{streaming.bandwidth.used} / {streaming.bandwidth.total} {streaming.bandwidth.unit}</span>
                      </div>
                      <div className="w-full h-3 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(streaming.bandwidth.used / streaming.bandwidth.total) * 100}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            streaming.bandwidth.used / streaming.bandwidth.total > 0.8
                              ? 'bg-gradient-to-r from-orange-500 to-red-500'
                              : 'bg-gradient-to-r from-violet-600 to-indigo-500'
                          }`}
                        />
                      </div>
                      <div className="text-xs text-white/25 mt-2">{Math.round((streaming.bandwidth.used / streaming.bandwidth.total) * 100)}% utilized</div>
                    </div>
                  )}

                  {/* Recent jobs */}
                  {streaming?.recentJobs && streaming.recentJobs.length > 0 && (
                    <div className="bg-[#0f0f23] border border-white/[0.06] rounded-2xl overflow-hidden">
                      <div className="px-5 py-4 border-b border-white/[0.06]">
                        <h3 className="text-sm font-semibold text-white">Recent Upload Jobs</h3>
                      </div>
                      <div className="divide-y divide-white/[0.04]">
                        {streaming.recentJobs.map((job: any) => (
                          <div key={job._id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02]">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              job.status === 'completed' ? 'bg-emerald-500' :
                              job.status === 'processing' ? 'bg-sky-500 animate-pulse' :
                              job.status === 'failed' ? 'bg-red-500' : 'bg-white/20'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white/70 truncate">{job.title || job.filename || 'Untitled'}</div>
                              <div className="text-xs text-white/25 mt-0.5">{fmtRelative(job.createdAt)}</div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                              job.status === 'completed' ? 'text-emerald-400 bg-emerald-500/10' :
                              job.status === 'processing' ? 'text-sky-400 bg-sky-500/10' :
                              job.status === 'failed' ? 'text-red-400 bg-red-500/10' :
                              'text-white/30 bg-white/[0.05]'
                            }`}>
                              {job.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'backups' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-bold text-white">Backup & Recovery</h1>
                      <p className="text-sm text-white/30 mt-0.5">Backup coverage, restore points, and integrity checks.</p>
                    </div>
                    <div className="flex gap-2">
                      {['database', 'study_materials', 'course_metadata', 'video_metadata', 'audit_logs'].map((type) => (
                        <button
                          key={type}
                          className="px-3 py-1.5 text-xs rounded-lg border border-white/[0.12] text-white/60 hover:text-white"
                          onClick={async () => { await apiFetch('/owner/backups/run', { method: 'POST', body: JSON.stringify({ type }) }); await loadBackups(); }}
                        >
                          Run {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {backups?.services?.map((service) => (
                      <div key={service.type} className="p-4 rounded-2xl border border-white/[0.08] bg-[#0f0f23]">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-white">{service.type}</h3>
                          <span className="text-xs text-white/40">{service.backupStatus}</span>
                        </div>
                        <div className="mt-3 text-xs text-white/35 space-y-1">
                          <div>Last backup: {service.lastBackupTime ? fmtDate(service.lastBackupTime) : 'Never'}</div>
                          <div>Size: {(service.backupSizeBytes / (1024 * 1024)).toFixed(2)} MB</div>
                          <div>Health: {service.backupHealth}</div>
                          <div>Integrity: {service.integrityVerified ? 'Verified' : 'Not verified'}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#0f0f23] border border-white/[0.06] rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Restore Points</h3>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto">
                      {(backups?.restorePoints || []).map((rp) => (
                        <div key={rp.id} className="text-xs text-white/60 border border-white/[0.06] rounded-lg px-3 py-2 flex items-center justify-between">
                          <span>{rp.restorePointLabel}</span>
                          <span>{rp.backupAgeHours}h ago</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'health' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-bold text-white">Platform Health</h1>
                      <p className="text-sm text-white/30 mt-0.5">Service availability and system health telemetry.</p>
                    </div>
                    <button className="px-3 py-1.5 text-xs rounded-lg border border-white/[0.12] text-white/70" onClick={loadHealth}>Refresh</button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {(health?.services || []).map((service) => (
                      <div key={service.service} className="p-4 rounded-2xl border border-white/[0.08] bg-[#0f0f23]">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-white capitalize">{service.service.replace('_', ' ')}</h3>
                          <span className={`text-xs ${service.status === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}`}>{service.status}</span>
                        </div>
                        <div className="mt-2 text-xs text-white/35 space-y-1">
                          <div>Response: {service.responseTimeMs} ms</div>
                          <div>Errors: {service.errorCount}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {health?.systemHealth && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <StatCard icon={Cpu} label="CPU" value={`${health.systemHealth.cpuUsagePct}%`} color="from-violet-600/5 to-transparent" isDark />
                      <StatCard icon={Server} label="Memory" value={`${health.systemHealth.memoryUsagePct}%`} color="from-sky-600/5 to-transparent" isDark />
                      <StatCard icon={HardDrive} label="Disk" value={`${health.systemHealth.diskUsagePct}%`} color="from-amber-600/5 to-transparent" isDark />
                      <StatCard icon={Radio} label="Bandwidth" value={`${health.systemHealth.bandwidthUsageGB} GB`} color="from-emerald-600/5 to-transparent" isDark />
                      <StatCard icon={Activity} label="Queue" value={`${health.systemHealth.queueStatus.processing}/${health.systemHealth.queueStatus.total}`} color="from-pink-600/5 to-transparent" isDark />
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'instituteDetail' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-bold text-white">Institute Detail</h1>
                      <p className="text-sm text-white/30 mt-0.5">Deep profile, stats, and recent activity for one institute.</p>
                    </div>
                    <select
                      value={selectedInstituteId}
                      onChange={(e) => setSelectedInstituteId(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-[#0f0f23] border border-white/[0.08] text-sm text-white"
                    >
                      <option value="">Select institute</option>
                      {institutes.map((i) => <option key={i._id} value={i._id}>{i.name}</option>)}
                    </select>
                  </div>

                  {instituteDetails && (
                    <>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon={Users} label="Students" value={instituteDetails.stats.students} color="from-sky-600/5 to-transparent" isDark />
                        <StatCard icon={Layers} label="Courses" value={instituteDetails.stats.courses} color="from-indigo-600/5 to-transparent" isDark />
                        <StatCard icon={Video} label="Lessons" value={instituteDetails.stats.lessons} color="from-fuchsia-600/5 to-transparent" isDark />
                        <StatCard icon={Radio} label="Videos" value={instituteDetails.stats.videos} color="from-cyan-600/5 to-transparent" isDark />
                        <StatCard icon={FileText} label="Materials" value={instituteDetails.stats.materials} color="from-amber-600/5 to-transparent" isDark />
                        <StatCard icon={Clock} label="Watch Hours" value={instituteDetails.stats.watchHours} color="from-lime-600/5 to-transparent" isDark />
                        <StatCard icon={Activity} label="Active Sessions" value={instituteDetails.stats.activeSessions} color="from-pink-600/5 to-transparent" isDark />
                      </div>
                      <div className="bg-[#0f0f23] border border-white/[0.06] rounded-2xl p-4">
                        <h3 className="text-sm font-semibold text-white mb-3">Recent Activity</h3>
                        <div className="text-xs text-white/45">Uploads: {instituteDetails.recentActivity.uploads.length} | Logins: {instituteDetails.recentActivity.logins.length} | Security: {instituteDetails.recentActivity.securityEvents.length} | Announcements: {instituteDetails.recentActivity.announcements.length}</div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════
                  SECTION 6: SECURITY CENTER
              ══════════════════════════════════════════════════════════ */}
              {activeSection === 'security' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-bold text-white">Security Center</h1>
                      <p className="text-sm text-white/30 mt-0.5">Threat detection & access audit logs</p>
                    </div>
                    <SectionBadge>Security</SectionBadge>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {security && Object.entries(EVENT_CONFIG).map(([key, cfg]) => {
                      const count = security.summary[key] ?? 0;
                      return (
                        <button
                          key={key}
                          onClick={() => setSecurityFilter(securityFilter === key ? 'all' : key)}
                          className={`p-4 rounded-2xl border text-left transition-all ${
                            securityFilter === key
                              ? `${cfg.bg} border-current`
                              : 'bg-[#0f0f23] border-white/[0.06] hover:border-white/[0.1]'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                          </div>
                          <div className="text-2xl font-bold text-white">{count}</div>
                          <div className="text-[10px] text-white/25 mt-0.5">events logged</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-white/30 font-medium">Filter:</span>
                    {[
                      { id: 'all', label: 'All Logs' },
                      { id: 'screenshot', label: 'Screenshots' },
                      { id: 'multiple_login', label: 'Multi-Login' },
                      { id: 'suspicious_ip', label: 'Suspicious IP' },
                      { id: 'devtools_open', label: 'DevTools' },
                      { id: 'screen_recording', label: 'Recording' },
                      { id: 'playback_anomaly', label: 'Anomaly' },
                      { id: 'user_report', label: 'User Reports' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSecurityFilter(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          securityFilter === f.id
                            ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                            : 'text-white/30 hover:text-white/60 bg-white/[0.04] border border-transparent'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Logs */}
                  <div className="bg-[#0f0f23] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Event Logs</span>
                      <span className="text-xs text-white/25">{security?.logs?.length ?? 0} entries</span>
                    </div>
                    <div className="divide-y divide-white/[0.04] max-h-[480px] overflow-y-auto">
                      {(!security || security.logs.length === 0) ? (
                        <div className="px-5 py-12 text-center">
                          <ShieldAlert className="w-8 h-8 text-white/10 mx-auto mb-2" />
                          <div className="text-sm text-white/20">No security events found</div>
                        </div>
                      ) : security.logs.map(log => {
                        const cfg = EVENT_CONFIG[log.eventType] ?? { label: log.eventType, color: 'text-white/40', bg: 'bg-white/[0.05]', icon: AlertCircle };
                        return (
                          <div key={log._id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-start gap-4">
                              <div className={`p-2 rounded-xl ${cfg.bg} flex-shrink-0 mt-0.5`}>
                                <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                                  {log.userId && (
                                    <span className="text-xs text-white/50">
                                      {log.userId.name}
                                      <span className="text-white/25"> · #{log.userId.user_id}</span>
                                    </span>
                                  )}
                                  <span className="text-xs text-white/20 ml-auto">{fmtRelative(log.createdAt)}</span>
                                </div>
                                {log.details && renderDetails(log.details, log.eventType)}
                                <div className="flex items-center gap-4 mt-2 flex-wrap">
                                  {log.ipAddress && (
                                    <span className="flex items-center gap-1 text-[10px] text-white/25 font-mono">
                                      <Globe className="w-3 h-3" />
                                      {log.ipAddress}
                                    </span>
                                  )}
                                  {log.deviceFingerprint && (
                                    <span className="flex items-center gap-1 text-[10px] text-white/20 font-mono truncate max-w-xs">
                                      <Smartphone className="w-3 h-3" />
                                      {log.deviceFingerprint.slice(0, 20)}…
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Violations section */}
                  <div>
                    <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Violation Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        {
                          title: 'Account Sharing',
                          desc: 'Multiple logins detected',
                          count: security?.summary?.multiple_login ?? 0,
                          icon: UserX,
                          color: 'text-rose-400',
                          bg: 'bg-rose-500/10',
                          border: 'border-rose-500/20'
                        },
                        {
                          title: 'Multiple Logins',
                          desc: 'Concurrent session violations',
                          count: security?.summary?.suspicious_ip ?? 0,
                          icon: Monitor,
                          color: 'text-orange-400',
                          bg: 'bg-orange-500/10',
                          border: 'border-orange-500/20'
                        },
                        {
                          title: 'Suspicious Devices',
                          desc: 'Anomalous device fingerprints',
                          count: (security?.summary?.devtools_open ?? 0) + (security?.summary?.screen_recording ?? 0),
                          icon: Smartphone,
                          color: 'text-purple-400',
                          bg: 'bg-purple-500/10',
                          border: 'border-purple-500/20'
                        }
                      ].map((v, i) => (
                        <div key={i} className={`p-5 rounded-2xl border ${v.bg} ${v.border}`}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2.5 rounded-xl ${v.bg}`}>
                              <v.icon className={`w-4 h-4 ${v.color}`} />
                            </div>
                            <div>
                              <div className={`text-sm font-semibold ${v.color}`}>{v.title}</div>
                              <div className="text-xs text-white/25">{v.desc}</div>
                            </div>
                          </div>
                          <div className="text-3xl font-bold text-white">{v.count}</div>
                          <div className="text-xs text-white/25 mt-1">total violations</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0f0f23] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Owner Audit Log</span>
                      <span className="text-xs text-white/25">{ownerActions.length} actions</span>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto divide-y divide-white/[0.04]">
                      {ownerActions.length === 0 ? (
                        <div className="px-5 py-8 text-xs text-white/25">No owner actions recorded yet</div>
                      ) : ownerActions.map((log) => (
                        <div key={log._id} className="px-5 py-3 text-xs">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-white/80 font-medium">{log.action}</span>
                            <span className="text-white/25">{fmtRelative(log.createdAt)}</span>
                          </div>
                          <div className="text-white/35 mt-1">
                            owner: {log.ownerId?.email || 'N/A'} | target user: {log.targetUser?.email || 'N/A'} | target institute: {log.targetInstitute?.name || 'N/A'}
                          </div>
                          <div className="text-white/25 mt-1 font-mono">{log.ipAddress || 'N/A'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
