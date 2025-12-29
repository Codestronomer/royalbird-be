
import mongoose, { Schema, Document } from "mongoose";

export interface IComicPage extends Document {
  comic: Schema.Types.ObjectId;
  chapter?: Schema.Types.ObjectId;
  pageNumber: number;
  
  // Images
  imageUrl: string;
  imageUrlHighRes?: string;
  imageUrlThumbnail?: string;
  
  // Dimensions
  width?: number;
  height?: number;
  
  // Metadata
  altText?: string;
  description?: string;
  panelCount?: number;
  isDoubleSpread: boolean;
  
  // Processing
  isProcessed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  
  createdAt: Date;
  updatedAt: Date;
}

const ComicPageSchema = new Schema<IComicPage>({
  comic: { type: Schema.Types.ObjectId, ref: 'Comic', required: true },
  chapter: { type: Schema.Types.ObjectId, ref: 'Chapter' },
  pageNumber: { type: Number, required: true, min: 1 },
  
  imageUrl: { type: String, required: true },
  imageUrlHighRes: String,
  imageUrlThumbnail: String,
  
  width: Number,
  height: Number,
  
  altText: String,
  description: String,
  panelCount: Number,
  isDoubleSpread: { type: Boolean, default: false },
  
  isProcessed: { type: Boolean, default: false },
  processingStatus: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
}, {
  timestamps: true,
});

// Compound index for unique page numbers per comic
ComicPageSchema.index({ comic: 1, pageNumber: 1 }, { unique: true });

export const ComicPage = mongoose.model<IComicPage>('ComicPage', ComicPageSchema);