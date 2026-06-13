import express from 'express';
import { protect } from '../middleware/auth.js';
import { Course } from '../models/Course.js';
import { Faculty } from '../models/Faculty.js';
import { getStudentMaterials } from '../controllers/materialController.js';

const router = express.Router();

// Study Materials API alias used by the student dashboard
router.get('/materials', protect, getStudentMaterials);

// 5️⃣ Faculty Section API
router.get('/faculty', protect, async (req, res) => {
  try {
    const facultyMembers = await Faculty.find({ institute: req.user.institute }).populate('courses');
    
    if (facultyMembers.length === 0) {
      // Return empty array or dynamic fallback if desired, but we return seeded records
      return res.json([]);
    }

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
        avatar: f.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(f.name)}`
      };
    });

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
