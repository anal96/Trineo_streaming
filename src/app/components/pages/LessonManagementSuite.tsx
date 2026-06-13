import { useEffect, useMemo, useState } from 'react';
import { GripVertical, Plus, RefreshCw, Save, Search, Trash2, Video, AlertCircle, X, Check } from 'lucide-react';
import { apiFetch, getApiUrl } from '../../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

export default function LessonManagementSuite() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [lessons, setLessons] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [videoAssets, setVideoAssets] = useState<any[]>([]);
  const [syncingLessons, setSyncingLessons] = useState(false);
  const [replacingVideoId, setReplacingVideoId] = useState<string | null>(null);
  const [replaceProgress, setReplaceProgress] = useState(0);

  const handleReplaceVideoInline = async (lessonId: string, file: File) => {
    setReplacingVideoId(lessonId);
    setReplaceProgress(0);
    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();
    const token = localStorage.getItem('token');

    xhr.open('POST', getApiUrl(`/lessons/${lessonId}/replace-video`));
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setReplaceProgress(percent);
      }
    };

    xhr.onload = () => {
      setReplacingVideoId(null);
      if (xhr.status === 202 || xhr.status === 200) {
        toast.success('Video replacement started successfully!');
        loadLessons();
      } else {
        let errorMsg = 'Video replacement failed.';
        try {
          const resp = JSON.parse(xhr.responseText || '{}');
          errorMsg = resp.message || errorMsg;
        } catch (_) {}
        toast.error(errorMsg);
      }
    };

    xhr.onerror = () => {
      setReplacingVideoId(null);
      toast.error('Network error during video replacement.');
    };

    xhr.send(formData);
  };

  // Creation State
  const [createForm, setCreateForm] = useState<any>({
    title: '',
    description: '',
    moduleTitle: 'Module 1',
    moduleOrder: 1,
    order: 1,
    duration: '10:00',
    thumbnail: '',
    isLocked: false,
    publishStatus: 'draft',
    releaseAt: '',
    videoAssetId: ''
  });

  // Editing State
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({
    title: '',
    description: '',
    moduleTitle: '',
    moduleOrder: 1,
    order: 1,
    duration: '',
    thumbnail: '',
    isLocked: false,
    publishStatus: '',
    releaseAt: '',
    videoAssetId: ''
  });

  const loadCourses = async () => {
    try {
      const data = await apiFetch('/courses');
      setCourses(data);
      if (!selectedCourseId && data.length) setSelectedCourseId(data[0]._id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load courses.');
    }
  };

  const loadLessons = async () => {
    if (!selectedCourseId) return;
    try {
      const data = await apiFetch(`/lessons/course/${selectedCourseId}?search=${encodeURIComponent(search)}`);
      setLessons(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load lessons.');
    }
  };

  const loadVideoAssets = async () => {
    try {
      const data = await apiFetch('/videos/jobs');
      // Filter ready videos that have a valid youtubeVideoId
      const readyAssets = data.filter((item: any) => item.youtubeVideoId);
      setVideoAssets(readyAssets);
    } catch (err: any) {
      console.error('Failed to load video assets:', err);
    }
  };

  const syncLessons = async () => {
    try {
      setSyncingLessons(true);
      const res = await apiFetch('/videos/youtube/lessons/sync', { method: 'POST' });
      toast.success(res.message || 'Lessons synchronized successfully.');
      loadLessons();
      loadVideoAssets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync lessons.');
    } finally {
      setSyncingLessons(false);
    }
  };

  useEffect(() => {
    loadCourses();
    loadVideoAssets();
  }, []);

  useEffect(() => {
    loadLessons();
  }, [selectedCourseId, search]);

  const groupedModules = useMemo(() => {
    const map: Record<string, any[]> = {};
    lessons.forEach((lesson) => {
      const key = `${lesson.moduleOrder || 1}-${lesson.moduleTitle || 'Module 1'}`;
      if (!map[key]) map[key] = [];
      map[key].push(lesson);
    });
    return Object.entries(map).sort((a, b) => Number(a[0].split('-')[0]) - Number(b[0].split('-')[0]));
  }, [lessons]);

  const resetCreateForm = () => {
    setCreateForm({
      title: '',
      description: '',
      moduleTitle: 'Module 1',
      moduleOrder: 1,
      order: 1,
      duration: '10:00',
      thumbnail: '',
      isLocked: false,
      publishStatus: 'draft',
      releaseAt: '',
      videoAssetId: ''
    });
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error('Please select a course first.');
      return;
    }

    // Validation: block publishing if no video asset is linked
    if (createForm.publishStatus === 'published') {
      toast.error('Published status is blocked until a video is linked.');
      return;
    }

    try {
      const payload = {
        ...createForm,
        courseId: selectedCourseId,
        videoAssetId: null,
        releaseAt: createForm.releaseAt || null
      };

      await apiFetch('/lessons', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      toast.success('Lesson record created successfully.');
      resetCreateForm();
      loadLessons();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create lesson record.');
    }
  };

  const handleSaveInline = async (e: React.FormEvent, lessonId: string) => {
    e.preventDefault();

    // Validation: block publishing if no video asset is linked
    const currentLesson = lessons.find(l => l._id === lessonId);
    const hasVideo = currentLesson?.videoAssetId || currentLesson?.youtubeVideoId;
    if (editForm.publishStatus === 'published' && !hasVideo) {
      toast.error('Published status is blocked until a video is linked.');
      return;
    }

    try {
      const payload = {
        ...editForm,
        releaseAt: editForm.releaseAt || null
      };

      await apiFetch(`/lessons/${lessonId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      toast.success('Lesson record updated successfully.');
      setEditingLessonId(null);
      loadLessons();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lesson record.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await apiFetch(`/lessons/${id}`, { method: 'DELETE' });
      toast.success('Lesson record deleted.');
      loadLessons();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete lesson.');
    }
  };

  const handleReorder = async (moduleTitle: string, moduleOrder: number, ordered: any[]) => {
    try {
      const items = ordered.map((lesson, idx) => ({ id: lesson._id, order: idx + 1, moduleTitle, moduleOrder }));
      await apiFetch('/lessons/reorder', { method: 'POST', body: JSON.stringify({ items }) });
      toast.success('Order saved successfully.');
      loadLessons();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save order.');
    }
  };

  const onDragLesson = (dragId: string, targetId: string, moduleTitle: string, moduleOrder: number) => {
    if (dragId === targetId) return;
    const list = lessons.filter((l) => l.moduleTitle === moduleTitle && Number(l.moduleOrder) === Number(moduleOrder)).sort((a, b) => a.order - b.order);
    const from = list.findIndex((l) => l._id === dragId);
    const to = list.findIndex((l) => l._id === targetId);
    if (from < 0 || to < 0) return;
    const reordered = [...list];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    handleReorder(moduleTitle, moduleOrder, reordered);
  };

  const applyBulk = async (action: string) => {
    if (!selectedIds.length) return;
    try {
      await apiFetch('/lessons/bulk', { method: 'POST', body: JSON.stringify({ lessonIds: selectedIds, action }) });
      toast.success(`Bulk action "${action}" applied.`);
      setSelectedIds([]);
      loadLessons();
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply bulk operation.');
    }
  };

  const toggleSelectLesson = (lessonId: string, checked: boolean) => {
    setSelectedIds((curr) => checked ? [...curr, lessonId] : curr.filter((id) => id !== lessonId));
  };

  const startInlineEdit = (lesson: any) => {
    setEditingLessonId(lesson._id);
    setEditForm({
      title: lesson.title,
      description: lesson.description || '',
      moduleTitle: lesson.moduleTitle || 'Module 1',
      moduleOrder: Number(lesson.moduleOrder) || 1,
      order: Number(lesson.order) || 1,
      duration: lesson.duration || '10:00',
      thumbnail: lesson.thumbnail || '',
      isLocked: lesson.isLocked || false,
      publishStatus: lesson.publishStatus || 'draft',
      releaseAt: lesson.releaseAt ? String(lesson.releaseAt).slice(0, 16) : '',
      videoAssetId: lesson.videoAssetId?._id || lesson.videoAssetId || ''
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Course Builder</CardTitle>
          <CardDescription>Configure course structure, modules, lesson parameters, and link processed Video Assets.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              className="h-11 rounded-xl border px-3 bg-background border-border text-sm"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">Select Course</option>
              {courses.map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}
            </select>
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10 h-11 rounded-xl border-border"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search lesson records..."
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="min-h-11 rounded-xl" onClick={() => applyBulk('lock')}>Bulk Lock</Button>
            <Button size="sm" variant="outline" className="min-h-11 rounded-xl" onClick={() => applyBulk('unlock')}>Bulk Unlock</Button>
            <Button size="sm" variant="outline" className="min-h-11 rounded-xl" onClick={() => applyBulk('publish')}>Bulk Publish</Button>
            <Button size="sm" variant="outline" className="min-h-11 rounded-xl" onClick={() => applyBulk('unpublish')}>Bulk Unpublish</Button>
            <Button size="sm" variant="outline" className="min-h-11 rounded-xl" onClick={syncLessons} disabled={syncingLessons}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncingLessons ? 'animate-spin' : ''}`} />
              Sync Lessons
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {groupedModules.map(([moduleKey, moduleLessons]) => {
              const [moduleOrder, ...titleParts] = moduleKey.split('-');
              const moduleTitle = titleParts.join('-');
              return (
                <Card key={moduleKey} className="border border-border/70 bg-card/50">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base font-semibold">Module {moduleOrder}: {moduleTitle}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-4">
                    {moduleLessons.sort((a, b) => a.order - b.order).map((lesson: any) => {
                      const isEditing = editingLessonId === lesson._id;
                      const isReady = lesson.youtubeVideoId && lesson.uploadStatus === 'ready';
                      const isProcessing = lesson.videoAssetId && lesson.uploadStatus !== 'ready';
                      const isMissing = !lesson.videoAssetId && !lesson.youtubeVideoId;

                      return (
                        <div
                          key={lesson._id}
                          className="border border-border/50 rounded-xl p-4 bg-background transition-all"
                          draggable={!isEditing}
                          onDragStart={(e) => e.dataTransfer.setData('lessonId', lesson._id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => onDragLesson(e.dataTransfer.getData('lessonId'), lesson._id, moduleTitle, Number(moduleOrder))}
                        >
                          {!isEditing ? (
                            /* Read-only view */
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(lesson._id)}
                                  onChange={(e) => toggleSelectLesson(lesson._id, e.target.checked)}
                                  className="h-4 w-4 rounded border-border"
                                />
                                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                                    <span className="truncate">{lesson.title}</span>
                                    {isReady && (
                                      <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/10 text-xs px-2 py-0">
                                        ✓ Video Linked
                                      </Badge>
                                    )}
                                    {isMissing && (
                                      <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs px-2 py-0">
                                        🔴 Video Missing
                                      </Badge>
                                    )}
                                    {isProcessing && (
                                      <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/10 text-xs px-2 py-0">
                                        ⏳ Processing Video
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Duration: {lesson.duration || '0:00'} · Status: <span className="capitalize">{lesson.publishStatus}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 justify-end">
                                <Badge variant={lesson.isLocked ? 'destructive' : 'outline'} className="rounded-full">
                                  {lesson.isLocked ? 'Locked' : 'Unlocked'}
                                </Badge>
                                <Button size="sm" variant="outline" className="min-h-9 px-3 rounded-xl" onClick={() => startInlineEdit(lesson)}>Edit</Button>
                                <Button size="sm" variant="outline" className="min-h-9 px-3 rounded-xl border-red-500/30 text-red-500 hover:bg-red-500/5" onClick={() => handleDelete(lesson._id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* Inline Edit Mode */
                            <form onSubmit={(e) => handleSaveInline(e, lesson._id)} className="space-y-4">
                              <div className="flex items-center justify-between border-b border-border pb-2">
                                <span className="text-sm font-semibold flex items-center gap-2">
                                  <Video className="w-4 h-4 text-violet-500" />
                                  Editing Lesson Inline
                                </span>
                                <Button size="icon" variant="ghost" onClick={() => setEditingLessonId(null)} className="h-8 w-8 rounded-full">
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Lesson Title</Label>
                                  <Input value={editForm.title} onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))} required />
                                </div>
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Input value={editForm.description} onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Module Title</Label>
                                  <Input value={editForm.moduleTitle} onChange={(e) => setEditForm(prev => ({ ...prev, moduleTitle: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-2">
                                    <Label>Module Order</Label>
                                    <Input type="number" value={editForm.moduleOrder} onChange={(e) => setEditForm(prev => ({ ...prev, moduleOrder: Number(e.target.value) }))} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Lesson Order</Label>
                                    <Input type="number" value={editForm.order} onChange={(e) => setEditForm(prev => ({ ...prev, order: Number(e.target.value) }))} />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Duration (mm:ss)</Label>
                                  <Input value={editForm.duration} onChange={(e) => setEditForm(prev => ({ ...prev, duration: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Thumbnail URL</Label>
                                  <Input value={editForm.thumbnail} onChange={(e) => setEditForm(prev => ({ ...prev, thumbnail: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Release At</Label>
                                  <Input type="datetime-local" value={editForm.releaseAt} onChange={(e) => setEditForm(prev => ({ ...prev, releaseAt: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Publish Status</Label>
                                  <select
                                    className="h-10 rounded-md border px-3 bg-background w-full border-border text-sm"
                                    value={editForm.publishStatus}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, publishStatus: e.target.value }))}
                                  >
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                    <option value="unpublished">Unpublished</option>
                                    <option value="scheduled">Scheduled</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Access Lock</Label>
                                  <select
                                    className="h-10 rounded-md border px-3 bg-background w-full border-border text-sm"
                                    value={editForm.isLocked ? 'locked' : 'unlocked'}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, isLocked: e.target.value === 'locked' }))}
                                  >
                                    <option value="unlocked">Unlocked</option>
                                    <option value="locked">Locked</option>
                                  </select>
                                </div>

                                <div className="space-y-4 md:col-span-2 border-t border-border pt-4 mt-2">
                                  <h4 className="text-sm font-semibold text-foreground/80">Video Section</h4>
                                  <div className="bg-muted/30 border border-border p-4 rounded-xl space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2">
                                      <span className="text-muted-foreground font-medium">Current Video:</span>
                                      <span className="font-semibold text-foreground truncate max-w-xs">
                                        {lesson.videoAssetId?.title || lesson.title || 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground font-medium">Status:</span>
                                      <span className="capitalize font-bold text-primary">
                                        {isReady ? 'Ready' : isProcessing ? `Processing (${lesson.uploadStatus || 'Pending'})` : 'Missing'}
                                      </span>
                                    </div>

                                    <div className="pt-2 border-t border-border/40 space-y-2">
                                      <Label className="text-xs font-semibold text-muted-foreground">Replace Video File</Label>
                                      <Input
                                        type="file"
                                        accept="video/*"
                                        disabled={replacingVideoId === lesson._id}
                                        className="text-xs file:bg-primary file:text-white file:border-0 file:rounded file:px-2 file:py-1 cursor-pointer bg-background"
                                        onChange={(e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            handleReplaceVideoInline(lesson._id, e.target.files[0]);
                                          }
                                        }}
                                      />
                                    </div>

                                    {replacingVideoId === lesson._id && (
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-xs font-semibold">
                                          <span>{replaceProgress === 100 ? 'Streaming to YouTube...' : 'Uploading video file...'}</span>
                                          <span>{replaceProgress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-gradient-to-r from-primary to-slate-700 transition-all duration-300"
                                            style={{ width: `${replaceProgress}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2 justify-end pt-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setEditingLessonId(null)} className="min-h-9 px-4 rounded-xl">Cancel</Button>
                                <Button type="submit" size="sm" className="min-h-9 px-4 rounded-xl">
                                  <Save className="w-4 h-4 mr-2" />
                                  Save Changes
                                </Button>
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* CREATE LESSON RECORD CARD */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Create Lesson Record</CardTitle>
          <CardDescription>Setup a lesson shell. Links directly to processed Video Assets from the Video Library.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateLesson} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={createForm.title} onChange={(e) => setCreateForm((f: any) => ({ ...f, title: e.target.value }))} required placeholder="e.g. Introduction to Accounting" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={createForm.description} onChange={(e) => setCreateForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Lesson objectives and summaries" />
              </div>
              <div className="space-y-2">
                <Label>Module Title</Label>
                <Input value={createForm.moduleTitle} onChange={(e) => setCreateForm((f: any) => ({ ...f, moduleTitle: e.target.value }))} placeholder="e.g. Module 1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Module Order</Label>
                  <Input type="number" value={createForm.moduleOrder} onChange={(e) => setCreateForm((f: any) => ({ ...f, moduleOrder: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Lesson Order</Label>
                  <Input type="number" value={createForm.order} onChange={(e) => setCreateForm((f: any) => ({ ...f, order: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Duration (mm:ss)</Label>
                <Input value={createForm.duration} onChange={(e) => setCreateForm((f: any) => ({ ...f, duration: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Thumbnail URL</Label>
                <Input value={createForm.thumbnail} onChange={(e) => setCreateForm((f: any) => ({ ...f, thumbnail: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Release At</Label>
                <Input type="datetime-local" value={createForm.releaseAt} onChange={(e) => setCreateForm((f: any) => ({ ...f, releaseAt: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Publish Status</Label>
                <select
                  className="h-11 rounded-xl border px-3 bg-background w-full border-border text-sm"
                  value={createForm.publishStatus}
                  onChange={(e) => setCreateForm((f: any) => ({ ...f, publishStatus: e.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="unpublished">Unpublished</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Access Lock</Label>
                <select
                  className="h-11 rounded-xl border px-3 bg-background w-full border-border text-sm"
                  value={createForm.isLocked ? 'locked' : 'unlocked'}
                  onChange={(e) => setCreateForm((f: any) => ({ ...f, isLocked: e.target.value === 'locked' }))}
                >
                  <option value="unlocked">Unlocked</option>
                  <option value="locked">Locked</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="min-h-11 rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Create Lesson Record
              </Button>
              <Button type="button" variant="outline" onClick={resetCreateForm} className="min-h-11 rounded-xl">Clear Form</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
