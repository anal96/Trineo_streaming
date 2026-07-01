import { Faculty } from '../models/Faculty.js';
import { LiveClass } from '../models/LiveClass.js';
import fs from 'fs';
import path from 'path';
import { isR2Configured, uploadToR2 } from '../utils/r2Service.js';

const processFacultyAvatar = async (avatarBase64) => {
  if (!avatarBase64 || !avatarBase64.startsWith('data:image/')) {
    return avatarBase64;
  }
  
  const base64Data = avatarBase64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, 'base64');

  const filename = `faculty_${Date.now()}_${Math.floor(Math.random() * 1000)}.webp`;
  const relativePath = `/uploads/avatars/${filename}`;
  const filePath = path.join(path.resolve(), 'uploads', 'avatars', filename);

  // Ensure uploads/avatars exists
  const avatarsDir = path.join(path.resolve(), 'uploads', 'avatars');
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }

  let avatarUrl = relativePath;
  if (isR2Configured()) {
    try {
      const r2Key = `avatars/${filename}`;
      avatarUrl = await uploadToR2(buffer, r2Key, 'image/webp');
    } catch (r2Err) {
      console.error("R2 Faculty Avatar upload failed, falling back to local file:", r2Err);
      fs.writeFileSync(filePath, buffer);
    }
  } else {
    fs.writeFileSync(filePath, buffer);
  }

  return avatarUrl;
};

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

    const processedAvatar = avatar ? await processFacultyAvatar(avatar) : null;

    const faculty = await Faculty.create({
      name: name.trim(),
      role: (role || 'Lecturer').trim(),
      department: (department || '').trim(),
      email: (email || '').trim(),
      officeHours: (officeHours || '').trim(),
      bio: (bio || '').trim(),
      avatar: processedAvatar,
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
    if (avatar !== undefined) {
      faculty.avatar = avatar ? await processFacultyAvatar(avatar) : null;
    }
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
