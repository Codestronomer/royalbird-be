import mongoose, { Schema, Document } from 'mongoose';

export interface IBlogPost extends Document {
  id: string;
  slug: string;
  title: string;
  description?: string;
  content: string; // MDX content
  
  author: string;
  category: string;
  featuredImage?: string;
  readingTime?: number;
  
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  featured: boolean;
  
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];

  // engagement metrics
  views: number;
  likes: number;
  likedBy: string[]; // IPs who have liked the post
  
  // Dates
  publishedAt?: Date;
  scheduledAt?: Date;
  deletedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IBlogPostMethods {
  generateSlug(title: string): string;
  like(userId: string): Promise<boolean>;
  unlike(userId: string): Promise<boolean>;
  hasLiked(userId: string): boolean;
  incrementViews(): Promise<void>;
}

export type BlogPostDocument = IBlogPost & IBlogPostMethods;

const BlogPostSchema = new Schema<IBlogPost, IBlogPostMethods>({
  slug: { type: String, required: true, unique: true, lowercase: true, index: true },
  title: { type: String, required: true },
  description: String,
  content: { type: String, required: true },
  
  author: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  featuredImage: String,
  readingTime: Number,
  
  status: { type: String, enum: ['draft', 'published', 'scheduled', 'archived'], default: 'draft' },
  featured: { type: Boolean, default: false, index: true },
  
  metaTitle: String,
  metaDescription: String,
  tags: [String],

  views: { type: Number, default: 0, min: 0 },
  likes: { type: Number, default: 0, min: 0 },
  likedBy: { type: [String], default: [], index: true }, // Store IPs
  
  publishedAt: { type: Date, index: true },
  scheduledAt: Date,
  deletedAt: Date,
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString(),
      delete ret._id;
      delete ret.__v;
      delete ret.likedBy;
      return ret;
    }
  }
});

BlogPostSchema.index(
  { title: 'text', description: 'text', content: 'text' },
  {
    name: 'BlogSearchIndex',
    weights: {
      title: 10,
      description: 5,
      content: 1,
    }
  }
)

BlogPostSchema.index({ likes: -1, publishedAt: -1 }); // For popular posts
BlogPostSchema.index({ views: -1, publishedAt: -1 }); // For trending posts
BlogPostSchema.index({ publishedAt: -1 }); // For chronological order

// Calculate reading time before save
BlogPostSchema.pre<IBlogPost>('save', function(this: IBlogPost) {
  if (this.isModified('content')) {
    const words = (this.content || '').split(/\s+/).filter(Boolean).length;
    this.readingTime = Math.ceil(words / 200); // 200 words per minute
  }
});

BlogPostSchema.methods.generateSlug = function(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim()
}

BlogPostSchema.methods.incrementViews = async function(): Promise<void> {
  this.views += 1;
  await this.save();
};

// Like/unlike methods
BlogPostSchema.methods.like = async function(userId: string): Promise<boolean> {
  if (!this.likedBy.includes(userId)) {
    this.likedBy.push(userId);
    this.likes += 1;
    await this.save();
    return true; // Liked
  }
  return false; // Already liked
};

BlogPostSchema.methods.unlike = async function(userId: string): Promise<boolean> {
  const index = this.likedBy.indexOf(userId);
  if (index > -1) {
    this.likedBy.splice(index, 1);
    this.likes -= 1;
    await this.save();
    return true; // Unliked
  }
  return false; // Wasn't liked
};

BlogPostSchema.methods.hasLiked = function(userId: string): boolean {
  return this.likedBy.includes(userId);
};

export const BlogPost = mongoose.model<IBlogPost>('BlogPost', BlogPostSchema);