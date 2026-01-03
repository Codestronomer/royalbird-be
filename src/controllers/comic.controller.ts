import { 
  JsonController, Get, Post, Put, Delete, Param, Body, 
  QueryParams, HttpCode, NotFoundError, BadRequestError, 
  ForbiddenError
} from 'routing-controllers';
import { Service } from 'typedi';
import { Comic, ComicDocument } from '../models/comic.model';
import { ComicPage } from '../models/comicPage.model';
import { Genre } from '../models/genre.model';
import { Tag } from '../models/tag.model';
import { CreateComicDto, LikeComicDto } from '../dto/comic.dto';
import mongoose from 'mongoose';

interface ComicQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  genre?: string;
  tag?: string;
  featured?: boolean;
  search?: string;
  sort?: string;
}

@Service()
@JsonController('/comics')
export class ComicController {

  @Get('/')
  async getComics(@QueryParams() query: ComicQueryParams) {
    const {
      page = 1,
      limit = 20,
      status,
      genre,
      tag,
      featured,
      search,
      sort = '-publishedAt',
    } = query;

    const skip = (page - 1) * limit;
    let mongoQuery: any = { deletedAt: null };
    if (status) {
      mongoQuery.status = [status];
    }

    if (featured) mongoQuery.featured = true;

    // Parallel lookup for Genre and Tag slugs to IDs
    const [genreDoc, tagDoc] = await Promise.all([
      genre ? Genre.findOne({ slug: genre }).select('_id') : null,
      tag ? Tag.findOne({ slug: tag }).select('_id') : null
    ]);

    if (genre && genreDoc) mongoQuery.genres = genreDoc._id;
    if (tag && tagDoc) mongoQuery.tags = tagDoc._id;

    if (search) {
      mongoQuery.$text = { $search: search }; // Assumes text index exists
      // Fallback if no text index:
      // mongoQuery.title = { $regex: search, $options: 'i' };
    }

    const [comics, total] = await Promise.all([
      Comic.find(mongoQuery)
        .populate('genres', 'name slug color icon')
        .populate('tags', 'name slug type')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Comic.countDocuments(mongoQuery)
    ]);

    return {
      success: true,
      pagination: {
        current: page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: comics.map(comic => ({
        ...comic,
        id: comic._id.toString(), 
        _id: comic._id.toString(),
        genres: comic.genres.map((genre) => ({ ...genre, _id: genre._id.toString()}))
      })),
    };
  }

  @Get('/featured')
  async getFeaturedComics() {
    const comics = await Comic.find({
      status: 'published',
      featured: true,
      deletedAt: null,
    })
    .populate('genres', 'name slug color icon')
    .sort('-publishedAt')
    .limit(6)
    .lean();

    return { success: true, data: comics };
  }

  @Get('/:slug')
  async getComic(@Param('slug') slug: string) {
    // Atomic view increment and fetch in one go
    const comic = await Comic.findOneAndUpdate(
      { slug, deletedAt: null },
      { $inc: { views: 1 } },
      { new: true }
    )
    .populate('genres', 'name slug color icon')
    .populate('tags', 'name slug')
    .lean();

    if (!comic) throw new NotFoundError(`Comic '${slug}' not found`);

    // Fetch pages separately for performance/pagination if needed
    const pages = await ComicPage.find({ comic: { _id: comic._id } })
      .sort({ pageNumber: 1 })
      .select('pageNumber imageUrl imageUrlThumbnail isDoubleSpread')
      .lean();

    return {
      success: true,
      data: {
        ...comic,
        id: comic._id.toString(),
        _id: comic._id.toString(),
        genres: comic.genres.map((genre) => ({ ...genre, id: genre._id.toString(), _id: genre._id.toString()})),
        pages
      },
    };
  }

  @Post('/')
  @HttpCode(201)
  async createComic(@Body() comicData: CreateComicDto) {
    // Ensure slug is unique before attempt
    const existing = await Comic.findOne({ slug: comicData.slug });
    if (existing) throw new BadRequestError('Slug already in use');

    const comicPayload = {
      ...comicData,
      genres: comicData.genres?.map(id => new mongoose.Types.ObjectId(id)),
      tags: comicData.tags?.map(id => new mongoose.Types.ObjectId(id))
    };

    const comic = new Comic(comicPayload);
    await comic.save();
    return { success: true, data: comic.toObject() };
  }

  @Put('/:id')
  async updateComic(@Param('id') id: string, @Body() comicData: Partial<CreateComicDto>) {
    const updatedComic = await Comic.findByIdAndUpdate(
      id,
      { $set: comicData },
      { new: true, runValidators: true }
    );

    if (!updatedComic) throw new NotFoundError('Comic not found');
    return { success: true, data: updatedComic.toObject() };
  }

  @Delete('/:id')
  async deleteComic(@Param('id') id: string) {
    // Using soft delete instance method defined in your schema
    const comic = await Comic.findById(id);
    if (!comic) throw new NotFoundError('Comic not found');
    
    await (comic as any).softDelete();
    return { success: true, message: 'Comic moved to archive' };
  }

  // @desc    Like a comic
    // @route   POST /api/comics/:id/like
    // @access  Public (or Authorized for logged-in users)
    @Post('/:id/like')
    @HttpCode(200)
    async likeComic(
      @Param('id') id: string,
      @Body() body: LikeComicDto
    ) {
      const { userId } = body;
  
      if (!userId) {
        throw new BadRequestError('User identifier is required');
      }
  
      const comic: ComicDocument = await Comic.findById(id);
      
      if (!comic) {
        throw new NotFoundError('comic not found');
      }
  
      if (comic.status !== 'published') {
        throw new ForbiddenError('Cannot like unpublished comic');
      }
  
      const liked = await comic.like(userId);
  
      return {
        success: true,
        message: liked ? 'comic liked successfully' : 'comic already liked',
        data: {
          id: comic.id,
          likes: comic.likes,
          liked: liked
        }
      };
    }
  
    // @desc    Unlike a comic
    // @route   POST /api/blogs/:id/unlike
    // @access  Public (or Authorized for logged-in users)
    @Post('/:id/unlike')
    @HttpCode(200)
    async unlikeComic(
      @Param('id') id: string,
      @Body() body: LikeComicDto
    ) {
      const { userId } = body;
  
      if (!userId) {
        throw new BadRequestError('User identifier is required');
      }
  
      const comic: ComicDocument = await Comic.findById(id);
      
      if (!comic) {
        throw new NotFoundError('Comic not found');
      }
  
      const unliked = await comic.unlike(userId);
  
      return {
        success: true,
        message: unliked ? 'Comic unliked successfully' : 'Comic was not liked',
        data: {
          id: comic.id,
          likes: comic.likes,
          unliked: unliked
        }
      };
    }
  
    // @desc    Check if user liked a comic
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
  
      const comic: ComicDocument = await Comic.findById(id);
      
      if (!comic) {
        throw new NotFoundError('comic not found');
      }
  
      const hasLiked = comic.hasLiked(userId);
  
      return {
        success: true,
        data: {
          id: comic.id,
          hasLiked,
          likes: comic.likes
        }
      };
    }
}