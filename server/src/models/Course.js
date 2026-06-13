import mongoose from 'mongoose';
import { slugify, uniqueSlug } from '../utils/slugify.js';

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  instructor: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800'
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  duration: {
    type: String,
    default: '0h'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  category: {
    type: String,
    enum: ['Development', 'Data Science', 'Design', 'Cloud', 'Business'],
    default: 'Development'
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

courseSchema.pre('validate', async function nextSlug() {
  if (!this.isModified('title') && this.slug) return;
  const baseSlug = slugify(this.title);
  this.slug = await uniqueSlug(mongoose.models.Course, baseSlug, {}, this._id);
});

export const Course = mongoose.model('Course', courseSchema);
