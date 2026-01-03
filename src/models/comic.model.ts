// src/models/Comic.model.ts
import mongoose, { Schema, Document, Query, CallbackWithoutResultAndOptionalError } from 'mongoose';
import { IGenre, ITag } from '../types/types';
import { Genre } from './genre.model';
import { Tag } from './tag.model';
// import { NextFunction } from 'express';

export interface IComic extends Document {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  shortDescription?: string;
  
  // Media
  coverImage: string;
  thumbnail?: string;
  bannerImage?: string;
  previewImages?: string[];
  pdfUrl?: string;
  
  // Content
  format: 'digital' | 'print' | 'both';
  contentType: 'images' | 'pdf' | 'both';
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  availability: 'Completed' | 'Ongoing' | 'Coming Soon';
  ageRating: 'ALL' | '13+' | '16+' | '18+';
  language: string;
  featured: boolean;
  
  // Pricing
  isFree: boolean;
  price?: number;
  currency: string;
  
  // Statistics
  totalPages: number;
  estimatedReadTime?: string;
  views: number;
  readers: number;
  averageRating: number;
  ratingCount: number;
  // engagement metrics
  likes: number;
  likedBy: string[];
  
  // Metadata
  writer?: string;
  artist?: string;
  colorist?: string;
  letterer?: string;
  issueNumber?: number;
  
  // Relations
  genres: IGenre['_id'][];
  tags: ITag['_id'][];
  
  // Dates
  publishedAt?: Date;
  scheduledAt?: Date;
  deletedAt?: Date;
  
  // System
  createdAt: Date;
  updatedAt: Date;
}

export interface IComicMethods {
  generateSlug(title: string): string;
  like(userId: string): Promise<boolean>;
  unlike(userId: string): Promise<boolean>;
  hasLiked(userId: string): boolean;
  incrementViews(): Promise<void>;
}

export type ComicDocument = IComic & IComicMethods;

const ComicSchema = new Schema<IComic>({
  slug: { type: String, required: true, unique: true, lowercase: true },
  title: { type: String, required: true },
  subtitle: String,
  description: { type: String, required: true },
  shortDescription: String,
  
  coverImage: { type: String, required: true },
  thumbnail: String,
  bannerImage: String,
  previewImages: [String],
  pdfUrl: String,
  
  format: { type: String, enum: ['digital', 'print', 'both'], default: 'digital' },
  contentType: { type: String, enum: ['images', 'pdf', 'both'], default: 'images' },
  status: { type: String, enum: ['draft', 'published', 'scheduled', 'archived'], default: 'draft' },
  availability: { type: String, enum: ['Completed', 'Ongoing', 'Coming Soon'], default: 'Ongoing' },
  ageRating: { type: String, enum: ['ALL', '13+', '16+', '18+'], default: '13+' },
  language: { type: String, default: 'en' },
  featured: { type: Boolean, default: false, index: true },
  
  isFree: { type: Boolean, default: false },
  price: { type: Number, min: 0 },
  currency: { type: String, default: 'USD' },
  
  totalPages: { type: Number, default: 0, min: 0 },
  estimatedReadTime: String,
  views: { type: Number, default: 0, min: 0 },
  likes: { type: Number, default: 0, min: 0 },
  likedBy: { type: [String], default: [], index: true },
  readers: { type: Number, default: 0, min: 0 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0, min: 0 },
  
  writer: String,
  artist: String,
  colorist: String,
  letterer: String,
  issueNumber: Number,
  
  genres: [{ type: Schema.Types.ObjectId, ref: 'Genre' }],
  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
  
  publishedAt: Date,
  scheduledAt: Date,
  deletedAt: Date,
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString(),
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true },
});

// Indexes
ComicSchema.index({ slug: 1 });
ComicSchema.index({ status: 1, publishedAt: -1 });
ComicSchema.index({ genres: 1 });
ComicSchema.index({ tags: 1 });
ComicSchema.index({ isFree: 1 });
ComicSchema.index({ averageRating: -1 });
ComicSchema.index({ views: -1 });

// Virtual for formatted price
ComicSchema.virtual('formattedPrice').get(function() {
  if (this.isFree) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency,
  }).format(this.price || 0);
});

// Soft delete
ComicSchema.methods.softDelete = async function() {
  this.deletedAt = new Date();
  await this.save();
};

// Increment views
ComicSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
};

// Update rating
ComicSchema.methods.updateRating = async function(newRating: number) {
  const totalRating = this.averageRating * this.ratingCount;
  this.ratingCount += 1;
  this.averageRating = (totalRating + newRating) / this.ratingCount;
  await this.save();
};

ComicSchema.methods.like = async function(userId: string): Promise<boolean> {
  if (!this.likedBy.includes(userId)) {
    this.likedBy.push(userId);
    this.likes += 1;
    await this.save();
    return true; // Liked
  }
  return false; // Already liked
};

ComicSchema.methods.unlike = async function(userId: string): Promise<boolean> {
  const index = this.likedBy.indexOf(userId);
  if (index > -1) {
    this.likedBy.splice(index, 1);
    this.likes -= 1;
    await this.save();
    return true; // Unliked
  }
  return false; // Wasn't liked
};

ComicSchema.methods.hasLiked = function(userId: string): boolean {
  return this.likedBy.includes(userId);
};

ComicSchema.post('save', async function(doc: any, next: CallbackWithoutResultAndOptionalError) {
  try {
    if (doc.genres) {
      for (const genreId of doc.genres) {
        await (Genre as any).incrementCount(genreId);
      }
    }
    
    if (doc.tags && doc.tags.length > 0) {
      for (const tagId of doc.tags) {
        await (Tag as any).incrementCount(tagId);
      }
    }
    next(); // Explicitly call next in post hooks to be safe
  } catch (err: any) {
    next(err);
  }
});

ComicSchema.pre('findOneAndDelete', { document: false, query: true }, async function (this: mongoose.Query<any, any>, next: any) {
  try {
    const doc = await this.model.findOne(this.getQuery());

    if (doc?.genres) {
      for (const genreId of doc.genres) {
        await (Genre as any).decrementCount(genreId);
      }
    }

    if (doc?.tags) {
      for (const tagId of doc.tags) {
        await (Tag as any).decrementCount(tagId);
      }
    }
    next();
  } catch (err: any) {
    next(err);
  }
});

ComicSchema.post('findOneAndUpdate', async function(doc) {
  // Handle genre/tag count updates on edit
  // This would need more complex logic to track changes
});


export const Comic = mongoose.model<IComic>('Comic', ComicSchema);