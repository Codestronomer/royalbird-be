// src/types/shared.types.ts
import { Document } from 'mongoose';

// Genre Interface
export interface IGenre extends Document {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  
  // Statistics
  comicCount?: number;
  featured: boolean;
  
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  
  // Ordering
  order: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// Tag Interface
export interface ITag extends Document {
  name: string;
  slug: string;
  description?: string;
  
  // Statistics
  comicCount: number;
  featured: boolean;
  
  // Type (optional categorization)
  type?: 'genre' | 'theme' | 'character' | 'setting' | 'style';
  
  createdAt: Date;
  updatedAt: Date;
}

// Category Interface (for blog posts)
export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  
  // Parent category for hierarchy
  parent?: string;
  
  postCount?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// Response types
export interface PaginatedResponse<T> {
  success: boolean;
  count: number;
  total: number;
  pagination: {
    page: number;
    limit: number;
    pages: number;
  };
  data: T[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ErrorResponse {
  success: boolean;
  error: string;
  stack?: string;
  details?: any;
}

// Comic-related types
export interface ComicPage {
  pageNumber: number;
  imageUrl: string;
  imageUrlThumbnail?: string;
  altText?: string;
  isDoubleSpread: boolean;
  panelCount?: number;
}

export interface ComicChapter {
  chapterNumber: number;
  title: string;
  description?: string;
  totalPages: number;
  startPage: number;
  endPage: number;
  isFree: boolean;
  price?: number;
  publishedAt?: Date;
}