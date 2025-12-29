// src/models/Category.model.ts
import mongoose, { Schema } from 'mongoose';
import { ICategory } from '../types/types';

const CategorySchema = new Schema<ICategory>({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
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
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  icon: { 
    type: String,
    default: 'FileText'
  },
  color: { 
    type: String,
    default: '#10B981',
    validate: {
      validator: (color: string) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color),
      message: 'Color must be a valid hex code'
    }
  },
  
  // Parent category for hierarchy
  parent: { 
    type: String,
    default: null
  },
  
  // Statistics
  postCount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Auto-generate slug from name
CategorySchema.pre('save', function() {
  if (!this.isModified('name')) return;
  
  this.slug = this.name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
});

// Virtual for child categories
CategorySchema.virtual('children', {
  ref: 'Category',
  localField: 'slug',
  foreignField: 'parent',
  justOne: false,
});

// Indexes
CategorySchema.index({ slug: 1 });
CategorySchema.index({ parent: 1 });
CategorySchema.index({ postCount: -1 });

// Static methods
CategorySchema.statics.incrementCount = async function(categoryId: string) {
  await this.findByIdAndUpdate(categoryId, { $inc: { postCount: 1 } });
};

CategorySchema.statics.decrementCount = async function(categoryId: string) {
  await this.findByIdAndUpdate(categoryId, { $inc: { postCount: -1 } });
};

CategorySchema.statics.getWithPosts = async function() {
  const BlogPost = mongoose.model('BlogPost');
  const categories = await this.find().lean();
  
  const categoriesWithPosts = await Promise.all(
    categories.map(async (category: ICategory) => {
      const posts = await BlogPost.find({
        category: category.slug,
        status: 'published',
        deletedAt: null
      })
        .select('slug title description featuredImage publishedAt readingTime')
        .limit(5)
        .lean();
      
      return {
        ...category,
        recentPosts: posts
      };
    })
  );
  
  return categoriesWithPosts;
};

export const Category = mongoose.model<ICategory>('Category', CategorySchema);