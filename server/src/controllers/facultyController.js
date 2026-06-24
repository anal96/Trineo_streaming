import { Faculty } from '../models/Faculty.js';
import { LiveClass } from '../models/LiveClass.js';

// GET /api/faculty — List all faculty for the admin's institute
export const getFacultyList = async (req, res) => {
  try {
    const facultyMembers = await Faculty.find({ institute: req.user.institute })
      .populate('courses')
      .sort({ createdAt: -1 });

    const mapped = facultyMembers.map(f => {
      const courseName = f.courses && f.courses.length > 0
        ? f.courses.map(c => c.title).join(', ')
        : 'General Studies';
      return {
        id: f._id,
        name: f.name,
        courseName,
        role: f.role,
        department: f.department,
        email: f.email,
        officeHours: f.officeHours || 'By appointment',
        bio: f.bio,
        avatar: f.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(f.name)}`,
        courses: (f.courses || []).map(c => ({ _id: c._id, title: c.title })),
        createdAt: f.createdAt
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error('getFacultyList error:', err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/faculty — Create a new faculty member
export const createFaculty = async (req, res) => {
  try {
    const { name, role, department, email, officeHours, bio, avatar, courses } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Faculty name is required' });
    }

    const faculty = await Faculty.create({
      name: name.trim(),
      role: (role || 'Lecturer').trim(),
      department: (department || '').trim(),
      email: (email || '').trim(),
      officeHours: (officeHours || '').trim(),
      bio: (bio || '').trim(),
      avatar: avatar || null,
      courses: courses || [],
      institute: req.user.institute
    });

    const populated = await faculty.populate('courses');

    const courseName = populated.courses && populated.courses.length > 0
      ? populated.courses.map(c => c.title).join(', ')
      : 'General Studies';

    res.status(201).json({
      id: populated._id,
      name: populated.name,
      courseName,
      role: populated.role,
      department: populated.department,
      email: populated.email,
      officeHours: populated.officeHours || 'By appointment',
      bio: populated.bio,
      avatar: populated.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(populated.name)}`,
      courses: (populated.courses || []).map(c => ({ _id: c._id, title: c.title })),
      createdAt: populated.createdAt
    });
  } catch (err) {
    console.error('createFaculty error:', err);
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/faculty/:id — Update a faculty member
export const updateFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty member not found' });
    }

    // Tenant isolation: ensure this faculty belongs to the admin's institute
    if (faculty.institute && faculty.institute.toString() !== req.user.institute.toString()) {
      return res.status(403).json({ message: 'Forbidden: cross-tenant access denied' });
    }

    const { name, role, department, email, officeHours, bio, avatar, courses } = req.body;

    if (name !== undefined) faculty.name = name.trim();
    if (role !== undefined) faculty.role = role.trim();
    if (department !== undefined) faculty.department = department.trim();
    if (email !== undefined) faculty.email = email.trim();
    if (officeHours !== undefined) faculty.officeHours = officeHours.trim();
    if (bio !== undefined) faculty.bio = bio.trim();
    if (avatar !== undefined) faculty.avatar = avatar;
    if (courses !== undefined) faculty.courses = courses;

    await faculty.save();
    const populated = await faculty.populate('courses');

    const courseName = populated.courses && populated.courses.length > 0
      ? populated.courses.map(c => c.title).join(', ')
      : 'General Studies';

    res.json({
      id: populated._id,
      name: populated.name,
      courseName,
      role: populated.role,
      department: populated.department,
      email: populated.email,
      officeHours: populated.officeHours || 'By appointment',
      bio: populated.bio,
      avatar: populated.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(populated.name)}`,
      courses: (populated.courses || []).map(c => ({ _id: c._id, title: c.title })),
      createdAt: populated.createdAt
    });
  } catch (err) {
    console.error('updateFaculty error:', err);
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/faculty/:id — Delete a faculty member
export const deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty member not found' });
    }

    // Tenant isolation
    if (faculty.institute && faculty.institute.toString() !== req.user.institute.toString()) {
      return res.status(403).json({ message: 'Forbidden: cross-tenant access denied' });
    }

    // Check for linked live classes
    const linkedClasses = await LiveClass.countDocuments({ facultyId: faculty._id });
    if (linkedClasses > 0) {
      return res.status(409).json({
        message: `Cannot delete: this faculty is assigned to ${linkedClasses} live class${linkedClasses > 1 ? 'es' : ''}. Remove or reassign those classes first.`
      });
    }

    await Faculty.findByIdAndDelete(req.params.id);

    res.json({ message: 'Faculty member deleted successfully' });
  } catch (err) {
    console.error('deleteFaculty error:', err);
    res.status(500).json({ message: err.message });
  }
};
