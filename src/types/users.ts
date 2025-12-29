// src/types/user.ts
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  role: 'user' | 'author' | 'admin' | 'moderator';
  status: 'active' | 'suspended' | 'deactivated' | 'pending';
  emailVerified: boolean;
  
  // Stats
  stats: {
    comicViews: number;
    blogViews: number;
    comments: number;
    likesGiven: number;
    readingTime: number;
    lastActive: Date;
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
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface UserRegistrationDto {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  agreeToTerms: boolean;
}

export interface UserLoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface UserUpdateDto {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  preferences?: Partial<UserProfile['preferences']>;
}

export interface PasswordChangeDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface EmailChangeDto {
  newEmail: string;
  password: string;
}

export interface SocialLoginDto {
  provider: 'google' | 'github' | 'twitter' | 'discord';
  token: string;
  email?: string;
  name?: string;
  avatar?: string;
}