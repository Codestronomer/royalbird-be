import mongoose, { Schema, Document } from 'mongoose';
import { randomBytes } from 'node:crypto';

export interface IEmailSubscriber extends Document {
  email: string;
  name?: string;
  
  preferences: {
    comics: boolean;
    blog: boolean;
    announcements: boolean;
    weeklyDigest: boolean;
  };
  
  // Verification
  isVerified: boolean;
  verificationToken?: string;
  verificationSentAt?: Date;
  verifiedAt?: Date;
  
  // Subscription status
  isSubscribed: boolean;
  unsubscribeToken?: string;
  unsubscribedAt?: Date;
  
  // Tracking
  source?: string;
  campaign?: string;
  referral?: string;
  
  // Location
  country?: string;
  city?: string;
  timezone?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const EmailSubscriberSchema = new Schema<IEmailSubscriber>({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    validate: {
      validator: (email: string) => /\S+@\S+\.\S+/.test(email),
      message: 'Please provide a valid email address'
    }
  },
  name: String,
  
  preferences: {
    comics: { type: Boolean, default: true },
    blog: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true },
    weeklyDigest: { type: Boolean, default: true },
  },
  
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationSentAt: Date,
  verifiedAt: Date,
  
  isSubscribed: { type: Boolean, default: true },
  unsubscribeToken: String,
  unsubscribedAt: Date,
  
  source: String,
  campaign: String,
  referral: String,
  
  country: String,
  city: String,
  timezone: String,
}, {
  timestamps: true,
});

// Generate verification token
EmailSubscriberSchema.methods.generateVerificationToken = function() {
  this.verificationToken = randomBytes(32).toString('hex');
  this.verificationSentAt = new Date();
  return this.verificationToken;
};

// Generate unsubscribe token
EmailSubscriberSchema.methods.generateUnsubscribeToken = function() {
  this.unsubscribeToken = randomBytes(32).toString('hex');
  return this.unsubscribeToken;
};

// Verify email
EmailSubscriberSchema.methods.verify = async function() {
  this.isVerified = true;
  this.verifiedAt = new Date();
  this.verificationToken = undefined;
  await this.save();
};

// Unsubscribe
EmailSubscriberSchema.methods.unsubscribe = async function() {
  this.isSubscribed = false;
  this.unsubscribedAt = new Date();
  await this.save();
};

// Resubscribe
EmailSubscriberSchema.methods.resubscribe = async function() {
  this.isSubscribed = true;
  this.unsubscribedAt = undefined;
  await this.save();
};

/**
 * Statics: Methods called on the Model itself (e.g., EmailSubscriber.getGrowthStats)
 */
EmailSubscriberSchema.statics.getGrowthStats = async function(days = 30) {
  const now = new Date();
  const currentPeriodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(now.getTime() - (days * 2) * 24 * 60 * 60 * 1000);

  const stats = await this.aggregate([
    {
      $facet: {
        "currentPeriod": [
          { $match: { createdAt: { $gte: currentPeriodStart }, isSubscribed: true } },
          { $count: "count" }
        ],
        "previousPeriod": [
          { $match: { createdAt: { $gte: previousPeriodStart, $lt: currentPeriodStart }, isSubscribed: true } },
          { $count: "count" }
        ],
        "totalCount": [
          { $match: { isSubscribed: true } },
          { $count: "count" }
        ]
      }
    },
    {
      $project: {
        total: { $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0] },
        current: { $ifNull: [{ $arrayElemAt: ["$currentPeriod.count", 0] }, 0] },
        previous: { $ifNull: [{ $arrayElemAt: ["$previousPeriod.count", 0] }, 0] },
        lost: { $ifNull: [{ $arrayElemAt: ["$unsubscribes.count", 0] }, 0] } // Ensure this is still here!
      }
    }
  ]);

  const { current, previous, total } = stats[0];
  
  // Trend calculation: ((current - previous) / previous) * 100
  let trend = 0;
  if (previous > 0) {
    trend = ((current - previous) / previous) * 100;
  } else if (current > 0) {
    trend = 100; // 100% growth if previous was 0
  }

  return { total, current, trend };
};

export const EmailSubscriber = mongoose.model<IEmailSubscriber>('EmailSubscriber', EmailSubscriberSchema);