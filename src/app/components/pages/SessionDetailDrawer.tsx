import React, { useState } from 'react';
import { 
  Laptop, Smartphone, Globe, ShieldAlert, Ban, Clock, 
  MapPin, Shield, Calendar, Users, Star, Play, FileText, 
  Download, Award, X, Activity, HardDrive
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../utils/api';
import { ScrollArea } from '../ui/scroll-area';

interface SessionDetailDrawerProps {
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTerminate: (sessionId: string) => void;
}

export default function SessionDetailDrawer({
  sessionId,
  isOpen,
  onClose,
  onTerminate
}: SessionDetailDrawerProps) {

  // Fetch detailed statistics when sessionId is active and isOpen
  const { data, isLoading } = useQuery({
    queryKey: ['security-center', 'session-details', sessionId],
    queryFn: () => apiFetch(`/security-center/sessions/${sessionId}/details`),
    enabled: !!sessionId && isOpen,
  });

  if (!isOpen) return null;

  const session = data?.session;
  const securityState = data?.securityState || { violationCount: 0, accountLocked: false };
  const violationsCount = data?.violationsCount || { screenshot: 0, screen_recording: 0, devtools: 0, downloads: 0 };
  const timelineLogs = data?.timelineLogs || [];
  const riskScore = data?.riskScore || 5;

  const renderStars = (score: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star 
          key={i} 
          className={`w-3.5 h-3.5 ${
            i <= score 
              ? 'fill-amber-500 text-amber-500' 
              : 'text-muted/40'
          }`} 
        />
      );
    }
    return (
      <div className="flex items-center gap-0.5">
        {stars}
        <span className="text-[10px] font-black uppercase tracking-wider ml-1.5 text-muted-foreground">
          {score >= 4 ? 'Low Risk' : score >= 3 ? 'Medium Risk' : 'High Risk'}
        </span>
      </div>
    );
  };

  // Helper to parse timeline icons
  const getTimelineIcon = (type: string) => {
    const ucType = (type || '').toUpperCase();
    if (ucType.includes('LOGIN') || ucType === 'LOGIN_SUCCESS') {
      return <span className="text-base">🟢</span>;
    }
    if (ucType === 'VIDEO_STARTED' || ucType === 'VIDEO_PLAYBACK_START') {
      return <Play className="w-3.5 h-3.5 text-primary fill-primary" />;
    }
    if (ucType === 'PDF_OPENED' || ucType === 'PDF_VIEW') {
      return <FileText className="w-3.5 h-3.5 text-indigo-500" />;
    }
    if (ucType === 'DOWNLOAD_ATTEMPT' || ucType === 'MATERIAL_DOWNLOAD') {
      return <Download className="w-3.5 h-3.5 text-emerald-500" />;
    }
    if (ucType.includes('QUIZ') || ucType.includes('SUBMIT')) {
      return <Award className="w-3.5 h-3.5 text-amber-500" />;
    }
    if (ucType.includes('LOGOUT')) {
      return <span className="text-base">🚪</span>;
    }
    return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const getTimelineLabel = (log: any) => {
    const ucType = (log.eventType || '').toUpperCase();
    if (ucType.includes('LOGIN') || ucType === 'LOGIN_SUCCESS') return 'Login Successful';
    if (ucType === 'VIDEO_STARTED') return 'Started Video';
    if (ucType === 'PDF_OPENED') return 'Opened PDF Notes';
    if (ucType === 'DOWNLOAD_ATTEMPT') return 'Downloaded Study Material';
    if (ucType.includes('QUIZ')) return 'Quiz Answer Submitted';
    if (ucType.includes('LOGOUT')) return 'Logged Out';
    return log.details || log.eventType || 'System Event';
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[480px] p-0 rounded-l-[32px] border-l border-border/40 flex flex-col h-full bg-card overflow-hidden">
        {/* Header bar */}
        <SheetHeader className="p-6 pb-4 border-b border-border/30 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-sm font-extrabold flex items-center gap-1.5">
                <Shield className="w-4.5 h-4.5 text-primary" />
                <span>Session Inspections Drawer</span>
              </SheetTitle>
              <div className="text-[10px] text-muted-foreground leading-relaxed">
                Aggregated diagnostics, connection logs, risk vectors, and timeline events.
              </div>
            </div>
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground animate-pulse font-bold">
            Aggregating session security details...
          </div>
        ) : !session ? (
          <div className="flex-1 flex items-center justify-center text-xs text-rose-500 font-bold">
            Failed to load session payload.
          </div>
        ) : (
          <ScrollArea className="flex-1 p-6 space-y-6">
            <div className="space-y-6 pb-8">
              {/* Profile Card Header */}
              <div className="flex items-center gap-3 bg-muted/20 border border-border/20 p-4 rounded-2xl">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 border flex items-center justify-center text-primary font-black text-sm uppercase shrink-0 shadow-inner">
                  {session.userId?.name?.substring(0, 2) || 'US'}
                </div>
                <div className="min-w-0 leading-tight">
                  <h4 className="font-extrabold text-xs text-foreground">{session.userId?.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{session.userId?.email}</p>
                  <p className="text-[9px] font-bold text-primary mt-1">
                    ID: {session.userId?.user_id} · Batch: {session.userId?.batchName || 'Default'}
                  </p>
                </div>
              </div>

              {/* Threat Scoring Header */}
              <div className="grid grid-cols-2 gap-3 bg-muted/10 p-3.5 border rounded-2xl">
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-muted-foreground tracking-wider">Device Threat Level</span>
                  <div className="mt-0.5">{renderStars(riskScore)}</div>
                </div>
                <div className="space-y-1 border-l pl-3.5">
                  <span className="text-[8px] font-black uppercase text-muted-foreground tracking-wider">Connection Integrity</span>
                  <div className="mt-0.5 font-bold text-xs text-foreground flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${session.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span>{session.isOnline ? 'Active Connection' : 'Offline'}</span>
                  </div>
                </div>
              </div>

              {/* Geo Connection Panel */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Connection Geolocation Details</span>
                </h4>
                <div className="p-4 border border-border/30 rounded-2xl bg-card text-xs font-semibold leading-relaxed space-y-2 text-muted-foreground">
                  <div className="flex justify-between border-b pb-2">
                    <span>Current IP Address:</span>
                    <span className="text-foreground">{session.ipAddress}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span>Previous IP Address:</span>
                    <span className="text-foreground">{session.previousIpAddress || 'None (Single IP session)'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span>Login Location:</span>
                    <span className="text-foreground">{session.location || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between pb-0">
                    <span>Active Timezone:</span>
                    <span className="text-foreground">{session.timezone || 'Asia/Kolkata'}</span>
                  </div>
                </div>
              </div>

              {/* Characteristics: Tab section style */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Physical Device Characteristics</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs leading-normal font-semibold">
                  <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Manufacturer</span>
                    <p className="text-foreground mt-0.5">{session.manufacturer || 'General System'}</p>
                  </div>
                  <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Model Name</span>
                    <p className="text-foreground mt-0.5">{session.deviceModel || session.device || 'PC'}</p>
                  </div>
                  <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Platform / OS</span>
                    <p className="text-foreground mt-0.5">{session.platform || 'Desktop'} · {session.os || 'Windows'}</p>
                  </div>
                  <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Active Browser</span>
                    <p className="text-foreground mt-0.5">{session.browser || 'Chrome'}</p>
                  </div>
                  <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Preferred Lang</span>
                    <p className="text-foreground mt-0.5">{session.language || 'en-US'}</p>
                  </div>
                  <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Network Type</span>
                    <p className="text-foreground mt-0.5 capitalize">{session.networkType || 'wifi'}</p>
                  </div>
                </div>
              </div>

              {/* Login/Authentication Metadata */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Login & Session Expiries</span>
                </h4>
                <div className="p-4 border border-border/30 rounded-2xl bg-card text-xs font-semibold leading-relaxed space-y-2 text-muted-foreground">
                  <div className="flex justify-between border-b pb-2">
                    <span>Authentication Method:</span>
                    <span className="text-foreground">{session.loginMethod || 'Password'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span>Login Timestamp:</span>
                    <span className="text-foreground">
                      {new Date(session.loginTime).toLocaleDateString()} · {new Date(session.loginTime).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span>Last Seen/Heartbeat:</span>
                    <span className="text-foreground">
                      {session.heartbeatAt ? new Date(session.heartbeatAt).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between pb-0">
                    <span>JWT Stable UUID suffix:</span>
                    <span className="text-foreground font-mono text-[10px]">{session.tokenSuffix || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Security Metrics Panel */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Historical Violation Audits</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs leading-normal font-semibold">
                  <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-center">
                    <span className="text-[9px] font-black uppercase text-rose-500/80">Screenshots Blocking</span>
                    <p className="text-rose-600 font-extrabold text-lg mt-0.5">{violationsCount.screenshot}</p>
                  </div>
                  <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-center">
                    <span className="text-[9px] font-black uppercase text-rose-500/80">Screen Recording Blocks</span>
                    <p className="text-rose-600 font-extrabold text-lg mt-0.5">{violationsCount.screen_recording}</p>
                  </div>
                  <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-center">
                    <span className="text-[9px] font-black uppercase text-rose-500/80">DevTools Detections</span>
                    <p className="text-rose-600 font-extrabold text-lg mt-0.5">{violationsCount.devtools}</p>
                  </div>
                  <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-center">
                    <span className="text-[9px] font-black uppercase text-rose-500/80">Material Downloads</span>
                    <p className="text-rose-600 font-extrabold text-lg mt-0.5">{violationsCount.downloads}</p>
                  </div>
                </div>
              </div>

              {/* Timeline list */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Session Activity Timeline</span>
                </h4>

                <div className="relative pl-6 space-y-4">
                  {/* Vertical bar line */}
                  <div className="absolute left-2.5 top-2.5 bottom-2.5 w-0.5 bg-border/40" />

                  {timelineLogs.length === 0 ? (
                    <div className="text-xs text-muted-foreground pl-1 font-semibold">
                      No session logs tracked yet. Heartbeat is updating active portal.
                    </div>
                  ) : timelineLogs.map((log: any, idx: number) => {
                    const logTime = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    return (
                      <div key={log._id || idx} className="relative flex items-start gap-3 pl-1 text-xs">
                        {/* Dot anchor */}
                        <div className="absolute -left-5 top-1 w-3.5 h-3.5 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        </div>

                        <div className="flex-1 bg-muted/15 border rounded-xl p-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-muted border flex items-center justify-center shrink-0">
                              {getTimelineIcon(log.eventType)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-foreground block">{getTimelineLabel(log)}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground/80 font-mono">{logTime}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Close / Revoke action buttons */}
              <div className="pt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-9.5 text-xs rounded-xl font-bold" 
                  onClick={onClose}
                >
                  Close Drawer
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1 h-9.5 text-xs rounded-xl font-bold bg-rose-600 hover:bg-rose-700"
                  onClick={() => onTerminate(session._id)}
                >
                  Force Disconnect
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
