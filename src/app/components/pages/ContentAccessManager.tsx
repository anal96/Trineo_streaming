import { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  UserCheck,
  UserX,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  Users,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Check,
  XCircle,
  GraduationCap,
  BookOpen,
  Layers,
  FileText,
  Shield,
  Mail,
  Phone,
  Building2,
  Hash,
  CalendarDays,
  Zap,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { toast } from 'sonner';
import { apiFetch } from '../../utils/api';

// Date formatting helper
const formatDate = (dateString: any) => {
  if (!dateString) return 'No Expiry Set';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) {
    return 'Invalid Expiry';
  }
  if (d.getTime() === 0 || d.getFullYear() === 1970) {
    return 'No Expiry Set';
  }
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatRelativeDate = (dateString: any) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, urgent: true };
  if (days === 0) return { text: 'Expires today', urgent: true };
  if (days <= 7) return { text: `${days}d remaining`, urgent: true };
  if (days <= 30) return { text: `${days}d remaining`, urgent: false };
  return { text: `${days}d remaining`, urgent: false };
};

export default function ContentAccessManager() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    validRules: 0,
    requiringReview: 0,
    expiringWithin7Days: 0,
    suspendedRules: 0,
    expiredRules: 0
  });

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('All');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState('All');

  // Individual Form State
  const [detailStatus, setDetailStatus] = useState<'active' | 'inactive'>('active');
  const [detailExpiry, setDetailExpiry] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Detailed Content Access Restrictions
  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [restrictionsLoading, setRestrictionsLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  // Bulk operation form states
  const [bulkExpiryDate, setBulkExpiryDate] = useState('');
  const [showBulkExpiryInput, setShowBulkExpiryInput] = useState(false);

  // Bulk content restriction states
  const [bulkHierarchy, setBulkHierarchy] = useState<any>(null);
  const [bulkBatchId, setBulkBatchId] = useState<string | null>(null);
  const [bulkBatchName, setBulkBatchName] = useState<string | null>(null);
  const [bulkExpandedNodes, setBulkExpandedNodes] = useState<Record<string, boolean>>({});
  const [bulkHierarchyLoading, setBulkHierarchyLoading] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const studentsData = await apiFetch('/access/students');
      setStudents(studentsData || []);

      const analyticsData = await apiFetch('/access/analytics');
      setAnalytics(analyticsData || {
        validRules: 0,
        requiringReview: 0,
        expiringWithin7Days: 0,
        suspendedRules: 0,
        expiredRules: 0
      });
    } catch (err: any) {
      toast.error('Failed to load access data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentRestrictions = async (studentId: string) => {
    setRestrictionsLoading(true);
    setHierarchy(null);
    setRestrictions([]);
    setActiveBatchId(null);
    try {
      const data = await apiFetch(`/access/student/${studentId}/restrictions`);
      if (data) {
        setRestrictions(data.restrictions || []);
        setHierarchy(data.hierarchy || null);
        if (data.program) {
          setActiveBatchId(data.program.id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load restrictions:', err);
    } finally {
      setRestrictionsLoading(false);
    }
  };

  const handleToggleNodeAccess = async (
    nodeType: 'batch' | 'subject' | 'unit' | 'topic',
    nodeId: string | null,
    currentStatus: 'allowed' | 'blocked'
  ) => {
    if (!selectedStudent || !activeBatchId) return;
    const targetStatus = currentStatus === 'allowed' ? 'blocked' : 'allowed';
    try {
      await apiFetch(`/access/student/${selectedStudent._id}/restrictions/toggle`, {
        method: 'POST',
        body: JSON.stringify({
          batchId: activeBatchId,
          subjectId: nodeType === 'subject' ? nodeId : undefined,
          unitId: nodeType === 'unit' ? nodeId : undefined,
          topicId: nodeType === 'topic' ? nodeId : undefined,
          status: targetStatus
        })
      });
      toast.success(`Access updated successfully`);
      loadStudentRestrictions(selectedStudent._id);
    } catch (err: any) {
      toast.error('Failed to toggle access: ' + err.message);
    }
  };

  const handleQuickAction = async (action: string) => {
    if (!selectedStudent || !activeBatchId) return;
    try {
      await apiFetch(`/access/student/${selectedStudent._id}/restrictions/quick-action`, {
        method: 'POST',
        body: JSON.stringify({
          batchId: activeBatchId,
          action
        })
      });
      toast.success(`Quick action executed successfully`);
      loadStudentRestrictions(selectedStudent._id);
    } catch (err: any) {
      toast.error('Quick action failed: ' + err.message);
    }
  };

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const toggleBulkNodeExpand = (nodeId: string) => {
    setBulkExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const loadBulkBatchHierarchy = async (batchName: string) => {
    setBulkHierarchyLoading(true);
    setBulkHierarchy(null);
    setBulkBatchId(null);
    setBulkBatchName(batchName);
    setBulkExpandedNodes({});
    try {
      const data = await apiFetch(`/access/batch/${encodeURIComponent(batchName)}/hierarchy`);
      if (data && data.program) {
        setBulkBatchId(data.program.id);
        setBulkHierarchy(data.hierarchy || null);
      }
    } catch (err: any) {
      console.error('Failed to load batch hierarchy:', err);
    } finally {
      setBulkHierarchyLoading(false);
    }
  };

  useEffect(() => {
    if (selectedIds.length === 0) {
      setBulkHierarchy(null);
      setBulkBatchId(null);
      setBulkBatchName(null);
      return;
    }
    const selectedStudents = students.filter(s => selectedIds.includes(s._id));
    const batches = new Set(selectedStudents.map(s => s.program || s.courseName).filter(Boolean));
    if (batches.size === 1) {
      const commonBatch = Array.from(batches)[0] as string;
      if (commonBatch !== bulkBatchName) {
        loadBulkBatchHierarchy(commonBatch);
      }
    } else {
      setBulkHierarchy(null);
      setBulkBatchId(null);
      setBulkBatchName(null);
    }
  }, [selectedIds]);

  const handleBulkToggleNodeAccess = async (
    nodeType: 'batch' | 'subject' | 'unit' | 'topic',
    nodeId: string | null,
    currentStatus: 'allowed' | 'blocked'
  ) => {
    if (selectedIds.length === 0 || !bulkBatchId) return;
    const targetStatus = currentStatus === 'allowed' ? 'blocked' : 'allowed';
    try {
      await apiFetch('/access/bulk/restrictions/toggle', {
        method: 'POST',
        body: JSON.stringify({
          studentIds: selectedIds,
          batchId: bulkBatchId,
          subjectId: nodeType === 'subject' ? nodeId : undefined,
          unitId: nodeType === 'unit' ? nodeId : undefined,
          topicId: nodeType === 'topic' ? nodeId : undefined,
          status: targetStatus
        })
      });
      toast.success(`Bulk access updated for ${selectedIds.length} students`);
      if (bulkBatchName) loadBulkBatchHierarchy(bulkBatchName);
      if (selectedStudent && selectedIds.includes(selectedStudent._id)) {
        loadStudentRestrictions(selectedStudent._id);
      }
    } catch (err: any) {
      toast.error('Bulk toggle failed: ' + err.message);
    }
  };

  const handleBulkQuickAction = async (action: string) => {
    if (selectedIds.length === 0 || !bulkBatchId) return;
    try {
      await apiFetch('/access/bulk/restrictions/quick-action', {
        method: 'POST',
        body: JSON.stringify({
          studentIds: selectedIds,
          batchId: bulkBatchId,
          action
        })
      });
      toast.success(`Bulk quick action applied to ${selectedIds.length} students`);
      if (bulkBatchName) loadBulkBatchHierarchy(bulkBatchName);
      if (selectedStudent && selectedIds.includes(selectedStudent._id)) {
        loadStudentRestrictions(selectedStudent._id);
      }
    } catch (err: any) {
      toast.error('Bulk quick action failed: ' + err.message);
    }
  };

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setDetailStatus(student.status || 'active');
    setDetailExpiry(student.packageExpiryDate ? student.packageExpiryDate.split('T')[0] : '');
    loadStudentRestrictions(student._id);
  };

  const handleSaveStudentAccess = async (statusOverride?: any) => {
    if (!selectedStudent) return;
    setIsSaving(true);
    const targetStatus = (statusOverride === 'active' || statusOverride === 'inactive') ? statusOverride : detailStatus;
    try {
      const updated = await apiFetch(`/access/student/${selectedStudent._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: targetStatus,
          packageExpiryDate: detailExpiry || null
        })
      });
      
      toast.success('Access settings saved successfully');
      setDetailStatus(targetStatus);
      
      const updatedStudent = { 
        ...selectedStudent, 
        status: targetStatus, 
        packageExpiryDate: detailExpiry ? new Date(detailExpiry).toISOString() : null 
      };
      setSelectedStudent(updatedStudent);
      
      await loadAllData();
    } catch (err: any) {
      toast.error('Failed to save student access: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDetailStatus(e.target.checked ? 'active' : 'inactive');
  };

  const handleBulkToggleAccess = async (status: 'active' | 'inactive') => {
    if (selectedIds.length === 0) return;
    try {
      await apiFetch('/access/bulk/toggle-access', {
        method: 'POST',
        body: JSON.stringify({
          studentIds: selectedIds,
          status
        })
      });
      toast.success(`Access ${status === 'active' ? 'enabled' : 'disabled'} for ${selectedIds.length} students`);
      setSelectedIds([]);
      await loadAllData();
      if (selectedStudent && selectedIds.includes(selectedStudent._id)) {
        setSelectedStudent(null);
      }
    } catch (err: any) {
      toast.error('Bulk update failed: ' + err.message);
    }
  };

  const handleBulkSetExpiry = async () => {
    if (selectedIds.length === 0) return;
    if (!bulkExpiryDate) {
      toast.error('Please choose a valid expiry date');
      return;
    }
    try {
      await apiFetch('/access/bulk/set-expiry', {
        method: 'POST',
        body: JSON.stringify({
          studentIds: selectedIds,
          packageExpiryDate: bulkExpiryDate
        })
      });
      toast.success(`Expiry set for ${selectedIds.length} students`);
      setSelectedIds([]);
      setShowBulkExpiryInput(false);
      setBulkExpiryDate('');
      await loadAllData();
      if (selectedStudent && selectedIds.includes(selectedStudent._id)) {
        setSelectedStudent(null);
      }
    } catch (err: any) {
      toast.error('Bulk update failed: ' + err.message);
    }
  };

  const handleBulkExtendExpiry = async (days: number) => {
    if (selectedIds.length === 0) return;
    try {
      await apiFetch('/access/bulk/extend-expiry', {
        method: 'POST',
        body: JSON.stringify({
          studentIds: selectedIds,
          days
        })
      });
      toast.success(`Extended access by ${days} days for ${selectedIds.length} students`);
      setSelectedIds([]);
      await loadAllData();
      if (selectedStudent && selectedIds.includes(selectedStudent._id)) {
        setSelectedStudent(null);
      }
    } catch (err: any) {
      toast.error('Bulk extend failed: ' + err.message);
    }
  };

  // Compute student-focused KPIs
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'active').length;
  const now = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const expiringSoon = students.filter(s => 
    s.packageExpiryDate && new Date(s.packageExpiryDate) > now && new Date(s.packageExpiryDate) <= sevenDaysLater
  ).length;
  const suspendedStudents = students.filter(s => s.status !== 'active').length;
  const activeBatches = new Set(students.map(s => s.program || s.courseName).filter(Boolean)).size;

  // Filter students
  const filteredStudents = students.filter(student => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query ? true : (
      student.name?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query) ||
      String(student.user_id).includes(query)
    );

    if (!matchesSearch) return false;

    if (selectedProgramFilter !== 'All') {
      const progVal = student.program || student.courseName || '';
      if (progVal !== selectedProgramFilter) {
        return false;
      }
    }

    const isSuspended = student.status !== 'active';
    const isExpired = student.packageExpiryDate && new Date(student.packageExpiryDate) <= now;
    const isExpiringSoon = student.packageExpiryDate && 
                           new Date(student.packageExpiryDate) > now && 
                           new Date(student.packageExpiryDate) <= sevenDaysLater;
    const isInvalidExpiry = !student.packageExpiryDate || isNaN(new Date(student.packageExpiryDate).getTime());
    const isMissingProgram = !student.program && !student.courseName;

    switch (filterType) {
      case 'valid':
        return student.status === 'active' && (!student.packageExpiryDate || new Date(student.packageExpiryDate) > now);
      case 'review':
        return isMissingProgram || isInvalidExpiry;
      case 'expiring':
        return student.status === 'active' && isExpiringSoon;
      case 'suspended':
        return isSuspended;
      case 'expired':
        return isExpired;
      case 'all':
      default:
        return true;
    }
  });

  const uniquePrograms = Array.from(new Set(students.map(s => s.program || s.courseName).filter(Boolean))) as string[];

  const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.includes(s._id));

  const handleHeaderCheckboxChange = () => {
    if (isAllSelected) {
      const filteredIds = filteredStudents.map(s => s._id);
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const filteredIds = filteredStudents.map(s => s._id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleStudentCheckboxChange = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, studentId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== studentId));
    }
  };

  // ── Render Hierarchy Node (shared between individual & bulk) ────────────
  const renderHierarchyTree = (
    hierarchyData: any,
    restrictionsData: any[],
    expandedMap: Record<string, boolean>,
    toggleExpand: (id: string) => void,
    onToggleAccess: (nodeType: 'batch' | 'subject' | 'unit' | 'topic', nodeId: string | null, status: 'allowed' | 'blocked') => void,
    batchName: string
  ) => {
    const isBlocked = restrictionsData.some(r => !r.subjectId && !r.unitId && !r.topicId && r.status === 'blocked');

    const AccessChip = ({ blocked, inherited, onClick, disabled }: { blocked: boolean; inherited?: boolean; onClick: () => void; disabled?: boolean }) => (
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        disabled={disabled}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all shrink-0 ${
          blocked
            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/60'
            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {blocked ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        {blocked ? 'Blocked' : 'Allowed'}
        {inherited && <span className="text-[8px] font-normal opacity-60 ml-0.5">(Inherited)</span>}
      </button>
    );

    return (
      <div className="space-y-1">
        {/* Batch Level */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/20 border border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Batch</div>
              <div className="text-sm font-bold truncate text-foreground">{batchName}</div>
            </div>
          </div>
          <AccessChip blocked={isBlocked} onClick={() => onToggleAccess('batch', null, isBlocked ? 'blocked' : 'allowed')} />
        </div>

        {/* Subjects */}
        <div className="pl-4 space-y-1 ml-4 border-l-2 border-indigo-100 dark:border-indigo-900/40">
          {hierarchyData.subjects?.map((sub: any) => {
            const isSubExplicitBlocked = restrictionsData.some(r => r.subjectId === sub.id && !r.unitId && !r.topicId && r.status === 'blocked');
            const isSubBlocked = isBlocked || isSubExplicitBlocked;
            const isSubExpanded = !!expandedMap[sub.id];

            return (
              <div key={sub.id} className="space-y-1">
                <div
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => toggleExpand(sub.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                      {sub.units?.length > 0 ? (
                        isSubExpanded ? <ChevronDown className="h-3.5 w-3.5 text-violet-500" /> : <ChevronRight className="h-3.5 w-3.5 text-violet-500" />
                      ) : (
                        <Layers className="h-3 w-3 text-violet-400" />
                      )}
                    </div>
                    <span className="text-xs font-semibold truncate text-foreground">{sub.subjectCode} — {sub.subjectName}</span>
                  </div>
                  <AccessChip blocked={isSubBlocked} inherited={isBlocked} onClick={() => onToggleAccess('subject', sub.id, isSubBlocked ? 'blocked' : 'allowed')} disabled={isBlocked} />
                </div>

                {/* Units */}
                {isSubExpanded && sub.units && (
                  <div className="pl-4 space-y-0.5 ml-3 border-l-2 border-violet-100 dark:border-violet-900/30">
                    {sub.units.map((unit: any) => {
                      const isUnitExplicitBlocked = restrictionsData.some(r => r.unitId === unit.id && !r.topicId && r.status === 'blocked');
                      const isUnitBlocked = isSubBlocked || isUnitExplicitBlocked;
                      const isUnitExpanded = !!expandedMap[unit.id];

                      return (
                        <div key={unit.id} className="space-y-0.5">
                          <div
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
                            onClick={() => toggleExpand(unit.id)}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-5 h-5 rounded-md bg-sky-500/10 flex items-center justify-center shrink-0">
                                {unit.lessons?.length > 0 ? (
                                  isUnitExpanded ? <ChevronDown className="h-3 w-3 text-sky-500" /> : <ChevronRight className="h-3 w-3 text-sky-500" />
                                ) : (
                                  <FileText className="h-2.5 w-2.5 text-sky-400" />
                                )}
                              </div>
                              <span className="text-xs truncate text-foreground/90 font-medium">{unit.name}</span>
                            </div>
                            <AccessChip blocked={isUnitBlocked} inherited={isSubBlocked} onClick={() => onToggleAccess('unit', unit.id, isUnitBlocked ? 'blocked' : 'allowed')} disabled={isSubBlocked} />
                          </div>

                          {/* Topics */}
                          {isUnitExpanded && unit.lessons && (
                            <div className="pl-3.5 space-y-0.5 ml-2.5 border-l border-sky-100 dark:border-sky-900/30">
                              {unit.lessons.map((lesson: any) => {
                                const isTopicExplicitBlocked = restrictionsData.some(r => r.topicId === lesson.id && r.status === 'blocked');
                                const isTopicBlocked = isUnitBlocked || isTopicExplicitBlocked;

                                return (
                                  <div key={lesson.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                                      <span className="text-[11px] truncate text-foreground/75">{lesson.title}</span>
                                    </div>
                                    <AccessChip blocked={isTopicBlocked} inherited={isUnitBlocked} onClick={() => onToggleAccess('topic', lesson.id, isTopicBlocked ? 'blocked' : 'allowed')} disabled={isUnitBlocked} />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Access Manager</h1>
              <p className="text-sm text-muted-foreground">Manage student access, subscriptions, and content permissions</p>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={loadAllData}
          className="rounded-xl h-9 px-4 gap-2 border-border/60 hover:bg-muted/50 transition-all self-start sm:self-auto"
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            label: 'Total Students',
            value: totalStudents,
            icon: Users,
            gradient: 'from-slate-500/10 to-slate-600/5',
            iconBg: 'bg-slate-100 dark:bg-slate-800',
            iconColor: 'text-slate-600 dark:text-slate-300',
            filter: 'all'
          },
          {
            label: 'Active Students',
            value: activeStudents,
            icon: UserCheck,
            gradient: 'from-emerald-500/10 to-emerald-600/5',
            iconBg: 'bg-emerald-100 dark:bg-emerald-950/50',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            filter: 'valid',
            sub: totalStudents > 0 ? `${Math.round((activeStudents / totalStudents) * 100)}% active` : undefined
          },
          {
            label: 'Expiring Soon',
            value: expiringSoon,
            icon: Clock,
            gradient: 'from-amber-500/10 to-amber-600/5',
            iconBg: 'bg-amber-100 dark:bg-amber-950/50',
            iconColor: 'text-amber-600 dark:text-amber-400',
            filter: 'expiring',
            sub: 'Within 7 days'
          },
          {
            label: 'Suspended',
            value: suspendedStudents,
            icon: UserX,
            gradient: 'from-rose-500/10 to-rose-600/5',
            iconBg: 'bg-rose-100 dark:bg-rose-950/50',
            iconColor: 'text-rose-600 dark:text-rose-400',
            filter: 'suspended'
          },
          {
            label: 'Active Batches',
            value: activeBatches,
            icon: GraduationCap,
            gradient: 'from-violet-500/10 to-violet-600/5',
            iconBg: 'bg-violet-100 dark:bg-violet-950/50',
            iconColor: 'text-violet-600 dark:text-violet-400',
            filter: 'all'
          }
        ].map((card) => {
          const isActive = filterType === card.filter && card.filter !== 'all';
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => setFilterType(card.filter === filterType ? 'all' : card.filter)}
              className={`relative group text-left p-4 rounded-2xl border transition-all duration-200 bg-gradient-to-br ${card.gradient} ${
                isActive
                  ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/20 scale-[1.02]'
                  : 'border-border/50 hover:border-border hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <Icon className={`h-4.5 w-4.5 ${card.iconColor}`} />
                </div>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-foreground">{card.value}</div>
              <div className="text-[11px] font-medium text-muted-foreground mt-0.5">{card.label}</div>
              {card.sub && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{card.sub}</div>}
            </button>
          );
        })}
      </div>

      {/* ── Main Layout ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Left: Students Table ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search + Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-background border-border/60 focus-visible:ring-indigo-500/30"
              />
            </div>
            <select
              value={selectedProgramFilter}
              onChange={(e) => setSelectedProgramFilter(e.target.value)}
              className="h-11 rounded-xl border border-border/60 bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 min-w-[160px]"
            >
              <option value="All">All Batches</option>
              {uniquePrograms.map(prog => (
                <option key={prog} value={prog}>{prog}</option>
              ))}
            </select>
          </div>

          {/* Active Filter Badges */}
          {(filterType !== 'all' || selectedProgramFilter !== 'All') && (
            <div className="flex flex-wrap gap-1.5">
              {filterType !== 'all' && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors gap-1.5 rounded-lg px-3 py-1"
                  onClick={() => setFilterType('all')}
                >
                  Filter: <span className="font-bold capitalize">{filterType}</span>
                  <XCircle className="h-3 w-3" />
                </Badge>
              )}
              {selectedProgramFilter !== 'All' && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors gap-1.5 rounded-lg px-3 py-1"
                  onClick={() => setSelectedProgramFilter('All')}
                >
                  Batch: <span className="font-bold">{selectedProgramFilter}</span>
                  <XCircle className="h-3 w-3" />
                </Badge>
              )}
            </div>
          )}

          {/* Bulk Actions Bar */}
          {selectedIds.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/15 border border-indigo-200/60 dark:border-indigo-800/40 rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                    <SlidersHorizontal className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-foreground">{selectedIds.length} students selected</span>
                    <p className="text-[10px] text-muted-foreground">Apply bulk actions below</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleBulkToggleAccess('active')}
                    className="h-8 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Enable
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleBulkToggleAccess('inactive')}
                    className="h-8 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm"
                  >
                    <UserX className="h-3.5 w-3.5" />
                    Suspend
                  </Button>
                  
                  {!showBulkExpiryInput ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowBulkExpiryInput(true)}
                      className="h-8 rounded-lg text-xs gap-1.5"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Set Expiry
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                      <Input
                        type="date"
                        value={bulkExpiryDate}
                        onChange={(e) => setBulkExpiryDate(e.target.value)}
                        className="h-8 py-0 px-2 w-36 text-xs rounded-lg"
                      />
                      <Button size="sm" onClick={handleBulkSetExpiry} className="h-8 px-3 rounded-lg text-xs">Apply</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setShowBulkExpiryInput(false); setBulkExpiryDate(''); }} className="h-8 px-2 rounded-lg">
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleBulkExtendExpiry(30)}
                    className="h-8 rounded-lg text-xs gap-1"
                  >
                    +30d
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleBulkExtendExpiry(90)}
                    className="h-8 rounded-lg text-xs gap-1"
                  >
                    +90d
                  </Button>
                </div>
              </div>

              {/* Bulk Content Access Controls */}
              {bulkBatchId && bulkHierarchy && (
                <div className="p-3 bg-white/60 dark:bg-white/[0.03] border border-violet-200/60 dark:border-violet-800/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-violet-500" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wide">Bulk Content Access</span>
                      <Badge variant="secondary" className="text-[10px] rounded-md">{bulkBatchName}</Badge>
                    </div>
                    {bulkHierarchyLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => handleBulkQuickAction('allow_all')} className="h-7 rounded-lg text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 gap-1">
                      <Check className="h-3 w-3" />Allow All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkQuickAction('block_all')} className="h-7 rounded-lg text-[10px] font-semibold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1">
                      <XCircle className="h-3 w-3" />Block All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkQuickAction('block_batch')} className="h-7 rounded-lg text-[10px]">Block Batch</Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkQuickAction('block_subject')} className="h-7 rounded-lg text-[10px]">Block Subject</Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkQuickAction('block_unit')} className="h-7 rounded-lg text-[10px]">Block Unit</Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkQuickAction('block_topic')} className="h-7 rounded-lg text-[10px]">Block Topic</Button>
                  </div>

                  <div className="max-h-[260px] overflow-y-auto rounded-xl bg-background/60 p-2">
                    {renderHierarchyTree(
                      bulkHierarchy,
                      [], // Bulk mode shows default state
                      bulkExpandedNodes,
                      toggleBulkNodeExpand,
                      handleBulkToggleNodeAccess,
                      bulkBatchName || 'Batch'
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 italic">Toggling a node applies the change to all {selectedIds.length} selected students.</p>
                </div>
              )}

              {selectedIds.length > 0 && !bulkBatchId && !bulkHierarchyLoading && (() => {
                const selectedStudentsList = students.filter(s => selectedIds.includes(s._id));
                const batches = new Set(selectedStudentsList.map(s => s.program || s.courseName).filter(Boolean));
                if (batches.size > 1) {
                  return (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Bulk content controls require all selected students to be in the same batch.
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          )}

          {/* Students Table Card */}
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2.5">
                <Users className="h-4.5 w-4.5 text-indigo-500" />
                <span className="text-sm font-bold text-foreground">Students</span>
                <Badge variant="secondary" className="text-[10px] rounded-md font-medium">{filteredStudents.length} of {students.length}</Badge>
              </div>
            </div>

            <ScrollArea className="h-[520px] w-full">
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10">
                  <TableRow className="border-border/40">
                    <TableHead className="w-[40px] pl-4">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleHeaderCheckboxChange}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Student</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Batch</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[100px]">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[140px]">Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                          <span className="text-sm">Loading students...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center gap-3 py-8">
                          <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                            <Users className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">No students found</p>
                            <p className="text-xs text-muted-foreground">Try adjusting your search or filter criteria</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => {
                      const isSelected = selectedStudent?._id === student._id;
                      const isChecked = selectedIds.includes(student._id);
                      const expiryInfo = formatRelativeDate(student.packageExpiryDate);
                      return (
                        <TableRow 
                          key={student._id}
                          onClick={() => handleSelectStudent(student)}
                          className={`cursor-pointer transition-all duration-150 border-border/30 ${
                            isSelected 
                              ? 'bg-indigo-50/60 dark:bg-indigo-950/15 border-l-2 border-l-indigo-500' 
                              : 'hover:bg-muted/30'
                          }`}
                        >
                          <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleStudentCheckboxChange(student._id, e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-border/50">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name || 'user'}`} />
                                <AvatarFallback className="text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  {student.name?.charAt(0)?.toUpperCase() || 'S'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate text-foreground">{student.name}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{student.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {(student.program || student.courseName) ? (
                              <Badge variant="secondary" className="text-[10px] font-medium rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-none">
                                {student.program || student.courseName}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">No batch</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              student.status === 'active' 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {student.status === 'active' ? 'Active' : 'Suspended'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <div className="font-medium text-foreground/80">{formatDate(student.packageExpiryDate)}</div>
                              {expiryInfo && (
                                <div className={`text-[10px] mt-0.5 ${expiryInfo.urgent ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground/60'}`}>
                                  {expiryInfo.text}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Content Access Hierarchy Card */}
          {activeBatchId && (
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4 text-violet-500" />
                  Content Permissions
                </h4>
                {restrictionsLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" onClick={() => handleQuickAction('allow_all')} className="h-7 rounded-lg text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 gap-1">
                  <Check className="h-3 w-3" />Allow All
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickAction('block_all')} className="h-7 rounded-lg text-[10px] font-semibold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1">
                  <XCircle className="h-3 w-3" />Block All
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickAction('block_batch')} className="h-7 rounded-lg text-[10px]">Block Batch</Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickAction('block_subject')} className="h-7 rounded-lg text-[10px]">Block Subject</Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickAction('block_unit')} className="h-7 rounded-lg text-[10px]">Block Unit</Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickAction('block_topic')} className="h-7 rounded-lg text-[10px]">Block Topic</Button>
              </div>

              {/* Hierarchy Tree */}
              <div className="rounded-xl border border-border/40 bg-muted/10 p-3 max-h-[380px] overflow-y-auto">
                {hierarchy ? (
                  renderHierarchyTree(
                    hierarchy,
                    restrictions,
                    expandedNodes,
                    toggleNodeExpand,
                    handleToggleNodeAccess,
                    selectedStudent?.program || selectedStudent?.courseName || 'Batch'
                  )
                ) : (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center mx-auto mb-2">
                      <BookOpen className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-xs text-muted-foreground">No curriculum hierarchy found for this student.</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Ensure a valid batch is assigned.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Student Detail Panel ──────────────────── */}
        <div className="space-y-4">
          {!selectedStudent ? (
            <div className="rounded-2xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center p-8 text-center min-h-[500px]">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/50 dark:to-violet-950/30 flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-indigo-500/60" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">Select a Student</h3>
              <p className="text-sm text-muted-foreground max-w-[220px]">
                Choose a student from the table to view and manage their access permissions.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              
              {/* Student Profile Card */}
              <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
                {/* Profile Header */}
                <div className="relative">
                  <div className="h-20 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600" />
                  <div className="absolute -bottom-8 left-5">
                    <Avatar className="h-16 w-16 border-4 border-card shadow-xl">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStudent.name || 'user'}`} />
                      <AvatarFallback className="text-xl font-bold bg-indigo-100 text-indigo-700">
                        {selectedStudent.name?.charAt(0)?.toUpperCase() || 'S'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {/* Status pill on the banner */}
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${
                      detailStatus === 'active'
                        ? 'bg-emerald-500/20 text-white border border-emerald-400/30'
                        : 'bg-rose-500/20 text-white border border-rose-400/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${detailStatus === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      {detailStatus === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                </div>

                <div className="pt-10 px-5 pb-5 space-y-4">
                  {/* Name & Email */}
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{selectedStudent.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3 w-3" />
                      {selectedStudent.email}
                    </p>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: 'Student ID', value: selectedStudent.user_id || 'N/A', icon: Hash },
                      { label: 'Batch', value: selectedStudent.program || selectedStudent.courseName || 'N/A', icon: BookOpen },
                      { label: 'Campus', value: selectedStudent.branchName || 'Main', icon: Building2 },
                      { label: 'Phone', value: selectedStudent.phone || 'N/A', icon: Phone },
                      { label: 'Joined', value: selectedStudent.enrollmentDate ? new Date(selectedStudent.enrollmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A', icon: CalendarDays },
                      { label: 'Expiry', value: formatDate(selectedStudent.packageExpiryDate), icon: Clock },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Icon className="h-3 w-3" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
                          </div>
                          <div className="text-xs font-semibold text-foreground truncate">{item.value}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Access Settings Card */}
              <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-5">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-500" />
                  Access Settings
                </h4>

                {/* Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/20 border border-border/40">
                  <div>
                    <Label htmlFor="access-toggle" className="text-sm font-semibold cursor-pointer">Platform Access</Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Allow student to view content and attend classes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="access-toggle"
                      checked={detailStatus === 'active'}
                      onChange={handleToggleStatus}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600" />
                  </label>
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <Label htmlFor="expiry-picker" className="text-sm font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Access Valid Until
                  </Label>
                  <Input
                    type="date"
                    id="expiry-picker"
                    value={detailExpiry}
                    onChange={(e) => setDetailExpiry(e.target.value)}
                    className="h-10 rounded-xl border-border/60"
                  />
                  <p className="text-[10px] text-muted-foreground">Leave empty for unlimited access.</p>
                </div>

                {/* Save Actions */}
                <div className="space-y-2 pt-2">
                  <Button 
                    onClick={() => handleSaveStudentAccess()} 
                    className="w-full h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold gap-2 shadow-lg shadow-indigo-500/20 transition-all"
                    disabled={isSaving}
                  >
                    {isSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                  
                  {detailStatus === 'active' ? (
                    <Button 
                      variant="outline"
                      onClick={() => handleSaveStudentAccess('inactive')} 
                      className="w-full h-9 rounded-xl border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-2 text-xs"
                      disabled={isSaving}
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Suspend Student
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      onClick={() => handleSaveStudentAccess('active')} 
                      className="w-full h-9 rounded-xl border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 gap-2 text-xs"
                      disabled={isSaving}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Reactivate Student
                    </Button>
                  )}
                </div>
              </div>


            </div>
          )}
        </div>
      </div>
    </div>
  );
}
