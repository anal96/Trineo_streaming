import React from 'react';
import {
  Shield, Camera, Video, RefreshCw, Users, ShieldCheck, Lock, Laptop, Smartphone, History, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Input } from '../../ui/input';
import { Progress } from '../../ui/progress';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner';

interface SecuritySectionProps {
  isMobile?: boolean;
  categorizedEvents: any;
  securityScore: number;
  violations: any[];
  securityLogs: any;
  parseUserAgentDetails: (ua: string) => { os: string; browser: string };
  formatLastActive: (dateString: string | Date, isCurrent: boolean) => string;
  renderTimelineItem?: (event: any) => React.ReactNode;
  passwordForm: any;
  setPasswordForm: React.Dispatch<React.SetStateAction<any>>;
  showCurrentPassword: any;
  setShowCurrentPassword: any;
  showNewPassword: any;
  setShowNewPassword: any;
  showConfirmPassword: any;
  setShowConfirmPassword: any;
  passwordStrength: any;
  apiFetch: any;
  setUser: any;
  user: any;
  setSecurityLogs: any;
  navigate: any;
}

export default function SecuritySection({
  isMobile = false,
  categorizedEvents,
  securityScore,
  violations,
  securityLogs,
  parseUserAgentDetails,
  formatLastActive,
  renderTimelineItem,
  passwordForm,
  setPasswordForm,
  showCurrentPassword,
  setShowCurrentPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  passwordStrength,
  apiFetch,
  setUser,
  user,
  setSecurityLogs,
  navigate
}: SecuritySectionProps) {

  const handlePasswordChange = async () => {
    try {
      const resp = await apiFetch('/student-account/password/change', { method: 'POST', body: JSON.stringify(passwordForm) });
      toast.success('Password changed successfully!', { description: 'Please login again to verify credentials.' });
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
      }, 1500);
    } catch (e: any) {
      toast.error(e.message || 'Failed to change password');
    }
  };

  const handleDisconnectSession = async (sessionId: string) => {
    try {
      await apiFetch(`/student-account/sessions/${sessionId}/terminate`, { method: 'POST' });
      toast.success('Session terminated successfully.');
      const data = await apiFetch('/auth/security-logs');
      setSecurityLogs(data);
    } catch (err: any) {
      toast.error('Failed to terminate session', { description: err.message });
    }
  };

  const handleDisconnectAllOthers = async () => {
    try {
      await apiFetch('/student-account/sessions/terminate-others', { method: 'POST' });
      toast.success('All other sessions terminated successfully.');
      const data = await apiFetch('/auth/security-logs');
      setSecurityLogs(data);
    } catch (err: any) {
      toast.error('Failed to terminate other sessions', { description: err.message });
    }
  };

  if (isMobile) {
    return (
      <div className="p-4 border-t border-border/45 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
        {/* Violations grid */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-3 bg-muted/20 border border-border/20 rounded-xl">
            <div className="text-[9px] font-bold text-muted-foreground uppercase">Screenshots</div>
            <div className="text-sm font-black text-foreground mt-0.5">{categorizedEvents.screenshot.length}</div>
          </div>
          <div className="p-3 bg-muted/20 border border-border/20 rounded-xl">
            <div className="text-[9px] font-bold text-muted-foreground uppercase">Recordings</div>
            <div className="text-sm font-black text-foreground mt-0.5">{categorizedEvents.recording.length}</div>
          </div>
          <div className="p-3 bg-muted/20 border border-border/20 rounded-xl">
            <div className="text-[9px] font-bold text-muted-foreground uppercase">Tab Switches</div>
            <div className="text-sm font-black text-foreground mt-0.5">{categorizedEvents.tab.length}</div>
          </div>
          <div className="p-3 bg-muted/20 border border-border/20 rounded-xl">
            <div className="text-[9px] font-bold text-muted-foreground uppercase font-semibold">Security Score</div>
            <div className="text-sm font-black text-emerald-600 mt-0.5">{securityScore}%</div>
          </div>
        </div>

        {/* Audit details */}
        <div className="text-[10px] text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/20">
          Our LMS anti-piracy algorithms monitor screenshots, screen recordings, and tab switches during video playback. Repeated violations lowers your Security Compliance Score and may automatically lock access.
        </div>

        {/* Recent devices */}
        <div className="space-y-2">
          <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider">Active Device Sessions</h4>
          <div className="divide-y divide-border/30">
            {securityLogs?.activeSessions?.map((session: any) => {
              const ua = parseUserAgentDetails(session.userAgent);
              const isCurrent = session.tokenHash === localStorage.getItem('token');
              return (
                <div key={session._id} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-foreground">{ua.os}</span>
                      {isCurrent && <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[8px] px-1 font-black">Current</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{ua.browser} · IP: {session.ipAddress}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatLastActive(session.lastActive, isCurrent)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="space-y-6">
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
                onChange={(e) => setPasswordForm((f: any) => ({ ...f, currentPassword: e.target.value }))} 
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
                onChange={(e) => setPasswordForm((f: any) => ({ ...f, newPassword: e.target.value }))} 
              />
              <button 
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
                onChange={(e) => setPasswordForm((f: any) => ({ ...f, confirmPassword: e.target.value }))} 
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
              onClick={handlePasswordChange}
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
                          onClick={() => handleDisconnectSession(session._id)}
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
                    onClick={handleDisconnectAllOthers}
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
              {renderTimelineItem && violations.map((event: any) => renderTimelineItem(event))}
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
    </div>
  );
}
