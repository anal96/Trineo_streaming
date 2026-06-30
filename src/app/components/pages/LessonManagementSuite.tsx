import { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  X, 
  ArrowUp, 
  ArrowDown, 
  AlertCircle,
  Pencil,
  Check,
  Folder,
  BookOpen,
  Layers,
  GraduationCap,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Search,
  Settings,
  Calendar,
  Clock,
  Play,
  FileText,
  Copy,
  Info,
  MoreVertical,
  ExternalLink,
  Loader2,
  Trash,
  RefreshCw
} from 'lucide-react';
import { apiFetch, getApiUrl } from '../../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

const initialProgramForm = { name: '', description: '', thumbnail: '', bannerImage: '', displayOrder: 0, status: 'active', isLocked: false };
const initialSubjectForm = { subjectCode: '', subjectName: '', description: '', displayOrder: 0, status: 'published', isLocked: false };
const initialUnitForm = { name: '', description: '', displayOrder: 0, status: 'published', isLocked: false };
const initialLessonForm = { title: '', description: '', order: 0, publishStatus: 'draft', isLocked: false };

interface LessonManagementSuiteProps {
  initialSelectedProgramId?: string;
  onClearInitialProgram?: () => void;
}

export default function LessonManagementSuite({
  initialSelectedProgramId,
  onClearInitialProgram
}: LessonManagementSuiteProps = {}) {
  const queryClient = useQueryClient();

  const cachedUser = useMemo(() => {
    const cached = localStorage.getItem('user');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch (_) {
      return null;
    }
  }, []);

  const instituteId = cachedUser?.institute?._id || cachedUser?.institute || '';

  // Programs State (Batches)
  const { data: programs = [], refetch: refetchPrograms } = useQuery({
    queryKey: ['programs', instituteId],
    queryFn: async () => {
      const data = await apiFetch('/programs');
      return data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    },
    enabled: !!instituteId,
  });
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [batchSearch, setBatchSearch] = useState('');
  const [checkedProgramIds, setCheckedProgramIds] = useState<string[]>([]);

  // Tree and Explorer State
  const [subjects, setSubjects] = useState<any[]>([]);
  const [unitsBySubject, setUnitsBySubject] = useState<Record<string, any[]>>({});
  const [lessonsByUnit, setLessonsByUnit] = useState<Record<string, any[]>>({});
  const [treeSearch, setTreeSearch] = useState('');
  
  // Selection checks
  const [checkedSubjectIds, setCheckedSubjectIds] = useState<string[]>([]);
  const [checkedUnitIds, setCheckedUnitIds] = useState<string[]>([]);
  const [checkedLessonIds, setCheckedLessonIds] = useState<string[]>([]);

  // Expand / Collapse State
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [collapseAll, setCollapseAll] = useState(false);

  // Inspector Panel State (Right Sidebar)
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [selectedTopicTab, setSelectedTopicTab] = useState<'overview' | 'content' | 'resources' | 'settings'>('overview');

  // Form Drawer States
  const [drawerType, setDrawerType] = useState<'program' | 'subject' | 'unit' | 'lesson' | null>(null);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  
  const [programForm, setProgramForm] = useState(initialProgramForm);
  const [subjectForm, setSubjectForm] = useState(initialSubjectForm);
  const [unitForm, setUnitForm] = useState(initialUnitForm);
  const [lessonForm, setLessonForm] = useState(initialLessonForm);

  const [editingProgram, setEditingProgram] = useState<any>(null);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<any>(null);

  // Multi-video management modal states
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoModalMode, setVideoModalMode] = useState<'upload' | 'edit' | 'replace'>('upload');
  const [selectedVideoContent, setSelectedVideoContent] = useState<any>(null);
  const [selectedUploadLesson, setSelectedUploadLesson] = useState<any>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  const triggerAddVideo = (lesson: any) => {
    setSelectedUploadLesson(lesson);
    setVideoModalMode('upload');
    setVideoTitle('');
    setVideoDuration('');
    setVideoFile(null);
    setPdfTitle('');
    setPdfFile(null);
    setSelectedVideoContent(null);
    setVideoModalOpen(true);
  };

  const triggerEditVideo = (video: any) => {
    setSelectedVideoContent(video);
    setVideoModalMode('edit');
    setVideoTitle(video.title);
    setVideoDuration(video.youtubeDuration || video.duration || '');
    setVideoModalOpen(true);
  };

  const triggerReplaceVideo = (video: any) => {
    setSelectedVideoContent(video);
    setVideoModalMode('replace');
    setVideoTitle(video.title);
    setVideoDuration(video.youtubeDuration || video.duration || '');
    setVideoFile(null);
    setVideoModalOpen(true);
  };

  const deleteVideoContent = async (contentId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this video?');
    if (!confirmDelete) return;

    try {
      setIsLoading(true);
      await apiFetch(`/content/${contentId}`, { method: 'DELETE' });
      toast.success('Video deleted successfully');
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete video');
    } finally {
      setIsLoading(false);
    }
  };

  const moveVideoOrder = async (lesson: any, videoIdx: number, direction: 'up' | 'down') => {
    const lessonVideos = lesson.videos || lesson.contents?.filter((c: any) => c.type === 'video') || [];
    if (lessonVideos.length <= 1) return;
    if (direction === 'up' && videoIdx === 0) return;
    if (direction === 'down' && videoIdx === lessonVideos.length - 1) return;

    const newVideos = [...lessonVideos];
    const targetIdx = direction === 'up' ? videoIdx - 1 : videoIdx + 1;
    const temp = newVideos[videoIdx];
    newVideos[videoIdx] = newVideos[targetIdx];
    newVideos[targetIdx] = temp;

    const reorderItems = newVideos.map((v, idx) => ({
      id: v._id,
      order: idx + 1
    }));

    try {
      setIsLoading(true);
      await apiFetch('/content/reorder', {
        method: 'POST',
        body: JSON.stringify({ items: reorderItems })
      });
      toast.success('Video order updated');
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reorder videos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (videoModalMode === 'edit') {
      if (!videoTitle.trim()) return alert('Video title is required');
      try {
        setIsLoading(true);
        await apiFetch(`/content/${selectedVideoContent._id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: videoTitle.trim(),
            youtubeDuration: videoDuration.trim(),
            duration: videoDuration.trim()
          })
        });
        toast.success('Video updated successfully');
        setVideoModalOpen(false);
        await loadAllDataForProgram(selectedProgramId);
      } catch (err: any) {
        toast.error(err.message || 'Failed to update video');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!videoFile) {
      alert('Please select an MP4 video file first');
      return;
    }

    setUploadingVideo(true);
    setVideoUploadProgress(0);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('title', videoTitle.trim() || 'New Video');
    formData.append('duration', videoDuration.trim() || '15:00');
    formData.append('courseId', selectedProgramId);
    
    if (videoModalMode === 'replace') {
      formData.append('lessonId', selectedVideoContent.lessonId);
      formData.append('replaceContentId', selectedVideoContent._id);
      formData.append('contentId', selectedVideoContent._id);
    } else {
      formData.append('lessonId', selectedUploadLesson._id);
      if (pdfFile) {
        formData.append('attachment', pdfFile);
        formData.append('attachmentName', pdfTitle || pdfFile.name.replace(/\.[^/.]+$/, ""));
      }
    }

    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    const token = localStorage.getItem('token');

    xhr.open('POST', getApiUrl('/videos/youtube/upload'));
    if (token && token !== 'session_active') {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setVideoUploadProgress(percent);
      }
    };

    xhr.onload = async () => {
      setUploadingVideo(false);
      if (xhr.status === 202 || xhr.status === 200) {
        toast.success(videoModalMode === 'replace' ? 'Video replaced successfully' : 'Video uploaded successfully');
        setVideoModalOpen(false);
        await loadAllDataForProgram(selectedProgramId);
      } else {
        const resp = JSON.parse(xhr.responseText || '{}');
        alert(resp.message || 'Upload failed');
      }
    };

    xhr.onerror = () => {
      setUploadingVideo(false);
      alert('Network error during upload');
    };

    xhr.send(formData);
  };

  // Load Programs (Batches)
  const loadPrograms = async () => {
    await queryClient.invalidateQueries({ queryKey: ['programs', instituteId] });
  };

  // Eager load all subjects, units, and lessons under a program (Batch)
  const loadAllDataForProgram = async (pId: string) => {
    if (!pId) {
      setSubjects([]);
      setUnitsBySubject({});
      setLessonsByUnit({});
      return;
    }
    setIsLoading(true);
    try {
      // 1. Fetch Subjects
      const subjectsData = await apiFetch(`/subjects?programId=${pId}`);
      const sortedSubjects = subjectsData.sort((a: any, b: any) => (a.subjectCode || '').localeCompare(b.subjectCode || ''));
      setSubjects(sortedSubjects);

      // 2. Eagerly fetch units for all these subjects in parallel
      const unitsPromises = sortedSubjects.map(async (s: any) => {
        try {
          const data = await apiFetch(`/units?subjectId=${s._id}`);
          const sorted = data.sort((a: any, b: any) => {
            if (a.createdAt && b.createdAt) {
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }
            return (a.name || '').localeCompare(b.name || '');
          });
          return { sId: s._id, data: sorted };
        } catch (err) {
          console.error(`Failed to load units for subject ${s._id}`, err);
          return { sId: s._id, data: [] };
        }
      });

      const unitsResults = await Promise.all(unitsPromises);
      const newUnitsMap: Record<string, any[]> = {};
      unitsResults.forEach(res => {
        newUnitsMap[res.sId] = res.data;
      });
      setUnitsBySubject(newUnitsMap);

      // 3. Eagerly fetch lessons for all loaded units in parallel
      const allUnitsList = unitsResults.flatMap(res => res.data);
      const lessonsPromises = allUnitsList.map(async (u: any) => {
        try {
          const data = await apiFetch(`/lessons?unitId=${u._id}`);
          const sorted = data.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
          return { uId: u._id, data: sorted };
        } catch (err) {
          console.error(`Failed to load lessons for unit ${u._id}`, err);
          return { uId: u._id, data: [] };
        }
      });

      const lessonsResults = await Promise.all(lessonsPromises);
      const newLessonsMap: Record<string, any[]> = {};
      lessonsResults.forEach(res => {
        newLessonsMap[res.uId] = res.data;
      });
      setLessonsByUnit(newLessonsMap);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load curriculum hierarchy');
    } finally {
      setIsLoading(false);
    }
  };

  // Init load
  useEffect(() => {
    loadPrograms();
  }, []);

  // Cascading Selection effect: when selected program changes, load its subtree
  useEffect(() => {
    if (selectedProgramId) {
      loadAllDataForProgram(selectedProgramId);
      
      // Auto-expand all subjects by default for premium feel
      setExpandedSubjects(new Set());
      setExpandedUnits(new Set());
    } else {
      setSubjects([]);
      setUnitsBySubject({});
      setLessonsByUnit({});
    }
    
    // Clear selection check states
    setSelectedLessonId('');
    setCheckedProgramIds([]);
    setCheckedSubjectIds([]);
    setCheckedUnitIds([]);
    setCheckedLessonIds([]);
  }, [selectedProgramId]);

  // Handle external program selection (from dashboard overview)
  useEffect(() => {
    if (initialSelectedProgramId && programs.length > 0) {
      const target = programs.find((p: any) => p._id === initialSelectedProgramId);
      if (target) {
        setSelectedProgramId(initialSelectedProgramId);
        startEditProgram(target);
      }
      if (onClearInitialProgram) {
        onClearInitialProgram();
      }
    }
  }, [initialSelectedProgramId, programs]);

  // Expand All toggle
  useEffect(() => {
    if (collapseAll) {
      setExpandedSubjects(new Set());
      setExpandedUnits(new Set());
    } else if (subjects.length > 0) {
      // Expand all subjects
      setExpandedSubjects(new Set(subjects.map(s => s._id)));
      // Expand all units
      const allUnitIds = Object.values(unitsBySubject).flat().map(u => u._id);
      setExpandedUnits(new Set(allUnitIds));
    }
  }, [collapseAll, subjects, unitsBySubject]);

  // Filtered Programs (Batches)
  const filteredPrograms = useMemo(() => {
    return programs.filter(p => 
      p.name.toLowerCase().includes(batchSearch.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(batchSearch.toLowerCase()))
    );
  }, [programs, batchSearch]);

  // Active Lesson lookup helper
  const selectedLesson = useMemo(() => {
    if (!selectedLessonId) return null;
    const allLessons = Object.values(lessonsByUnit).flat();
    return allLessons.find(l => l._id === selectedLessonId) || null;
  }, [selectedLessonId, lessonsByUnit]);

  // Active Unit lookup for selected lesson
  const selectedLessonParentUnit = useMemo(() => {
    if (!selectedLesson) return null;
    const allUnits = Object.values(unitsBySubject).flat();
    return allUnits.find(u => u._id === selectedLesson.unitId) || null;
  }, [selectedLesson, unitsBySubject]);

  // Computed live metrics for KPI cards
  const kpiStats = useMemo(() => {
    const totalBatches = programs.length;
    const totalSubjects = selectedProgramId 
      ? subjects.length 
      : programs.reduce((acc, p) => acc + (p.subjectsCount || 0), 0);
    
    const totalUnits = selectedProgramId
      ? Object.values(unitsBySubject).flat().length
      : 0; // Units loaded for selected program

    const totalTopics = selectedProgramId
      ? Object.values(lessonsByUnit).flat().length
      : programs.reduce((acc, p) => acc + (p.lessonsCount || 0), 0);

    return { totalBatches, totalSubjects, totalUnits, totalTopics };
  }, [programs, selectedProgramId, subjects, unitsBySubject, lessonsByUnit]);

  // --- PROGRAM (BATCH) CRUD HANDLERS ---
  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (drawerMode === 'edit' && editingProgram) {
        await apiFetch(`/programs/${editingProgram._id}`, {
          method: 'PUT',
          body: JSON.stringify(programForm)
        });
        toast.success('Batch updated successfully.');
      } else {
        await apiFetch('/programs', {
          method: 'POST',
          body: JSON.stringify(programForm)
        });
        toast.success('Batch created successfully.');
      }
      setProgramForm(initialProgramForm);
      setEditingProgram(null);
      setDrawerType(null);
      await loadPrograms();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save batch');
    }
  };

  const startCreateProgram = () => {
    setDrawerMode('create');
    setProgramForm(initialProgramForm);
    setDrawerType('program');
  };

  const startEditProgram = (p: any) => {
    setDrawerMode('edit');
    setEditingProgram(p);
    setProgramForm({
      name: p.name,
      description: p.description || '',
      thumbnail: p.thumbnail || '',
      bannerImage: p.bannerImage || '',
      displayOrder: p.displayOrder ?? 0,
      status: p.status || 'active',
      isLocked: p.isLocked ?? false
    });
    setDrawerType('program');
  };

  const handleDeleteProgram = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this batch? All associated subjects, units, and topics will be affected.')) return;
    try {
      await apiFetch(`/programs/${id}`, { method: 'DELETE' });
      toast.success('Batch deleted successfully.');
      if (selectedProgramId === id) {
        setSelectedProgramId('');
      }
      await loadPrograms();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete batch');
    }
  };

  const handleMoveProgram = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= programs.length) return;

    const currentItem = programs[index];
    const targetItem = programs[targetIndex];
    const currentOrder = currentItem.displayOrder ?? 0;
    const targetOrder = targetItem.displayOrder ?? 0;

    const newCurrentOrder = targetOrder === currentOrder ? currentOrder + 1 : targetOrder;
    const newTargetOrder = currentOrder;

    try {
      await apiFetch(`/programs/${currentItem._id}`, {
        method: 'PUT',
        body: JSON.stringify({ displayOrder: newCurrentOrder })
      });
      await apiFetch(`/programs/${targetItem._id}`, {
        method: 'PUT',
        body: JSON.stringify({ displayOrder: newTargetOrder })
      });
      toast.success('Batch order updated.');
      await loadPrograms();
    } catch (err: any) {
      toast.error('Failed to update batch order.');
    }
  };

  const handleBulkPrograms = async (action: 'publish' | 'unpublish' | 'lock' | 'unlock' | 'delete') => {
    if (!checkedProgramIds.length) return;
    if (action === 'delete' && !window.confirm('Are you sure you want to delete selected batches?')) return;
    try {
      await apiFetch('/programs/bulk', {
        method: 'POST',
        body: JSON.stringify({ programIds: checkedProgramIds, action })
      });
      toast.success(`Bulk batches action "${action}" completed.`);
      setCheckedProgramIds([]);
      await loadPrograms();
      if (selectedProgramId && checkedProgramIds.includes(selectedProgramId)) {
        setSelectedProgramId('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Bulk update failed');
    }
  };

  // --- SUBJECT CRUD HANDLERS ---
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramId) return;
    try {
      if (drawerMode === 'edit' && editingSubject) {
        await apiFetch(`/subjects/${editingSubject._id}`, {
          method: 'PUT',
          body: JSON.stringify(subjectForm)
        });
        toast.success('Subject updated successfully.');
      } else {
        await apiFetch('/subjects', {
          method: 'POST',
          body: JSON.stringify({ ...subjectForm, programId: selectedProgramId })
        });
        toast.success('Subject created successfully.');
      }
      setSubjectForm(initialSubjectForm);
      setEditingSubject(null);
      setDrawerType(null);
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save subject');
    }
  };

  const startCreateSubject = () => {
    if (!selectedProgramId) {
      toast.warning('Please select a batch first');
      return;
    }
    setDrawerMode('create');
    setSubjectForm(initialSubjectForm);
    setDrawerType('subject');
  };

  const startEditSubject = (s: any) => {
    setDrawerMode('edit');
    setEditingSubject(s);
    setSubjectForm({
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      description: s.description || '',
      displayOrder: s.displayOrder ?? 0,
      status: s.status || 'published',
      isLocked: s.isLocked ?? false
    });
    setDrawerType('subject');
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this subject? All nested units and topics will be deleted.')) return;
    try {
      await apiFetch(`/subjects/${id}`, { method: 'DELETE' });
      toast.success('Subject deleted successfully.');
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete subject');
    }
  };

  const handleMoveSubject = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subjects.length) return;

    const currentItem = subjects[index];
    const targetItem = subjects[targetIndex];
    const currentOrder = currentItem.displayOrder ?? 0;
    const targetOrder = targetItem.displayOrder ?? 0;

    const newCurrentOrder = targetOrder === currentOrder ? currentOrder + 1 : targetOrder;
    const newTargetOrder = currentOrder;

    try {
      await apiFetch(`/subjects/${currentItem._id}`, {
        method: 'PUT',
        body: JSON.stringify({ displayOrder: newCurrentOrder })
      });
      await apiFetch(`/subjects/${targetItem._id}`, {
        method: 'PUT',
        body: JSON.stringify({ displayOrder: newTargetOrder })
      });
      toast.success('Subject order updated.');
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error('Failed to update subject order.');
    }
  };

  const handleBulkSubjects = async (action: 'publish' | 'unpublish' | 'lock' | 'unlock' | 'delete') => {
    if (!checkedSubjectIds.length) return;
    if (action === 'delete' && !window.confirm('Are you sure you want to delete selected subjects?')) return;
    try {
      await apiFetch('/subjects/bulk', {
        method: 'POST',
        body: JSON.stringify({ subjectIds: checkedSubjectIds, action })
      });
      toast.success(`Bulk subjects action "${action}" completed.`);
      setCheckedSubjectIds([]);
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error(err.message || 'Bulk update failed');
    }
  };

  // --- UNIT CRUD HANDLERS ---
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit && !editingSubject?._id) return;
    const targetSubjectId = editingUnit ? editingUnit.subjectId : editingSubject._id;
    try {
      if (drawerMode === 'edit' && editingUnit) {
        await apiFetch(`/units/${editingUnit._id}`, {
          method: 'PUT',
          body: JSON.stringify(unitForm)
        });
        toast.success('Unit updated successfully.');
      } else {
        await apiFetch('/units', {
          method: 'POST',
          body: JSON.stringify({ ...unitForm, subjectId: targetSubjectId })
        });
        toast.success('Unit created successfully.');
      }
      setUnitForm(initialUnitForm);
      setEditingUnit(null);
      setDrawerType(null);
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save unit');
    }
  };

  const startCreateUnit = (subject: any) => {
    setDrawerMode('create');
    setEditingSubject(subject);
    setUnitForm(initialUnitForm);
    setDrawerType('unit');
  };

  const startEditUnit = (u: any) => {
    setDrawerMode('edit');
    setEditingUnit(u);
    setUnitForm({
      name: u.name,
      description: u.description || '',
      displayOrder: u.displayOrder ?? 0,
      status: u.status || 'published',
      isLocked: u.isLocked ?? false
    });
    setDrawerType('unit');
  };

  const handleDeleteUnit = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this unit? All nested topics will be deleted.')) return;
    try {
      await apiFetch(`/units/${id}`, { method: 'DELETE' });
      toast.success('Unit deleted successfully.');
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete unit');
    }
  };

  const handleMoveUnit = async (subjectId: string, index: number, direction: 'up' | 'down') => {
    const subjectUnits = unitsBySubject[subjectId] || [];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subjectUnits.length) return;

    const currentItem = subjectUnits[index];
    const targetItem = subjectUnits[targetIndex];
    const currentOrder = currentItem.displayOrder ?? 0;
    const targetOrder = targetItem.displayOrder ?? 0;

    const newCurrentOrder = targetOrder === currentOrder ? currentOrder + 1 : targetOrder;
    const newTargetOrder = currentOrder;

    try {
      await apiFetch(`/units/${currentItem._id}`, {
        method: 'PUT',
        body: JSON.stringify({ displayOrder: newCurrentOrder })
      });
      await apiFetch(`/units/${targetItem._id}`, {
        method: 'PUT',
        body: JSON.stringify({ displayOrder: newTargetOrder })
      });
      toast.success('Unit order updated.');
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error('Failed to update unit order.');
    }
  };

  const handleBulkUnits = async (action: 'publish' | 'unpublish' | 'lock' | 'unlock' | 'delete') => {
    if (!checkedUnitIds.length) return;
    if (action === 'delete' && !window.confirm('Are you sure you want to delete selected units?')) return;
    try {
      await apiFetch('/units/bulk', {
        method: 'POST',
        body: JSON.stringify({ unitIds: checkedUnitIds, action })
      });
      toast.success(`Bulk units action "${action}" completed.`);
      setCheckedUnitIds([]);
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error(err.message || 'Bulk update failed');
    }
  };

  // --- TOPIC (LESSON) CRUD HANDLERS ---
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson && !editingUnit?._id) return;
    const targetUnitId = editingLesson ? editingLesson.unitId : editingUnit._id;
    try {
      if (drawerMode === 'edit' && editingLesson) {
        const updated = await apiFetch(`/lessons/${editingLesson._id}`, {
          method: 'PUT',
          body: JSON.stringify(lessonForm)
        });
        toast.success('Topic updated successfully.');
        // Refresh selected lesson view instantly
        if (selectedLessonId === editingLesson._id) {
          setSelectedLessonId('');
          setTimeout(() => setSelectedLessonId(editingLesson._id), 10);
        }
      } else {
        await apiFetch('/lessons', {
          method: 'POST',
          body: JSON.stringify({ ...lessonForm, unitId: targetUnitId })
        });
        toast.success('Topic created successfully.');
      }
      setLessonForm(initialLessonForm);
      setEditingLesson(null);
      setDrawerType(null);
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save topic');
    }
  };

  const startCreateLesson = (unit: any) => {
    setDrawerMode('create');
    setEditingUnit(unit);
    setLessonForm(initialLessonForm);
    setDrawerType('lesson');
  };

  const startEditLesson = (l: any) => {
    setDrawerMode('edit');
    setEditingLesson(l);
    setLessonForm({
      title: l.title,
      description: l.description || '',
      order: l.order ?? 0,
      publishStatus: l.publishStatus || 'draft',
      isLocked: l.isLocked ?? false
    });
    setDrawerType('lesson');
  };

  const handleDeleteLesson = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this topic/lesson?')) return;
    try {
      await apiFetch(`/lessons/${id}`, { method: 'DELETE' });
      toast.success('Topic deleted.');
      if (selectedLessonId === id) {
        setSelectedLessonId('');
      }
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete topic');
    }
  };

  const handleMoveLesson = async (unitId: string, index: number, direction: 'up' | 'down') => {
    const unitLessons = lessonsByUnit[unitId] || [];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= unitLessons.length) return;

    const currentItem = unitLessons[index];
    const targetItem = unitLessons[targetIndex];
    const currentOrder = currentItem.order ?? 0;
    const targetOrder = targetItem.order ?? 0;

    const newCurrentOrder = targetOrder === currentOrder ? currentOrder + 1 : targetOrder;
    const newTargetOrder = currentOrder;

    const items = [
      { id: currentItem._id, order: newCurrentOrder },
      { id: targetItem._id, order: newTargetOrder }
    ];

    try {
      await apiFetch('/lessons/reorder', {
        method: 'POST',
        body: JSON.stringify({ items })
      });
      toast.success('Topic order updated.');
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error('Failed to update topic order.');
    }
  };

  const handleDuplicateLesson = async (l: any) => {
    try {
      await apiFetch('/lessons', {
        method: 'POST',
        body: JSON.stringify({
          unitId: l.unitId,
          title: `${l.title} (Copy)`,
          description: l.description || 'Duplicated topic',
          order: (l.order ?? 0) + 1,
          publishStatus: 'draft',
          isLocked: l.isLocked ?? false
        })
      });
      toast.success('Topic duplicated successfully.');
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to duplicate topic');
    }
  };

  // Live status updates in Right Panel (Quick save toggles)
  const handleQuickSaveLesson = async (l: any, updates: Partial<typeof initialLessonForm>) => {
    try {
      const payload = {
        title: l.title,
        description: l.description || '',
        order: l.order ?? 0,
        publishStatus: l.publishStatus || 'draft',
        isLocked: l.isLocked ?? false,
        ...updates
      };
      
      await apiFetch(`/lessons/${l._id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      toast.success('Changes auto-saved.');
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error(err.message || 'Quick save failed');
    }
  };

  const handleBulkLessons = async (action: 'publish' | 'unpublish' | 'lock' | 'unlock' | 'delete') => {
    if (!checkedLessonIds.length) return;
    if (action === 'delete' && !window.confirm('Are you sure you want to delete selected topics?')) return;
    try {
      await apiFetch('/lessons/bulk', {
        method: 'POST',
        body: JSON.stringify({ lessonIds: checkedLessonIds, action })
      });
      toast.success(`Bulk topics action "${action}" completed.`);
      setCheckedLessonIds([]);
      await loadAllDataForProgram(selectedProgramId);
    } catch (err: any) {
      toast.error(err.message || 'Bulk update failed');
    }
  };

  // Toggle Expansion helpers
  const toggleSubjectExpand = (sId: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(sId)) {
        next.delete(sId);
      } else {
        next.add(sId);
      }
      return next;
    });
  };

  const toggleUnitExpand = (uId: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(uId)) {
        next.delete(uId);
      } else {
        next.add(uId);
      }
      return next;
    });
  };

  // Open interactive student preview
  const handleOpenPreview = (l: any) => {
    setPreviewLesson(l);
    setShowPreviewModal(true);
  };

  // Drawers and components JSX helpers
  const renderBackdrop = () => (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] transition-opacity duration-300"
      onClick={() => setDrawerType(null)}
    />
  );

  return (
    <div className="w-full flex flex-col h-[calc(100vh-140px)] min-h-[700px] bg-slate-50 border border-slate-200/60 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">
      
      {/* 1. Header Bar with SaaS Styling */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white py-5 px-8 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
            <GraduationCap className="w-6 h-6 text-indigo-200" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              Curriculum Builder
              <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-500/40 text-indigo-100 px-2 py-0.5 rounded-full border border-indigo-400/30">Admin Suite</span>
            </h1>
            <p className="text-xs text-indigo-100/80 mt-0.5">Build, organize, and manage batches, subjects, units and topics.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={startCreateProgram}
            className="bg-white text-indigo-800 hover:bg-indigo-50 font-bold rounded-xl text-xs h-9 px-4 shadow-sm border-0 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 text-indigo-700" /> New Batch
          </Button>
          <Button 
            variant="outline" 
            className="bg-white/10 border-white/20 hover:bg-white/20 text-white font-semibold rounded-xl text-xs h-9 px-4 flex items-center gap-1"
            onClick={() => toast.info('Import utility is loading components...')}
          >
            Import Curriculum
          </Button>
          <Badge className="bg-purple-950/40 border border-purple-400/20 text-purple-200 rounded-full px-3 py-1 font-bold text-xs">
            LMS Core V2
          </Badge>
        </div>
      </div>

      {/* 2. KPI row with dynamic metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-white border-b border-slate-200/80 shrink-0">
        {/* KPI 1 */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Batches</span>
            <span className="text-2xl font-extrabold text-slate-800 leading-none">{kpiStats.totalBatches}</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {selectedProgramId ? 'Batch Subjects' : 'Total Subjects'}
            </span>
            <span className="text-2xl font-extrabold text-slate-800 leading-none">{kpiStats.totalSubjects}</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {selectedProgramId ? 'Active Units' : 'Loaded Units'}
            </span>
            <span className="text-2xl font-extrabold text-slate-800 leading-none">{kpiStats.totalUnits}</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {selectedProgramId ? 'Batch Topics' : 'Total Topics'}
            </span>
            <span className="text-2xl font-extrabold text-slate-800 leading-none">{kpiStats.totalTopics}</span>
          </div>
        </div>
      </div>

      {/* 3. Three-Panel Layout Wrapper */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PANEL A: BATCH SIDEBAR */}
        <div className="w-72 border-r border-slate-200 bg-white flex flex-col h-full shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search batches..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-white border-slate-200/80 rounded-xl focus:ring-indigo-500"
              />
            </div>
            
            {checkedProgramIds.length > 0 && (
              <div className="flex items-center justify-between mt-3 p-2 bg-slate-100/70 border border-slate-200/60 rounded-xl text-[10px] text-slate-600">
                <span className="font-bold text-[10px] text-slate-600">{checkedProgramIds.length} checked</span>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-slate-200 text-indigo-600" onClick={() => handleBulkPrograms('publish')} title="Publish Selected"><Check className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-slate-200 text-slate-600" onClick={() => handleBulkPrograms('unpublish')} title="Draft Selected"><X className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-slate-200 text-red-500" onClick={() => handleBulkPrograms('delete')} title="Delete Selected"><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            )}
          </div>

          {/* Batches scroll container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredPrograms.length === 0 ? (
              <div className="text-center py-10">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No batches match search.</p>
              </div>
            ) : (
              filteredPrograms.map((p, idx) => {
                const isSelected = selectedProgramId === p._id;
                const isChecked = checkedProgramIds.includes(p._id);
                return (
                  <div
                    key={p._id}
                    onClick={() => setSelectedProgramId(p._id)}
                    className={`relative flex flex-col p-3.5 border rounded-2xl cursor-pointer transition-all duration-200 group ${
                      isSelected 
                        ? 'bg-indigo-50/50 border-indigo-500 ring-1 ring-indigo-500/20 text-indigo-900 font-semibold shadow-sm' 
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    {/* Left highlight strip */}
                    {isSelected && <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-600 rounded-r-md" />}
                    
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setCheckedProgramIds(curr => e.target.checked ? [...curr, p._id] : curr.filter(id => id !== p._id));
                          }}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold truncate block group-hover:text-indigo-600">{p.name}</span>
                          <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 font-normal">{p.description}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEditProgram(p)}
                          className="h-6 w-6 rounded hover:bg-slate-100 text-slate-500"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteProgram(p._id)}
                          className="h-6 w-6 rounded hover:bg-red-50 text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Stats & Badge footer row */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/50 text-[10px] text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-500">{p.subjectsCount || 0} Subj</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-slate-500">{p.lessonsCount || 0} Lsn</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {p.status === 'active' ? (
                          <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-bold text-[9px] border border-emerald-200/50">Active</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold text-[9px] border border-slate-200/50">Draft</span>
                        )}
                        {p.isLocked && <Lock className="w-2.5 h-2.5 text-rose-500 shrink-0" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-slate-100 shrink-0">
            <Button
              onClick={startCreateProgram}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 hover:border-indigo-200 font-bold rounded-xl text-xs h-9 flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Batch
            </Button>
          </div>
        </div>

        {/* PANEL B: CURRICULUM EXPLORER TREE VIEW */}
        <div className="flex-1 bg-slate-50/50 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-extrabold text-slate-800">Curriculum Explorer</span>
              {selectedProgramId && (
                <Badge className="bg-indigo-50 hover:bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 rounded-md text-[10px] px-2 py-0.5">
                  Batch: {programs.find(p => p._id === selectedProgramId)?.name}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Filter curriculum..."
                  value={treeSearch}
                  onChange={(e) => setTreeSearch(e.target.value)}
                  className="pl-8 h-8 text-[11px] bg-slate-50 border-slate-200 rounded-lg focus:ring-indigo-500"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCollapseAll(!collapseAll)}
                className="text-[11px] font-semibold text-slate-600 border-slate-200 h-8 rounded-lg flex items-center gap-1"
              >
                {collapseAll ? 'Expand All' : 'Collapse All'}
              </Button>

              {selectedProgramId && (
                <Button
                  onClick={startCreateSubject}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] h-8 px-3 flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Subject
                </Button>
              )}
            </div>
          </div>

          {/* Bulk actions for tree nodes if any checked */}
          {(checkedSubjectIds.length > 0 || checkedUnitIds.length > 0 || checkedLessonIds.length > 0) && (
            <div className="mx-6 mt-4 p-3 bg-amber-50/80 border border-amber-200/50 rounded-2xl flex items-center justify-between shrink-0 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <span className="font-bold">Bulk Actions:</span>
                {checkedSubjectIds.length > 0 && <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 text-[9px]">{checkedSubjectIds.length} Subjects</Badge>}
                {checkedUnitIds.length > 0 && <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[9px]">{checkedUnitIds.length} Units</Badge>}
                {checkedLessonIds.length > 0 && <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-[9px]">{checkedLessonIds.length} Topics</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg border-slate-200 bg-white" onClick={() => {
                  if (checkedSubjectIds.length) handleBulkSubjects('publish');
                  if (checkedUnitIds.length) handleBulkUnits('publish');
                  if (checkedLessonIds.length) handleBulkLessons('publish');
                }}>Publish</Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg border-slate-200 bg-white" onClick={() => {
                  if (checkedSubjectIds.length) handleBulkSubjects('unpublish');
                  if (checkedUnitIds.length) handleBulkUnits('unpublish');
                  if (checkedLessonIds.length) handleBulkLessons('unpublish');
                }}>Draft</Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] text-red-600 border-red-100 hover:bg-red-50 rounded-lg bg-white" onClick={() => {
                  if (checkedSubjectIds.length && window.confirm('Delete checked subjects?')) handleBulkSubjects('delete');
                  if (checkedUnitIds.length && window.confirm('Delete checked units?')) handleBulkUnits('delete');
                  if (checkedLessonIds.length && window.confirm('Delete checked topics?')) handleBulkLessons('delete');
                }}><Trash2 className="w-3 h-3 mr-0.5" />Delete</Button>
                <Button size="sm" variant="ghost" className="h-7 text-[10px] rounded-lg text-slate-500" onClick={() => {
                  setCheckedSubjectIds([]);
                  setCheckedUnitIds([]);
                  setCheckedLessonIds([]);
                }}>Clear</Button>
              </div>
            </div>
          )}

          {/* Tree Scroll View */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedProgramId ? (
              <div className="flex flex-col items-center justify-center text-center h-full py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                  <GraduationCap className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="font-bold text-slate-700 text-sm">No Batch Selected</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1">Select an academic batch program from the sidebar to inspect and build its curriculum hierarchy.</p>
              </div>
            ) : isLoading ? (
              <div className="space-y-4">
                <div className="h-14 bg-white border border-slate-100 rounded-2xl animate-pulse" />
                <div className="h-20 bg-white border border-slate-100 rounded-2xl animate-pulse pl-8" />
                <div className="h-14 bg-white border border-slate-100 rounded-2xl animate-pulse pl-16" />
                <div className="h-14 bg-white border border-slate-100 rounded-2xl animate-pulse" />
              </div>
            ) : subjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <BookOpen className="w-8 h-8 text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-700 text-sm">Empty Curriculum</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1">No subjects have been configured for this batch yet.</p>
                <Button onClick={startCreateSubject} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs h-9">
                  <Plus className="w-4 h-4 mr-1" /> Add Your First Subject
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {subjects
                  .filter(s => 
                    s.subjectName.toLowerCase().includes(treeSearch.toLowerCase()) || 
                    s.subjectCode.toLowerCase().includes(treeSearch.toLowerCase()) ||
                    (unitsBySubject[s._id] || []).some(u => 
                      u.name.toLowerCase().includes(treeSearch.toLowerCase()) ||
                      (lessonsByUnit[u._id] || []).some(l => l.title.toLowerCase().includes(treeSearch.toLowerCase()))
                    )
                  )
                  .map((subject, sIdx) => {
                    const isSubjectExpanded = expandedSubjects.has(subject._id);
                    const isSubjectChecked = checkedSubjectIds.includes(subject._id);
                    const subjectUnits = unitsBySubject[subject._id] || [];

                    return (
                      <div key={subject._id} className="group/subject select-none">
                        
                        {/* A. Subject Node Panel */}
                        <div className={`flex items-center justify-between p-3.5 rounded-2xl border bg-white transition-all ${
                          isSubjectExpanded ? 'border-slate-300 shadow-sm' : 'border-slate-200/80 hover:border-slate-300'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Expand toggle */}
                            <button
                              onClick={() => toggleSubjectExpand(subject._id)}
                              className="h-6 w-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500"
                            >
                              {isSubjectExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>

                            <input
                              type="checkbox"
                              checked={isSubjectChecked}
                              onChange={(e) => {
                                setCheckedSubjectIds(curr => e.target.checked ? [...curr, subject._id] : curr.filter(id => id !== subject._id));
                              }}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />

                            <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-mono text-[10px] font-bold px-1.5 py-0.5">
                              {subject.subjectCode}
                            </Badge>

                            <span className="font-extrabold text-slate-800 text-xs truncate">{subject.subjectName}</span>
                            
                            {subject.status === 'published' ? (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[9px] px-1.5 font-bold">Published</span>
                            ) : (
                              <span className="bg-slate-100 text-slate-500 border border-slate-200 rounded-md text-[9px] px-1.5 font-bold">Draft</span>
                            )}
                            {subject.isLocked && <Lock className="w-2.5 h-2.5 text-rose-500 shrink-0" />}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 opacity-0 group-hover/subject:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startCreateUnit(subject)}
                              className="h-7 w-7 rounded-lg text-emerald-600 hover:bg-emerald-50"
                              title="Add Unit under Subject"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEditSubject(subject)}
                              className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-100"
                              title="Edit Subject"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleMoveSubject(sIdx, 'up')}
                              disabled={sIdx === 0}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-20"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleMoveSubject(sIdx, 'down')}
                              disabled={sIdx === subjects.length - 1}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-20"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteSubject(subject._id)}
                              className="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* B. Nesting level: Units under Subject */}
                        {isSubjectExpanded && (
                          <div className="mt-1.5 pl-6 relative">
                            {/* Line connector decoration */}
                            <div className="absolute left-3 top-0 bottom-3 w-px bg-slate-200" />
                            
                            {subjectUnits.length === 0 ? (
                              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center text-[10px] text-slate-400 font-medium">
                                No units configured. Click the + button above to add a unit.
                              </div>
                            ) : (
                              subjectUnits
                                .filter(u => 
                                  u.name.toLowerCase().includes(treeSearch.toLowerCase()) || 
                                  (lessonsByUnit[u._id] || []).some(l => l.title.toLowerCase().includes(treeSearch.toLowerCase()))
                                )
                                .map((unit, uIdx) => {
                                  const isUnitExpanded = expandedUnits.has(unit._id);
                                  const isUnitChecked = checkedUnitIds.includes(unit._id);
                                  const unitLessons = lessonsByUnit[unit._id] || [];

                                  return (
                                    <div key={unit._id} className="group/unit mt-1.5 last:mb-2 select-none">
                                      {/* Unit Node Row */}
                                      <div className={`relative flex items-center justify-between p-3 rounded-xl border bg-slate-50/50 transition-all ${
                                        isUnitExpanded ? 'border-slate-300 shadow-sm' : 'border-slate-200/50 hover:border-slate-300 hover:bg-white'
                                      }`}>
                                        
                                        {/* Horizontal connecting branch line */}
                                        <div className="absolute -left-[11px] top-6 w-3 h-px bg-slate-200" />

                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <button
                                            onClick={() => toggleUnitExpand(unit._id)}
                                            className="h-5.5 w-5.5 rounded hover:bg-slate-200 flex items-center justify-center text-slate-500 shrink-0"
                                          >
                                            {isUnitExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                          </button>

                                          <input
                                            type="checkbox"
                                            checked={isUnitChecked}
                                            onChange={(e) => {
                                              setCheckedUnitIds(curr => e.target.checked ? [...curr, unit._id] : curr.filter(id => id !== unit._id));
                                            }}
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                                          />

                                          <Folder className="w-4 h-4 text-emerald-500 shrink-0" />
                                          <span className="font-bold text-slate-700 text-xs truncate">{unit.name}</span>
                                          
                                          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 font-bold border border-emerald-200/50 rounded text-[9px] px-1 py-0 leading-none">
                                            {unitLessons.length} Topics
                                          </Badge>
                                          {unit.isLocked && <Lock className="w-2.5 h-2.5 text-rose-500 shrink-0" />}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover/unit:opacity-100 transition-opacity">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => startCreateLesson(unit)}
                                            className="h-6.5 w-6.5 rounded-lg text-purple-600 hover:bg-purple-50"
                                            title="Add Topic under Unit"
                                          >
                                            <Plus className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => startEditUnit(unit)}
                                            className="h-6.5 w-6.5 rounded-lg text-slate-500 hover:bg-slate-200"
                                            title="Edit Unit"
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleMoveUnit(subject._id, uIdx, 'up')}
                                            disabled={uIdx === 0}
                                            className="h-6.5 w-6.5 rounded-lg text-slate-400 hover:bg-slate-250 disabled:opacity-20"
                                          >
                                            <ArrowUp className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleMoveUnit(subject._id, uIdx, 'down')}
                                            disabled={uIdx === subjectUnits.length - 1}
                                            className="h-6.5 w-6.5 rounded-lg text-slate-400 hover:bg-slate-250 disabled:opacity-20"
                                          >
                                            <ArrowDown className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDeleteUnit(unit._id)}
                                            className="h-6.5 w-6.5 rounded-lg text-rose-500 hover:bg-rose-50"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>

                                      {/* C. Nesting level: Lessons/Topics under Unit */}
                                      {isUnitExpanded && (
                                        <div className="mt-1 pl-8 relative">
                                          {/* Sub vertical line */}
                                          <div className="absolute left-3.5 top-0 bottom-3.5 w-px bg-slate-200" />

                                          {unitLessons.length === 0 ? (
                                            <div className="p-2.5 bg-slate-50/50 border border-slate-100 rounded-lg text-center text-[10px] text-slate-400 font-medium mt-1">
                                              No topics configured yet. Click the + button to add a topic.
                                            </div>
                                          ) : (
                                            unitLessons
                                              .filter(l => l.title.toLowerCase().includes(treeSearch.toLowerCase()))
                                              .map((lesson, lIdx) => {
                                                const isLessonSelected = selectedLessonId === lesson._id;
                                                const isLessonChecked = checkedLessonIds.includes(lesson._id);
                                                const isLessonExpanded = expandedLessons.has(lesson._id);
                                                const lessonVideos = lesson.videos || lesson.contents?.filter((c: any) => c.type === 'video') || [];

                                                return (
                                                  <div key={lesson._id} className="mt-1 space-y-1">
                                                    <div
                                                      onClick={() => {
                                                        setSelectedLessonId(lesson._id);
                                                        setSelectedTopicTab('overview');
                                                      }}
                                                      className={`group/lesson relative flex items-center justify-between p-3 rounded-xl border bg-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
                                                        isLessonSelected
                                                          ? 'border-purple-500 bg-purple-50/20 shadow-sm ring-1 ring-purple-500/15'
                                                          : 'border-slate-150 hover:border-slate-250 hover:bg-purple-50/5'
                                                      }`}
                                                    >
                                                      {/* Horizontal branch line */}
                                                      <div className="absolute -left-[19px] top-5.5 w-4.5 h-px bg-slate-200" />

                                                      <div className="flex items-center gap-2.5 min-w-0">
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedLessons(prev => {
                                                              const next = new Set(prev);
                                                              if (next.has(lesson._id)) {
                                                                next.delete(lesson._id);
                                                              } else {
                                                                next.add(lesson._id);
                                                              }
                                                              return next;
                                                            });
                                                          }}
                                                          className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 shrink-0"
                                                        >
                                                          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isLessonExpanded ? 'rotate-90' : ''}`} />
                                                        </button>

                                                        <input
                                                          type="checkbox"
                                                          checked={isLessonChecked}
                                                          onChange={(e) => {
                                                            setCheckedLessonIds(curr => e.target.checked ? [...curr, lesson._id] : curr.filter(id => id !== lesson._id));
                                                          }}
                                                          onClick={(e) => e.stopPropagation()}
                                                          className="h-3.5 w-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                                                        />

                                                        <span className={`text-xs font-semibold truncate ${
                                                          isLessonSelected ? 'text-purple-900 font-bold' : 'text-slate-700'
                                                        }`}>
                                                          {lesson.title}
                                                        </span>

                                                        <span className="bg-purple-50 text-purple-700 text-[9px] px-1.5 py-0.5 rounded border border-purple-200/50 font-medium shrink-0">
                                                          {lessonVideos.length} {lessonVideos.length === 1 ? 'Video' : 'Videos'}
                                                        </span>

                                                        {lesson.publishStatus === 'published' ? (
                                                          <Badge variant="outline" className="text-[8px] text-green-500 border-green-500/20 bg-green-500/5 px-1 py-0 leading-none">Published</Badge>
                                                        ) : (
                                                          <Badge variant="outline" className="text-[8px] text-slate-400 border-slate-300 bg-slate-50 px-1 py-0 leading-none">Draft</Badge>
                                                        )}
                                                        {lesson.isLocked && <Lock className="w-2.5 h-2.5 text-rose-500 shrink-0" />}
                                                      </div>

                                                      {/* Actions */}
                                                      <div className="flex items-center gap-0.5 opacity-0 group-hover/lesson:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                          size="icon"
                                                          variant="ghost"
                                                          onClick={() => startEditLesson(lesson)}
                                                          className="h-6 w-6 rounded hover:bg-slate-100 text-slate-500"
                                                          title="Edit Topic"
                                                        >
                                                          <Pencil className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                          size="icon"
                                                          variant="ghost"
                                                          onClick={() => handleDuplicateLesson(lesson)}
                                                          className="h-6 w-6 rounded hover:bg-slate-100 text-indigo-500"
                                                          title="Duplicate"
                                                        >
                                                          <Copy className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                          size="icon"
                                                          variant="ghost"
                                                          onClick={() => handleMoveLesson(unit._id, lIdx, 'up')}
                                                          disabled={lIdx === 0}
                                                          className="h-6 w-6 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-20"
                                                        >
                                                          ▲
                                                        </Button>
                                                        <Button
                                                          size="icon"
                                                          variant="ghost"
                                                          onClick={() => handleMoveLesson(unit._id, lIdx, 'down')}
                                                          disabled={lIdx === unitLessons.length - 1}
                                                          className="h-6 w-6 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-20"
                                                        >
                                                          ▼
                                                        </Button>
                                                        <Button
                                                          size="icon"
                                                          variant="ghost"
                                                          onClick={() => handleDeleteLesson(lesson._id)}
                                                          className="h-6 w-6 rounded hover:bg-slate-100 text-rose-500"
                                                          title="Delete"
                                                        >
                                                          <Trash className="w-3 h-3" />
                                                        </Button>
                                                      </div>
                                                    </div>

                                                    {/* Expanding Child Videos */}
                                                    {isLessonExpanded && (
                                                      <div className="pl-6 pr-2 py-1.5 space-y-1 bg-slate-50/30 rounded-lg border border-slate-100/50 mt-0.5 ml-3 text-left">
                                                        {lessonVideos.length === 0 ? (
                                                          <div className="p-2 text-center text-[10px] text-slate-400 font-medium">
                                                            No videos uploaded to this topic.
                                                          </div>
                                                        ) : (
                                                          lessonVideos.map((video: any, videoIdx: number) => {
                                                            const isReady = video.uploadStatus === 'ready';
                                                            return (
                                                              <div key={video._id} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-slate-150/60 dark:border-zinc-800 rounded-lg text-[11px] shadow-sm hover:border-purple-200 transition-colors">
                                                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                  <Play className="w-3 h-3 text-purple-500 fill-purple-500/10 shrink-0" />
                                                                  <span className="font-bold text-slate-700 dark:text-zinc-350 truncate">
                                                                    {video.title}
                                                                  </span>
                                                                  <span className="text-[9px] text-slate-400 font-medium">
                                                                    ({video.youtubeDuration || video.duration || '0:00'})
                                                                  </span>
                                                                  {isReady ? (
                                                                    <Badge variant="outline" className="text-[7px] text-green-500 border-green-500/25 bg-green-500/5 px-1 py-0 leading-none">Published</Badge>
                                                                  ) : (
                                                                    <Badge variant="outline" className="text-[7px] text-amber-500 border-amber-300 bg-amber-50 px-1 py-0 leading-none">{video.uploadStatus || 'processing'}</Badge>
                                                                  )}
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                                  <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => triggerEditVideo(video)}
                                                                    className="h-5 w-5 rounded hover:bg-slate-100 text-slate-500"
                                                                    title="Edit Title"
                                                                  >
                                                                    <Pencil className="w-2.5 h-2.5" />
                                                                  </Button>
                                                                  <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => triggerReplaceVideo(video)}
                                                                    className="h-5 w-5 rounded hover:bg-slate-100 text-amber-600"
                                                                    title="Replace Video File"
                                                                  >
                                                                    <RefreshCw className="w-2.5 h-2.5" />
                                                                  </Button>
                                                                  <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => deleteVideoContent(video._id)}
                                                                    className="h-5 w-5 rounded hover:bg-slate-100 text-rose-500"
                                                                    title="Delete Video"
                                                                  >
                                                                    <Trash className="w-2.5 h-2.5" />
                                                                  </Button>
                                                                  <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => moveVideoOrder(lesson, videoIdx, 'up')}
                                                                    disabled={videoIdx === 0}
                                                                    className="h-5 w-5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-20"
                                                                  >
                                                                    ▲
                                                                  </Button>
                                                                  <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => moveVideoOrder(lesson, videoIdx, 'down')}
                                                                    disabled={videoIdx === lessonVideos.length - 1}
                                                                    className="h-5 w-5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-20"
                                                                  >
                                                                    ▼
                                                                  </Button>
                                                                </div>
                                                              </div>
                                                            );
                                                          })
                                                        )}

                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            triggerAddVideo(lesson);
                                                          }}
                                                          className="w-full py-1.5 border border-dashed border-purple-200 hover:border-purple-400 text-purple-600 rounded-lg text-center font-bold text-[10px] bg-purple-50/10 hover:bg-purple-50/20 transition-all flex items-center justify-center gap-1 mt-1"
                                                        >
                                                          <span>+ Add Video</span>
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>
        </div>

        {/* PANEL C: TOPIC DETAILS INSPECTOR PANEL */}
        {selectedLesson && (
          <div className="w-80 border-l border-slate-200 bg-white flex flex-col h-full shrink-0 shadow-lg relative z-25 transition-transform duration-300">
            {/* Inspector Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
                  {selectedLesson.videoCount > 0 ? <Play className="w-4 h-4 fill-purple-600/10" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-extrabold text-slate-800 truncate" title={selectedLesson.title}>
                    {selectedLesson.title}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-medium truncate">
                    Unit: {selectedLessonParentUnit?.name || 'Curriculum unit'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLessonId('')}
                className="h-7 w-7 rounded-md hover:bg-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-600 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub navigation tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 p-1 shrink-0 gap-0.5">
              {(['overview', 'content', 'resources', 'settings'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSelectedTopicTab(tab)}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                    selectedTopicTab === tab 
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-100' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-white/40'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Inspector Scroll Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* TAB 1: OVERVIEW */}
              {selectedTopicTab === 'overview' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Description</Label>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-150 leading-relaxed min-h-[60px]">
                      {selectedLesson.description || 'No description provided. Click edit to add a synopsis for students.'}
                    </p>
                  </div>

                  <div className="bg-slate-50/50 rounded-2xl border border-slate-150 p-3.5 space-y-3">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Curriculum Metadata</Label>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium">Topic Type</span>
                        <span className="font-bold text-slate-700">{selectedLesson.videoCount > 0 ? '📽️ Video Lesson' : '📚 PDF Note'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium">Display Position</span>
                        <span className="font-bold text-slate-700">Index #{selectedLesson.order ?? 0}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium">Publish Status</span>
                        <span className="flex items-center gap-1.5 mt-0.5">
                          {selectedLesson.publishStatus === 'published' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] px-1 font-extrabold">Published</Badge>
                          ) : (
                            <Badge className="bg-slate-150 text-slate-500 border border-slate-200 rounded text-[9px] px-1 font-extrabold">Draft</Badge>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium">Access Status</span>
                        <span className="flex items-center gap-1.5 mt-0.5">
                          {selectedLesson.isLocked ? (
                            <Badge className="bg-rose-50 text-rose-700 border border-rose-100 rounded text-[9px] px-1 font-extrabold flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" />Locked</Badge>
                          ) : (
                            <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] px-1 font-extrabold flex items-center gap-0.5"><Unlock className="w-2.5 h-2.5" />Unlocked</Badge>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex gap-2.5">
                    <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="text-[10px] text-indigo-800 leading-normal font-medium">
                      Student analytics, quiz scores, and watch durations under this topic are loaded in the <span className="font-bold">Institute Analytics</span> reports.
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTENT (VIDEO/PDF ASSETS) */}
              {selectedTopicTab === 'content' && (
                <div className="space-y-3.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Linked Assets</Label>
                  
                  {selectedLesson.videoCount === 0 && selectedLesson.pdfCount === 0 && (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                      <span className="block text-xs font-bold text-slate-500">No linked media assets</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Use the Study Materials tab in your dashboard to link video uploads or PDFs to this lesson.</p>
                    </div>
                  )}

                  {selectedLesson.videoCount > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-purple-50/20 border border-purple-200/40 rounded-2xl text-xs">
                      <div className="h-8 w-8 bg-purple-500/10 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                        <Play className="w-4 h-4 fill-purple-600/15" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block font-bold text-slate-700 truncate">Video Resource</span>
                        <span className="block text-[10px] text-green-600 font-bold">🟢 linked & parsed ({selectedLesson.videoCount} active)</span>
                      </div>
                    </div>
                  )}

                  {selectedLesson.pdfCount > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50/20 border border-emerald-200/40 rounded-2xl text-xs">
                      <div className="h-8 w-8 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block font-bold text-slate-700 truncate">Document Attachment</span>
                        <span className="block text-[10px] text-slate-400 font-medium">{selectedLesson.pdfCount} PDF Note(s)</span>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[10px] text-slate-500 space-y-1 font-medium">
                    <span className="block font-bold text-slate-700 text-[11px] mb-1">Diagnostic Log Info</span>
                    <div className="flex justify-between">
                      <span>Total contents:</span>
                      <span className="font-bold text-slate-700">{selectedLesson.contentCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Video status:</span>
                      <span className="font-bold text-purple-700">{selectedLesson.videoCount > 0 ? 'LOCKED/ENCODED' : 'MISSING'}</span>
                    </div>
                    {selectedLesson.contentIds && selectedLesson.contentIds.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-250/50 font-mono text-[8px] truncate">
                        ID map: {selectedLesson.contentIds.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: RESOURCES */}
              {selectedTopicTab === 'resources' && (
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Linked PDF Resources</Label>
                  
                  {(() => {
                    const pdfContents = selectedLesson.contents?.filter((c: any) => c.type === 'pdf') || [];
                    if (pdfContents.length === 0) {
                      return (
                        <div className="p-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <AlertCircle className="w-5 h-5 text-slate-350 mx-auto mb-1.5" />
                          <span className="block text-[11px] font-bold text-slate-500">No PDF Documents Linked</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">Use the Study Materials tab in your dashboard to upload and link PDF resources to this topic.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {pdfContents.map((pdf: any) => (
                          <div key={pdf._id} className="p-3 bg-emerald-50/25 border border-emerald-200/40 rounded-xl flex items-center justify-between text-xs hover:border-emerald-300 transition-all">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div className="min-w-0">
                                <span className="block font-bold text-slate-700 truncate" title={pdf.attachmentName || 'Study Note PDF'}>
                                  {pdf.attachmentName || 'Study Note PDF'}
                                </span>
                                {pdf.attachmentUrl && (
                                  <a 
                                    href={pdf.attachmentUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-[9px] text-emerald-600 hover:text-emerald-700 font-bold hover:underline flex items-center gap-0.5 mt-0.5"
                                  >
                                    View Document <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Attachment resource notes */}
                  <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="font-bold text-slate-700">Homework & Assignment</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Optionally assign text tasks or readings for students to submit in lessons.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: SETTINGS (QUICK SAVE TOGGLES) */}
              {selectedTopicTab === 'settings' && (
                <div className="space-y-4">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Live Quick Toggles</Label>

                  {/* Toggle status dropdown */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Publish Status</Label>
                    <select
                      value={selectedLesson.publishStatus || 'draft'}
                      onChange={(e) => handleQuickSaveLesson(selectedLesson, { publishStatus: e.target.value })}
                      className="h-9 text-xs bg-white border border-slate-200 rounded-xl w-full px-2 font-medium focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="published">Published 🟢</option>
                      <option value="draft">Draft 🟡</option>
                    </select>
                  </div>

                  {/* Toggle Lock status dropdown */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Student Access Control</Label>
                    <select
                      value={selectedLesson.isLocked ? 'locked' : 'unlocked'}
                      onChange={(e) => handleQuickSaveLesson(selectedLesson, { isLocked: e.target.value === 'locked' })}
                      className="h-9 text-xs bg-white border border-slate-200 rounded-xl w-full px-2 font-medium focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="unlocked">Unlocked (Open) 🔓</option>
                      <option value="locked">Locked (Private) 🔒</option>
                    </select>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl text-[10px] leading-relaxed font-normal mt-4">
                    ⚠️ Changing toggles here updates database instantly. These reflect on student dashboards automatically.
                  </div>
                </div>
              )}
            </div>

            {/* Inspector bottom quick actions panel */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2.5 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => startEditLesson(selectedLesson)}
                  className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs h-9 shadow-sm"
                >
                  Edit details
                </Button>
                <Button
                  onClick={() => handleDeleteLesson(selectedLesson._id)}
                  className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-xl text-xs h-9"
                >
                  Delete Topic
                </Button>
              </div>

              <Button
                onClick={() => {
                  if (selectedLessonParentUnit) {
                    startCreateLesson(selectedLessonParentUnit);
                  }
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs h-10 shadow-md flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Another Topic
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* --- FORM SLIDE-OVER DRAWER COMPONENT --- */}
      {drawerType && (
        <>
          {renderBackdrop()}
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[101] transform transition-transform duration-300 ease-out translate-x-0 flex flex-col border-l border-slate-250 animate-slide-in">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 text-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-extrabold text-base tracking-tight flex items-center gap-1.5">
                  <Settings className="w-5 h-5 text-indigo-600 animate-spin-slow" />
                  {drawerMode === 'create' ? 'Create' : 'Modify'} {
                    drawerType === 'program' ? 'Academic Batch' :
                    drawerType === 'subject' ? 'Curriculum Subject' :
                    drawerType === 'unit' ? 'Subject Unit' : 'Lesson Topic'
                  }
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Fill in curriculum specs below. Fields marked * are mandatory.</p>
              </div>
              <button 
                onClick={() => setDrawerType(null)} 
                className="h-8 w-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body Scroll Form */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* FORM A: PROGRAM (BATCH) */}
              {drawerType === 'program' && (
                <form onSubmit={handleSaveProgram} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Batch Name *</Label>
                    <Input
                      placeholder="e.g. Bachelor of Computer Applications"
                      value={programForm.name}
                      onChange={(e) => setProgramForm(f => ({ ...f, name: e.target.value }))}
                      required
                      className="h-10 text-xs bg-slate-50/50 rounded-xl focus:bg-white focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Description *</Label>
                    <textarea
                      placeholder="Enter a brief program overview or syllabus layout..."
                      value={programForm.description}
                      onChange={(e) => setProgramForm(f => ({ ...f, description: e.target.value }))}
                      required
                      className="min-h-[90px] w-full text-xs p-3 bg-slate-50/50 border border-input rounded-xl focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Thumbnail URL</Label>
                    <Input
                      placeholder="https://images.unsplash.com/..."
                      value={programForm.thumbnail}
                      onChange={(e) => setProgramForm(f => ({ ...f, thumbnail: e.target.value }))}
                      className="h-10 text-xs bg-slate-50/50 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Banner Image URL</Label>
                    <Input
                      placeholder="https://images.unsplash.com/..."
                      value={programForm.bannerImage}
                      onChange={(e) => setProgramForm(f => ({ ...f, bannerImage: e.target.value }))}
                      className="h-10 text-xs bg-slate-50/50 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Order Position</Label>
                      <Input
                        type="number"
                        value={programForm.displayOrder}
                        onChange={(e) => setProgramForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
                        className="h-10 text-xs bg-slate-50/50 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Publish Status</Label>
                      <select
                        value={programForm.status}
                        onChange={(e) => setProgramForm(f => ({ ...f, status: e.target.value }))}
                        className="h-10 text-xs bg-slate-50/50 border border-input rounded-xl w-full px-3 focus:bg-white"
                      >
                        <option value="active">Published 🟢</option>
                        <option value="inactive">Draft 🟡</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Access Control</Label>
                    <select
                      value={programForm.isLocked ? 'locked' : 'unlocked'}
                      onChange={(e) => setProgramForm(f => ({ ...f, isLocked: e.target.value === 'locked' }))}
                      className="h-10 text-xs bg-slate-50/50 border border-input rounded-xl w-full px-3 focus:bg-white"
                    >
                      <option value="unlocked">Unlocked (Public) 🔓</option>
                      <option value="locked">Locked (Subscription Blocked) 🔒</option>
                    </select>
                  </div>

                  <div className="pt-4">
                    <Button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md">
                      <Check className="w-4 h-4" /> Save Batch Config
                    </Button>
                  </div>
                </form>
              )}

              {/* FORM B: SUBJECT */}
              {drawerType === 'subject' && (
                <form onSubmit={handleSaveSubject} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Subject Code *</Label>
                      <Input
                        placeholder="e.g. MCS-011"
                        value={subjectForm.subjectCode}
                        onChange={(e) => setSubjectForm(f => ({ ...f, subjectCode: e.target.value }))}
                        required
                        className="h-10 text-xs bg-slate-50/50 rounded-xl"
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Subject Name *</Label>
                      <Input
                        placeholder="e.g. C Programming & Data Structures"
                        value={subjectForm.subjectName}
                        onChange={(e) => setSubjectForm(f => ({ ...f, subjectName: e.target.value }))}
                        required
                        className="h-10 text-xs bg-slate-50/50 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Description</Label>
                    <textarea
                      placeholder="Add an optional syllabus scope synopsis for students..."
                      value={subjectForm.description}
                      onChange={(e) => setSubjectForm(f => ({ ...f, description: e.target.value }))}
                      className="min-h-[80px] w-full text-xs p-3 bg-slate-50/50 border border-input rounded-xl focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Order Position</Label>
                      <Input
                        type="number"
                        value={subjectForm.displayOrder}
                        onChange={(e) => setSubjectForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
                        className="h-10 text-xs bg-slate-50/50 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Publish Status</Label>
                      <select
                        value={subjectForm.status}
                        onChange={(e) => setSubjectForm(f => ({ ...f, status: e.target.value }))}
                        className="h-10 text-xs bg-slate-50/50 border border-input rounded-xl w-full px-3"
                      >
                        <option value="published">Published 🟢</option>
                        <option value="draft">Draft 🟡</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Access Control</Label>
                    <select
                      value={subjectForm.isLocked ? 'locked' : 'unlocked'}
                      onChange={(e) => setSubjectForm(f => ({ ...f, isLocked: e.target.value === 'locked' }))}
                      className="h-10 text-xs bg-slate-50/50 border border-input rounded-xl w-full px-3"
                    >
                      <option value="unlocked">Unlocked (Open Access) 🔓</option>
                      <option value="locked">Locked (Private) 🔒</option>
                    </select>
                  </div>

                  <div className="pt-4">
                    <Button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md">
                      <Check className="w-4 h-4" /> Save Subject Info
                    </Button>
                  </div>
                </form>
              )}

              {/* FORM C: UNIT */}
              {drawerType === 'unit' && (
                <form onSubmit={handleSaveUnit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Parent Subject</Label>
                    <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200/50 text-xs font-bold text-slate-700 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500" />
                      {editingSubject ? `[${editingSubject.subjectCode}] ${editingSubject.subjectName}` : 'Under selected Subject'}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Unit Name *</Label>
                    <Input
                      placeholder="e.g. Unit 1: Introduction to Coding Structures"
                      value={unitForm.name}
                      onChange={(e) => setUnitForm(f => ({ ...f, name: e.target.value }))}
                      required
                      className="h-10 text-xs bg-slate-50/50 rounded-xl focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Description</Label>
                    <textarea
                      placeholder="Summarize main concepts covered in this module..."
                      value={unitForm.description}
                      onChange={(e) => setUnitForm(f => ({ ...f, description: e.target.value }))}
                      className="min-h-[80px] w-full text-xs p-3 bg-slate-50/50 border border-input rounded-xl focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Display Order</Label>
                      <Input
                        type="number"
                        value={unitForm.displayOrder}
                        onChange={(e) => setUnitForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
                        className="h-10 text-xs bg-slate-50/50 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Publish Status</Label>
                      <select
                        value={unitForm.status}
                        onChange={(e) => setUnitForm(f => ({ ...f, status: e.target.value }))}
                        className="h-10 text-xs bg-slate-50/50 border border-input rounded-xl w-full px-3"
                      >
                        <option value="published">Published 🟢</option>
                        <option value="draft">Draft 🟡</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Access Lock</Label>
                    <select
                      value={unitForm.isLocked ? 'locked' : 'unlocked'}
                      onChange={(e) => setUnitForm(f => ({ ...f, isLocked: e.target.value === 'locked' }))}
                      className="h-10 text-xs bg-slate-50/50 border border-input rounded-xl w-full px-3"
                    >
                      <option value="unlocked">Unlocked 🔓</option>
                      <option value="locked">Locked 🔒</option>
                    </select>
                  </div>

                  <div className="pt-4">
                    <Button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md">
                      <Check className="w-4 h-4" /> Save Subject Unit
                    </Button>
                  </div>
                </form>
              )}

              {/* FORM D: TOPIC / LESSON */}
              {drawerType === 'lesson' && (
                <form onSubmit={handleSaveLesson} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Parent Module Unit</Label>
                    <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200/50 text-xs font-bold text-slate-700 flex items-center gap-2">
                      <Folder className="w-4 h-4 text-emerald-500" />
                      {editingUnit ? editingUnit.name : 'Under selected Unit'}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Topic / Lesson Title *</Label>
                    <Input
                      placeholder="e.g. Understanding Binary Trees & Node Traversals"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm(f => ({ ...f, title: e.target.value }))}
                      required
                      className="h-10 text-xs bg-slate-50/50 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Description / Synopsis</Label>
                    <textarea
                      placeholder="Add homework outlines, video logs, or study checklists..."
                      value={lessonForm.description}
                      onChange={(e) => setLessonForm(f => ({ ...f, description: e.target.value }))}
                      className="min-h-[85px] w-full text-xs p-3 bg-slate-50/50 border border-input rounded-xl focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Position order index</Label>
                      <Input
                        type="number"
                        value={lessonForm.order}
                        onChange={(e) => setLessonForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                        className="h-10 text-xs bg-slate-50/50 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Publish Status</Label>
                      <select
                        value={lessonForm.publishStatus}
                        onChange={(e) => setLessonForm(f => ({ ...f, publishStatus: e.target.value }))}
                        className="h-10 text-xs bg-slate-50/50 border border-input rounded-xl w-full px-3"
                      >
                        <option value="published">Published 🟢</option>
                        <option value="draft">Draft 🟡</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Student Access Lock</Label>
                    <select
                      value={lessonForm.isLocked ? 'locked' : 'unlocked'}
                      onChange={(e) => setLessonForm(f => ({ ...f, isLocked: e.target.value === 'locked' }))}
                      className="h-10 text-xs bg-slate-50/50 border border-input rounded-xl w-full px-3"
                    >
                      <option value="unlocked">Unlocked 🔓</option>
                      <option value="locked">Locked 🔒</option>
                    </select>
                  </div>

                  <div className="pt-4">
                    <Button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md">
                      <Check className="w-4 h-4" /> Save Topic Lesson
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}

      {/* --- PREVIEW MODAL --- */}
      {showPreviewModal && previewLesson && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
            onClick={() => setShowPreviewModal(false)}
          />
          
          {/* Modal box */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 animate-scale-up">
            
            {/* Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-purple-400 fill-purple-400/20" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Student Player Preview</span>
              </div>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="h-7 w-7 rounded-full bg-slate-850 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video mockup frame */}
            <div className="relative aspect-video bg-black flex items-center justify-center group">
              {previewLesson.videoCount > 0 ? (
                <>
                  {/* Fake Video Controls overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="h-1 bg-white/20 rounded-full w-full mb-3 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 bg-purple-500 w-[35%]" />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                      <div className="flex items-center gap-3">
                        <Play className="w-4 h-4 fill-white text-white cursor-pointer" />
                        <span>02:14 / 15:00</span>
                      </div>
                      <span className="text-[10px]">1080p Stream</span>
                    </div>
                  </div>

                  <div className="text-center space-y-3">
                    <div className="h-16 w-16 bg-purple-500/20 hover:bg-purple-500/35 border border-purple-500/30 rounded-full flex items-center justify-center text-purple-400 cursor-pointer transition-all hover:scale-105">
                      <Play className="w-8 h-8 fill-purple-400" />
                    </div>
                    <span className="block text-xs font-bold text-slate-400 font-mono">Trineo Encoded Playback Active</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-8 space-y-2">
                  <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                  <span className="block text-sm font-bold text-slate-400">PDF Study Notes Attachment Only</span>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">This lesson contains document downloads and text outlines, with no linked video playbacks.</p>
                  <Button 
                    onClick={() => toast.info('PDF download initialized (mock).')}
                    className="mt-3 bg-indigo-600 text-white hover:bg-indigo-700 h-8 rounded-lg text-xs"
                  >
                    Download PDF Document
                  </Button>
                </div>
              )}
            </div>

            {/* Synopsis Card */}
            <div className="p-6 bg-slate-950/90 space-y-2.5">
              <span className="text-xs text-purple-400 font-extrabold uppercase tracking-wide">Topic Lesson Title</span>
              <h2 className="text-base font-extrabold leading-tight text-white">{previewLesson.title}</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-normal bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                {previewLesson.description || 'No syllabus description provided for this lesson.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Video Management Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-zinc-100">
                {videoModalMode === 'upload' && `Upload Video to: ${selectedUploadLesson?.title}`}
                {videoModalMode === 'edit' && `Edit Video: ${selectedVideoContent?.title}`}
                {videoModalMode === 'replace' && `Replace Video: ${selectedVideoContent?.title}`}
              </h3>
              <button
                type="button"
                onClick={() => !uploadingVideo && setVideoModalOpen(false)}
                className="text-slate-450 hover:text-slate-600 dark:hover:text-zinc-200 text-sm font-bold"
                disabled={uploadingVideo}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVideoModalSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="modal-video-title">Video Title *</Label>
                  <Input
                    id="modal-video-title"
                    placeholder="e.g. Overview & Scope"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    required
                    disabled={uploadingVideo}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modal-video-duration">Duration</Label>
                  <Input
                    id="modal-video-duration"
                    placeholder="e.g. 15:45"
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(e.target.value)}
                    disabled={uploadingVideo}
                  />
                </div>
              </div>

              {videoModalMode === 'upload' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-zinc-800/80 pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-pdf-title">PDF Note Title</Label>
                    <Input
                      id="modal-pdf-title"
                      placeholder="e.g. Topic Notes PDF"
                      value={pdfTitle}
                      onChange={(e) => setPdfTitle(e.target.value)}
                      disabled={uploadingVideo}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="modal-pdf-file">PDF Attachment</Label>
                    <Input
                      id="modal-pdf-file"
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setPdfFile(e.target.files[0]);
                          if (!pdfTitle) {
                            setPdfTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                          }
                        }
                      }}
                      disabled={uploadingVideo}
                    />
                  </div>
                </div>
              )}

              {videoModalMode !== 'edit' && (
                <div className="space-y-1.5 pt-1">
                  <Label>Select MP4 Video File *</Label>
                  <div className="border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-5 text-center hover:border-purple-300 dark:hover:border-purple-800 transition-colors">
                    <input
                      type="file"
                      accept="video/*"
                      id="modal-file-input"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setVideoFile(e.target.files[0]);
                          if (!videoTitle) {
                            setVideoTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                          }
                        }
                      }}
                      required={videoModalMode === 'upload' && !videoFile}
                      disabled={uploadingVideo}
                    />
                    <label htmlFor="modal-file-input" className="space-y-1.5 block cursor-pointer">
                      <Play className="w-8 h-8 text-slate-400 mx-auto" />
                      <div className="text-xs font-semibold text-slate-700 dark:text-zinc-350">
                        {videoFile ? videoFile.name : 'Click to choose MP4 file'}
                      </div>
                      <div className="text-[10px] text-slate-400">Supports files up to 3GB</div>
                    </label>
                  </div>
                </div>
              )}

              {uploadingVideo && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                    <span>{videoUploadProgress === 100 ? 'Preparing Video...' : 'Uploading Video...'}</span>
                    <span>{videoUploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-650 to-indigo-600 transition-all duration-300"
                      style={{ width: `${videoUploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVideoModalOpen(false)}
                  className="w-1/3 text-xs h-9.5 rounded-xl border-slate-200 text-slate-650 hover:bg-slate-50"
                  disabled={uploadingVideo}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-2/3 bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-500/10 h-9.5 rounded-xl font-bold"
                  disabled={uploadingVideo || (videoModalMode !== 'edit' && !videoFile)}
                >
                  {uploadingVideo ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{videoUploadProgress === 100 ? 'Preparing...' : `Uploading (${videoUploadProgress}%)`}</span>
                    </div>
                  ) : (
                    <span>{videoModalMode === 'edit' ? 'Save Changes' : videoModalMode === 'replace' ? 'Upload & Replace' : 'Upload & Link'}</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
