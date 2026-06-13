import { useEffect, useState } from 'react';
import { AlertTriangle, Ban, LogOut, RefreshCw, Shield } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ResponsiveDataView, MobileRecordCard } from '../responsive/ResponsiveDataView';

export default function SecurityCenter() {
  const [overview, setOverview] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const loadData = async () => {
    const [o, s, e] = await Promise.all([
      apiFetch('/security-center/overview'),
      apiFetch('/security-center/sessions'),
      apiFetch('/security-center/events')
    ]);
    setOverview(o.cards);
    setSessions(s);
    setEvents(e);
  };

  useEffect(() => { loadData(); }, []);

  const terminateSession = async (id: string) => {
    await apiFetch(`/security-center/sessions/${id}/terminate`, { method: 'POST' });
    loadData();
  };

  const studentAction = async (studentId: string, action: 'disable' | 'enable' | 'resetSessions') => {
    await apiFetch('/security-center/student-action', { method: 'POST', body: JSON.stringify({ studentId, action }) });
    loadData();
  };

  const overviewCards = [
    ['Active Sessions', overview?.activeSessions || 0],
    ['Active Devices', overview?.activeDevices || 0],
    ['Suspicious Activities', overview?.suspiciousActivities || 0],
    ['Concurrent Attempts', overview?.concurrentAttempts || 0],
    ['Session Violations', overview?.sessionViolations || 0],
    ['Piracy Events', overview?.piracyEvents || 0]
  ];

  return (
    <div className="space-y-6 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {overviewCards.map(([label, value]) => (
          <Card key={String(label)}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-semibold">{value}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Active Sessions</CardTitle><CardDescription>Terminate, disable, enable, or reset student sessions.</CardDescription></CardHeader>
        <CardContent>
          <ResponsiveDataView
            desktop={
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Device</TableHead><TableHead>Browser</TableHead><TableHead>IP</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session._id}>
                      <TableCell>{session.userId?.name || 'Unknown'}</TableCell>
                      <TableCell>{session.device}</TableCell>
                      <TableCell>{session.browser}</TableCell>
                      <TableCell>{session.ipAddress || 'N/A'}</TableCell>
                      <TableCell><Badge variant={session.status === 'active' ? 'outline' : 'secondary'}>{session.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="min-h-11" onClick={() => terminateSession(session._id)}><LogOut className="w-4 h-4 mr-1" />Terminate</Button>
                          {session.userId?._id && (
                            <>
                              <Button size="sm" variant="outline" className="min-h-11" onClick={() => studentAction(session.userId._id, 'resetSessions')}><RefreshCw className="w-4 h-4 mr-1" />Reset</Button>
                              <Button size="sm" variant="outline" className="min-h-11 border-red-400 text-red-500" onClick={() => studentAction(session.userId._id, 'disable')}><Ban className="w-4 h-4 mr-1" />Disable</Button>
                              <Button size="sm" variant="outline" className="min-h-11" onClick={() => studentAction(session.userId._id, 'enable')}><Shield className="w-4 h-4 mr-1" />Enable</Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
            mobile={sessions.map((session) => (
              <MobileRecordCard
                key={session._id}
                title={session.userId?.name || 'Unknown'}
                badges={<Badge variant={session.status === 'active' ? 'outline' : 'secondary'}>{session.status}</Badge>}
                rows={[
                  { label: 'Device', value: session.device },
                  { label: 'Browser', value: session.browser },
                  { label: 'IP', value: session.ipAddress || 'N/A' },
                ]}
                actions={
                  <>
                    <Button size="sm" variant="outline" className="min-h-11 flex-1" onClick={() => terminateSession(session._id)}>Terminate</Button>
                    {session.userId?._id && (
                      <>
                        <Button size="sm" variant="outline" className="min-h-11 flex-1" onClick={() => studentAction(session.userId._id, 'resetSessions')}>Reset</Button>
                        <Button size="sm" variant="outline" className="min-h-11" onClick={() => studentAction(session.userId._id, 'disable')}>Disable</Button>
                        <Button size="sm" variant="outline" className="min-h-11" onClick={() => studentAction(session.userId._id, 'enable')}>Enable</Button>
                      </>
                    )}
                  </>
                }
              />
            ))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Security Events</CardTitle><CardDescription>Concurrent login attempts, token events, and piracy signals.</CardDescription></CardHeader>
        <CardContent>
          <ResponsiveDataView
            desktop={
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Student</TableHead><TableHead>IP</TableHead><TableHead>Device/Browser</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event._id}>
                      <TableCell><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />{event.eventType}</div></TableCell>
                      <TableCell>{event.userId?.name || 'System'}</TableCell>
                      <TableCell>{event.ipAddress || 'N/A'}</TableCell>
                      <TableCell className="break-all">{event.userAgent || 'N/A'}</TableCell>
                      <TableCell>{new Date(event.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
            mobile={events.map((event) => (
              <MobileRecordCard
                key={event._id}
                title={
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    {event.eventType}
                  </span>
                }
                subtitle={event.userId?.name || 'System'}
                rows={[
                  { label: 'IP', value: event.ipAddress || 'N/A' },
                  { label: 'Device', value: event.userAgent || 'N/A' },
                  { label: 'Time', value: new Date(event.createdAt).toLocaleString() },
                ]}
              />
            ))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
