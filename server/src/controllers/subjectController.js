import { Subject } from '../models/Subject.js';

const instituteFilter = (req) => {
  return req.user.role === 'owner' ? { isDeleted: false } : { institute: req.user.institute, isDeleted: false };
};

export const getSubjects = async (req, res) => {
  const { programId } = req.query;
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const filter = { ...instituteFilter(req) };
    if (programId) filter.programId = programId;

    const subjects = await Subject.find(filter).sort({ displayOrder: 1, createdAt: 1 });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSubjectById = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const subject = req.user.role === 'owner'
      ? await Subject.findOne({ _id: req.params.id, isDeleted: false })
      : await Subject.findOne({ _id: req.params.id, institute: req.user.institute, isDeleted: false });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createSubject = async (req, res) => {
  const { programId, subjectCode, subjectName, description, displayOrder, status, isLocked } = req.body;
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const subject = new Subject({
      programId,
      subjectCode,
      subjectName,
      description,
      displayOrder: Number(displayOrder) || 0,
      status: status || 'published',
      isLocked: isLocked !== undefined ? isLocked : false,
      institute: req.user.institute || null
    });
    const created = await subject.save();
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSubject = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const subject = req.user.role === 'owner'
      ? await Subject.findOne({ _id: req.params.id, isDeleted: false })
      : await Subject.findOne({ _id: req.params.id, institute: req.user.institute, isDeleted: false });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    subject.subjectCode = req.body.subjectCode || subject.subjectCode;
    subject.subjectName = req.body.subjectName || subject.subjectName;
    subject.description = req.body.description !== undefined ? req.body.description : subject.description;
    subject.displayOrder = req.body.displayOrder !== undefined ? Number(req.body.displayOrder) : subject.displayOrder;
    subject.status = req.body.status || subject.status;
    subject.isLocked = req.body.isLocked !== undefined ? req.body.isLocked : subject.isLocked;

    const updated = await subject.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const subject = req.user.role === 'owner'
      ? await Subject.findOne({ _id: req.params.id, isDeleted: false })
      : await Subject.findOne({ _id: req.params.id, institute: req.user.institute, isDeleted: false });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    subject.isDeleted = true;
    subject.deletedAt = new Date();
    await subject.save();

    res.json({ message: 'Subject soft deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkUpdateSubjects = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const { subjectIds = [], action } = req.body;
    if (!subjectIds.length) return res.status(400).json({ message: 'No subjects selected' });

    const filter = req.user.role === 'owner' 
      ? { _id: { $in: subjectIds }, isDeleted: false } 
      : { _id: { $in: subjectIds }, institute: req.user.institute, isDeleted: false };

    const update = {};
    if (action === 'delete') {
      update.isDeleted = true;
      update.deletedAt = new Date();
    } else if (action === 'lock') {
      update.isLocked = true;
    } else if (action === 'unlock') {
      update.isLocked = false;
    } else if (action === 'publish') {
      update.status = 'published';
    } else if (action === 'unpublish') {
      update.status = 'draft';
    }

    await Subject.updateMany(filter, { $set: update });
    res.json({ message: 'Bulk action completed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
