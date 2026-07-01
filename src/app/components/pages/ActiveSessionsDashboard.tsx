import React, { useState, useMemo } from 'react';
import { 
  Laptop, Smartphone, Globe, Search, Filter, ShieldAlert, Ban, 
  Copy, Check, AlertTriangle, ArrowRight, Eye, Shield, Users, 
  Activity, RefreshCw, Trash2, Calendar
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { apiFetch } from '../../utils/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SessionDetailDrawer from './SessionDetailDrawer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

export default function ActiveSessionsDashboard() {
  const queryClient = useQueryClient();
  
  // Table search & filter states
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [appType, setAppType] = useState('all');
  const [onlineStatus, setOnlineStatus] = useState('all');
  const [timeRange, setTimeRange] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Drawer states
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Block Dialog state
  const [blockingSession, setBlockingSession] = useState<any>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockType, setBlockType] = useState<'temporary' | 'permanent'>('permanent');
  const [blockedUntil, setBlockedUntil] = useState('24h');
  
  // Copy state helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch active sessions with query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (search) params.set('search', search);
    if (platform !== 'all') params.set('platform', platform);
    if (appType !== 'all') params.set('appType', appType);
    if (onlineStatus === 'online') params.set('online', 'true');
    if (onlineStatus === 'offline') params.set('online', 'false');
    if (timeRange !== 'all') params.set('timeRange', timeRange);
    return params.toString();
  }, [page, limit, search, platform, appType, onlineStatus, timeRange]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['security-center', 'sessions-dashboard', queryParams],
    queryFn: () => apiFetch(`/security-center/sessions?${queryParams}`),
  });

  // Fetch blocked devices for the metrics summary
  const { data: blockedDevices = [], refetch: refetchBlocked } = useQuery({
    queryKey: ['security-center', 'blocked-devices'],
    queryFn: () => apiFetch('/security-center/devices/blocked'),
  });

  const sessions = data?.sessions || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 10, pages: 1 };

  const stats = useMemo(() => {
    return {
      totalActive: pagination.total || 0,
      online: sessions.filter((s: any) => s.isOnline).length,
      android: sessions.filter((s: any) => s.appType === 'Android App').length,
      blocked: blockedDevices.length
    };
  }, [sessions, pagination.total, blockedDevices]);

  const handleCopyFingerprint = (fingerprint: string, id: string) => {
    if (!fingerprint) return;
    navigator.clipboard.writeText(fingerprint);
    setCopiedId(id);
    toast.success('Fingerprint copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to terminate this session?')) return;
    try {
      await apiFetch(`/security-center/sessions/${sessionId}/terminate`, { method: 'POST' });
      toast.success('Session terminated successfully');
      refetch();
    } catch (err: any) {
      toast.error('Failed to terminate session: ' + err.message);
    }
  };

  const handleBlockDevice = async () => {
    if (!blockingSession) return;
    try {
      let expiryDate = null;
      if (blockType === 'temporary') {
        const hours = blockedUntil === '24h' ? 24 : blockedUntil === '48h' ? 48 : 168; // 1 week fallback
        expiryDate = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }
      
      await apiFetch('/security-center/devices/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceFingerprint: blockingSession.deviceFingerprint,
          userId: blockingSession.userId?._id,
          deviceName: blockingSession.device || 'Unrecognized Device',
          nickname: blockingSession.nickname || '',
          reason: blockReason || 'Manual Administrator Block',
          blockType,
          blockedUntil: expiryDate
        })
      });
      
      toast.success('Device fingerprint blocked and session revoked');
      setBlockingSession(null);
      setBlockReason('');
      refetch();
      refetchBlocked();
    } catch (err: any) {
      toast.error('Failed to block device: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/40 bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Total Active Sessions</span>
              <h3 className="text-2xl font-black text-foreground">{stats.totalActive}</h3>
              <p className="text-[10px] text-muted-foreground">Unique active JWT matches</p>
            </div>
            <div className="p-3.5 bg-indigo-500/10 rounded-2xl text-indigo-500">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Online Right Now</span>
              <h3 className="text-2xl font-black text-emerald-600 flex items-center gap-2">
                {stats.online}
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </h3>
              <p className="text-[10px] text-muted-foreground">Active in the last 120s</p>
            </div>
            <div className="p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <Globe className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Android App Sessions</span>
              <h3 className="text-2xl font-black text-foreground">{stats.android}</h3>
              <p className="text-[10px] text-muted-foreground">Native Mobile App logins</p>
            </div>
            <div className="p-3.5 bg-purple-500/10 rounded-2xl text-purple-500">
              <Smartphone className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Blocked Endprints</span>
              <h3 className="text-2xl font-black text-rose-600">{stats.blocked}</h3>
              <p className="text-[10px] text-muted-foreground">Blacklisted fingerprints</p>
            </div>
            <div className="p-3.5 bg-rose-500/10 rounded-2xl text-rose-500">
              <Ban className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Card */}
      <Card className="border-border/40 bg-card">
        <CardHeader className="pb-3 border-b border-border/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Laptop className="w-5 h-5 text-primary" />
              <span>Active Sessions Registry</span>
            </CardTitle>
            <CardDescription>Search, filter, inspect and revoke student portal connections in real time.</CardDescription>
          </div>

          {/* Filtering row */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 h-8.5 text-xs rounded-xl"
                placeholder="Search name, email, IP..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            <select
              className="flex h-8.5 w-[110px] rounded-xl border border-input bg-background px-3.5 text-[11px] font-semibold transition-colors focus-visible:outline-none"
              value={platform}
              onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
            >
              <option value="all">Platforms</option>
              <option value="Desktop">Desktop</option>
              <option value="Mobile">Mobile</option>
            </select>

            <select
              className="flex h-8.5 w-[110px] rounded-xl border border-input bg-background px-3.5 text-[11px] font-semibold transition-colors focus-visible:outline-none"
              value={appType}
              onChange={(e) => { setAppType(e.target.value); setPage(1); }}
            >
              <option value="all">Client Type</option>
              <option value="Web">Web Portal</option>
              <option value="Android App">Android App</option>
              <option value="iOS App">iOS App</option>
            </select>

            <select
              className="flex h-8.5 w-[100px] rounded-xl border border-input bg-background px-3.5 text-[11px] font-semibold transition-colors focus-visible:outline-none"
              value={onlineStatus}
              onChange={(e) => { setOnlineStatus(e.target.value); setPage(1); }}
            >
              <option value="all">Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>

            <select
              className="flex h-8.5 w-[110px] rounded-xl border border-input bg-background px-3.5 text-[11px] font-semibold transition-colors focus-visible:outline-none"
              value={timeRange}
              onChange={(e) => { setTimeRange(e.target.value); setPage(1); }}
            >
              <option value="all">Login Time</option>
              <option value="Today">Today Only</option>
              <option value="Last7Days">Last 7 Days</option>
            </select>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider pl-6">Student Info</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider">Device details</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider">IP / Geolocation</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider">Active Activity</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider">Status</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground animate-pulse">
                    Loading active sessions from security node...
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    No active sessions match the requested filters.
                  </TableCell>
                </TableRow>
              ) : sessions.map((session: any) => {
                const isOnline = session.isOnline;
                const displayName = session.nickname || `${session.manufacturer || ''} ${session.deviceModel || ''}`.trim() || session.device || 'Unrecognized';
                
                return (
                  <TableRow key={session._id} className="hover:bg-muted/15 transition-colors">
                    <TableCell className="pl-6 py-3.5">
                      <div className="font-bold text-xs text-foreground">{session.userId?.name || 'Unknown User'}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{session.userId?.email || 'N/A'}</div>
                      {session.userId?.program && (
                        <div className="text-[9px] font-semibold text-primary mt-1">
                          {session.userId.program} · Batch: {session.userId.batchName || 'Default'}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                        {session.appType === 'Android App' || session.appType === 'iOS App' ? (
                          <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                        ) : (
                          <Laptop className="w-3.5 h-3.5 text-purple-500" />
                        )}
                        <span>{displayName}</span>
                        {session.isTrusted && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[8px] py-0 font-extrabold">Trusted</Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {session.browser} ({session.appType}) {session.appVersion ? `v${session.appVersion}` : ''}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">{session.ipAddress}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-muted-foreground" />
                        <span>{session.location || 'Unknown Location'}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-[11px] text-foreground max-w-[180px] truncate" title={session.currentAction}>
                        {session.currentAction || 'Browsing Dashboard'}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">
                        Duration: {Math.floor(session.sessionDuration / 60)}m {session.sessionDuration % 60}s
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className={isOnline ? 'text-emerald-600' : 'text-muted-foreground'}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="pr-6 text-right py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-[10px] rounded-lg font-bold px-2.5"
                          onClick={() => {
                            setSelectedSessionId(session._id);
                            setIsDrawerOpen(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-[10px] text-rose-600 hover:text-rose-700 border-rose-500/20 hover:bg-rose-500/5 rounded-lg font-bold px-2"
                          onClick={() => {
                            setBlockingSession(session);
                            setBlockReason('');
                            setBlockType('permanent');
                          }}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-[10px] text-muted-foreground hover:text-foreground rounded-lg px-2"
                          onClick={() => handleCopyFingerprint(session.deviceFingerprint, session._id)}
                          title="Copy Fingerprint"
                          disabled={!session.deviceFingerprint}
                        >
                          {copiedId === session._id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-[10px] text-destructive hover:bg-destructive/10 rounded-lg font-bold px-2.5"
                          onClick={() => handleTerminateSession(session._id)}
                        >
                          Terminate
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Table Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 pl-6 pr-6 border-t border-border/30">
              <div className="text-[11px] font-semibold text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} active sessions
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 rounded-lg"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="w-8 h-8 flex items-center justify-center border rounded-lg bg-card text-xs font-extrabold text-foreground">
                  {page}
                </div>
                <span className="text-xs text-muted-foreground">of {pagination.pages}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 rounded-lg"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slide Detail Drawer */}
      <SessionDetailDrawer
        sessionId={selectedSessionId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedSessionId(null);
        }}
        onTerminate={handleTerminateSession}
      />

      {/* Block Fingerprint Device Dialog */}
      <Dialog open={!!blockingSession} onOpenChange={(open) => !open && setBlockingSession(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 font-extrabold text-base">
              <ShieldAlert className="w-5 h-5" />
              <span>Block Device Fingerprint</span>
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
              This action blocks the device fingerprint permanently or temporarily. Future login requests from this device will be immediately rejected.
            </DialogDescription>
          </DialogHeader>

          {blockingSession && (
            <div className="space-y-4 py-3 text-xs leading-normal">
              <div className="p-3 bg-muted/40 border rounded-2xl space-y-1.5 font-semibold text-muted-foreground">
                <p><span className="text-foreground font-extrabold">Device Name:</span> {blockingSession.nickname || blockingSession.device}</p>
                <p className="font-mono text-[10px] break-all"><span className="text-foreground font-extrabold font-sans">Fingerprint:</span> {blockingSession.deviceFingerprint}</p>
                <p><span className="text-foreground font-extrabold">Logged User:</span> {blockingSession.userId?.name} ({blockingSession.userId?.email})</p>
              </div>

              {/* Block type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground">Block Duration Type</label>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant={blockType === 'permanent' ? 'default' : 'outline'}
                    className="flex-1 h-9 text-xs rounded-xl font-bold"
                    onClick={() => setBlockType('permanent')}
                  >
                    Permanent Block
                  </Button>
                  <Button 
                    type="button"
                    variant={blockType === 'temporary' ? 'default' : 'outline'}
                    className="flex-1 h-9 text-xs rounded-xl font-bold"
                    onClick={() => setBlockType('temporary')}
                  >
                    Temporary Block
                  </Button>
                </div>
              </div>

              {blockType === 'temporary' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-muted-foreground">Temporary Duration</label>
                  <select
                    className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs focus-visible:outline-none font-semibold"
                    value={blockedUntil}
                    onChange={(e) => setBlockedUntil(e.target.value)}
                  >
                    <option value="24h">24 Hours</option>
                    <option value="48h">48 Hours</option>
                    <option value="168h">1 Week (168 Hours)</option>
                  </select>
                </div>
              )}

              {/* Block Reason */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground">Reason for blocking</label>
                <Input
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Integrity violation / account sharing"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" className="h-9.5 text-xs rounded-xl font-bold" onClick={() => setBlockingSession(null)}>Cancel</Button>
            <Button variant="destructive" className="h-9.5 text-xs rounded-xl font-bold bg-rose-600 hover:bg-rose-700" onClick={handleBlockDevice}>
              Apply Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
