import {
  JsonController,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  QueryParams,
  HttpCode,
  Authorized,
  CurrentUser,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from 'routing-controllers';
import { Service } from 'typedi';
import { BlogPost, BlogPostDocument, IBlogPost } from '../models/blogPost.model';
import { QueryFilter } from 'mongoose';

interface CreateBlogPostDto {
  title: string;
  description?: string;
  content: string;
  author: string;
  category: string;
  featuredImage?: string;
  status?: 'draft' | 'published' | 'scheduled' | 'archived';
  featured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  publishedAt?: Date;
  scheduledAt?: Date;
}

interface UpdateBlogPostDto extends Partial<CreateBlogPostDto> {
  slug?: string;
}

interface LikeBlogPostDto {
  userId: string; // Or IP address for anonymous users
}

interface BlogQueryParams {
  page?: string;
  limit?: string;
  status?: 'draft' | 'published' | 'scheduled' | 'archived';
  category?: string;
  author?: string;
  featured?: string;
  search?: string;
  sortBy?: 'createdAt' | 'publishedAt' | 'title' | 'readingTime';
  sortOrder?: 'asc' | 'desc';
}

const generateUniqueSlug = async (title: string): Promise<string> => {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();

  let slug = baseSlug;
  let counter = 1;
  
  while (await BlogPost.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

@Service()
@JsonController('/blogs')
export class BlogController {

  // @desc Get all blogs 
  // @route GET /api/blogs
  // @access Public
  @Get('/')
  @HttpCode(200)
  async getBlogPosts(@QueryParams() query: BlogQueryParams) {
    const {
      page = '1',
      limit = '10',
      status,
      category,
      author,
      featured,
      search,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const mongoQuery: QueryFilter<IBlogPost> = {};

    mongoQuery.deletedAt = { $exists: true, $eq: null };

    if (category) {
      mongoQuery.category = category;
    }

    if (status) {
      mongoQuery.status = status;
    }

    if (author) {
      mongoQuery.author = author;
    }

    if (featured == 'true') {
      mongoQuery.featured = true;
    }
    
    if (search) {
      mongoQuery.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const sort: any = {};
    sort[sortBy] = sortOrder == 'desc' ? -1 : 1;

    const [posts, total] = await Promise.all([
      BlogPost.find(mongoQuery)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select('-content')
        .lean(),
      BlogPost.countDocuments(mongoQuery)
    ]);

    return {
      success: true,
      count: posts.length,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
        total: posts.length
      },
      data: posts.map(post => ({
        ...post,
        id: post._id.toString(),
        _id: post._id.toString()
      }))
    };
  }


  // @desc    Create new blog post
  // @route   POST /api/blogs
  // @access  Private/Admin
  @Post('/')
  @HttpCode(201)
  // @Authorized() // Add your authorization logic
  async createBlogPost(@Body() body: CreateBlogPostDto) {
    const {
      title,
      description,
      content,
      author,
      category,
      featuredImage,
      status = 'draft',
      featured = false,
      metaTitle,
      metaDescription,
      tags,
      publishedAt,
      scheduledAt
    } = body;

    // Validate required fields
    if (!title || !content || !author || !category) {
      throw new BadRequestError('Title, content, author, and category are required');
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(title);

    // Set publishedAt if status is published
    let finalPublishedAt = publishedAt;
    if (status === 'published' && !publishedAt) {
      finalPublishedAt = new Date();
    }

    // Create blog post
    const blogPost = await BlogPost.create({
      slug,
      title,
      description: description || content.substring(0, 150) + '...',
      content,
      author,
      category,
      featuredImage,
      status,
      featured,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || description || content.substring(0, 150),
      tags,
      publishedAt: finalPublishedAt,
      scheduledAt,
      deletedAt: null
    });

    return {
      success: true,
      message: 'Blog post created successfully',
      data: {
        id: blogPost._id.toString(),
        slug: blogPost.slug,
        title: blogPost.title,
        status: blogPost.status,
        createdAt: blogPost.createdAt
      }
    };
  }

  @Get('/featured')
  @HttpCode(200)
  async getFeaturedPosts(@QueryParams() query: { limit?: string }) {
    const limit = parseInt(query.limit || '5');
    
    const posts = await BlogPost.find({
      status: 'published',
      featured: true,
      deletedAt: { $exists: true, $eq: null }
    })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .select('-content')
    .lean();

    const transformedPosts = posts.map(post => ({
      ...post,
      id: post._id.toString(),
      _id: post._id.toString()
    }));

    return {
      success: true,
      count: transformedPosts.length,
      data: transformedPosts
    };
  }

  // @desc    Get blog categories
  // @route   GET /api/blogs/categories
  // @access  Public
  @Get('/categories')
  @HttpCode(200)
  async getCategories() {
    const categories = await BlogPost.aggregate([
      {
        $match: {
          status: 'published',
          deletedAt: { $exists: true, $eq: null }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          latest: { $max: '$publishedAt' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          name: '$_id',
          count: 1,
          latest: 1,
          _id: 0
        }
      }
    ]);

    return {
      success: true,
      data: categories
    };
  }

  // @desc    Search blog posts
  // @route   GET /api/blogs/search
  // @access  Public
  @Get('/search')
  @HttpCode(200)
  async searchBlogPosts(@QueryParams() query: { q: string; limit?: string }) {
    const { q, limit = '10' } = query;
    const limitNum = parseInt(limit);

    if (!q || q.trim().length < 2) {
      throw new BadRequestError('Search query must be at least 2 characters');
    }

    const posts = await BlogPost.find({
      $text: { $search: q },
      status: 'published',
      deletedAt: { $exists: true, $eq: null }
    })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limitNum)
    .select('-content')
    .lean();

    // If no text search results, fall back to regex search
    if (posts.length === 0) {
      const regexPosts = await BlogPost.find({
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { content: { $regex: q, $options: 'i' } }
        ],
        status: 'published',
        deletedAt: { $exists: true, $eq: null }
      })
      .sort({ publishedAt: -1 })
      .limit(limitNum)
      .select('-content')
      .lean();
      
      return {
        success: true,
        count: regexPosts.length,
        data: regexPosts.map(post => ({
          ...post,
          id: post._id.toString(),
          _id: post._id.toString()
        }))
      };
    }

    return {
      success: true,
      count: posts.length,
      data: posts.map(post => ({
        ...post,
        id: post._id.toString(),
        _id: post._id.toString()
      }))
    };
  }

  // @desc    Get single blog post by slug
  // @route   GET /api/blogs/:slug
  // @access  Public
  @Get('/:slug')
  @HttpCode(200)
  async getBlogPostBySlug(@Param('slug') slug: string) {
    const post = await BlogPost.findOne({ 
      slug,
      deletedAt: { $exists: true, $eq: null }
    }).lean();

    if (!post) {
      throw new NotFoundError('Blog post not found');
    }

    // Increment views if needed (you can add a views field to schema)
    await BlogPost.findByIdAndUpdate(post._id, { $inc: { views: 1 } });

    return {
      success: true,
      data: {
        ...post,
        id: post._id.toString(),
        _id: post._id.toString()
      }
    };
  }

  // @desc    Update blog post
  // @route   PUT /api/blogs/:id
  // @access  Private/Admin
  @Put('/:id')
  @HttpCode(200)
  @Authorized()
  async updateBlogPost(
    @Param('id') id: string,
    @Body() body: UpdateBlogPostDto
  ) {
    // Find post
    const post = await BlogPost.findById(id);
    
    if (!post) {
      throw new NotFoundError('Blog post not found');
    }

    // Check if deleted
    if (post.deletedAt) {
      throw new BadRequestError('Cannot update deleted blog post');
    }

    // Update slug if title changed
    if (body.title && body.title !== post.title) {
      body.slug = await generateUniqueSlug(body.title);
    }

    // Update publishedAt if status changed to published
    if (body.status === 'published' && post.status !== 'published') {
      body.publishedAt = body.publishedAt || new Date();
    }

    // Update post
    Object.assign(post, body);
    await post.save();

    return {
      success: true,
      message: 'Blog post updated successfully',
      data: {
        id: post._id.toString(),
        slug: post.slug,
        title: post.title,
        status: post.status,
        updatedAt: post.updatedAt
      }
    };
  }

  // @desc    Delete blog post (soft delete)
  // @route   DELETE /api/blogs/:id
  // @access  Private/Admin
  @Delete('/:id')
  @HttpCode(200)
  @Authorized()
  async deleteBlogPost(@Param('id') id: string) {
    const post = await BlogPost.findById(id);
    
    if (!post) {
      throw new NotFoundError('Blog post not found');
    }

    // Soft delete
    post.deletedAt = new Date();
    post.status = 'archived';
    await post.save();

    return {
      success: true,
      message: 'Blog post deleted successfully'
    };
  }

  // @desc    Increment blog post views
  // @route   POST /api/blogs/:id/view
  // @access  Public
  @Post('/:id/view')
  @HttpCode(200)
  async incrementViews(@Param('id') id: string) {
    const post: BlogPostDocument = await BlogPost.findById(id);
    
    if (!post) {
      throw new NotFoundError('Blog post not found');
    }

    if (post.status !== 'published') {
      throw new ForbiddenError('Cannot view unpublished blog post');
    }

    await post.incrementViews();

    return {
      success: true,
      message: 'View counted',
      data: {
        id: post.id,
        views: post.views
      }
    };
  }

  // @desc    Like a blog post
  // @route   POST /api/blogs/:id/like
  // @access  Public (or Authorized for logged-in users)
  @Post('/:id/like')
  @HttpCode(200)
  async likeBlogPost(
    @Param('id') id: string,
    @Body() body: LikeBlogPostDto
  ) {
    const { userId } = body;

    if (!userId) {
      throw new BadRequestError('User identifier is required');
    }

    const post: BlogPostDocument = await BlogPost.findById(id);
    
    if (!post) {
      throw new NotFoundError('Blog post not found');
    }

    if (post.status !== 'published') {
      throw new ForbiddenError('Cannot like unpublished blog post');
    }

    const liked = await post.like(userId);

    return {
      success: true,
      message: liked ? 'Post liked successfully' : 'Post already liked',
      data: {
        id: post.id,
        likes: post.likes,
        liked: liked
      }
    };
  }

  // @desc    Unlike a blog post
  // @route   POST /api/blogs/:id/unlike
  // @access  Public (or Authorized for logged-in users)
  @Post('/:id/unlike')
  @HttpCode(200)
  async unlikeBlogPost(
    @Param('id') id: string,
    @Body() body: LikeBlogPostDto
  ) {
    const { userId } = body;

    if (!userId) {
      throw new BadRequestError('User identifier is required');
    }

    const post: BlogPostDocument = await BlogPost.findById(id);
    
    if (!post) {
      throw new NotFoundError('Blog post not found');
    }

    const unliked = await post.unlike(userId);

    return {
      success: true,
      message: unliked ? 'Post unliked successfully' : 'Post was not liked',
      data: {
        id: post.id,
        likes: post.likes,
        unliked: unliked
      }
    };
  }

  // @desc    Check if user liked a blog post
  // @route   GET /api/blogs/:id/like-status
  // @access  Public
  @Get('/:id/like-status')
  @HttpCode(200)
  async getLikeStatus(
    @Param('id') id: string,
    @QueryParams() query: { userId: string }
  ) {
    const { userId } = query;

    if (!userId) {
      throw new BadRequestError('User identifier is required');
    }

    const post: BlogPostDocument = await BlogPost.findById(id);
    
    if (!post) {
      throw new NotFoundError('Blog post not found');
    }

    const hasLiked = post.hasLiked(userId);

    return {
      success: true,
      data: {
        id: post.id,
        hasLiked,
        likes: post.likes
      }
    };
  }

  // @desc    Get popular/top blog posts
  // @route   GET /api/blogs/popular
  // @access  Public
  @Get('/popular')
  @HttpCode(200)
  async getPopularPosts(@QueryParams() query: { 
    limit?: string;
    period?: 'day' | 'week' | 'month' | 'all';
  }) {
    const { limit = '10', period = 'week' } = query;
    const limitNum = parseInt(limit);

    let dateFilter = {};
    if (period !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      dateFilter = {
        publishedAt: { $gte: startDate }
      };
    }

    const posts = await BlogPost.find({
      status: 'published',
      deletedAt: { $exists: false },
      ...dateFilter
    })
    .sort({ likes: -1, views: -1 })
    .limit(limitNum)
    .select('-content -likedBy')
    .lean();

    const transformedPosts = posts.map(post => ({
      ...post,
      id: post._id.toString(),
      _id: post._id.toString()
    }));

    return {
      success: true,
      count: transformedPosts.length,
      period,
      data: transformedPosts
    };
  }

  // @desc    Get trending blog posts (by views)
  // @route   GET /api/blogs/trending
  // @access  Public
  @Get('/trending')
  @HttpCode(200)
  async getTrendingPosts(@QueryParams() query: { 
    limit?: string;
    period?: 'day' | 'week' | 'month' | 'all';
  }) {
    const { limit = '10', period = 'week' } = query;
    const limitNum = parseInt(limit);

    let dateFilter = {};
    if (period !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      dateFilter = {
        publishedAt: { $gte: startDate }
      };
    }

    const posts = await BlogPost.find({
      status: 'published',
      deletedAt: { $exists: false },
      ...dateFilter
    })
    .sort({ views: -1, likes: -1 })
    .limit(limitNum)
    .select('-content -likedBy')
    .lean();

    const transformedPosts = posts.map(post => ({
      ...post,
      id: post._id.toString(),
      _id: post._id.toString()
    }));

    return {
      success: true,
      count: transformedPosts.length,
      period,
      data: transformedPosts
    };
  }

  // @desc    Get blog post statistics (for admin)
  // @route   GET /api/blogs/:id/stats
  // @access  Private/Admin
  @Get('/:id/stats')
  @HttpCode(200)
  @Authorized()
  async getBlogStats(@Param('id') id: string) {
    const post = await BlogPost.findById(id)
      .select('+likedBy') // Include likedBy field
      .lean();
    
    if (!post) {
      throw new NotFoundError('Blog post not found');
    }

    // Calculate engagement rate
    const engagementRate = post.views > 0 
      ? (post.likes / post.views * 100).toFixed(2)
      : 0;

    // Calculate average reading completion (assuming 200 words per minute)
    const wordCount = post.content.split(/\s+/).length;
    const estimatedReadTime = Math.ceil(wordCount / 200); // minutes
    const estimatedCompletion = Math.min(100, (estimatedReadTime / 10) * 100); // Assuming 10 min max attention

    return {
      success: true,
      data: {
        id: post._id.toString(),
        title: post.title,
        views: post.views,
        likes: post.likes,
        likedByCount: post.likedBy?.length || 0,
        engagementRate: `${engagementRate}%`,
        readingTime: post.readingTime,
        wordCount,
        estimatedCompletion: `${estimatedCompletion.toFixed(1)}%`,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt
      }
    };
  }

  // @desc    Get overall blog statistics (for admin dashboard)
  // @route   GET /api/blogs/stats/overview
  // @access  Private/Admin
  @Get('/stats/overview')
  @HttpCode(200)
  @Authorized()
  async getBlogOverviewStats() {
    const stats = await BlogPost.aggregate([
      {
        $match: {
          deletedAt: { $exists: false }
        }
      },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          publishedPosts: {
            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
          },
          draftPosts: {
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
          },
          featuredPosts: {
            $sum: { $cond: [{ $eq: ['$featured', true] }, 1, 0] }
          },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          avgReadingTime: { $avg: '$readingTime' }
        }
      }
    ]);

    const categoryStats = await BlogPost.aggregate([
      {
        $match: {
          status: 'published',
          deletedAt: { $exists: false }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const topPosts = await BlogPost.find({
      status: 'published',
      deletedAt: { $exists: false }
    })
    .sort({ views: -1 })
    .limit(5)
    .select('title slug views likes publishedAt')
    .lean();

    return {
      success: true,
      data: {
        overview: stats[0] || {
          totalPosts: 0,
          publishedPosts: 0,
          draftPosts: 0,
          featuredPosts: 0,
          totalViews: 0,
          totalLikes: 0,
          avgReadingTime: 0
        },
        categoryStats: categoryStats.map(stat => ({
          category: stat._id,
          count: stat.count,
          totalViews: stat.totalViews,
          totalLikes: stat.totalLikes
        })),
        topPosts: topPosts.map(post => ({
          id: post._id.toString(),
          title: post.title,
          slug: post.slug,
          views: post.views,
          likes: post.likes,
          publishedAt: post.publishedAt
        }))
      }
    };
  }
}