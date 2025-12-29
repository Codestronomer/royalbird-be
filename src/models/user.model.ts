// src/models/user.model.ts
import mongoose, { Schema, Document, Model, CallbackWithoutResultAndOptionalError, Query } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { NextFunction } from 'express';

export interface IUser extends Document {
  id: string;
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  role: 'user' | 'author' | 'admin' | 'moderator';
  status: 'active' | 'suspended' | 'deactivated' | 'pending';
  
  // Authentication
  emailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  
  // Social
  socialProfiles?: {
    google?: string;
    github?: string;
    twitter?: string;
    discord?: string;
  };
  
  // Preferences
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    theme: 'light' | 'dark' | 'auto';
    language: string;
    newsletter: boolean;
    comicUpdates: boolean;
    blogUpdates: boolean;
  };
  
  // Stats
  stats: {
    comicViews: number;
    blogViews: number;
    comments: number;
    likesGiven: number;
    readingTime: number;
    lastActive: Date;
  };
  
  // Bookmarks
  bookmarkedComics: mongoose.Types.ObjectId[];
  bookmarkedBlogs: mongoose.Types.ObjectId[];
  likedComics: mongoose.Types.ObjectId[];
  likedBlogs: mongoose.Types.ObjectId[];
  readingHistory?: Array<{
    comicId: mongoose.Types.ObjectId;
    blogId: mongoose.Types.ObjectId;
    contentId: string;
    contentType: 'comic' | 'blog';
    progress: number; // 0-100
    lastPage?: number;
    lastReadAt: Date;
  }>;
  
  // Security
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastPasswordChange: Date;
  securityQuestions?: Array<{
    question: string;
    answerHash: string;
  }>;

  location?: string;
  country?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  deletedAt?: Date;
}

// Methods interface
export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateVerificationToken(): string;
  generatePasswordResetToken(): string;
  isLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  lockAccount(): Promise<void>;
  unlockAccount(): Promise<void>;
  updateLastLogin(): Promise<void>;
  getFullName(): string;
  getInitials(): string;
  hasRole(role: string): boolean;
  isAdmin(): boolean;
  isAuthor(): boolean;
}

// Model interface
export interface IUserModel extends Model<IUser, {}, IUserMethods> {
  findByEmail(email: string): Promise<IUser | null>;
  findByUsername(username: string): Promise<IUser | null>;
  findByVerificationToken(token: string): Promise<IUser | null>;
  findByPasswordResetToken(token: string): Promise<IUser | null>;
  isEmailTaken(email: string, excludeUserId?: string): Promise<boolean>;
  isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean>;
}

interface UserQueryHelpers {
  active(): Query<any, IUser, UserQueryHelpers> & UserQueryHelpers;
  admins(): Query<any, IUser, UserQueryHelpers> & UserQueryHelpers;
  verified(): Query<any, IUser, UserQueryHelpers> & UserQueryHelpers;
}

