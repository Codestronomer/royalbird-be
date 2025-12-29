// src/models/Genre.model.ts
import mongoose, { Schema } from 'mongoose';
import { IGenre } from '../types/types';

const GenreSchema = new Schema<IGenre>({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    maxlength: [100, 'Genre name cannot exceed 100 characters']
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
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  icon: { 
    type: String,
    default: 'BookOpen'
  },
  color: { 
    type: String,
    default: '#4F46E5',
    validate: {
      validator: (color: string) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color),
      message: 'Color must be a valid hex code'
    }
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
  
  // SEO
  metaTitle: { 
    type: String,
    maxlength: [60, 'Meta title cannot exceed 60 characters']
  },
  metaDescription: { 
    type: String,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  
  // Ordering
  order: { 
    type: Number, 
    default: 0 
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Auto-generate slug from name
GenreSchema.pre('save', function() {
  if (!this.isModified('name')) return;
  
  // Generate slug: "Science Fiction" -> "science-fiction"
  this.slug = this.name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/--+/g, '-');    // Replace multiple hyphens with single
});

// Auto-generate meta fields if not provided
GenreSchema.pre('save', function() {
  if (!this.metaTitle && this.name) {
    this.metaTitle = `${this.name} Comics - Royalbird Studios`;
  }
  
  if (!this.metaDescription && this.description) {
    this.metaDescription = this.description.substring(0, 157) + '...';
  }
});

// Virtual for formatted color
GenreSchema.virtual('colorLight').get(function() {
  if (!this.color) return '#EEF2FF';
  
  // Lighten the color by 90% for backgrounds
  const hex = this.color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const lightR = Math.round(r + (255 - r) * 0.9);
  const lightG = Math.round(g + (255 - g) * 0.9);
  const lightB = Math.round(b + (255 - b) * 0.9);
  
  return `rgb(${lightR}, ${lightG}, ${lightB})`;
});

// Indexes for performance
GenreSchema.index({ slug: 1 });
GenreSchema.index({ featured: 1, order: 1 });
GenreSchema.index({ name: 'text', description: 'text' });

// Static methods
GenreSchema.statics.incrementCount = async function(genreId: string) {
  await this.findByIdAndUpdate(genreId, { $inc: { comicCount: 1 } });
};

GenreSchema.statics.decrementCount = async function(genreId: string) {
  await this.findByIdAndUpdate(genreId, { $inc: { comicCount: -1 } });
};

// Instance methods
GenreSchema.methods.getComics = async function(limit = 10) {
  const Comic = mongoose.model('Comic');
  return Comic.find({ 
    genres: this._id,
    status: 'published',
    deletedAt: null
  })
    .select('slug title coverImage description views averageRating')
    .limit(limit)
    .lean();
};

GenreSchema.methods.getPopularComics = async function(limit = 5) {
  const Comic = mongoose.model('Comic');
  return Comic.find({ 
    genres: this._id,
    status: 'published',
    deletedAt: null
  })
    .select('slug title coverImage views averageRating')
    .sort('-views')
    .limit(limit)
    .lean();
};

export const Genre = mongoose.model<IGenre>('Genre', GenreSchema);