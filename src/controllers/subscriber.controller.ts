import { 
  JsonController, 
  Get, 
  Post, 
  Param, 
  Body, 
  QueryParams,
  HttpCode, 
  NotFoundError,
  Authorized
} from 'routing-controllers';
import { Service } from 'typedi';
import { EmailSubscriber } from '../models/emailSubscriber.model';
import { sendEmail } from '../services/email.service';

// NOTE: The `EmailSubscriber` model must have methods defined (like `generateVerificationToken`, `verify`, `unsubscribe`). 
// These model methods are preserved in the refactor.

// Interface for subscriber data in POST request
interface SubscribeBody {
  email: string;
  name?: string;
  preferences?: Record<string, boolean>;
}

// Interface for admin GET request query
interface SubscriberQueryParams {
  page?: string;
  limit?: string;
  subscribed?: string;
  verified?: string;
}

/**
 * Helper function to send verification email (Kept outside the class or moved to a Service)
 */
const sendVerificationEmail = async (subscriber: any) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${subscriber.verificationToken}`;
  const unsubscribeUrl = `${process.env.BASE_URL}/api/subscribers/unsubscribe/${subscriber.unsubscribeToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #4F46E5;">Welcome to Royalbird Studios! 🎉</h1>
      <p>Thank yourself for subscribing to our newsletter.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 8px;
                  font-weight: bold;">
          Verify Email Address
        </a>
      </div>
      
      <p style="font-size: 14px; color: #6b7280;">
        Royalbird Studios<br>
      </p>
    </div>
  `;

  await sendEmail({
    to: subscriber.email,
    subject: 'Verify your email address - Royalbird Studios',
    html,
  });
};


@Service()
@JsonController('/subscribers')
export class SubscriberController {

  /**
   * @desc    Get Growth Analytics (New Endpoint)
   * @route   GET /api/subscribers/stats
   * @access  Private/Admin
   */
  @Get('/stats')
  @HttpCode(200)
  @Authorized()
  async getStats(@QueryParams() query: { days?: string }) {
    const days = parseInt(query.days || '30');
    
    // Call the static method we added to the Schema
    const stats = await (EmailSubscriber as any).getGrowthStats(days);

    return {
      success: true,
      data: {
        total: stats.total,
        newSignups: stats.current,
        netGrowth: stats.current,
        growthPercentage: stats.trend.toFixed(1),
        trend: stats.trend,
        periodDays: days,
        unsubscribes: stats.lost,
      }
    };
  }

  @Post('/')
  @HttpCode(201)
  async subscribe(@Body() body: SubscribeBody) {
    const { email, name, preferences } = body;

    let subscriber = await EmailSubscriber.findOne({ email });

    if (subscriber) {
      // Already subscribed and verified
      if (subscriber.isSubscribed && subscriber.isVerified) {
        return {
          success: true,
          message: 'Already subscribed',
          data: subscriber,
        };
      }

      // If unsubscribed, resubscribe
      if (!subscriber.isSubscribed) {
        subscriber.isSubscribed = true;
        subscriber.unsubscribedAt = undefined;
        subscriber.preferences = { ...subscriber.preferences, ...preferences };
        if (name) subscriber.name = name;
        await subscriber.save();
      }

      if (!subscriber.isVerified) {
        await sendVerificationEmail(subscriber);
      }
    } else {
      // Create new subscriber
      subscriber = await EmailSubscriber.create({
        email,
        name,
        preferences: preferences || {
          comics: true,
          blog: true,
          announcements: true,
          weeklyDigest: true,
        },
      });

      // Generate verification token and save
      (subscriber as any).generateVerificationToken();
      await subscriber.save();
      
      await sendVerificationEmail(subscriber);
    }

    return {
      success: true,
      message: 'Subscription successful',
      data: {
        _id: subscriber._id.toString(),
        id: subscriber._id.toString(),
        email: subscriber.email,
        isVerified: subscriber.isVerified,
      },
    };
  }

  // @desc    Verify email
  // @route   GET /api/subscribers/verify/:token
  // @access  Public
  @Get('/verify/:token')
  @HttpCode(200)
  async verifyEmail(@Param('token') token: string) {
    const subscriber = await EmailSubscriber.findOne({
      verificationToken: token,
      verificationSentAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 24 hours
    });

    if (!subscriber) {
      throw new Error('Invalid or expired verification token');
    }

    await (subscriber as any).verify();

    return {
      success: true,
      message: 'Email verified successfully',
      data: {
        id: subscriber._id.toString(),
        email: subscriber.email,
      },
    };
  }

  // @desc    Unsubscribe from newsletter
  // @route   GET /api/subscribers/unsubscribe/:token
  // @access  Public
  @Get('/unsubscribe/:token')
  @HttpCode(200)
  async unsubscribe(@Param('token') token: string) {
    const subscriber = await EmailSubscriber.findOne({
      unsubscribeToken: token,
    });

    if (!subscriber) {
      throw new Error('Invalid unsubscribe token');
    }

    await (subscriber as any).unsubscribe();

    return {
      success: true,
      message: 'Successfully unsubscribed',
    };
  }

  // @desc    Get all subscribers (admin)
  // @route   GET /api/subscribers
  // @access  Private/Admin
  @Get('/')
  @HttpCode(200)
  @Authorized()
  async getSubscribers(@QueryParams() query: SubscriberQueryParams) {
    const {
      page = '1',
      limit = '50',
      subscribed = 'true',
      verified,
    } = query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let mongoQuery: any = {};

    if (subscribed === 'true') {
      mongoQuery.isSubscribed = true;
    }

    if (verified === 'true') {
      mongoQuery.isVerified = true;
    } else if (verified === 'false') {
      mongoQuery.isVerified = false;
    }

    // Execute query
    const [subscribers, total] = await Promise.all([
      EmailSubscriber.find(mongoQuery)
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      EmailSubscriber.countDocuments(mongoQuery),
    ]);

    return {
      success: true,
      count: subscribers.length,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      data: subscribers.map((subscriber) => ({...subscriber, id: subscriber._id.toString(), _id: subscriber._id.toString()})),
    };
  }

  /**
   * @desc    Get single subscriber details
   * @route   GET /api/subscribers/:id
   * @access  Private/Admin
   */
  @Get('/:id')
  @HttpCode(200)
  @Authorized()
  async getSubscriberDetail(@Param('id') id: string) {
    // 1. Fetch the subscriber by ID
    const subscriber = await EmailSubscriber.findById(id).lean();

    if (!subscriber) {
      throw new NotFoundError(`Subscriber with ID ${id} not found`);
    }

    // 2. Optional: Add calculated metadata for the UI
    // For example, checking if the email domain is high-risk or common
    const emailProvider = subscriber.email.split('@')[1];
    
    return {
      success: true,
      data: {
        ...subscriber,
        id: subscriber._id.toString(),
        _id: subscriber._id.toString(),
        meta: {
          provider: emailProvider,
          isCorporate: !['gmail.com', 'yahoo.com', 'outlook.com'].includes(emailProvider),
          // Calculate tenure in days
          tenureDays: Math.floor(
            (Date.now() - new Date(subscriber.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          ),
        }
      },
    };
  }
}