import { useState, useEffect } from 'react';
import {
  Key,
  Search,
  Plus,
  Trash2,
  Calendar,
  Layers,
  BookOpen,
  UserCheck,
  UserX,
  AlertTriangle,
  FolderOpen,
  TrendingUp,
  Clock,
  Settings,
  Filter,
  CheckCircle2,
  Lock,
  Package,
  Users,
  Pencil
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';
import { apiFetch } from '../../utils/api';

export default function ContentAccessManager() {
  const [subTab, setSubTab] = useState<'students' | 'packages' | 'batches' | 'analytics'>('students');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    totalStudents: 0,
    inactiveStudents: 0,
    activeDirectCount: 0,
    directLocksCount: 0,
    activePackagesCount: 0,
    expiredPackagesCount: 0,
    popularPackages: []
  });

  // Search/Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentRules, setStudentRules] = useState<any[]>([]);
  
  // Curriculum metadata cache
  const [courseMeta, setCourseMeta] = useState<any>({ subjects: [], modules: [], lessons: [] });

  // Override Form State
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [ruleCourseId, setRuleCourseId] = useState('');
  const [ruleAccessType, setRuleAccessType] = useState<'course' | 'subject' | 'module' | 'lesson'>('course');
  const [ruleSubjectId, setRuleSubjectId] = useState('');
  const [ruleModuleId, setRuleModuleId] = useState('');
  const [ruleLessonId, setRuleLessonId] = useState('');
  const [ruleStatus, setRuleStatus] = useState<'active' | 'locked' | 'expired' | 'suspended'>('active');
  const [ruleStartDate, setRuleStartDate] = useState('');
  const [ruleExpiryDate, setRuleExpiryDate] = useState('');

  // Package Creator State
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [pkgName, setPkgName] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgCourses, setPkgCourses] = useState<string[]>([]);
  const [pkgSubjects, setPkgSubjects] = useState<string>('');
  const [pkgModules, setPkgModules] = useState<string>('');
  const [pkgLessons, setPkgLessons] = useState<string[]>([]);

  // Assign Package State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignPackageId, setAssignPackageId] = useState('');
  const [assignExpiry, setAssignExpiry] = useState('');

  // Batch Access State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [batchCourses, setBatchCourses] = useState<string[]>([]);
  const [batchSubjects, setBatchSubjects] = useState<string>('');
  const [batchModules, setBatchModules] = useState<string>('');
  const [batchStatus, setBatchStatus] = useState<'active' | 'locked' | 'expired' | 'suspended'>('active');
  const [batchStart, setBatchStart] = useState('');
  const [batchExpiry, setBatchExpiry] = useState('');

  // Edit Mode IDs State
  const [editRuleId, setEditRuleId] = useState<string | null>(null);
  const [editBatchId, setEditBatchId] = useState<string | null>(null);
  const [editPackageId, setEditPackageId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, [subTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load courses for reference
      const coursesData = await apiFetch('/courses');
      setCourses(coursesData);

      if (subTab === 'students') {
        const studentsData = await apiFetch('/access/students');
        setStudents(studentsData);
        const pkgs = await apiFetch('/access/packages');
        setPackages(pkgs);
      } else if (subTab === 'packages') {
        const pkgs = await apiFetch('/access/packages');
        setPackages(pkgs);
      } else if (subTab === 'batches') {
        const batchesData = await apiFetch('/access/batches');
        setBatches(batchesData);
      } else if (subTab === 'analytics') {
        const analyticsData = await apiFetch('/access/analytics');
        setAnalytics(analyticsData);
      }
    } catch (err: any) {
      toast.error('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch curriculum helper options when course changes
  const handleCourseChange = async (courseId: string) => {
    setRuleCourseId(courseId);
    setRuleSubjectId('');
    setRuleModuleId('');
    setRuleLessonId('');
    if (!courseId) return;
    try {
      const meta = await apiFetch(`/access/curriculum-meta/${courseId}`);
      setCourseMeta(meta);
    } catch (err: any) {
      toast.error('Failed to load curriculum selectors: ' + err.message);
    }
  };

  // Student specific overrides logic
  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    try {
      const rules = await apiFetch(`/access/student/${student._id}`);
      setStudentRules(rules);
    } catch (err: any) {
      toast.error('Failed to fetch overrides: ' + err.message);
    }
  };

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !ruleCourseId) {
      toast.error('Please select a student and course');
      return;
    }

    if (!ruleExpiryDate) {
      toast.error('Expiry date is required.');
      return;
    }

    if (ruleAccessType === 'course' && !ruleStartDate) {
      toast.error('Start date is required.');
      return;
    }

    try {
      const url = editRuleId ? `/access/student/${editRuleId}` : '/access/student';
      const method = editRuleId ? 'PUT' : 'POST';
      await apiFetch(url, {
        method,
        body: JSON.stringify({
          studentId: selectedStudent._id,
          courseId: ruleCourseId,
          accessType: ruleAccessType,
          subjectId: ruleSubjectId,
          moduleId: ruleModuleId,
          lessonId: ruleLessonId || undefined,
          status: ruleStatus,
          startDate: ruleStartDate || undefined,
          expiryDate: ruleExpiryDate || undefined
        })
      });
      toast.success(editRuleId ? 'Access override updated successfully' : 'Access override created successfully');
      setShowOverrideModal(false);
      setEditRuleId(null);
      // Reload rules
      handleSelectStudent(selectedStudent);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save override rule');
    }
  };

  const handleDeleteOverride = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this permission override?')) return;
    try {
      await apiFetch(`/access/student/${id}`, { method: 'DELETE' });
      toast.success('Override removed successfully');
      if (selectedStudent) handleSelectStudent(selectedStudent);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete rule');
    }
  };

  const handleEditOverride = async (rule: any) => {
    setEditRuleId(rule._id);
    setRuleCourseId(rule.courseId?._id || rule.courseId || '');
    setRuleAccessType(rule.accessType);
    setRuleSubjectId(rule.subjectId || '');
    setRuleModuleId(rule.moduleId || '');
    setRuleLessonId(rule.lessonId?._id || rule.lessonId || '');
    setRuleStatus(rule.status);
    setRuleStartDate(rule.startDate ? rule.startDate.split('T')[0] : '');
    setRuleExpiryDate(rule.expiryDate ? rule.expiryDate.split('T')[0] : '');

    // Fetch curriculum selectors helper for this course
    const courseId = rule.courseId?._id || rule.courseId || '';
    if (courseId) {
      try {
        const meta = await apiFetch(`/access/curriculum-meta/${courseId}`);
        setCourseMeta(meta);
      } catch (err: any) {
        console.error('Failed to load curriculum selectors:', err);
      }
    }

    setShowOverrideModal(true);
  };

  // Package logic
  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName) return toast.error('Package name is required');
    try {
      const splitList = (str: string) => str.split(',').map(s => s.trim()).filter(Boolean);
      const url = editPackageId ? `/access/packages/${editPackageId}` : '/access/packages';
      const method = editPackageId ? 'PUT' : 'POST';
      await apiFetch(url, {
        method,
        body: JSON.stringify({
          name: pkgName,
          description: pkgDesc,
          courseIds: pkgCourses,
          subjectIds: splitList(pkgSubjects),
          moduleIds: splitList(pkgModules),
          lessonIds: pkgLessons
        })
      });
      toast.success(editPackageId ? 'Access package updated successfully' : 'Access package created successfully');
      setShowPackageModal(false);
      setPkgName('');
      setPkgDesc('');
      setPkgCourses([]);
      setPkgSubjects('');
      setPkgModules('');
      setPkgLessons([]);
      setEditPackageId(null);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save package');
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!window.confirm('Delete package? Students assigned this package will lose inherited permissions.')) return;
    try {
      await apiFetch(`/access/packages/${id}`, { method: 'DELETE' });
      toast.success('Package deleted successfully');
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete package');
    }
  };

  const handleEditPackage = (pkg: any) => {
    setEditPackageId(pkg._id);
    setPkgName(pkg.name);
    setPkgDesc(pkg.description || '');
    setPkgCourses(pkg.courseIds.map((c: any) => c._id || c));
    setPkgSubjects(pkg.subjectIds.join(', '));
    setPkgModules(pkg.moduleIds.join(', '));
    setPkgLessons(pkg.lessonIds.map((l: any) => l._id || l));
    setShowPackageModal(true);
  };

  const handleAssignPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assignPackageId && !assignExpiry) {
      toast.error('Please select an access expiry date.');
      return;
    }
    try {
      await apiFetch(`/access/student/${assignStudentId}/assign-package`, {
        method: 'POST',
        body: JSON.stringify({
          packageId: assignPackageId || null,
          packageExpiryDate: assignExpiry || undefined
        })
      });
      toast.success('Package mapping updated successfully');
      setShowAssignModal(false);
      loadAllData();
      if (selectedStudent && selectedStudent._id === assignStudentId) {
        setSelectedStudent((prev: any) => ({
          ...prev,
          assignedPackage: assignPackageId ? packages.find(p => p._id === assignPackageId) : null,
          packageExpiryDate: assignExpiry || null
        }));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign package');
    }
  };

  // Batch access logic
  const handleCreateBatchRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName) return toast.error('Batch Name is required');
    if (!batchExpiry) return toast.error('Expiry date is required.');
    try {
      const splitList = (str: string) => str.split(',').map(s => s.trim()).filter(Boolean);
      const url = editBatchId ? `/access/batches/${editBatchId}` : '/access/batches';
      const method = editBatchId ? 'PUT' : 'POST';
      await apiFetch(url, {
        method,
        body: JSON.stringify({
          batchName,
          courseIds: batchCourses,
          subjectIds: splitList(batchSubjects),
          moduleIds: splitList(batchModules),
          status: batchStatus,
          startDate: batchStart || undefined,
          expiryDate: batchExpiry || undefined
        })
      });
      toast.success(editBatchId ? 'Batch rule updated successfully' : 'Batch permissions saved successfully');
      setShowBatchModal(false);
      setEditBatchId(null);
      setBatchName('');
      setBatchCourses([]);
      setBatchSubjects('');
      setBatchModules('');
      setBatchStart('');
      setBatchExpiry('');
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save batch rule');
    }
  };

  const handleDeleteBatchRule = async (id: string) => {
    if (!window.confirm('Delete batch permission rule?')) return;
    try {
      await apiFetch(`/access/batches/${id}`, { method: 'DELETE' });
      toast.success('Batch rule deleted successfully');
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete batch rule');
    }
  };

  const handleEditBatchRule = (batch: any) => {
    setEditBatchId(batch._id);
    setBatchName(batch.batchName);
    setBatchCourses(batch.courseIds.map((c: any) => c._id || c));
    setBatchSubjects(batch.subjectIds.join(', '));
    setBatchModules(batch.moduleIds.join(', '));
    setBatchStatus(batch.status);
    setBatchStart(batch.startDate ? batch.startDate.split('T')[0] : '');
    setBatchExpiry(batch.expiryDate ? batch.expiryDate.split('T')[0] : '');
    setShowBatchModal(true);
  };

  const filteredStudentsList = students.filter(student =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
    String(student.user_id).includes(studentSearch)
  );

  return (
    <div className="space-y-6">
      {/* Subtab selection */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2 bg-card p-1 rounded-xl border border-border/50 shadow-sm">
          {[
            { id: 'students', label: 'Student Permissions', icon: Users },
            { id: 'packages', label: 'Access Packages', icon: Package },
            { id: 'batches', label: 'Batch Controls', icon: Layers },
            { id: 'analytics', label: 'Analytics Dashboard', icon: TrendingUp }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => {
                setSubTab(t.id as any);
                setSelectedStudent(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                subTab === t.id
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 bg-muted/50 border px-3 py-1.5 rounded-full">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>Manual offline activation mode active</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading access controls database...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: Student Permissions */}
          {subTab === 'students' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Students grid */}
              <div className="xl:col-span-1 space-y-4">
                <Card className="border-border/50 bg-card shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Search className="w-5 h-5 text-primary" />
                      <span>Search Students</span>
                    </CardTitle>
                    <CardDescription>
                      Grant and configure direct granular locks & permissions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search student ID, name, email..."
                        className="pl-10 rounded-xl"
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                      />
                    </div>

                    <ScrollArea className="h-[480px] pr-2">
                      <div className="space-y-2">
                        {filteredStudentsList.map(st => (
                          <div
                            key={st._id}
                            onClick={() => handleSelectStudent(st)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                              selectedStudent?._id === st._id
                                ? 'bg-primary/5 border-primary'
                                : 'bg-card border-border/40 hover:border-border/80'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-foreground leading-tight truncate max-w-[150px]">{st.name}</span>
                              <Badge variant={st.status === 'active' ? 'default' : 'destructive'} className="text-[10px] uppercase font-bold px-1.5 py-0.5">
                                {st.status}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">{st.email}</div>
                            
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/25 rounded-md px-1.5 py-0.5">
                                ID: {st.user_id}
                              </span>
                              {st.batchName && (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border rounded-md px-1.5 py-0.5">
                                  Batch: {st.batchName}
                                </span>
                              )}
                            </div>

                            {st.assignedPackage && (
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200/50 rounded-lg p-1.5 mt-1">
                                <Package className="w-3.5 h-3.5" />
                                <span className="truncate">Pkg: {st.assignedPackage.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                        {filteredStudentsList.length === 0 && (
                          <div className="text-center py-8 text-xs text-muted-foreground font-semibold">
                            No students match this query.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Student detail/rules management */}
              <div className="xl:col-span-2 space-y-6">
                {selectedStudent ? (
                  <Card className="border-border/50 bg-card shadow-sm">
                    <CardHeader className="border-b border-border/40 pb-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                        <div>
                          <CardTitle className="text-xl font-black text-foreground">{selectedStudent.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            User ID: {selectedStudent.user_id} · Email: {selectedStudent.email}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-[#1f5fa7] text-white flex items-center gap-1.5 rounded-lg"
                            onClick={() => {
                              setEditRuleId(null);
                              setRuleCourseId('');
                              setRuleAccessType('course');
                              setRuleSubjectId('');
                              setRuleModuleId('');
                              setRuleLessonId('');
                              setRuleStatus('active');
                              setRuleStartDate('');
                              setRuleExpiryDate('');
                              setShowOverrideModal(true);
                              if (courses.length > 0) handleCourseChange(courses[0]._id);
                            }}
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Permission Rule</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1.5 rounded-lg border-border"
                            onClick={() => {
                              setAssignStudentId(selectedStudent._id);
                              setAssignPackageId(selectedStudent.assignedPackage?._id || '');
                              setAssignExpiry(selectedStudent.packageExpiryDate ? selectedStudent.packageExpiryDate.split('T')[0] : '');
                              setShowAssignModal(true);
                            }}
                          >
                            <Package className="w-4 h-4" />
                            <span>Set Package</span>
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      {/* Package details banner */}
                      {selectedStudent.assignedPackage && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-600/10 to-indigo-600/5 border border-violet-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-violet-600/15 border border-violet-500/30 rounded-xl text-violet-600">
                              <Package className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-violet-950">Assigned Access Package</h4>
                              <p className="text-xs text-violet-600 font-semibold mt-0.5">
                                Inherits all permissions inside package: <strong className="underline">{selectedStudent.assignedPackage.name}</strong>
                              </p>
                            </div>
                          </div>
                          {selectedStudent.packageExpiryDate && (
                            <div className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-violet-500" />
                              <span>Valid Until: {new Date(selectedStudent.packageExpiryDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Overrides Table */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Key className="w-4 h-4 text-primary" />
                          <span>Direct Permission Rules & Custom Blocks</span>
                        </h3>

                        <div className="border border-border/50 rounded-2xl overflow-hidden bg-card shadow-sm">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead className="text-xs font-bold">Course / Target</TableHead>
                                <TableHead className="text-xs font-bold">Scope Level</TableHead>
                                <TableHead className="text-xs font-bold">Access Status</TableHead>
                                <TableHead className="text-xs font-bold">Start Date</TableHead>
                                <TableHead className="text-xs font-bold">Expiry Date</TableHead>
                                <TableHead className="w-[80px] text-right font-bold"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {studentRules.map(rule => {
                                const targetDetail =
                                  rule.accessType === 'lesson' && rule.lessonId ? `Lesson: ${rule.lessonId.title}` :
                                  rule.accessType === 'module' ? `Module: ${rule.moduleId}` :
                                  rule.accessType === 'subject' ? `Subject: ${rule.subjectId}` :
                                  rule.courseId?.title || 'Unknown Course';

                                return (
                                  <TableRow key={rule._id} className="hover:bg-muted/10">
                                    <TableCell className="font-semibold text-xs leading-normal">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-foreground">{targetDetail}</span>
                                        {rule.accessType !== 'course' && (
                                          <span className="text-[10px] text-muted-foreground">Course: {rule.courseId?.title}</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs capitalize font-medium text-slate-500">
                                      {rule.accessType}
                                    </TableCell>
                                    <TableCell>
                                      {(() => {
                                        const isExpired = rule.status === 'expired' || (rule.expiryDate && new Date(rule.expiryDate) < new Date());
                                        if (isExpired) {
                                          return (
                                            <Badge
                                              variant="destructive"
                                              className="text-[9px] uppercase font-black tracking-wider px-2 py-0.5 bg-red-600 text-white border border-red-700"
                                            >
                                              Expired
                                            </Badge>
                                          );
                                        }
                                        return (
                                          <Badge
                                            variant={rule.status === 'active' ? 'default' : 'destructive'}
                                            className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 ${
                                              rule.status === 'active' ? 'bg-green-500/10 text-green-600 border border-green-500/30' :
                                              rule.status === 'locked' ? 'bg-red-500/15 text-red-500 border border-red-500/25 animate-pulse' :
                                              'bg-yellow-500/10 text-yellow-600 border border-yellow-500/30'
                                            }`}
                                          >
                                            {rule.status}
                                          </Badge>
                                        );
                                      })()}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium text-slate-500">
                                      {rule.startDate ? new Date(rule.startDate).toLocaleDateString() : 'Immediate'}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium text-slate-500">
                                      {rule.expiryDate ? new Date(rule.expiryDate).toLocaleDateString() : 'Lifetime'}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                                          onClick={() => handleEditOverride(rule)}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                          onClick={() => handleDeleteOverride(rule._id)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              {studentRules.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground font-semibold">
                                    No custom override rules set. Student accesses content via Packages, Batches, or legacy enrollments.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-border/50 bg-card p-12 text-center shadow-sm">
                    <Key className="w-12 h-12 text-primary mx-auto mb-3 opacity-40" />
                    <h3 className="font-bold text-lg">Select a Student</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
                      Select a student from the sidebar list to inspect, edit, or configure custom course-level, subject-level, or lesson-level rules.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Access Packages */}
          {subTab === 'packages' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">Content Access Packages</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Bundle multiple courses and specific levels to assign to students instantly.</p>
                </div>
                <Button
                  className="bg-primary hover:bg-[#1f5fa7] text-white flex items-center gap-1.5 rounded-xl"
                  onClick={() => {
                    setEditPackageId(null);
                    setPkgName('');
                    setPkgDesc('');
                    setPkgCourses([]);
                    setPkgSubjects('');
                    setPkgModules('');
                    setPkgLessons([]);
                    setShowPackageModal(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Package</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {packages.map(pkg => (
                  <Card key={pkg._id} className="border-border/50 bg-card shadow-sm flex flex-col justify-between">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 bg-violet-600/10 border border-violet-500/20 text-violet-600 rounded-xl">
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-extrabold text-foreground">{pkg.name}</CardTitle>
                            <CardDescription className="text-xs mt-0.5 max-w-[200px] truncate">{pkg.description || 'No description'}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleEditPackage(pkg)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeletePackage(pkg._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 flex-1 space-y-4 text-xs font-semibold">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bundled Content</span>
                        
                        <div className="space-y-1.5">
                          {pkg.courseIds.map((c: any) => (
                            <div key={c._id} className="flex items-center gap-1.5 text-foreground leading-snug">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span className="truncate">Course: {c.title}</span>
                            </div>
                          ))}
                          
                          {pkg.subjectIds.map((sub: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-1.5 text-foreground">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>Subject: {sub}</span>
                            </div>
                          ))}

                          {pkg.moduleIds.map((mod: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-1.5 text-foreground">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>Module: {mod}</span>
                            </div>
                          ))}

                          {pkg.lessonIds.map((l: any) => (
                            <div key={l._id} className="flex items-center gap-1.5 text-foreground leading-snug">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span className="truncate">Lesson: {l.title}</span>
                            </div>
                          ))}

                          {pkg.courseIds.length === 0 && pkg.subjectIds.length === 0 && pkg.moduleIds.length === 0 && pkg.lessonIds.length === 0 && (
                            <span className="text-muted-foreground italic font-medium text-[11px]">No items configured in package.</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {packages.length === 0 && (
                  <Card className="col-span-full border-border/50 bg-card p-12 text-center shadow-sm">
                    <Package className="w-12 h-12 text-primary mx-auto mb-3 opacity-40" />
                    <h3 className="font-bold text-base">No Packages Found</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 leading-relaxed">
                      Bundle complex course/module access profiles together to allow single-click assignments for students.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Batch Control */}
          {subTab === 'batches' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">Batch Access Management</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Configure access parameters for entire student batches (mapped by batchName string).</p>
                </div>
                <Button
                  className="bg-primary hover:bg-[#1f5fa7] text-white flex items-center gap-1.5 rounded-xl"
                  onClick={() => {
                    setEditBatchId(null);
                    setBatchName('');
                    setBatchCourses([]);
                    setBatchSubjects('');
                    setBatchModules('');
                    setBatchStart('');
                    setBatchExpiry('');
                    setBatchStatus('active');
                    setShowBatchModal(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Configure Batch Rule</span>
                </Button>
              </div>

              <div className="border border-border/50 rounded-2xl overflow-hidden bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-bold">Batch Name</TableHead>
                      <TableHead className="text-xs font-bold">Granted Courses & Items</TableHead>
                      <TableHead className="text-xs font-bold">Status</TableHead>
                      <TableHead className="text-xs font-bold">Start Date</TableHead>
                      <TableHead className="text-xs font-bold">Expiry Date</TableHead>
                      <TableHead className="w-[80px] text-right font-bold"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map(batch => (
                      <TableRow key={batch._id} className="hover:bg-muted/10">
                        <TableCell className="font-extrabold text-sm text-foreground">
                          {batch.batchName}
                        </TableCell>
                        <TableCell className="max-w-xs font-semibold text-xs leading-normal">
                          <div className="flex flex-col gap-1 py-1">
                            {batch.courseIds.map((c: any) => (
                              <span key={c._id} className="text-slate-600">✓ Course: {c.title}</span>
                            ))}
                            {batch.subjectIds.map((sub: string, idx: number) => (
                              <span key={idx} className="text-slate-600">✓ Subject: {sub}</span>
                            ))}
                            {batch.moduleIds.map((mod: string, idx: number) => (
                              <span key={idx} className="text-slate-600">✓ Module: {mod}</span>
                            ))}
                            {batch.courseIds.length === 0 && batch.subjectIds.length === 0 && batch.moduleIds.length === 0 && (
                              <span className="text-muted-foreground italic font-medium">No permissions configured</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const isExpired = batch.status === 'expired' || (batch.expiryDate && new Date(batch.expiryDate) < new Date());
                            if (isExpired) {
                              return (
                                <Badge
                                  variant="destructive"
                                  className="text-[9px] uppercase font-black tracking-wider px-2 py-0.5 bg-red-600 text-white border border-red-700"
                                >
                                  Expired
                                </Badge>
                              );
                            }
                            return (
                              <Badge
                                variant={batch.status === 'active' ? 'default' : 'destructive'}
                                className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 ${
                                  batch.status === 'active' ? 'bg-green-500/10 text-green-600 border border-green-500/30' :
                                  'bg-red-500/15 text-red-500 border border-red-500/25 animate-pulse'
                                }`}
                              >
                                {batch.status}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-500">
                          {batch.startDate ? new Date(batch.startDate).toLocaleDateString() : 'Immediate'}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-500">
                          {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'Lifetime'}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => handleEditBatchRule(batch)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteBatchRule(batch._id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {batches.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground font-semibold">
                          No batch access rules configured. Set up rules to automatically bind permissions to class batches.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* TAB 4: Analytics */}
          {subTab === 'analytics' && (
            <div className="space-y-6">
              {/* Analytics header cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: 'Total Registered Students', value: analytics.totalStudents, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
                  { title: 'Active Direct Grants', value: analytics.activeDirectCount, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                  { title: 'Locked Access Override Accounts', value: analytics.directLocksCount, icon: Lock, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20 animate-pulse' },
                  { title: 'Active Package Members', value: analytics.activePackagesCount, icon: Package, color: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/20' }
                ].map(card => (
                  <Card key={card.title} className="border-border/50 bg-card shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{card.title}</span>
                        <div className={`p-2.5 rounded-xl border ${card.bg} ${card.color}`}>
                          <card.icon className="w-5 h-5" />
                        </div>
                      </div>
                      <h4 className="text-3xl font-black text-foreground">{card.value}</h4>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Sub stats */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-2 border-border/50 bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Package className="w-5 h-5 text-violet-500" />
                      <span>Most Popular Access Packages</span>
                    </CardTitle>
                    <CardDescription>Highest active student subscriptions counts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-border/40 rounded-xl overflow-hidden bg-card/50">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-xs font-bold">Package Name</TableHead>
                            <TableHead className="text-xs font-bold text-right">Active Students Assigned</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.popularPackages.map((pkg: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-extrabold text-sm">{pkg.name}</TableCell>
                              <TableCell className="text-right font-black text-sm text-primary">{pkg.count}</TableCell>
                            </TableRow>
                          ))}
                          {analytics.popularPackages.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-6 text-xs text-muted-foreground">
                                No package assignments tracked yet.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="xl:col-span-1 border-border/50 bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <span>Access Warnings & Issues</span>
                    </CardTitle>
                    <CardDescription>Actionable student block indicators</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-yellow-800">
                        <span>Deactivated Accounts:</span>
                        <span className="text-sm">{analytics.inactiveStudents}</span>
                      </div>
                      <p className="text-[10px] text-yellow-700 leading-normal">
                        Students that are globally inactive cannot access any lectures regardless of packages or batches.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-violet-800">
                        <span>Expired Package Accesses:</span>
                        <span className="text-sm">{analytics.expiredPackagesCount}</span>
                      </div>
                      <p className="text-[10px] text-violet-700 leading-normal">
                        Students whose package expiration dates have passed. They will see the Expiry Lock Screen on content.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Upcoming Expirations and Expired Records Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border/50 bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-500" />
                      <span>Upcoming Expirations (Next 7 Days)</span>
                    </CardTitle>
                    <CardDescription>Direct student, package, and batch rules expiring soon.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-border/40 rounded-xl overflow-hidden bg-card/50">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-xs font-bold">Student / Target</TableHead>
                            <TableHead className="text-xs font-bold">Scope / Package</TableHead>
                            <TableHead className="text-xs font-bold text-right">Expires On</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.upcomingExpirations && analytics.upcomingExpirations.map((item: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-semibold text-xs leading-normal">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-foreground">{item.studentName}</span>
                                  <span className="text-[10px] text-muted-foreground">ID: {item.studentId}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-medium text-slate-500">
                                {item.target}
                              </TableCell>
                              <TableCell className="text-right text-xs font-bold text-amber-600">
                                {new Date(item.expiryDate).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!analytics.upcomingExpirations || analytics.upcomingExpirations.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                                No upcoming expirations in the next 7 days.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span>Expired Student Overrides</span>
                    </CardTitle>
                    <CardDescription>Custom student permission blocks that have expired.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-border/40 rounded-xl overflow-hidden bg-card/50">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-xs font-bold">Student / Target</TableHead>
                            <TableHead className="text-xs font-bold">Scope</TableHead>
                            <TableHead className="text-xs font-bold text-right">Expired On</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.expiredOverrides && analytics.expiredOverrides.map((item: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-semibold text-xs leading-normal">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-foreground">{item.studentName}</span>
                                  <span className="text-[10px] text-muted-foreground">ID: {item.studentId}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-medium text-slate-500">
                                {item.target}
                              </TableCell>
                              <TableCell className="text-right text-xs font-bold text-red-500">
                                {new Date(item.expiryDate).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!analytics.expiredOverrides || analytics.expiredOverrides.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                                No expired student overrides found.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-bold">{editRuleId ? 'Edit Access Override' : 'Create Access Override'}</CardTitle>
              <CardDescription className="text-xs">
                {editRuleId ? 'Modify the existing override configuration.' : `Set custom access parameters overriding defaults for ${selectedStudent?.name}.`}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateOverride}>
              <CardContent className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs">Select Course</Label>
                    <select
                      className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 outline-none text-xs font-semibold text-foreground focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                      value={ruleCourseId}
                      onChange={e => handleCourseChange(e.target.value)}
                      required
                      disabled={!!editRuleId}
                    >
                      <option value="">-- Choose Course --</option>
                      {courses.map(c => (
                        <option key={c._id} value={c._id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  {ruleCourseId && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="font-semibold text-xs">Access Level Scope</Label>
                        <select
                          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 outline-none text-xs font-semibold focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                          value={ruleAccessType}
                          onChange={e => {
                            setRuleAccessType(e.target.value as any);
                            setRuleSubjectId('');
                            setRuleModuleId('');
                            setRuleLessonId('');
                          }}
                          required
                          disabled={!!editRuleId}
                        >
                          <option value="course">Entire Course</option>
                          <option value="subject">Subject Level</option>
                          <option value="module">Module Level</option>
                          <option value="lesson">Individual Lesson</option>
                        </select>
                      </div>

                      {ruleAccessType === 'subject' && (
                        <div className="space-y-1.5">
                          <Label className="font-semibold text-xs">Subject Title</Label>
                          <select
                            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 outline-none text-xs font-semibold focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                            value={ruleSubjectId}
                            onChange={e => setRuleSubjectId(e.target.value)}
                            required
                            disabled={!!editRuleId}
                          >
                            <option value="">-- Select Subject --</option>
                            {courseMeta.subjects.map((sub: string) => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {ruleAccessType === 'module' && (
                        <div className="space-y-1.5">
                          <Label className="font-semibold text-xs">Module Title</Label>
                          <select
                            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 outline-none text-xs font-semibold focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                            value={ruleModuleId}
                            onChange={e => setRuleModuleId(e.target.value)}
                            required
                            disabled={!!editRuleId}
                          >
                            <option value="">-- Select Module --</option>
                            {courseMeta.modules.map((mod: string) => (
                              <option key={mod} value={mod}>{mod}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {ruleAccessType === 'lesson' && (
                        <div className="space-y-1.5">
                          <Label className="font-semibold text-xs">Select Lesson</Label>
                          <select
                            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 outline-none text-xs font-semibold focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                            value={ruleLessonId}
                            onChange={e => setRuleLessonId(e.target.value)}
                            required
                            disabled={!!editRuleId}
                          >
                            <option value="">-- Select Lesson --</option>
                            {courseMeta.lessons.map((l: any) => (
                              <option key={l._id} value={l._id}>[{l.subjectTitle} - {l.moduleTitle}] {l.title}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="font-semibold text-xs">Override Status</Label>
                      <select
                        className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 outline-none text-xs font-semibold focus:border-primary"
                        value={ruleStatus}
                        onChange={e => setRuleStatus(e.target.value as any)}
                        required
                      >
                        <option value="active">Active (Unlock)</option>
                        <option value="locked">Locked</option>
                        <option value="suspended">Suspended</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-semibold text-xs">
                        Start Date {ruleAccessType === 'course' ? <span className="text-red-500">*</span> : '(Optional)'}
                      </Label>
                      <Input
                        type="date"
                        className="rounded-xl text-xs"
                        value={ruleStartDate}
                        onChange={e => setRuleStartDate(e.target.value)}
                        required={ruleAccessType === 'course'}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs">
                      Expiry Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      className="rounded-xl text-xs"
                      value={ruleExpiryDate}
                      onChange={e => setRuleExpiryDate(e.target.value)}
                      required
                    />
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                      Access will automatically expire on the selected date.
                    </p>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 border-t border-border/40 flex justify-end gap-3 bg-muted/10">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setShowOverrideModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-[#1f5fa7] text-white rounded-xl"
                >
                  Save Override Rule
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Package Creation Modal */}
      {showPackageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-bold">{editPackageId ? 'Edit Access Package' : 'Create Access Package'}</CardTitle>
              <CardDescription className="text-xs">{editPackageId ? 'Modify the existing package configuration.' : 'Define a bundle mapping with customized granular targets.'}</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreatePackage}>
              <ScrollArea className="max-h-[500px]">
                <CardContent className="p-6 space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs">Package Name</Label>
                    <Input
                      placeholder="e.g. Accounting + Law Package"
                      className="rounded-xl"
                      value={pkgName}
                      onChange={e => setPkgName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs">Description</Label>
                    <Input
                      placeholder="e.g. Grants access to accounts and commercial law courses"
                      className="rounded-xl"
                      value={pkgDesc}
                      onChange={e => setPkgDesc(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs mb-1 block">Courses Included (Check all that apply)</Label>
                    <div className="border border-border/50 rounded-xl p-3 bg-card space-y-2 max-h-36 overflow-y-auto">
                      {courses.map(c => (
                        <div key={c._id} className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            id={`pkg-course-${c._id}`}
                            checked={pkgCourses.includes(c._id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setPkgCourses([...pkgCourses, c._id]);
                              } else {
                                setPkgCourses(pkgCourses.filter(id => id !== c._id));
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                          />
                          <label htmlFor={`pkg-course-${c._id}`} className="font-semibold cursor-pointer">{c.title}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs">Included Subjects (Comma separated titles, optional)</Label>
                    <Input
                      placeholder="Accounting, Business Law"
                      className="rounded-xl"
                      value={pkgSubjects}
                      onChange={e => setPkgSubjects(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground font-semibold">Grants permissions to any lessons matching these subjects.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs">Included Modules (Comma separated titles, optional)</Label>
                    <Input
                      placeholder="Module 1, Module 2"
                      className="rounded-xl"
                      value={pkgModules}
                      onChange={e => setPkgModules(e.target.value)}
                    />
                  </div>
                </CardContent>
              </ScrollArea>
              <div className="p-6 border-t border-border/40 flex justify-end gap-3 bg-muted/10">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setShowPackageModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-[#1f5fa7] text-white rounded-xl font-bold"
                >
                  {editPackageId ? 'Update Package' : 'Create Package'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Assign Package Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-card border border-border shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-bold">Assign Access Package</CardTitle>
              <CardDescription className="text-xs">Map access package inherited rules onto student profile.</CardDescription>
            </CardHeader>
            <form onSubmit={handleAssignPackage}>
              <CardContent className="p-6 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs">Select Package</Label>
                  <select
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 outline-none text-xs font-semibold focus:border-primary"
                    value={assignPackageId}
                    onChange={e => setAssignPackageId(e.target.value)}
                  >
                    <option value="">-- No Active Package (Revoke/None) --</option>
                    {packages.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs">
                    Package Expiry Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    className="rounded-xl text-xs"
                    value={assignExpiry}
                    onChange={e => setAssignExpiry(e.target.value)}
                    required={!!assignPackageId}
                  />
                  <p className="text-[10px] text-muted-foreground font-semibold">Access will automatically expire on the selected date.</p>
                  {assignPackageId && !assignExpiry && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1">
                      Please select an access expiry date.
                    </p>
                  )}
                </div>
              </CardContent>
              <div className="p-6 border-t border-border/40 flex justify-end gap-3 bg-muted/10">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-[#1f5fa7] text-white rounded-xl font-bold"
                  disabled={!!assignPackageId && !assignExpiry}
                >
                  Confirm Assignment
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Batch Access Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-bold">{editBatchId ? 'Edit Batch Access' : 'Configure Batch Access'}</CardTitle>
              <CardDescription className="text-xs">Grant curriculum permissions for an entire student batch.</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateBatchRule}>
              <ScrollArea className="max-h-[500px]">
                <CardContent className="p-6 space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs">Batch Name</Label>
                    <Input
                      placeholder="e.g. CA Foundation Batch A"
                      className="rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                      value={batchName}
                      onChange={e => setBatchName(e.target.value)}
                      required
                      disabled={!!editBatchId}
                    />
                    <p className="text-[10px] text-muted-foreground font-semibold">Must match the exact batchName field set on students.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs mb-1 block">Courses Included (Check all that apply)</Label>
                    <div className="border border-border/50 rounded-xl p-3 bg-card space-y-2 max-h-36 overflow-y-auto">
                      {courses.map(c => (
                        <div key={c._id} className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            id={`batch-course-${c._id}`}
                            checked={batchCourses.includes(c._id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setBatchCourses([...batchCourses, c._id]);
                              } else {
                                setBatchCourses(batchCourses.filter(id => id !== c._id));
                              }
                            }}
                            className="rounded border-border text-primary h-4 w-4"
                          />
                          <label htmlFor={`batch-course-${c._id}`} className="font-semibold cursor-pointer">{c.title}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs">Included Subjects (Comma separated, optional)</Label>
                    <Input
                      placeholder="Accounting, Business Law"
                      className="rounded-xl"
                      value={batchSubjects}
                      onChange={e => setBatchSubjects(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs">Included Modules (Comma separated, optional)</Label>
                    <Input
                      placeholder="Module 1, Module 2"
                      className="rounded-xl"
                      value={batchModules}
                      onChange={e => setBatchModules(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="font-semibold text-xs">Batch Access Status</Label>
                      <select
                        className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 outline-none text-xs font-semibold focus:border-primary"
                        value={batchStatus}
                        onChange={e => setBatchStatus(e.target.value as any)}
                        required
                      >
                        <option value="active">Active (Unlock)</option>
                        <option value="locked">Locked</option>
                        <option value="suspended">Suspended</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-semibold text-xs">Start Date (Optional)</Label>
                      <Input
                        type="date"
                        className="rounded-xl text-xs"
                        value={batchStart}
                        onChange={e => setBatchStart(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs">
                      Expiry Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      className="rounded-xl text-xs"
                      value={batchExpiry}
                      onChange={e => setBatchExpiry(e.target.value)}
                      required
                    />
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1">Access will automatically expire on the selected date.</p>
                  </div>
                </CardContent>
              </ScrollArea>
              <div className="p-6 border-t border-border/40 flex justify-end gap-3 bg-muted/10">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setShowBatchModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-[#1f5fa7] text-white rounded-xl font-bold"
                >
                  Save Batch Rule
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
