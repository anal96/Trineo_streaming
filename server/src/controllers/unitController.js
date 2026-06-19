import { Unit } from '../models/Unit.js';

const instituteFilter = (req) => {
  return req.user.role === 'owner' ? { isDeleted: false } : { institute: req.user.institute, isDeleted: false };
};

export const getUnits = async (req, res) => {
  const { subjectId } = req.query;
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const filter = { ...instituteFilter(req) };
    if (subjectId) filter.subjectId = subjectId;

    const units = await Unit.find(filter).sort({ displayOrder: 1, createdAt: 1 });
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUnitById = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const unit = req.user.role === 'owner'
      ? await Unit.findOne({ _id: req.params.id, isDeleted: false })
      : await Unit.findOne({ _id: req.params.id, institute: req.user.institute, isDeleted: false });

    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }
    res.json(unit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createUnit = async (req, res) => {
  const { subjectId, name, description, displayOrder, status, isLocked } = req.body;
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const unit = new Unit({
      subjectId,
      name,
      description,
      displayOrder: Number(displayOrder) || 0,
      status: status || 'published',
      isLocked: isLocked !== undefined ? isLocked : false,
      institute: req.user.institute || null
    });
    const created = await unit.save();
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUnit = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const unit = req.user.role === 'owner'
      ? await Unit.findOne({ _id: req.params.id, isDeleted: false })
      : await Unit.findOne({ _id: req.params.id, institute: req.user.institute, isDeleted: false });

    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    unit.name = req.body.name || unit.name;
    unit.description = req.body.description !== undefined ? req.body.description : unit.description;
    unit.displayOrder = req.body.displayOrder !== undefined ? Number(req.body.displayOrder) : unit.displayOrder;
    unit.status = req.body.status || unit.status;
    unit.isLocked = req.body.isLocked !== undefined ? req.body.isLocked : unit.isLocked;

    const updated = await unit.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUnit = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const unit = req.user.role === 'owner'
      ? await Unit.findOne({ _id: req.params.id, isDeleted: false })
      : await Unit.findOne({ _id: req.params.id, institute: req.user.institute, isDeleted: false });

    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    unit.isDeleted = true;
    unit.deletedAt = new Date();
    await unit.save();

    res.json({ message: 'Unit soft deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkUpdateUnits = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const { unitIds = [], action } = req.body;
    if (!unitIds.length) return res.status(400).json({ message: 'No units selected' });

    const filter = req.user.role === 'owner' 
      ? { _id: { $in: unitIds }, isDeleted: false } 
      : { _id: { $in: unitIds }, institute: req.user.institute, isDeleted: false };

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

    await Unit.updateMany(filter, { $set: update });
    res.json({ message: 'Bulk action completed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
