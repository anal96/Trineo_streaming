import mongoose from 'mongoose';
import { slugify, uniqueSlug } from '../utils/slugify.js';

const programSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800'
  },
  bannerImage: {
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
    enum: ['active', 'inactive'],
    default: 'active'
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
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

programSchema.virtual('title').get(function() {
  return this.name;
});

// Compound unique index for scoped slug
programSchema.index(
  { instituteId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

programSchema.pre('validate', async function nextSlug() {
  if (!this.isModified('name') && this.slug) return;
  const baseSlug = slugify(this.name);
  this.slug = await uniqueSlug(mongoose.models.Program, baseSlug, { instituteId: this.instituteId }, this._id);
});

programSchema.pre('save', async function (next) {
  if (this.institute && !this.instituteId) {
    try {
      const InstituteModel = mongoose.model('Institute');
      const inst = await InstituteModel.findById(this.institute);
      if (inst) {
        this.instituteId = inst.instituteId;
      }
    } catch (err) {
      console.error('Error populating instituteId in program pre-save:', err);
    }
  }
  next();
});

export const Program = mongoose.model('Program', programSchema);
