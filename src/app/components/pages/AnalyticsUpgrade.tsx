import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  Users, 
  Folder, 
  BookOpen, 
  Clock, 
  FileText, 
  AlertTriangle, 
  Award, 
  Calendar, 
  Activity, 
  TrendingUp, 
  Search, 
  Info,
  Download,
  Book,
  Loader2,
  GraduationCap,
  Video,
  Layers,
  Eye,
  Play,
  CheckCircle,
  RefreshCw,
  BarChart3
} from 'lucide-react';

// ── Animated Counter ─────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 800, suffix = '', decimals = 0 }: { value: number; duration?: number; suffix?: string; decimals?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(progress * value);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(value);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <>{count.toFixed(decimals)}{suffix}</>;
}

// ── Skeleton Loader ──────────────────────────────────────────────────
function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="animate-pulse space-y-3" style={{ height }}>
      <div className="flex items-end gap-2 h-full px-4 pb-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div 
            key={i} 
            className="flex-1 bg-gradient-to-t from-slate-200/80 to-slate-100/40 dark:from-slate-800/60 dark:to-slate-800/20 rounded-t-md" 
            style={{ height: `${20 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Premium Card Wrapper ─────────────────────────────────────────────
const DashCard = ({ children, className = '', ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div 
    className={`bg-white dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/60 rounded-[20px] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default function AnalyticsUpgrade() {
  const [range, setRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const cachedUser = useMemo(() => {
    const cached = localStorage.getItem('user');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch (_) {
      return null;
    }
  }, []);

  const instituteId = cachedUser?.institute?._id || cachedUser?.institute || '';

  const { data: analytics = null, isLoading: isAnalyticsLoading, error: queryError, refetch } = useQuery({
    queryKey: ['analytics', range, customStart, customEnd, instituteId],
    queryFn: async () => {
      let url = `/analytics/overview?range=${range}`;
      if (range === 'custom' && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }
      const response = await apiFetch(url);
      if (response && !response.data) {
        response.data = response;
      }
      return response.data;
    },
    enabled: (range !== 'custom' || (!!customStart && !!customEnd)) && !!instituteId
  });

  const loading = isAnalyticsLoading && !analytics;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (queryError) {
      setError((queryError as any).message || 'Unable to load analytics data. Please refresh or contact support.');
    } else {
      setError(null);
    }
  }, [queryError]);

  const load = () => {
    refetch();
  };

  useEffect(() => {
    console.log("Analytics State:", analytics);
  }, [analytics]);

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      load();
    }
  };

  function formatRelativeTime(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // Chart colors
  const PROGRESS_COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
  const CHART_VIOLET = '#8B5CF6';
  const CHART_INDIGO = '#6366F1';
  const CHART_CYAN = '#06B6D4';
  const CHART_PINK = '#EC4899';
  const CHART_EMERALD = '#10B981';

  // Tooltip style
  const tooltipStyle = {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    fontSize: 11,
    color: '#1e293b',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)',
    padding: '10px 14px'
  };

  const severityBadge = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 border border-red-200/60 dark:border-red-500/20">🔴 Critical</span>;
      case 'Warning':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20">🟠 Warning</span>;
      case 'Low':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20">🟡 Low</span>;
      default:
        return null;
    }
  };

  const isDataEmpty = !analytics || (
    (analytics?.metrics?.totalStudents || 0) === 0 && 
    (analytics?.engagementTrend || []).length === 0 &&
    (analytics?.recentActivity || []).length === 0
  );

  // Activity icon selector
  const getActivityIcon = (action: string) => {
    if (action === 'watched' || action === 'viewed') return { icon: Play, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-500/15' };
    if (action === 'downloaded') return { icon: Download, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-500/15' };
    if (action === 'completed') return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-500/15' };
    return { icon: Eye, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-500/15' };
  };

  // Range label for display
  const rangeLabel = range === 'today' ? 'Today' : range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : range === '90d' ? 'Last 90 Days' : 'Custom Range';

  return (
    <div className="space-y-6 pb-12 min-h-screen">
      
      {/* ══════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════ */}
      <DashCard className="!rounded-[24px] !shadow-lg">
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Trineo Stream Analytics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Institute Learning Intelligence Dashboard · {rangeLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['today', '7d', '30d', '90d', 'custom'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`h-9 px-4 rounded-xl text-xs font-semibold border transition-all duration-200 capitalize cursor-pointer ${
                  range === r 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 border-transparent text-white shadow-md shadow-violet-500/20' 
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : r}
              </button>
            ))}

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              title="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </DashCard>

      {/* Custom Range Inputs */}
      {range === 'custom' && (
        <form onSubmit={handleApplyCustomRange} className="flex flex-wrap items-end gap-3">
          <DashCard className="!rounded-2xl flex-1 min-w-fit">
            <div className="p-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  required
                  className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  required
                  className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                />
              </div>
              <button
                type="submit"
                className="h-9 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl px-5 text-xs font-semibold shadow-md shadow-violet-500/15 border-none transition-all cursor-pointer"
              >
                Apply Filter
              </button>
            </div>
          </DashCard>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════
          LOADING SKELETONS / ERROR BOUNDARY / CONTENT
      ══════════════════════════════════════════════════════ */}
      {loading ? (
        <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* KPI Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <DashCard key={i}>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800" />
                  </div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-24" />
                </div>
              </DashCard>
            ))}
          </div>
          {/* Chart Skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[...Array(4)].map((_, i) => (
              <DashCard key={i}>
                <div className="p-6 space-y-4">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-40" />
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-56" />
                  <ChartSkeleton />
                </div>
              </DashCard>
            ))}
          </div>
        </motion.div>

      ) : error ? (
        /* ══════════════════════════════════════════════════════
            ERROR STATE (Dedicated Dashboard Error Boundary)
        ══════════════════════════════════════════════════════ */
        <DashCard className="!rounded-[24px] border-rose-200 dark:border-rose-950/60 shadow-lg">
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center mb-6">
              <AlertTriangle className="w-9 h-9 text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Unable to load analytics data</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
              {error}
            </p>
            <button
              onClick={load}
              className="h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl px-6 text-xs font-semibold shadow-md shadow-violet-500/15 transition-all cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Please Refresh
            </button>
          </div>
        </DashCard>

      ) : isDataEmpty ? (
        /* ══════════════════════════════════════════════════════
            EMPTY STATE
        ══════════════════════════════════════════════════════ */
        <DashCard className="!rounded-[24px]">
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-950/40 dark:to-indigo-950/30 flex items-center justify-center mb-6">
              <Search className="w-9 h-9 text-violet-500/60" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No learning activity yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Student analytics will automatically appear once learners begin watching videos, accessing study materials, and progressing through topics.
            </p>
          </div>
        </DashCard>
      ) : (
        /* ══════════════════════════════════════════════════════
            DASHBOARD CONTENT
        ══════════════════════════════════════════════════════ */
        <motion.div 
          className="space-y-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          
          {/* ── KPI Cards ─────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              {
                label: 'Total Students',
                value: analytics?.metrics?.totalStudents || 0,
                icon: Users,
                iconBg: 'bg-violet-100 dark:bg-violet-500/12',
                iconColor: 'text-violet-600 dark:text-violet-400',
                sub: 'Registered in institute',
                accent: null
              },
              {
                label: 'Active Students',
                value: analytics?.metrics?.activeStudents || 0,
                icon: Activity,
                iconBg: 'bg-emerald-100 dark:bg-emerald-500/12',
                iconColor: 'text-emerald-600 dark:text-emerald-400',
                sub: null,
                accent: { value: analytics?.metrics?.activeRate || 0, suffix: '% active', color: 'text-emerald-600 dark:text-emerald-400' }
              },
              {
                label: 'Total Batches',
                value: analytics?.metrics?.totalBatches || 0,
                icon: Folder,
                iconBg: 'bg-blue-100 dark:bg-blue-500/12',
                iconColor: 'text-blue-600 dark:text-blue-400',
                sub: 'Published batches',
                accent: null
              },
              {
                label: 'Total Subjects',
                value: analytics?.metrics?.totalSubjects || 0,
                icon: Book,
                iconBg: 'bg-indigo-100 dark:bg-indigo-500/12',
                iconColor: 'text-indigo-600 dark:text-indigo-400',
                sub: 'Course subjects',
                accent: null
              },
              {
                label: 'Total Topics',
                value: analytics?.metrics?.totalTopics || 0,
                icon: Video,
                iconBg: 'bg-amber-100 dark:bg-amber-500/12',
                iconColor: 'text-amber-600 dark:text-amber-400',
                sub: 'Published topics',
                accent: null
              },
              {
                label: 'Watch Hours',
                value: analytics?.metrics?.totalWatchHours || 0,
                icon: Clock,
                iconBg: 'bg-rose-100 dark:bg-rose-500/12',
                iconColor: 'text-rose-600 dark:text-rose-400',
                sub: 'Total watch time',
                accent: null,
                decimals: 1,
                suffix: 'h'
              }
            ].map((kpi, idx) => (
              <motion.div 
                key={kpi.label} 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.3) }}
              >
                <DashCard className="h-full hover:-translate-y-0.5">
                  <div className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">{kpi.label}</span>
                      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${kpi.iconBg} flex items-center justify-center shrink-0`}>
                        <kpi.icon className={`w-4 h-4 ${kpi.iconColor}`} />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        <AnimatedCounter value={kpi.value} decimals={kpi.decimals || 0} suffix={kpi.suffix || ''} />
                      </div>
                      {kpi.accent ? (
                        <div className={`inline-flex items-center gap-1 text-[10px] font-bold ${kpi.accent.color} mt-1.5`}>
                          <TrendingUp className="w-3 h-3" />
                          <AnimatedCounter value={kpi.accent.value} decimals={1} suffix={kpi.accent.suffix} />
                        </div>
                      ) : kpi.sub ? (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">{kpi.sub}</div>
                      ) : null}
                    </div>
                  </div>
                </DashCard>
              </motion.div>
            ))}
          </div>

          {/* ── Section 1 & 2: Engagement + Progress ───── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Engagement Trend (wider) */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <DashCard>
                <div className="p-5 sm:p-6 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-violet-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Student Engagement Trend</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Daily student activity across the platform</p>
                </div>
                <div className="px-2 sm:px-4 pb-5">
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics?.engagementTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="loginLine" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_VIOLET} stopOpacity={0.3}/>
                            <stop offset="100%" stopColor={CHART_VIOLET} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" strokeOpacity={0.5} vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" style={{ fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#64748b', fontWeight: 'bold', fontSize: 10 }} />
                        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} iconType="circle" iconSize={6} />
                        <Line type="monotone" dataKey="logins" name="Daily Logins" stroke={CHART_VIOLET} strokeWidth={2.5} activeDot={{ r: 5, strokeWidth: 2 }} dot={false} />
                        <Line type="monotone" dataKey="views" name="Video Views" stroke={CHART_CYAN} strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="downloads" name="Downloads" stroke={CHART_PINK} strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </DashCard>
            </motion.div>

            {/* Progress Distribution (narrower) */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <DashCard className="h-full">
                <div className="p-5 sm:p-6 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Progress Distribution</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Student syllabus completion breakdown</p>
                </div>
                <div className="px-6 pb-5 flex flex-col items-center gap-4">
                  <div className="h-[200px] w-full flex items-center justify-center">
                    <div className="h-[200px] w-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics?.progressDistribution || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {(analytics?.progressDistribution || []).map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={PROGRESS_COLORS[index % PROGRESS_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="w-full space-y-2">
                    {(analytics?.progressDistribution || []).map((item: any, idx: number) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PROGRESS_COLORS[idx] }} />
                          <span className="text-slate-600 dark:text-slate-400 font-medium">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </DashCard>
            </motion.div>
          </div>

          {/* ── Section 3 & 4: Batch + Subject Performance ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Batch Performance */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <DashCard>
                <div className="p-5 sm:p-6 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Folder className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Batch Performance</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Watch time and completion rates by learning batch</p>
                </div>
                <div className="px-2 sm:px-4 pb-5">
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics?.batchPerformance || []} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="batchGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" horizontal={false} strokeOpacity={0.5} />
                        <XAxis type="number" stroke="#94a3b8" style={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" style={{ fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" iconSize={6} />
                        <Bar dataKey="completion" name="Completion %" fill="url(#batchGrad)" radius={[0, 6, 6, 0]} />
                        <Bar dataKey="watchHours" name="Watch Hours" fill={CHART_INDIGO} radius={[0, 6, 6, 0]} opacity={0.7} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </DashCard>
            </motion.div>

            {/* Subject Engagement */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              <DashCard>
                <div className="p-5 sm:p-6 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Book className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Performing Subjects</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Views and completion rate per subject</p>
                </div>
                <div className="px-2 sm:px-4 pb-5">
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics?.subjectPerformance || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="subjectGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1d4ed8" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" strokeOpacity={0.5} vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: 9, fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" style={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" iconSize={6} />
                        <Bar dataKey="views" name="Topic Views" fill="url(#subjectGrad)" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="completion" name="Completion %" fill={CHART_EMERALD} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </DashCard>
            </motion.div>
          </div>

          {/* ── Section 5 & 6: Top Topics + Watch Growth ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Most Watched Topics - Leaderboard Cards */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <DashCard>
                <div className="p-5 sm:p-6 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Most Watched Topics</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Top 10 topics by student views</p>
                </div>
                <div className="px-5 sm:px-6 pb-5 max-h-[340px] overflow-y-auto space-y-2">
                  {(analytics?.topTopics || []).length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">No topic data available yet.</div>
                  ) : (
                    (analytics?.topTopics || []).map((topic: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                          idx < 3 
                            ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm' 
                            : 'bg-slate-200/80 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{topic.name}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">{topic.views}</div>
                          <div className="text-[9px] text-slate-400">views</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DashCard>
            </motion.div>

            {/* Watch Time Growth */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.35 }}
            >
              <DashCard>
                <div className="p-5 sm:p-6 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-rose-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Watch Time Growth</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Cumulative watch hours over the selected period</p>
                </div>
                <div className="px-2 sm:px-4 pb-5">
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics?.watchTimeGrowth || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="watchFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_VIOLET} stopOpacity={0.15}/>
                            <stop offset="95%" stopColor={CHART_VIOLET} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" strokeOpacity={0.5} vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" style={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area type="monotone" dataKey="hours" name="Cumulative Hours" stroke={CHART_VIOLET} strokeWidth={2.5} fillOpacity={1} fill="url(#watchFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </DashCard>
            </motion.div>
          </div>

          {/* ── Section 7: Students Needing Attention ──── */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <DashCard>
              <div className="p-5 sm:p-6 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Students Needing Attention</h3>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">No login in 14+ days or progress below 20%</p>
                  </div>
                  {(analytics?.needyStudents || []).length > 0 && (
                    <Badge variant="secondary" className="text-[10px] rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-none font-bold">
                      {(analytics?.needyStudents || []).length} students
                    </Badge>
                  )}
                </div>
              </div>
              <div className="px-5 sm:px-6 pb-5">
                {(analytics?.needyStudents || []).length === 0 ? (
                  <div className="text-center py-10 flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">All students are actively learning and progressing.</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto max-h-[380px] border border-slate-200/70 dark:border-slate-800/60 rounded-2xl">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900/80 sticky top-0 z-10">
                        <TableRow className="border-slate-200/60 dark:border-slate-800/50">
                          <TableHead className="text-[10px] uppercase font-black tracking-wider text-slate-400">Student</TableHead>
                          <TableHead className="text-[10px] uppercase font-black tracking-wider text-slate-400">Batch</TableHead>
                          <TableHead className="text-[10px] uppercase font-black tracking-wider text-slate-400">Progress</TableHead>
                          <TableHead className="text-[10px] uppercase font-black tracking-wider text-slate-400">Last Active</TableHead>
                          <TableHead className="text-[10px] uppercase font-black tracking-wider text-slate-400">Severity</TableHead>
                          <TableHead className="text-[10px] uppercase font-black tracking-wider text-slate-400">Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(analytics?.needyStudents || []).map((student: any, idx: number) => (
                          <TableRow key={idx} className="border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-8 w-8 border border-slate-200/50 dark:border-slate-700/50">
                                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                                  <AvatarFallback className="text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">{student.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="text-xs font-semibold text-slate-900 dark:text-white">{student.name}</div>
                                  <div className="text-[10px] text-slate-400">{student.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px] rounded-md font-medium bg-slate-100 dark:bg-slate-800 border-none">{student.batch}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={student.progress} className="h-1.5 w-16" />
                                <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">{student.progress}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 dark:text-slate-400 font-medium">{formatRelativeTime(student.lastActive)}</TableCell>
                            <TableCell>{severityBadge(student.severity)}</TableCell>
                            <TableCell className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[150px] truncate">{student.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </DashCard>
          </motion.div>

          {/* ── Section 8 & 9: Leaderboard + Resources ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Student Leaderboard */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.45 }}
            >
              <DashCard>
                <div className="p-5 sm:p-6 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-violet-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Student Leaderboard</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Most engaged students by watch hours</p>
                </div>
                <div className="px-5 sm:px-6 pb-5">
                  {(analytics?.leaderboard || []).length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">No student progress recorded yet.</div>
                  ) : (
                    <div className="space-y-2 max-h-[380px] overflow-y-auto">
                      {(analytics?.leaderboard || []).map((student: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            idx === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm' :
                            idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-sm' :
                            idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-sm' :
                            'bg-slate-200/80 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
                          }`}>
                            {idx + 1}
                          </div>
                          <Avatar className="h-8 w-8 border border-slate-200/50 dark:border-slate-700/50 shrink-0">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                            <AvatarFallback className="text-[10px] font-bold">{student.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{student.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{student.batch}</div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{student.progress}%</div>
                              <div className="text-[9px] text-slate-400">progress</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">{student.watchHours}h</div>
                              <div className="text-[9px] text-slate-400">watched</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DashCard>
            </motion.div>

            {/* Resource Analytics */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <DashCard>
                <div className="p-5 sm:p-6 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-cyan-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Resource Analytics</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">PDF downloads, notes views, and assignment activity</p>
                </div>
                <div className="px-2 sm:px-4 pb-5">
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics?.resourceAnalytics || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" strokeOpacity={0.5} vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" style={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" name="Count" radius={[8, 8, 0, 0]}>
                          {(analytics?.resourceAnalytics || []).map((_: any, index: number) => {
                            const colors = [CHART_VIOLET, CHART_CYAN, CHART_PINK];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </DashCard>
            </motion.div>
          </div>

          {/* ── Section 10: Recent Activity Feed ──────── */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.55 }}
          >
            <DashCard>
              <div className="p-5 sm:p-6 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-violet-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Learning Activity</h3>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Live chronological record of student learning actions</p>
              </div>
              <div className="px-5 sm:px-6 pb-5">
                {(analytics?.recentActivity || []).length === 0 ? (
                  <div className="text-center py-10 flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-400">No recent activity logged.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {(analytics?.recentActivity || []).map((activity: any) => {
                      const { icon: Icon, color, bg } = getActivityIcon(activity.action);
                      return (
                        <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                          <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                            <Icon className={`w-3.5 h-3.5 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-baseline gap-1 text-sm">
                              <span className="font-bold text-slate-900 dark:text-white">{activity.studentName}</span>
                              <span className="text-slate-500 dark:text-slate-400">{activity.action}</span>
                            </div>
                            <div className="text-xs font-semibold text-violet-600 dark:text-violet-400 truncate mt-0.5">{activity.target}</div>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tabular-nums shrink-0 mt-1">
                            {formatRelativeTime(activity.timestamp)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </DashCard>
          </motion.div>

        </motion.div>
      )}
    </div>
  );
}
