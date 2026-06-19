import mongoose from 'mongoose';
import { slugify, uniqueSlug } from '../utils/slugify.js';

const unitSchema = new mongoose.Schema({
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null
  },
  instituteId: {
    type: String,
    index: true,
    default: ''
  },
  slug: {
    type: String,
    required: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['published', 'draft'],
    default: 'published'
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index for scoped slug
unitSchema.index(
  { subjectId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

unitSchema.pre('validate', async function nextSlug() {
  if (!this.isModified('name') && this.slug) return;
  const baseSlug = slugify(this.name);
  this.slug = await uniqueSlug(mongoose.models.Unit, baseSlug, { subjectId: this.subjectId }, this._id);
});

unitSchema.pre('save', async function (next) {
  if (this.institute && !this.instituteId) {
    try {
      const InstituteModel = mongoose.model('Institute');
      const inst = await InstituteModel.findById(this.institute);
      if (inst) {
        this.instituteId = inst.instituteId;
      }
    } catch (err) {
      console.error('Error populating instituteId in unit pre-save:', err);
    }
  }
  next();
});

export const Unit = mongoose.model('Unit', unitSchema);