const UserSchema = new Schema<IUser, Model<IUser, UserQueryHelpers>, {}, UserQueryHelpers>({
  // Core Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    index: true,
    match: [/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, hyphens and underscores']
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false // Don't include password by default in queries
  },
  firstName: {
    type: String,
    required: false,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: false,
    trim: true,
    maxlength: 50
  },
  avatar: {
    type: String,
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  
  // Role and Status
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user',
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deactivated', 'pending'],
    default: 'pending',
    index: true
  },
  
  // Authentication
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    select: false
  },
  verificationTokenExpires: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  loginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  lockUntil: {
    type: Date,
    select: false
  },
  
  // Social Profiles
  socialProfiles: {
    google: { type: String, select: false },
    github: { type: String, select: false },
    twitter: { type: String, select: false },
    discord: { type: String, select: false }
  },
  
  // Preferences
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    theme: { 
      type: String, 
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: { type: String, default: 'en' },
    newsletter: { type: Boolean, default: true },
    comicUpdates: { type: Boolean, default: true },
    blogUpdates: { type: Boolean, default: true }
  },
  
  // Stats
  stats: {
    comicViews: { type: Number, default: 0 },
    blogViews: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    likesGiven: { type: Number, default: 0 },
    readingTime: { type: Number, default: 0 }, // in minutes
    lastActive: { type: Date, default: Date.now }
  },
  
  // Bookmarks and Likes
  bookmarkedComics: [{
    type: Schema.Types.ObjectId,
    ref: 'Comic',
    index: true
  }],
  bookmarkedBlogs: [{
    type: Schema.Types.ObjectId,
    ref: 'BlogPost',
    index: true
  }],
  likedComics: [{
    type: Schema.Types.ObjectId,
    ref: 'Comic',
    index: true
  }],
  likedBlogs: [{
    type: Schema.Types.ObjectId,
    ref: 'BlogPost',
    index: true
  }],
  location: String,
  country: String,
  
  // Reading History
  readingHistory: [{
    comicId: { type: Schema.Types.ObjectId, ref: 'Comic' },
    blogId: { type: Schema.Types.ObjectId, ref: 'BlogPost' },
    contentId: { type: String, required: true },
    contentType: { type: String, enum: ['comic', 'blog'], required: true },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    lastPage: { type: Number, min: 1 },
    lastReadAt: { type: Date, default: Date.now }
  }],
  
  // Security
  twoFactorEnabled: {
    type: Boolean,
    default: false,
    select: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  lastPasswordChange: {
    type: Date,
    default: Date.now,
    select: false
  },
  securityQuestions: [{
    question: { type: String, required: true },
    answerHash: { type: String, required: true, select: false }
  }]
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      // Hide sensitive fields
      delete ret.password;
      delete ret.verificationToken;
      delete ret.verificationTokenExpires;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      delete ret.twoFactorSecret;
      delete ret.securityQuestions;
      delete ret.__v;
      
      // Add virtual fields
      ret.id = ret._id.toString();
      
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ status: 1, role: 1 });
UserSchema.index({ 'stats.lastActive': -1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'authorProfile.isVerifiedAuthor': 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function(this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for initials
UserSchema.virtual('initials').get(function(this: IUser) {
  return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
});

// Virtual for isActive
UserSchema.virtual('isActive').get(function(this: IUser) {
  return this.status === 'active';
});

// Virtual for account age
UserSchema.virtual('accountAge').get(function(this: IUser) {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)); // days
});

// ========== MIDDLEWARE ==========

// Hash password before saving
UserSchema.pre<IUser>('save', async function() {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Update timestamps on certain updates
UserSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

// ========== STATIC METHODS ==========

// Find by email
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// Find by username
UserSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username: username.toLowerCase() });
};

// Find by verification token
UserSchema.statics.findByVerificationToken = function(token: string) {
  return this.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: Date.now() }
  });
};

// Find by password reset token
UserSchema.statics.findByPasswordResetToken = function(token: string) {
  return this.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: Date.now() }
  });
};

// Check if email is taken
UserSchema.statics.isEmailTaken = async function(email: string, excludeUserId?: string) {
  const user = await this.findOne({
    email: email.toLowerCase(),
    _id: { $ne: excludeUserId }
  });
  return !!user;
};

// Check if username is taken
UserSchema.statics.isUsernameTaken = async function(username: string, excludeUserId?: string) {
  const user = await this.findOne({
    username: username.toLowerCase(),
    _id: { $ne: excludeUserId }
  });
  return !!user;
};

// ========== INSTANCE METHODS ==========

// Compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
UserSchema.methods.generateAuthToken = function(): string {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
    status: this.status
  };

  const options: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN as any)|| '7d' };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your-secret-key',
    options,
  );
};

// Generate verification token
UserSchema.methods.generateVerificationToken = function(): string {
  const token = jwt.sign(
    { id: this._id },
    process.env.JWT_VERIFICATION_SECRET || 'verification-secret',
    { expiresIn: '24h' }
  );
  
  this.verificationToken = token;
  this.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  return token;
};

// Generate password reset token
UserSchema.methods.generatePasswordResetToken = function(): string {
  const token = jwt.sign(
    { id: this._id },
    process.env.JWT_RESET_SECRET || 'reset-secret',
    { expiresIn: '1h' }
  );
  
  this.passwordResetToken = token;
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  
  return token;
};

