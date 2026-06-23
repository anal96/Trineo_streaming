import { useEffect, useState } from 'react';
import { Calendar, Video, Plus, PencilLine, Trash2, Users, CheckCircle, X, Search } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { ResponsiveDataView, MobileRecordCard } from '../responsive/ResponsiveDataView';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function LiveClassesManagement() {
  const queryClient = useQueryClient();

  // Form State
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [platform, setPlatform] = useState<'Google Meet' | 'Zoom'>('Google Meet');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState<'upcoming' | 'live' | 'completed' | 'cancelled'>('upcoming');
  const [notifyStudents, setNotifyStudents] = useState(false);

  // Attendance Viewer State
  const [attendanceClass, setAttendanceClass] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Filters
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // React Query Hooks
  const { data: liveClasses = [], isLoading: loading } = useQuery({
    queryKey: ['live-classes'],
    queryFn: () => apiFetch('/live-classes'),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => apiFetch('/courses'),
  });

  const { data: faculties = [] } = useQuery({
    queryKey: ['faculty'],
    queryFn: () => apiFetch('/student/faculty'),
  });

  const openCreateModal = () => {
    setEditingClass(null);
    setTitle('');
    setDescription('');
    setCourseId('');
    setFacultyId('');
    setPlatform('Google Meet');
    setMeetingUrl('');
    setStartTime('');
    setEndTime('');
    setStatus('upcoming');
    setNotifyStudents(false);
    setShowClassModal(true);
  };

  const openEditModal = (lc: any) => {
    setEditingClass(lc);
    setTitle(lc.title || '');
    setDescription(lc.description || '');
    setCourseId(lc.courseId?._id || lc.courseId || '');
    setFacultyId(lc.facultyId?._id || lc.facultyId || '');
    setPlatform(lc.platform || 'Google Meet');
    setMeetingUrl(lc.meetingUrl || '');
    
    // Format dates to YYYY-MM-DDThh:mm
    if (lc.startTime) {
      setStartTime(new Date(lc.startTime).toISOString().slice(0, 16));
    } else {
      setStartTime('');
    }
    if (lc.endTime) {
      setEndTime(new Date(lc.endTime).toISOString().slice(0, 16));
    } else {
      setEndTime('');
    }

    setStatus(lc.status || 'upcoming');
    setNotifyStudents(false);
    setShowClassModal(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !courseId || !facultyId || !meetingUrl || !startTime || !endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      toast.error('End time must be after start time');
      return;
    }

    const payload = {
      title,
      description,
      courseId,
      facultyId,
      platform,
      meetingUrl,
      startTime,
      endTime,
      status,
      notifyStudents
    };

    try {
      if (editingClass?._id) {
        await apiFetch(`/live-classes/${editingClass._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success('Live class updated successfully');
      } else {
        await apiFetch('/live-classes', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success('Live class created successfully');
      }
      setShowClassModal(false);
      queryClient.invalidateQueries({ queryKey: ['live-classes'] });
    } catch (err: any) {
      toast.error('Failed to save live class', { description: err.message });
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this live class? This action will permanently remove all attendance logs for this lecture.')) return;
    try {
      await apiFetch(`/live-classes/${id}`, { method: 'DELETE' });
      toast.success('Live class deleted');
      queryClient.invalidateQueries({ queryKey: ['live-classes'] });
    } catch (err: any) {
      toast.error('Delete failed', { description: err.message });
    }
  };

  const handleViewAttendance = async (lc: any) => {
    setAttendanceClass(lc);
    setAttendanceLoading(true);
    try {
      const records = await apiFetch(`/live-classes/${lc._id}/attendance`);
      setAttendanceRecords(records);
    } catch (err: any) {
      toast.error('Failed to load attendance list', { description: err.message });
    } finally {
      setAttendanceLoading(false);
    }
  };

  const filteredClasses = liveClasses.filter(lc => {
    const titleMatch = lc.title.toLowerCase().includes(filterSearch.toLowerCase()) || 
                       (lc.courseId?.title || '').toLowerCase().includes(filterSearch.toLowerCase());
    const courseIdString = lc.courseId?._id || lc.courseId || '';
    const courseMatch = filterCourse ? String(courseIdString) === String(filterCourse) : true;
    return titleMatch && courseMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header card with action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Live Lectures Calendar</h2>
          <p className="text-muted-foreground text-sm">Schedule and monitor real-time virtual classrooms in zoom or Google Meet.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-primary hover:bg-[#1f5fa7] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Schedule Live Class
        </Button>
      </div>

      {/* Filter panel */}
      <Card className="border-border/50 bg-card">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                className="pl-10" 
                value={filterSearch} 
                onChange={(e) => setFilterSearch(e.target.value)} 
                placeholder="Search by lecture name or batch..." 
              />
            </div>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
            >
              <option value="">All Batches</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>{course.title}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Listing card */}
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Class Schedule
          </CardTitle>
          <CardDescription>View status, meeting parameters, scheduled faculty, and student attendance logs.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Loading schedules...</div>
          ) : (
            <ResponsiveDataView
              desktop={
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lecture Info</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Timing</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClasses.map((lc) => (
                      <TableRow key={lc._id}>
                        <TableCell>
                          <div className="font-semibold text-foreground">{lc.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{lc.description || 'No description'}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="secondary" className="text-[10px] font-bold">
                              {lc.platform}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={lc.meetingUrl}>
                              {lc.meetingUrl}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{lc.courseId?.title || 'Unknown Batch'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{lc.facultyId?.name || 'Assigned Lecturer'}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>Start: {new Date(lc.startTime).toLocaleString()}</div>
                          <div className="text-muted-foreground mt-0.5">End: {new Date(lc.endTime).toLocaleString()}</div>
                        </TableCell>
                        <TableCell>
                          <button 
                            onClick={() => handleViewAttendance(lc)}
                            className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>{lc.attendanceCount || 0} joined</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              lc.status === 'live' 
                                ? 'bg-red-500/15 text-red-400 border border-red-500/20 font-black animate-pulse' 
                                : lc.status === 'upcoming' 
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                : lc.status === 'completed'
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-muted text-muted-foreground border border-border'
                            }
                          >
                            {lc.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="min-h-11" onClick={() => openEditModal(lc)}>
                              <PencilLine className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" className="min-h-11 border-red-500/30 text-red-500" onClick={() => handleDeleteClass(lc._id)}>
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredClasses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-10">No live classes scheduled.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              }
              mobile={
                filteredClasses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No live classes scheduled.</p>
                ) : (
                  filteredClasses.map((lc) => (
                    <MobileRecordCard
                      key={lc._id}
                      title={lc.title}
                      subtitle={lc.courseId?.title || 'Unknown Batch'}
                      badges={
                        <div className="flex gap-1">
                          <Badge variant="outline">{lc.platform}</Badge>
                          <Badge 
                            variant="outline"
                            className={lc.status === 'live' ? 'text-red-500 border-red-500/30' : 'text-blue-500 border-blue-500/30'}
                          >
                            {lc.status}
                          </Badge>
                        </div>
                      }
                      rows={[
                        { label: 'Faculty', value: lc.facultyId?.name || 'N/A' },
                        { label: 'Start', value: new Date(lc.startTime).toLocaleString() },
                        { label: 'End', value: new Date(lc.endTime).toLocaleString() },
                        { 
                          label: 'Attendance', 
                          value: (
                            <button 
                              onClick={() => handleViewAttendance(lc)}
                              className="text-xs text-primary font-semibold underline"
                            >
                              {lc.attendanceCount || 0} joined
                            </button>
                          )
                        }
                      ]}
                      actions={
                        <>
                          <Button size="sm" variant="outline" className="min-h-11 flex-1" onClick={() => openEditModal(lc)}>Edit</Button>
                          <Button size="sm" variant="outline" className="min-h-11 text-red-500" onClick={() => handleDeleteClass(lc._id)}>Delete</Button>
                        </>
                      }
                    />
                  ))
                )
              }
            />
          )}
        </CardContent>
      </Card>

      {/* SCHEDULE LIVE CLASS MODAL */}
      <Dialog open={showClassModal} onOpenChange={setShowClassModal}>
        <DialogContent className="max-w-lg w-[92vw] rounded-2xl border-border bg-card p-0 overflow-hidden shadow-2xl">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-indigo-500 to-indigo-700" />
          <form onSubmit={handleSaveClass} className="p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Video className="w-5 h-5 text-primary" />
                {editingClass ? 'Edit Scheduled Live Class' : 'Schedule New Live Class'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Define the lecture properties, faculty assignment, and meeting link.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="lc-title">Lecture Title *</Label>
                <Input 
                  id="lc-title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Q&A Session: React Hooks vs Classes" 
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lc-desc">Description</Label>
                <Input 
                  id="lc-desc" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Optional brief description of the lecture goals" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lc-course">Batch *</Label>
                  <select
                    id="lc-course"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    required
                  >
                    <option value="">Select a Batch</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lc-faculty">Faculty *</Label>
                  <select
                    id="lc-faculty"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={facultyId}
                    onChange={(e) => setFacultyId(e.target.value)}
                    required
                  >
                    <option value="">Select Faculty</option>
                    {faculties.map((f) => (
                      <option key={f.id || f._id} value={f.id || f._id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="lc-platform">Platform *</Label>
                  <select
                    id="lc-platform"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as 'Google Meet' | 'Zoom')}
                    required
                  >
                    <option value="Google Meet">Google Meet</option>
                    <option value="Zoom">Zoom</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="lc-url">Meeting URL *</Label>
                  <Input 
                    id="lc-url" 
                    value={meetingUrl} 
                    onChange={(e) => setMeetingUrl(e.target.value)} 
                    placeholder="https://meet.google.com/abc-defg-hij or zoom url" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lc-start">Start Time *</Label>
                  <Input 
                    id="lc-start" 
                    type="datetime-local" 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)} 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lc-end">End Time *</Label>
                  <Input 
                    id="lc-end" 
                    type="datetime-local" 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="lc-status">Status</Label>
                  <select
                    id="lc-status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live Now</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="lc-notify"
                    type="checkbox"
                    checked={notifyStudents}
                    onChange={(e) => setNotifyStudents(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-background"
                  />
                  <Label htmlFor="lc-notify" className="cursor-pointer font-medium text-xs sm:text-sm">
                    Notify Enrolled Students
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-4 border-t border-border">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowClassModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-primary text-white hover:bg-primary/95">
                Save Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ATTENDANCE LIST VIEWER DIALOG */}
      <Dialog open={!!attendanceClass} onOpenChange={(open) => !open && setAttendanceClass(null)}>
        <DialogContent className="max-w-2xl w-[94vw] rounded-2xl border-border bg-card p-0 overflow-hidden shadow-2xl">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-primary to-indigo-600" />
          <div className="p-6 space-y-4">
            <DialogHeader className="flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-base font-bold">
                  <Users className="w-5 h-5 text-primary" />
                  Attendance Log
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Class: "{attendanceClass?.title}" · Enrolled Batch: "{attendanceClass?.courseId?.title}"
                </DialogDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={() => setAttendanceClass(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogHeader>

            {attendanceLoading ? (
              <div className="py-12 text-center text-muted-foreground">Fetching logs...</div>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell className="font-mono text-primary text-xs">{record.studentId?.user_id || 'N/A'}</TableCell>
                        <TableCell className="font-medium text-sm">{record.studentId?.name || 'Student'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{record.studentId?.email || 'N/A'}</TableCell>
                        <TableCell className="text-xs">{new Date(record.joinedAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {attendanceRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-xs">No students have joined this live class session yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button variant="outline" className="w-full" onClick={() => setAttendanceClass(null)}>
                Close Viewer
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
