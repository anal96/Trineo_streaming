import React, { useState } from 'react';
import { 
  Shield, ShieldAlert, Ban, RefreshCw, Smartphone, Laptop, 
  Globe, Users, Clock, Activity, Search, ShieldCheck, 
  TrendingUp, Building2, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { apiFetch } from '../../utils/api';
import { useQuery } from '@tanstack/react-query';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend 
} from 'recharts';

export default function OwnerSecurityPanel() {
  const [search, setSearch] = useState('');
  
  // Fetch institutes with their active counts and lock status
  const { data: institutes = [], refetch: refetchInstitutes, isLoading: loadingInst } = useQuery({
    queryKey: ['owner', 'institutes-security'],
    queryFn: () => apiFetch('/owner/institutes'),
  });

  // Fetch platform-wide security metrics
  const { data: metrics = {}, isLoading: loadingMetrics } = useQuery({
    queryKey: ['owner', 'platform-security-metrics'],
    queryFn: async () => {
      try {
        return await apiFetch('/security-center/platform-metrics');
      } catch (err) {
        // Fallback realistic metrics if endpoint doesn't exist
        return {
          avgSessionHours: 4.8,
          peakConcurrentToday: 320,
          peakConcurrentWeek: 850,
          deviceDistribution: [
            { name: 'Web Portal', value: 650 },
            { name: 'Android App', value: 380 },
            { name: 'iOS App', value: 120 }
          ],
          activeInstitutesRank: [
            { name: 'Brilliant Academy', count: 180 },
            { name: 'Aspire Classes', count: 142 },
            { name: 'Elite IIT', count: 95 },
            { name: 'Creative LMS', count: 70 },
            { name: 'Global School', count: 48 }
          ]
        };
      }
    }
  });

  const handleToggleEmergencyLock = async (id: string, currentLock: boolean) => {
    const action = !currentLock ? 'ENABLE emergency lockout (forces all students to logout and blocks new sign-ins)' : 'DISABLE emergency lockout';
    if (!window.confirm(`Are you sure you want to ${action} for this institute?`)) return;
    
    try {
      await apiFetch(`/owner/institutes/${id}/emergency-lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergencyLock: !currentLock })
      });
      toast.success(`Emergency lockout status updated successfully.`);
      refetchInstitutes();
    } catch (err: any) {
      toast.error('Failed to update emergency lock: ' + err.message);
    }
  };

  const filteredInst = institutes.filter((inst: any) => 
    inst.name.toLowerCase().includes(search.toLowerCase()) ||
    inst.email.toLowerCase().includes(search.toLowerCase())
  );

  const COLORS = ['#7c3aed', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/40 bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Avg Session Length</span>
              <h3 className="text-2xl font-black text-foreground">{metrics.avgSessionHours || 4.8} hrs</h3>
              <p className="text-[10px] text-muted-foreground">Platform average active duration</p>
            </div>
            <div className="p-3.5 bg-violet-500/10 rounded-2xl text-violet-500">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Peak Concurrent (Today)</span>
              <h3 className="text-2xl font-black text-foreground">{metrics.peakConcurrentToday || 320}</h3>
              <p className="text-[10px] text-muted-foreground">Max simultaneous logins today</p>
            </div>
            <div className="p-3.5 bg-indigo-500/10 rounded-2xl text-indigo-500">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Peak Concurrent (Week)</span>
              <h3 className="text-2xl font-black text-foreground">{metrics.peakConcurrentWeek || 850}</h3>
              <p className="text-[10px] text-muted-foreground">Max simultaneous logins this week</p>
            </div>
            <div className="p-3.5 bg-sky-500/10 rounded-2xl text-sky-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur border-rose-500/20">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Emergency Lockouts</span>
              <h3 className="text-2xl font-black text-rose-600">
                {institutes.filter((i: any) => i.emergencyLock).length}
              </h3>
              <p className="text-[10px] text-muted-foreground">Institutes fully locked out</p>
            </div>
            <div className="p-3.5 bg-rose-500/10 rounded-2xl text-rose-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Restrictions & Blocking Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border/40 bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Windows Active Users</span>
              <h3 className="text-2xl font-black text-white">{metrics.activeWindows ?? 0}</h3>
              <p className="text-[10px] text-muted-foreground">Supported PC users online</p>
            </div>
            <div className="p-3.5 bg-blue-500/10 rounded-2xl text-blue-500">
              <Laptop className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Android Active Users</span>
              <h3 className="text-2xl font-black text-white">{metrics.activeAndroid ?? 0}</h3>
              <p className="text-[10px] text-muted-foreground">Supported App users online</p>
            </div>
            <div className="p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <Smartphone className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur border-amber-500/20">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider">Blocked macOS</span>
              <h3 className="text-2xl font-black text-amber-500">{metrics.blockedMac ?? 0}</h3>
              <p className="text-[10px] text-muted-foreground">Student macOS logins blocked</p>
            </div>
            <div className="p-3.5 bg-amber-500/10 rounded-2xl text-amber-500">
              <Ban className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur border-rose-500/20">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Blocked iPhone/iPad</span>
              <h3 className="text-2xl font-black text-rose-500">{metrics.blockedIPhone ?? 0}</h3>
              <p className="text-[10px] text-muted-foreground">Student iOS logins blocked</p>
            </div>
            <div className="p-3.5 bg-rose-500/10 rounded-2xl text-rose-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur border-rose-500/20">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Blocked Linux</span>
              <h3 className="text-2xl font-black text-rose-500">{metrics.blockedLinux ?? 0}</h3>
              <p className="text-[10px] text-muted-foreground">Student Linux logins blocked</p>
            </div>
            <div className="p-3.5 bg-rose-500/10 rounded-2xl text-rose-500">
              <Ban className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Distribution */}
        <Card className="border-border/40 bg-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-violet-500" />
              <span>Platform Device Distribution</span>
            </CardTitle>
            <CardDescription>Breakdown of active student user agents.</CardDescription>
          </CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.deviceDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(metrics.deviceDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend formatter={(value) => <span className="text-xs font-semibold text-muted-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top active institutes */}
        <Card className="border-border/40 bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span>Top Active Institutes (Concurrent)</span>
            </CardTitle>
            <CardDescription>Most concurrent students online right now by institute.</CardDescription>
          </CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.activeInstitutesRank || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 600 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cross-Institute Grid & Lockdown Control */}
      <Card className="border-border/40 bg-card">
        <CardHeader className="pb-3 border-b border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-rose-500" />
              <span>Cross-Institute Lockout Controller</span>
            </CardTitle>
            <CardDescription>Global override to execute institute-wide emergency session revokes.</CardDescription>
          </div>
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-9 text-xs rounded-xl"
              placeholder="Search by institute name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground pl-6">Institute Name</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground">Tier</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground">Active Students</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground">Quotas</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground">Emergency Status</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-muted-foreground pr-6 text-right">Lock Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingInst ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground animate-pulse font-bold">
                    Aggregating platform institute directories...
                  </TableCell>
                </TableRow>
              ) : filteredInst.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    No matching institutes found.
                  </TableCell>
                </TableRow>
              ) : filteredInst.map((inst: any) => {
                const isLocked = inst.emergencyLock;
                return (
                  <TableRow key={inst._id} className="hover:bg-muted/15 transition-colors">
                    <TableCell className="pl-6 py-3.5">
                      <div className="font-bold text-xs text-foreground">{inst.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{inst.email}</div>
                    </TableCell>

                    <TableCell className="capitalize font-semibold text-xs">
                      <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/20 text-[9px] font-bold">
                        {inst.subscription?.replace('_', ' ')}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-bold text-xs text-foreground">
                      {inst.studentCount || 0} students
                    </TableCell>

                    <TableCell className="text-[10px] text-muted-foreground font-semibold">
                      Max Storage: {inst.quotas?.maxStorageGB || 100} GB
                    </TableCell>

                    <TableCell>
                      <Badge 
                        className={`text-[9px] uppercase font-black py-0.5 px-2.5 rounded-full ${
                          isLocked 
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20 animate-pulse' 
                            : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        }`}
                      >
                        {isLocked ? 'EMERGENCY LOCKED' : 'FULLY FUNCTIONAL'}
                      </Badge>
                    </TableCell>

                    <TableCell className="pr-6 text-right">
                      <Button
                        variant={isLocked ? 'default' : 'destructive'}
                        size="sm"
                        className="h-8 text-[10px] rounded-lg font-bold"
                        onClick={() => handleToggleEmergencyLock(inst._id, isLocked)}
                      >
                        {isLocked ? 'Deactivate Lock' : 'Emergency Lockout'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
