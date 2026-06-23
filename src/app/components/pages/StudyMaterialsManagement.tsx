import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Loader2, Search, Trash2, Upload } from 'lucide-react';
import { apiFetch, getApiUrl } from '../../utils/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { ResponsiveDataView, MobileRecordCard } from '../responsive/ResponsiveDataView';

export default function StudyMaterialsManagement() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadCourseId, setUploadCourseId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (type && type !== 'All') params.set('type', type);
    if (courseId) params.set('courseId', courseId);
    const value = params.toString();
    return value ? `?${value}` : '';
  }, [search, type, courseId]);

  // Queries
  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => apiFetch('/courses'),
  });

  const { data: materials = [], isLoading: loading } = useQuery({
    queryKey: ['materials', 'admin', search, type, courseId],
    queryFn: () => apiFetch(`/materials/admin${queryString}`),
  });

  const resetUploadForm = () => {
    setTitle('');
    setDescription('');
    setUploadCourseId('');
    setFile(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !uploadCourseId || !file) {
      alert('Title, course, and PDF file are required');
      return;
    }
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('courseId', uploadCourseId);
    formData.append('file', file);

    setUploading(true);
    try {
      await apiFetch('/materials', { method: 'POST', body: formData });
      resetUploadForm();
      queryClient.invalidateQueries({ queryKey: ['materials', 'admin'] });
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this study material?')) return;
    try {
      await apiFetch(`/materials/${id}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['materials', 'admin'] });
    } catch (err: any) {
      alert(err.message || 'Failed to delete material');
    }
  };

  const openDownload = (downloadUrl: string) => {
    const token = localStorage.getItem('token');
    const url = token
      ? `${getApiUrl(downloadUrl)}?token=${encodeURIComponent(token)}`
      : getApiUrl(downloadUrl);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload Study Material
          </CardTitle>
          <CardDescription>Upload tenant-scoped PDF materials and assign them to a batch.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Week 3 Revision Notes" required />
              </div>
              <div className="space-y-2">
                <Label>Batch</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={uploadCourseId}
                  onChange={(e) => setUploadCourseId(e.target.value)}
                  required
                >
                  <option value="">Select a batch</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>{course.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="space-y-2">
              <Label>PDF File</Label>
              <Input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            <Button type="submit" className="bg-primary text-white" disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? 'Uploading...' : 'Upload Material'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Study Materials Management
          </CardTitle>
          <CardDescription>Search, filter, download, and delete uploaded materials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or description" />
            </div>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">All Batches</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>{course.title}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            {['All', 'pdf'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${
                  type === value ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground'
                }`}
              >
                {value === 'All' ? 'All Types' : value.toUpperCase()}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <ResponsiveDataView
              desktop={
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell>
                          <div className="font-medium">{material.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{material.description || 'No description'}</div>
                        </TableCell>
                        <TableCell>{material.courseTitle || 'Unknown Batch'}</TableCell>
                        <TableCell><Badge variant="outline">{String(material.fileType || 'pdf').toUpperCase()}</Badge></TableCell>
                        <TableCell>{((material.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB</TableCell>
                        <TableCell>{new Date(material.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="outline" className="min-h-11" onClick={() => openDownload(material.downloadUrl)}><Download className="w-4 h-4 mr-1" />Download</Button>
                            <Button size="sm" variant="outline" className="min-h-11 border-red-500/30 text-red-500" onClick={() => handleDelete(material.id)}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {materials.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No study materials found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              }
              mobile={
                materials.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No study materials found.</p>
                ) : (
                  materials.map((material) => (
                    <MobileRecordCard
                      key={material.id}
                      title={material.title}
                      subtitle={material.courseTitle || 'Unknown Batch'}
                      badges={<Badge variant="outline">{String(material.fileType || 'pdf').toUpperCase()}</Badge>}
                      rows={[
                        { label: 'Size', value: `${((material.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB` },
                        { label: 'Uploaded', value: new Date(material.createdAt).toLocaleDateString() },
                      ]}
                      actions={
                        <>
                          <Button size="sm" variant="outline" className="min-h-11 flex-1" onClick={() => openDownload(material.downloadUrl)}>Download</Button>
                          <Button size="sm" variant="outline" className="min-h-11 text-red-500" onClick={() => handleDelete(material.id)}>Delete</Button>
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
    </div>
  );
}
