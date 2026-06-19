import mongoose from 'mongoose';
import { slugify, uniqueSlug } from '../utils/slugify.js';

const subjectSchema = new mongoose.Schema({
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    required: true
  },
  subjectCode: {
    type: String,
    required: true
  },
  subjectName: {
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
subjectSchema.index(
  { programId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

subjectSchema.pre('validate', async function nextSlug() {
  if (!this.isModified('subjectName') && this.slug) return;
  const baseSlug = slugify(this.subjectName);
  this.slug = await uniqueSlug(mongoose.models.Subject, baseSlug, { programId: this.programId }, this._id);
});

subjectSchema.pre('save', async function (next) {
  if (this.institute && !this.instituteId) {
    try {
      const InstituteModel = mongoose.model('Institute');
      const inst = await InstituteModel.findById(this.institute);
      if (inst) {
        this.instituteId = inst.instituteId;
      }
    } catch (err) {
      console.error('Error populating instituteId in subject pre-save:', err);
    }
  }
  next();
});

export const Subject = mongoose.model('Subject', subjectSchema);
