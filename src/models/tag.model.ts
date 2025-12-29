// src/models/Tag.model.ts
import mongoose, { Schema } from 'mongoose';
import { ITag } from '../types/types';

const TagSchema = new Schema<ITag>({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    maxlength: [50, 'Tag name cannot exceed 50 characters']
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  description: { 
    type: String, 
    maxlength: [300, 'Description cannot exceed 300 characters']
  },
  
  // Statistics
  comicCount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  featured: { 
    type: Boolean, 
    default: false 
  },
  
  // Type categorization
  type: { 
    type: String, 
    enum: ['genre', 'theme', 'character', 'setting', 'style', 'audience', 'format'],
    default: 'theme'
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Auto-generate slug from name
TagSchema.pre('save', function() {
  if (!this.isModified('name')) return;
  
  this.slug = this.name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');

});

// Auto-generate description if not provided
TagSchema.pre('save', function() {
  if (!this.description && this.name) {
    this.description = `Explore ${this.name} comics and stories at Royalbird Studios.`;
  }
});

// Indexes for performance
TagSchema.index({ slug: 1 });
TagSchema.index({ featured: 1 });
TagSchema.index({ type: 1 });
TagSchema.index({ name: 'text', description: 'text' });

// Static methods
TagSchema.statics.incrementCount = async function(tagId: string) {
  await this.findByIdAndUpdate(tagId, { $inc: { comicCount: 1 } });
};

TagSchema.statics.decrementCount = async function(tagId: string) {
  await this.findByIdAndUpdate(tagId, { $inc: { comicCount: -1 } });
};

TagSchema.statics.getPopularTags = async function(limit = 20) {
  return this.find()
    .sort('-comicCount')
    .limit(limit)
    .lean();
};

TagSchema.statics.getByType = async function(type: string) {
  return this.find({ type })
    .sort('name')
    .lean();
};

// Instance methods
TagSchema.methods.getComics = async function(limit = 10) {
  const Comic = mongoose.model('Comic');
  return Comic.find({ 
    tags: this._id,
    status: 'published',
    deletedAt: null
  })
    .select('slug title coverImage description views')
    .limit(limit)
    .lean();
};

export const Tag = mongoose.model<ITag>('Tag', TagSchema);