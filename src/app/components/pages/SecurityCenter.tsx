import { useEffect, useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Ban, 
  LogOut, 
  RefreshCw, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Download, 
  Tv, 
  Smartphone, 
  Laptop, 
  Globe, 
  Calendar, 
  User, 
  Clock, 
  Activity, 
  Search, 
  Filter, 
  CheckCircle2, 
  Eye, 
  UserMinus, 
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ResponsiveDataView, MobileRecordCard } from '../responsive/ResponsiveDataView';
import { Input } from '../ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '../ui/dialog';
import { toast } from 'sonner';

export default function SecurityCenter() {
  const [overview, setOverview] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('all');
  
  // Session filter state (default to active only)
  const [sessionFilter, setSessionFilter] = useState<'active' | 'suspended' | 'violations' | 'all'>('active');

  // Pagination states
  const [alertsPage, setAlertsPage] = useState(1);
  const [alertsPerPage, setAlertsPerPage] = useState(10);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsPerPage, setSessionsPerPage] = useState(10);

  // Selected student for detail modal
  const [selectedStudentStats, setSelectedStudentStats] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailedState, setDetailedState] = useState<any>(null);

  const loadData = async () => {
    try {
      const [o, s, e] = await Promise.all([
        apiFetch('/security-center/overview'),
        apiFetch('/security-center/sessions'),
        apiFetch('/security-center/events')
      ]);
      setOverview(o.cards);
      setSessions(s);
      setEvents(e);
    } catch (err: any) {
      toast.error('Failed to load security center data: ' + err.message);
    }
  };

  useEffect(() => { loadData(); }, []);

  const terminateSession = async (id: string) => {
    try {
      await apiFetch(`/security-center/sessions/${id}/terminate`, { method: 'POST' });
      toast.success('Session terminated successfully');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to terminate session');
    }
  };

  const studentAction = async (studentId: string, action: 'disable' | 'enable' | 'resetSessions' | 'suspend' | 'unlock') => {
    try {
      await apiFetch('/security-center/student-action', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action }) 
      });
      toast.success(`Security action '${action}' applied successfully`);
      loadData();
      if (selectedStudentStats && selectedStudentStats.student._id === studentId) {
        setIsModalOpen(false);
        setSelectedStudentStats(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply security action');
    }
  };

  const ignoreAlert = async (eventId: string) => {
    try {
      await apiFetch(`/security-center/events/${eventId}/ignore`, { method: 'POST' });
      toast.success('Alert ignored');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to ignore alert');
    }
  };

  const resolveAlert = async (eventId: string) => {
    try {
      await apiFetch(`/security-center/events/${eventId}/resolve`, { method: 'POST' });
      toast.success('Alert resolved');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve alert');
    }
  };

  // Compute student stats & safety scores (0-100) dynamically
  const studentStats = useMemo(() => {
    const statsMap: Record<string, any> = {};

    events.forEach(event => {
      const student = event.studentId;
      if (!student) return;

      const sId = student._id;
      if (!statsMap[sId]) {
        statsMap[sId] = {
          student,
          screenshot: 0,
          screen_recording: 0,
          concurrent: 0,
          account_sharing: 0,
          download_attempt: 0,
          unauthorized: 0,
          totalViolations: 0,
          events: []
        };
      }

      statsMap[sId].events.push(event);
      statsMap[sId].totalViolations += 1;

      if (event.eventType === 'screenshot') statsMap[sId].screenshot += 1;
      else if (event.eventType === 'screen_recording') statsMap[sId].screen_recording += 1;
      else if (event.eventType === 'concurrent_session_violation' || event.eventType === 'multiple_device_login') statsMap[sId].concurrent += 1;
      else if (event.eventType === 'account_sharing') statsMap[sId].account_sharing += 1;
      else if (event.eventType === 'download_attempt') statsMap[sId].download_attempt += 1;
      else if (event.eventType === 'unauthorized_content_access' || event.eventType === 'session_hijack') statsMap[sId].unauthorized += 1;
    });

    const list = Object.values(statsMap).map(item => {
      // Suggested Formula:
      // Screenshot Attempt: -5
      // Recording Detection: -20
      // Concurrent Login: -10
      // Account Sharing: -25
      // Unauthorized Access: -15
      // Clamp: 0 <= score <= 100
      const score = Math.max(
        0, 
        100 - (item.screenshot * 5) 
            - (item.screen_recording * 20) 
            - (item.concurrent * 10) 
            - (item.account_sharing * 25)
            - (item.unauthorized * 15)
      );
      return {
        ...item,
        score
      };
    });

    return list.sort((a, b) => a.score - b.score); // Worst score first (violators)
  }, [events]);

  const topViolators = useMemo(() => {
    return studentStats.filter(s => s.totalViolations > 0).slice(0, 5);
  }, [studentStats]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesSearch = searchQuery === '' || 
        (e.studentId?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.studentId?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.eventType || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.ipAddress || '').includes(searchQuery);

      const matchesType = selectedEventType === 'all' || e.eventType === selectedEventType;

      return matchesSearch && matchesType;
    });
  }, [events, searchQuery, selectedEventType]);

  // Filtered active sessions table
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const stats = studentStats.find(s => s.student._id === session.userId?._id);
      const isSuspended = session.userId?.status === 'inactive';
      const hasViolations = stats && stats.totalViolations > 0;

      if (sessionFilter === 'active') {
        return session.status === 'active';
      }
      if (sessionFilter === 'suspended') {
        return isSuspended;
      }
      if (sessionFilter === 'violations') {
        return hasViolations;
      }
      return true; // 'all'
    });
  }, [sessions, sessionFilter, studentStats]);

  // Pagination helper calculations and side effects
  const totalAlertsPages = Math.max(1, Math.ceil(filteredEvents.length / alertsPerPage));
  const paginatedEvents = useMemo(() => {
    return filteredEvents.slice((alertsPage - 1) * alertsPerPage, alertsPage * alertsPerPage);
  }, [filteredEvents, alertsPage, alertsPerPage]);

  const totalSessionsPages = Math.max(1, Math.ceil(filteredSessions.length / sessionsPerPage));
  const paginatedSessions = useMemo(() => {
    return filteredSessions.slice((sessionsPage - 1) * sessionsPerPage, sessionsPage * sessionsPerPage);
  }, [filteredSessions, sessionsPage, sessionsPerPage]);

  useEffect(() => {
    setAlertsPage(1);
  }, [searchQuery, selectedEventType]);

  useEffect(() => {
    setSessionsPage(1);
  }, [sessionFilter]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5';
    if (score >= 60) return 'text-amber-500 border-amber-500/20 bg-amber-500/5';
    return 'text-rose-500 border-rose-500/20 bg-rose-500/5';
  };

  const getScoreProgressColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/10">Secure ({score}%)</Badge>;
    if (score >= 60) return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 hover:bg-amber-500/10">Warning ({score}%)</Badge>;
    return <Badge className="bg-rose-500/10 text-rose-700 border-rose-500/20 hover:bg-rose-500/10 font-semibold animate-pulse">High Risk ({score}%)</Badge>;
  };

  const handleStudentClick = async (studentId: string) => {
    const stats = studentStats.find(s => s.student._id === studentId);
    if (stats) {
      setSelectedStudentStats(stats);
      setIsModalOpen(true);
      setDetailedState(null);
      try {
        const detail = await apiFetch(`/security-center/student/${studentId}/state`);
        setDetailedState(detail);
      } catch (err: any) {
        toast.error('Failed to load student security state: ' + err.message);
      }
    }
  };

  const overviewCards = [
    { label: 'Active Sessions', value: overview?.activeSessions || 0, icon: <Activity className="w-5 h-5 text-indigo-500" />, desc: 'Realtime sessions' },
    { label: 'Active Devices', value: overview?.activeDevices || 0, icon: <Laptop className="w-5 h-5 text-indigo-500" />, desc: 'Unique endpoints' },
    { label: 'Screenshot Attempts', value: overview?.screenshotAttempts || 0, icon: <Smartphone className="w-5 h-5 text-rose-500" />, desc: 'Screen snip block logs' },
    { label: 'Recording Attempts', value: overview?.recordingAttempts || 0, icon: <Tv className="w-5 h-5 text-rose-500" />, desc: 'Display sharing blocks' },
    { label: 'Concurrent Logins', value: overview?.concurrentAttempts || 0, icon: <RefreshCw className="w-5 h-5 text-amber-500" />, desc: 'Replaced session counts' },
    { label: 'Account Sharing Alerts', value: overview?.accountSharingAlerts || 0, icon: <ShieldAlert className="w-5 h-5 text-amber-500" />, desc: 'Flagged sharing events' },
    { label: 'Download Attempts', value: overview?.downloadAttempts || 0, icon: <Download className="w-5 h-5 text-emerald-500" />, desc: 'Notes/PDF downloads' },
    { label: 'Piracy Events', value: overview?.piracyEvents || 0, icon: <ShieldAlert className="w-5 h-5 text-rose-500" />, desc: 'Critical security triggers' }
  ];

  return (
    <div className="space-y-6 min-w-0">
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card) => (
          <Card key={card.label} className="border-border/50 bg-card hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{card.label}</p>
                <h3 className="text-2xl font-bold tracking-tight">{card.value}</h3>
                <p className="text-[10px] text-muted-foreground/80">{card.desc}</p>
              </div>
              <div className="p-3 bg-muted rounded-xl group-hover:scale-110 transition-transform">
                {card.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Hand side: Security Alerts */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  LMS Security Alerts
                </CardTitle>
                <CardDescription>Real-time piracy and access anomalies logged by our DRM engines.</CardDescription>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    className="pl-9 h-9 text-xs" 
                    placeholder="Search by student, IP..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <select
                  className="flex h-9 w-[150px] rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none"
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                >
                  <option value="all">All Alerts</option>
                  <option value="screenshot">Screenshots</option>
                  <option value="screen_recording">Screen Recording</option>
                  <option value="concurrent_session_violation">Concurrent Logins</option>
                  <option value="account_sharing">Account Sharing</option>
                  <option value="download_attempt">Downloads</option>
                </select>
              </div>
            </CardHeader>
            
            <CardContent>
              <ResponsiveDataView
                desktop={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Structural Context</TableHead>
                        <TableHead>Device/Browser</TableHead>
                        <TableHead>Alert Type</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                            No security alerts logged. Keep up the high standard of safety!
                          </TableCell>
                        </TableRow>
                      ) : paginatedEvents.map((event) => (
                        <TableRow key={event._id} className="hover:bg-muted/40 transition-colors">
                          <TableCell>
                            <div className="font-semibold text-sm cursor-pointer hover:underline text-primary" onClick={() => handleStudentClick(event.studentId?._id)}>
                              {event.studentId?.name || 'System / Unknown'}
                            </div>
                            <div className="text-xs text-muted-foreground">{event.studentId?.email || 'N/A'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-[11px] font-semibold truncate max-w-[150px]" title={event.batchName || event.batchId?.title}>
                              Batch: {event.batchName || event.batchId?.title || 'N/A'}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={`${event.subjectName || 'N/A'} / ${event.topicTitle || 'N/A'}`}>
                              {event.subjectName || event.subjectId?.subjectName || 'General'} · {event.topicTitle || event.topicId?.title || 'System'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs flex items-center gap-1">
                              {event.device.includes('Windows') || event.device.includes('Mac') ? <Laptop className="w-3.5 h-3.5 text-muted-foreground" /> : <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />}
                              {event.device}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{event.browser} (IP: {event.ipAddress})</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              <Badge variant="outline" className="capitalize text-[10px] bg-muted/60">
                                {event.eventType?.replace(/_/g, ' ')}
                              </Badge>
                              <Badge variant="outline" className={`text-[9px] uppercase ${
                                event.riskLevel === 'critical' ? 'border-rose-400 text-rose-500 bg-rose-500/5 font-semibold' :
                                event.riskLevel === 'high' ? 'border-amber-400 text-amber-500 bg-amber-500/5' :
                                event.riskLevel === 'medium' ? 'border-indigo-400 text-indigo-500 bg-indigo-500/5' :
                                'border-slate-400 text-slate-500 bg-slate-500/5'
                              }`}>
                                {event.riskLevel || 'low'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(event.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] uppercase ${
                              event.status === 'ignored' ? 'border-amber-400/40 text-amber-500 bg-amber-500/5' : 
                              event.status === 'resolved' ? 'border-emerald-400/40 text-emerald-500 bg-emerald-500/5' : 
                              'border-rose-400/40 text-rose-500 bg-rose-500/5 animate-pulse'
                            }`}>
                              {event.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {event.status === 'active_alert' && (
                                <>
                                  <Button size="sm" variant="outline" className="min-h-10 text-[11px] px-2 py-1" onClick={() => resolveAlert(event._id)}>Resolve</Button>
                                  <Button size="sm" variant="outline" className="min-h-10 text-[11px] px-2 py-1 border-amber-300 text-amber-600 hover:bg-amber-500/5" onClick={() => ignoreAlert(event._id)}>Ignore</Button>
                                </>
                              )}
                              <Button size="sm" variant="outline" className="min-h-10 text-[11px] px-2 py-1" onClick={() => handleStudentClick(event.studentId?._id)}><Eye className="w-3.5 h-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                }
                mobile={paginatedEvents.map((event) => (
                  <MobileRecordCard
                    key={event._id}
                    title={event.studentId?.name || 'System / Unknown'}
                    subtitle={event.studentId?.email}
                    badges={
                      <Badge variant="outline" className={`text-[10px] uppercase ${
                        event.status === 'ignored' ? 'border-amber-400/40 text-amber-500 bg-amber-500/5' : 
                        event.status === 'resolved' ? 'border-emerald-400/40 text-emerald-500 bg-emerald-500/5' : 
                        'border-rose-400/40 text-rose-500 bg-rose-500/5'
                      }`}>
                        {event.status}
                      </Badge>
                    }
                    rows={[
                      { label: 'Context', value: `${event.batchName || 'LMS'} · ${event.topicTitle || 'General'}` },
                      { label: 'Alert', value: `${event.eventType?.replace(/_/g, ' ')} (${event.riskLevel})` },
                      { label: 'Device', value: `${event.device} (${event.browser})` },
                      { label: 'IP', value: event.ipAddress || '127.0.0.1' },
                      { label: 'Time', value: new Date(event.createdAt).toLocaleString() }
                    ]}
                    actions={
                      <>
                        {event.status === 'active_alert' && (
                           <>
                             <Button size="sm" variant="outline" className="flex-1 min-h-11" onClick={() => resolveAlert(event._id)}>Resolve</Button>
                             <Button size="sm" variant="outline" className="flex-1 min-h-11 text-amber-600 border-amber-300" onClick={() => ignoreAlert(event._id)}>Ignore</Button>
                           </>
                        )}
                        <Button size="sm" variant="outline" className="min-h-11 px-3" onClick={() => handleStudentClick(event.studentId?._id)}>Details</Button>
                      </>
                    }
                  />
                ))}
              />

              {/* Alerts Pagination Controls */}
              {filteredEvents.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
                  <div className="text-xs text-muted-foreground">
                    Showing {(alertsPage - 1) * alertsPerPage + 1} to {Math.min(alertsPage * alertsPerPage, filteredEvents.length)} of {filteredEvents.length} alerts
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Rows per page</span>
                      <select
                        className="flex h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none"
                        value={alertsPerPage}
                        onChange={(e) => { setAlertsPerPage(Number(e.target.value)); setAlertsPage(1); }}
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
                        disabled={alertsPage <= 1}
                        onClick={() => setAlertsPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="w-8 h-8 flex items-center justify-center border border-border rounded-md bg-card text-xs font-semibold">
                        {alertsPage}
                      </div>
                      <span className="text-xs text-muted-foreground">of {totalAlertsPages}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 p-0"
                        disabled={alertsPage >= totalAlertsPages}
                        onClick={() => setAlertsPage((p) => Math.min(totalAlertsPages, p + 1))}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Sessions - Hidden terminated rows by default via sessionFilter */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-indigo-500" />
                  Active Sessions Directory
                </CardTitle>
                <CardDescription>Monitor and revoke student portal connections.</CardDescription>
              </div>

              {/* Sessions Table Filter Menu */}
              <div className="flex items-center gap-4 flex-wrap text-xs bg-muted/40 p-2 px-3.5 rounded-xl border border-border/40">
                <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">Filter:</span>
                {[
                  { value: 'active', label: 'Active Only' },
                  { value: 'suspended', label: 'Suspended' },
                  { value: 'violations', label: 'Violations' },
                  { value: 'all', label: 'All Sessions' }
                ].map((btn) => (
                  <label key={btn.value} className="flex items-center gap-1.5 cursor-pointer select-none font-medium text-foreground hover:text-primary transition-colors">
                    <input
                      type="checkbox"
                      className="rounded border-input text-primary focus:ring-primary h-4.5 w-4.5 accent-primary"
                      checked={sessionFilter === btn.value}
                      onChange={() => setSessionFilter(btn.value as any)}
                    />
                    <span className="text-[11px]">{btn.label}</span>
                  </label>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveDataView
                desktop={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Browser</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Last Seen</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSessions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                            No student sessions match the selected filter.
                          </TableCell>
                        </TableRow>
                      ) : paginatedSessions.map((session) => (
                        <TableRow key={session._id}>
                          <TableCell>
                            <div className="font-semibold text-sm cursor-pointer hover:underline" onClick={() => handleStudentClick(session.userId?._id)}>
                              {session.userId?.name || 'Unknown'}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{session.userId?.email || 'N/A'}</div>
                          </TableCell>
                          <TableCell className="text-xs">{session.device}</TableCell>
                          <TableCell className="text-xs">{session.browser}</TableCell>
                          <TableCell className="text-xs font-mono">{session.ipAddress || 'N/A'}</TableCell>
                          <TableCell className="text-xs">
                            {new Date(session.lastSeenAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={session.status === 'active' ? 'outline' : 'secondary'} className="text-[10px]">
                              {session.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1.5">
                              {session.status === 'active' && (
                                <Button size="sm" variant="outline" className="min-h-10 text-[11px]" onClick={() => terminateSession(session._id)}>
                                  <LogOut className="w-3.5 h-3.5 mr-1" /> Terminate
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="min-h-10 text-[11px]" onClick={() => handleStudentClick(session.userId?._id)}>Details</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                }
                mobile={paginatedSessions.map((session) => (
                  <MobileRecordCard
                    key={session._id}
                    title={session.userId?.name || 'Unknown'}
                    badges={<Badge variant={session.status === 'active' ? 'outline' : 'secondary'}>{session.status}</Badge>}
                    rows={[
                      { label: 'Device', value: `${session.device} (${session.browser})` },
                      { label: 'IP', value: session.ipAddress || 'N/A' },
                      { label: 'Last Active', value: new Date(session.lastSeenAt).toLocaleString() }
                    ]}
                    actions={
                      <>
                        {session.status === 'active' && (
                          <Button size="sm" variant="outline" className="flex-1 min-h-11 text-rose-500 border-rose-200" onClick={() => terminateSession(session._id)}>Terminate</Button>
                        )}
                        <Button size="sm" variant="outline" className="flex-1 min-h-11" onClick={() => handleStudentClick(session.userId?._id)}>Details</Button>
                      </>
                    }
                  />
                ))}
              />

              {/* Sessions Pagination Controls */}
              {filteredSessions.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
                  <div className="text-xs text-muted-foreground">
                    Showing {(sessionsPage - 1) * sessionsPerPage + 1} to {Math.min(sessionsPage * sessionsPerPage, filteredSessions.length)} of {filteredSessions.length} sessions
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Rows per page</span>
                      <select
                        className="flex h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none"
                        value={sessionsPerPage}
                        onChange={(e) => { setSessionsPerPage(Number(e.target.value)); setSessionsPage(1); }}
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
                        disabled={sessionsPage <= 1}
                        onClick={() => setSessionsPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="w-8 h-8 flex items-center justify-center border border-border rounded-md bg-card text-xs font-semibold">
                        {sessionsPage}
                      </div>
                      <span className="text-xs text-muted-foreground">of {totalSessionsPages}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 p-0"
                        disabled={sessionsPage >= totalSessionsPages}
                        onClick={() => setSessionsPage((p) => Math.min(totalSessionsPages, p + 1))}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Watchlist + Recent Incidents */}
        <div className="space-y-6">
          {/* Recent Incidents Feed (institute admins look here first) */}
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-500 animate-pulse" />
                Recent Incidents Feed
              </CardTitle>
              <CardDescription>Real-time security events logged across the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {events.slice(0, 10).map((evt) => {
                const timeString = new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateString = new Date(evt.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' });
                
                const emojiMap: Record<string, string> = {
                  screenshot: '📸',
                  screen_recording: '🎥',
                  concurrent_session_violation: '🔑',
                  multiple_device_login: '🔑',
                  account_sharing: '🤝',
                  download_attempt: '📥',
                  session_hijack: '🚨',
                  unauthorized_content_access: '🔒'
                };
                
                const typeLabelMap: Record<string, string> = {
                  screenshot: 'Screenshot Attempt',
                  screen_recording: 'Screen Recording Detected',
                  concurrent_session_violation: 'Concurrent Login',
                  multiple_device_login: 'Concurrent Login',
                  account_sharing: 'Account Sharing Flagged',
                  download_attempt: 'Protected File Download',
                  session_hijack: 'Session Hijack Blocked',
                  unauthorized_content_access: 'Unauthorized Content Attempt'
                };
                
                const emoji = emojiMap[evt.eventType] || '⚠️';
                const label = typeLabelMap[evt.eventType] || evt.eventType;
                
                return (
                  <div key={evt._id} className="flex items-start gap-3 text-xs border-b pb-2 last:border-0 last:pb-0">
                    <div className="text-[10px] text-muted-foreground shrink-0 text-right min-w-[55px]">
                      <div>{timeString}</div>
                      <div className="text-[8px]">{dateString}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-primary cursor-pointer hover:underline" onClick={() => handleStudentClick(evt.studentId?._id)}>
                        {evt.studentId?.name || 'System / Guest'}
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span>{emoji}</span>
                        <span className="font-medium text-foreground">{label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {events.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No recent incidents logged.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Profile Watchlist */}
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Risk Profile Watchlist
              </CardTitle>
              <CardDescription>LMS students sorted by lowest security safety score.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topViolators.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No violators flagged. All accounts secure.
                </div>
              ) : topViolators.map((v) => (
                <div 
                  key={v.student._id} 
                  className="p-3 border border-border/60 hover:border-primary/20 bg-muted/30 rounded-xl flex items-center justify-between gap-3 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => handleStudentClick(v.student._id)}
                >
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm group-hover:text-primary truncate">{v.student.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{v.student.email}</p>
                    <div className="mt-1.5 flex gap-1 flex-wrap">
                      <Badge variant="outline" className="text-[9px] bg-card px-1.5 py-0">
                        {v.totalViolations} Alerts
                      </Badge>
                      {v.screenshot > 0 && <Badge variant="outline" className="text-[9px] border-rose-300 text-rose-600 bg-rose-500/5 px-1 py-0">Screenshot</Badge>}
                      {v.screen_recording > 0 && <Badge variant="outline" className="text-[9px] border-rose-300 text-rose-600 bg-rose-500/5 px-1 py-0">Recording</Badge>}
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border text-center font-bold text-sm min-w-[55px] ${getScoreColor(v.score)}`}>
                    <div className="text-[9px] text-muted-foreground font-normal">Score</div>
                    {v.score}%
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Student Security Profile Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) { setIsModalOpen(false); setSelectedStudentStats(null); } }}>
        <DialogContent className="max-w-2xl bg-card border-border shadow-xl rounded-2xl">
          {selectedStudentStats && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xl uppercase">
                    {selectedStudentStats.student.name[0]}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold">{selectedStudentStats.student.name}</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">{selectedStudentStats.student.email}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {/* Score and Stats Column */}
                <div className="space-y-4">
                  <div className={`p-4 border rounded-2xl text-center space-y-2 ${getScoreColor(selectedStudentStats.score)}`}>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wide">Safety Rating</span>
                    <div className="text-4xl font-extrabold">{selectedStudentStats.score}%</div>
                    {getScoreBadge(selectedStudentStats.score)}
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div className={`h-2 rounded-full ${getScoreProgressColor(selectedStudentStats.score)}`} style={{ width: `${selectedStudentStats.score}%` }} />
                    </div>
                  </div>

                  <Card className="border-border/60 bg-muted/20">
                    <CardContent className="p-3 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <span className="text-muted-foreground font-semibold">User ID:</span>
                        <span className="font-semibold">{selectedStudentStats.student.user_id || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <span className="text-muted-foreground font-semibold">Status:</span>
                        <Badge variant="outline" className={selectedStudentStats.student.status === 'active' ? 'border-green-400 text-green-600 bg-green-500/5' : 'border-rose-400 text-rose-600 bg-rose-500/5'}>
                          {selectedStudentStats.student.status === 'active' ? 'Active' : 'Suspended'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <span className="text-muted-foreground font-semibold">Batch Name:</span>
                        <span className="font-semibold">{detailedState?.student?.batchName || selectedStudentStats.student.branchName || 'Not Enrolled'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-semibold">Joined Date:</span>
                        <span className="font-semibold">
                          {selectedStudentStats.student.enrollmentDate ? new Date(selectedStudentStats.student.enrollmentDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {detailedState?.securityState && (
                    <Card className="border-border/60 bg-muted/20 mt-4">
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Student Security Center</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-1 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <span className="text-muted-foreground font-semibold">Violation Count:</span>
                          <span className="font-bold text-rose-500">{detailedState.securityState.violationCount} / 4</span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <span className="text-muted-foreground font-semibold">Security Status:</span>
                          <Badge variant="outline" className={detailedState.securityState.accountLocked ? 'border-rose-400 text-rose-600 bg-rose-500/5 animate-pulse font-semibold' : 'border-green-400 text-green-600 bg-green-500/5'}>
                            {detailedState.securityState.accountLocked ? 'Locked' : 'Active'}
                          </Badge>
                        </div>
                        {detailedState.securityState.accountLocked && detailedState.securityState.lockedAt && (
                          <div className="flex flex-col gap-1 border-b pb-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground font-semibold">Locked At:</span>
                              <span className="font-semibold">
                                {new Date(detailedState.securityState.lockedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground font-semibold">Locked By:</span>
                              <span className="font-semibold">{detailedState.securityState.lockedBy || 'system'}</span>
                            </div>
                          </div>
                        )}
                        {detailedState.securityState.lastUnlockAt && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground font-semibold">Last Unlocked At:</span>
                              <span className="font-semibold">
                                {new Date(detailedState.securityState.lastUnlockAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground font-semibold">Last Unlocked By:</span>
                              <span className="font-semibold">{detailedState.securityState.lastUnlockedBy || 'admin'}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Timeline and History Column */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="font-bold text-sm flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                    <Clock className="w-4 h-4" />
                    Security Incident Timeline
                  </h3>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {selectedStudentStats.events.map((evt: any) => {
                      const dateFormatted = new Date(evt.createdAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      // Determine timeline event label
                      let eventLabel = evt.eventType?.replace(/_/g, ' ');
                      if (evt.eventType === 'screenshot') {
                        eventLabel = `Screenshot Attempt #${evt.attemptNumber || 1}`;
                      } else if (evt.eventType === 'screen_recording') {
                        eventLabel = `Screen Recording Attempt #${evt.attemptNumber || 1}`;
                      }

                      let actionLabel = '';
                      if (evt.actionTaken === 'session_terminated') {
                        actionLabel = 'Session Terminated';
                      } else if (evt.actionTaken === 'student_suspended') {
                        actionLabel = 'Account Locked';
                      } else if (evt.actionTaken === 'warning_shown') {
                        // 1st warning is Warning Issued, 2nd is 60 Second Lock
                        actionLabel = evt.attemptNumber === 2 ? '60 Second Lock' : 'Warning Issued';
                      }

                      return (
                        <div key={evt._id} className="p-3 border border-border/50 rounded-xl bg-card space-y-1.5 hover:bg-muted/10 transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs capitalize text-rose-600 dark:text-rose-400 bg-rose-500/5 px-2.5 py-0.5 rounded-full border border-rose-500/10">
                              {eventLabel}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {dateFormatted}
                            </span>
                          </div>
                          
                          {actionLabel && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 w-fit">
                              Action: {actionLabel}
                            </div>
                          )}

                          <p className="text-[11px] text-muted-foreground/85 leading-relaxed italic">{evt.details || `Logged by system on IP: ${evt.ipAddress}`}</p>
                          
                          {(evt.batchName || evt.topicTitle) && (
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/5 p-1 rounded border border-indigo-500/10 mt-1">
                              Snapshot: {evt.batchName || 'LMS'} &gt; {evt.topicTitle || 'General'}
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1 text-[9px] text-muted-foreground/60 font-medium">
                            <span>IP: {evt.ipAddress}</span>
                            <span>·</span>
                            <span>Device: {evt.device} / {evt.browser}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t flex flex-wrap gap-2 justify-end">
                    {(selectedStudentStats.student.status !== 'active' || detailedState?.securityState?.accountLocked) ? (
                      <Button size="sm" className="min-h-11 bg-green-600 hover:bg-green-700 text-white" onClick={() => studentAction(selectedStudentStats.student._id, 'unlock')}>
                        <UserCheck className="w-4 h-4 mr-1.5" /> Unlock Student
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" className="min-h-11" onClick={() => studentAction(selectedStudentStats.student._id, 'suspend')}>
                        <UserMinus className="w-4 h-4 mr-1.5" /> Suspend Student
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="min-h-11" onClick={() => studentAction(selectedStudentStats.student._id, 'resetSessions')}>
                      <RefreshCw className="w-4 h-4 mr-1.5" /> Force Logout All Devices
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