// Check if account is locked
UserSchema.methods.isLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Increment login attempts
UserSchema.methods.incrementLoginAttempts = async function(): Promise<void> {
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.resetLoginAttempts();
  }
  
  const updates: any = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: new Date(Date.now() + 15 * 60 * 1000) }; // 15 minutes
  }
  
  await this.updateOne(updates);
};

// Reset login attempts
UserSchema.methods.resetLoginAttempts = async function(): Promise<void> {
  await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Lock account
UserSchema.methods.lockAccount = async function(): Promise<void> {
  await this.updateOne({
    $set: {
      lockUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      status: 'suspended'
    }
  });
};

// Unlock account
UserSchema.methods.unlockAccount = async function(): Promise<void> {
  await this.updateOne({
    $set: { status: 'active' },
    $unset: { lockUntil: 1 }
  });
};

// Update last login
UserSchema.methods.updateLastLogin = async function(): Promise<void> {
  await this.updateOne({
    $set: {
      'stats.lastActive': new Date(),
      lastLoginAt: new Date()
    }
  });
};

// Get full name
UserSchema.methods.getFullName = function(): string {
  return `${this.firstName} ${this.lastName}`;
};

// Get initials
UserSchema.methods.getInitials = function(): string {
  return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
};

// Check role
UserSchema.methods.hasRole = function(role: string): boolean {
  return this.role === role;
};

// Check if admin
UserSchema.methods.isAdmin = function(): boolean {
  return this.role === 'admin';
};

// Check if author
UserSchema.methods.isAuthor = function(): boolean {
  return this.role === 'author' || this.role === 'admin';
};

// Add to reading history
UserSchema.methods.addToReadingHistory = async function(
  contentId: string,
  contentType: 'comic' | 'blog',
  progress: number = 0,
  lastPage?: number
): Promise<void> {
  const historyItem = {
    contentId,
    contentType,
    progress,
    lastPage,
    lastReadAt: new Date()
  };
  
  // Remove old entry if exists
  await this.updateOne({
    $pull: {
      readingHistory: { contentId, contentType }
    }
  });
  
  // Add new entry
  await this.updateOne({
    $push: {
      readingHistory: { $each: [historyItem], $position: 0, $slice: 50 }
    }
  });
};

// Toggle bookmark
UserSchema.methods.toggleBookmark = async function(
  contentId: mongoose.Types.ObjectId,
  contentType: 'comic' | 'blog'
): Promise<boolean> {
  const field = contentType === 'comic' ? 'bookmarkedComics' : 'bookmarkedBlogs';
  const isBookmarked = this[field].includes(contentId);
  
  if (isBookmarked) {
    await this.updateOne({ $pull: { [field]: contentId } });
    return false; // Removed
  } else {
    await this.updateOne({ $addToSet: { [field]: contentId } });
    return true; // Added
  }
};

// Toggle like
UserSchema.methods.toggleLike = async function(
  contentId: mongoose.Types.ObjectId,
  contentType: 'comic' | 'blog'
): Promise<boolean> {
  const field = contentType === 'comic' ? 'likedComics' : 'likedBlogs';
  const isLiked = this[field].includes(contentId);
  
  if (isLiked) {
    await this.updateOne({ $pull: { [field]: contentId } });
    return false; // Removed
  } else {
    await this.updateOne({ $addToSet: { [field]: contentId } });
    return true; // Added
  }
};

// ========== QUERY HELPERS ==========

// Active users only
UserSchema.query.active = function(this: Query<any, IUser, UserQueryHelpers> & UserQueryHelpers) {
  return this.where({ status: 'active' });
};

// Admins only
UserSchema.query.admins = function(this: Query<any, IUser, UserQueryHelpers> & UserQueryHelpers) {
  return this.where({ role: 'admin' });
};

// Verified email only
UserSchema.query.verified = function(this: Query<any, IUser, UserQueryHelpers> & UserQueryHelpers) {
  return this.where({ emailVerified: true });
};

// ========== EXPORT ==========

export const User = mongoose.model<IUser, IUserModel>('User', UserSchema);