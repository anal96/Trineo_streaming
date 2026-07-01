import { useState, useMemo } from 'react';
import { Plus, PencilLine, Trash2, Search, Users, Mail, Clock, BookOpen, Loader2 } from 'lucide-react';
import { apiFetch, getUploadUrl } from '../../utils/api';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function FacultyManagement() {
  const queryClient = useQueryClient();

  // Form state
  const [showModal, setShowModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<any>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [officeHours, setOfficeHours] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter
  const [searchQuery, setSearchQuery] = useState('');

  const cachedUser = useMemo(() => {
    const cached = localStorage.getItem('user');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch (_) {
      return null;
    }
  }, []);

  const instituteId = cachedUser?.institute?._id || cachedUser?.institute || '';

  // React Query: Faculty list
  const { data: facultyList = [], isLoading: loading } = useQuery({
    queryKey: ['faculty', instituteId],
    queryFn: () => apiFetch('/faculty'),
    enabled: !!instituteId,
  });

  // React Query: Courses (for multi-select association)
  const { data: courses = [] } = useQuery({
    queryKey: ['courses', instituteId],
    queryFn: () => apiFetch('/courses'),
    enabled: !!instituteId,
  });

  const openCreateModal = () => {
    setEditingFaculty(null);
    setName('');
    setRole('');
    setDepartment('');
    setEmail('');
    setOfficeHours('');
    setBio('');
    setAvatar(null);
    setSelectedCourses([]);
    setShowModal(true);
  };

  const openEditModal = (faculty: any) => {
    setEditingFaculty(faculty);
    setName(faculty.name || '');
    setRole(faculty.role || '');
    setDepartment(faculty.department || '');
    setEmail(faculty.email || '');
    setOfficeHours(faculty.officeHours || '');
    setBio(faculty.bio || '');
    setAvatar(faculty.avatar || null);
    setSelectedCourses((faculty.courses || []).map((c: any) => c._id));
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Faculty name is required');
      return;
    }

    setSaving(true);

    const payload = {
      name,
      role: role || 'Lecturer',
      department,
      email,
      officeHours,
      bio,
      avatar,
      courses: selectedCourses
    };

    try {
      if (editingFaculty?.id) {
        await apiFetch(`/faculty/${editingFaculty.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success('Faculty member updated successfully');
      } else {
        await apiFetch('/faculty', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success('Faculty member added successfully');
      }
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['faculty', instituteId] });
    } catch (err: any) {
      toast.error('Failed to save faculty member', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/faculty/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Faculty member removed');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['faculty', instituteId] });
    } catch (err: any) {
      toast.error('Delete failed', { description: err.message });
    } finally {
      setDeleting(false);
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(c => c !== courseId)
        : [...prev, courseId]
    );
  };

  const filteredFaculty = facultyList.filter((f: any) => {
    const q = searchQuery.toLowerCase();
    return (
      (f.name || '').toLowerCase().includes(q) ||
      (f.department || '').toLowerCase().includes(q) ||
      (f.role || '').toLowerCase().includes(q) ||
      (f.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Faculty & Staff</h2>
          <p className="text-muted-foreground text-sm">Manage your institute's instructors, departments, and contact information visible to students.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Faculty
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, department, role, or email..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Faculty Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading faculty members...</p>
        </div>
      ) : filteredFaculty.length === 0 ? (
        <Card className="border-dashed border-2 border-border/60 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg">
              {searchQuery ? 'No matching faculty found' : 'No faculty members yet'}
            </h3>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
              {searchQuery
                ? 'Try adjusting your search query.'
                : 'Add your first faculty member to display them on student dashboards.'}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateModal} variant="outline" className="mt-4 gap-2">
                <Plus className="w-4 h-4" /> Add Faculty Member
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFaculty.map((faculty: any) => (
            <Card key={faculty.id} className="border-border/60 bg-card hover:border-primary/20 transition-all group relative overflow-hidden">
              {/* Gradient accent strip */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/80 via-primary/50 to-transparent" />
              <CardContent className="pt-6 pb-5 px-5">
                {/* Top: Avatar + Identity */}
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                    <AvatarImage src={faculty.avatar ? (faculty.avatar.startsWith('/') ? getUploadUrl(faculty.avatar) : faculty.avatar) : `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(faculty.name)}`} />
                    <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">{faculty.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base truncate">{faculty.name}</h3>
                    <p className="text-xs text-primary font-semibold">{faculty.role}</p>
                    {faculty.department && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{faculty.department}</p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {faculty.bio && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">{faculty.bio}</p>
                )}

                {/* Metadata pills */}
                <div className="space-y-2 mb-4">
                  {faculty.courseName && (
                    <div className="flex items-center gap-2 text-xs">
                      <BookOpen className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      <span className="truncate text-muted-foreground">{faculty.courseName}</span>
                    </div>
                  )}
                  {faculty.officeHours && faculty.officeHours !== 'By appointment' && (
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      <span className="text-muted-foreground">{faculty.officeHours}</span>
                    </div>
                  )}
                  {faculty.email && (
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      <a href={`mailto:${faculty.email}`} className="text-muted-foreground hover:text-primary truncate">{faculty.email}</a>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-8"
                    onClick={() => openEditModal(faculty)}
                  >
                    <PencilLine className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-8 text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                    onClick={() => setDeleteTarget(faculty)}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      {!loading && filteredFaculty.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Badge variant="outline" className="bg-muted/30 border-border/50">
            {filteredFaculty.length} Faculty Member{filteredFaculty.length !== 1 ? 's' : ''}
          </Badge>
          {searchQuery && (
            <span>
              Showing results for &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </div>
      )}

      {/* ── Create / Edit Modal ─────────────────────────────────── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFaculty ? 'Edit Faculty Member' : 'Add New Faculty'}</DialogTitle>
            <DialogDescription>
              {editingFaculty
                ? 'Update the faculty details below. Changes will be visible to students immediately.'
                : 'Fill in the details to add a new faculty member to your institute.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 mt-2">
            {/* Profile Photo */}
            <div className="space-y-2 pb-1.5 border-b border-border/40">
              <Label>Profile Photo</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border">
                  <AvatarImage src={avatar ? (avatar.startsWith('data:') ? avatar : getUploadUrl(avatar)) : ''} />
                  <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                    {name ? name[0] : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1.5">
                  <Input
                    id="faculty-avatar-file"
                    type="file"
                    accept="image/*"
                    className="max-w-[220px] text-xs h-9 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setAvatar(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {avatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive text-xs hover:bg-destructive/5 self-start h-7 px-2"
                      onClick={() => setAvatar(null)}
                    >
                      Remove Photo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="faculty-name">Full Name *</Label>
              <Input
                id="faculty-name"
                placeholder="e.g. Dr. Sarah Johnson"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            {/* Role & Department – side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="faculty-role">Title / Role</Label>
                <Input
                  id="faculty-role"
                  placeholder="e.g. Head of Department"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faculty-department">Department</Label>
                <Input
                  id="faculty-department"
                  placeholder="e.g. Computer Science"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="faculty-email">Email Address</Label>
              <Input
                id="faculty-email"
                type="email"
                placeholder="e.g. sarah@institute.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            {/* Office Hours */}
            <div className="space-y-1.5">
              <Label htmlFor="faculty-office-hours">Office Hours</Label>
              <Input
                id="faculty-office-hours"
                placeholder="e.g. Monday/Wednesday 2:00 PM - 4:00 PM"
                value={officeHours}
                onChange={e => setOfficeHours(e.target.value)}
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="faculty-bio">Biography</Label>
              <textarea
                id="faculty-bio"
                placeholder="A short bio describing their expertise and background..."
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            {/* Course Assignment */}
            {courses.length > 0 && (
              <div className="space-y-1.5">
                <Label>Assign to Batches / Courses</Label>
                <div className="flex flex-wrap gap-2 p-3 rounded-md border border-input bg-background max-h-32 overflow-y-auto">
                  {courses.map((course: any) => {
                    const isSelected = selectedCourses.includes(course._id);
                    return (
                      <Badge
                        key={course._id}
                        variant={isSelected ? 'default' : 'outline'}
                        className={`cursor-pointer transition-all text-xs select-none ${
                          isSelected
                            ? 'bg-primary/90 text-primary-foreground hover:bg-primary'
                            : 'hover:bg-muted/50 text-muted-foreground'
                        }`}
                        onClick={() => toggleCourseSelection(course._id)}
                      >
                        {course.title}
                      </Badge>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Click to toggle. Leave empty for &ldquo;General Studies&rdquo;.</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="min-w-[100px]">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingFaculty ? 'Save Changes' : 'Add Faculty'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Faculty Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
              {deleteTarget?.courseName && deleteTarget.courseName !== 'General Studies' && (
                <span className="block mt-1 text-amber-500">
                  Note: If this faculty is assigned to live classes, they must be reassigned first.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="min-w-[100px]"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
