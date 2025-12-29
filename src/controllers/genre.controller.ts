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
  BadRequestError
} from 'routing-controllers';
import { Service } from 'typedi';
import { Genre } from '../models/genre.model';
import { Comic } from '../models/comic.model';
import { CreateGenreDto, UpdateGenreDto } from '../dto/genre.dto';

// Interface for query parameters (for Get all genres and Get genre comics)
interface GenreQueryParams {
  featured?: string;
  sort?: string;
  limit?: string;
  page?: string;
  status?: string;
  free?: string;
}

@Service()
@JsonController('/genres') // Base route: /api/genres (assuming routePrefix: '/api' in index.ts)
export class GenreController {

  // @desc    Get all genres
  // @route   GET /api/genres
  // @access  Public
  @Get('/')
  @HttpCode(200)
  async getGenres(@QueryParams() query: GenreQueryParams) {
    const {
      featured,
      sort = 'order',
      limit,
    } = query;

    let mongoQuery: any = {};

    if (featured === 'true') {
      mongoQuery.featured = true;
    }

    let queryBuilder = Genre.find(mongoQuery);

    // Sort
    const sortOrder = (sort as string).startsWith('-') ? -1 : 1;
    const sortField = (sort as string).replace('-', '');
    queryBuilder = queryBuilder.sort({ [sortField]: sortOrder, name: 1 });

    // Limit
    if (limit) {
      queryBuilder = queryBuilder.limit(parseInt(limit as string));
    }

    const genres = await queryBuilder.lean();

    // Get comic count for each genre
    const genresWithCounts = await Promise.all(
      genres.map(async (genre) => {
        const comicCount = await Comic.countDocuments({
          genres: genre._id,
          status: 'published',
          deletedAt: null
        });
        
        return {
          ...genre,
          id: genre._id.toString(),
          comicCount
        };
      })
    );

    return {
      success: true,
      count: genresWithCounts.length,
      data: genresWithCounts,
    };
  }

  // @desc    Get single genre
  // @route   GET /api/genres/:slug
  // @access  Public
  @Get('/:slug')
  @HttpCode(200)
  async getGenre(@Param('slug') slug: string) {
    const genre = await Genre.findOne({ slug }).lean();

    if (!genre) {
      throw new Error(`Genre not found with slug: ${slug}`);
    }

    // Get comics (latest 12)
    const comics = await Comic.find({
      genres: genre._id,
      status: 'published',
      deletedAt: null
    })
      .select('slug title coverImage description views averageRating totalPages isFree price publishedAt')
      .sort('-publishedAt')
      .limit(12)
      .populate('genres', 'name slug color')
      .populate('tags', 'name slug')
      .lean();

    // Get popular comics (top 6 by views)
    const popularComics = await Comic.find({
      genres: genre._id,
      status: 'published',
      deletedAt: null
    })
      .select('slug title coverImage views averageRating')
      .sort('-views')
      .limit(6)
      .lean();

    // Aggregate stats
    const [totalViewsResult, avgRatingResult, comicCount] = await Promise.all([
      Comic.aggregate([
        { $match: { genres: genre._id, status: 'published', deletedAt: null } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ]),
      Comic.aggregate([
        { $match: { genres: genre._id, status: 'published', deletedAt: null, averageRating: { $gt: 0 } } },
        { $group: { _id: null, avgRating: { $avg: '$averageRating' } } }
      ]),
      Comic.countDocuments({ genres: genre._id, status: 'published', deletedAt: null }),
    ]);


    return {
      success: true,
      data: {
        ...genre,
        comics,
        popularComics,
        stats: {
          comicCount,
          totalViews: totalViewsResult[0]?.totalViews || 0,
          averageRating: avgRatingResult[0]?.avgRating || 0,
        },
      },
    };
  }

  // @desc    Create genre
  // @route   POST /api/genres
  // @access  Private/Admin
  @Post('/')
  @HttpCode(201)
  async createGenre(@Body() genreData: CreateGenreDto) {
    const existing = await Genre.findOne({ slug: genreData.slug });

    if (existing) throw new BadRequestError('Genre already exists');
    const genre = await Genre.create(genreData);

    return {
      success: true,
      data: {
        id: genre._id.toString(),
        name: genre.name,
        slug: genre.slug,
        color: genre.color,
      }
    }
  }

  // @desc    Update genre
  // @route   PUT /api/genres/:id
  // @access  Private/Admin
  @Put('/:id')
  @HttpCode(200)
  async updateGenre(@Param('id') id: string, @Body() genreData: UpdateGenreDto) {
    let genre = await Genre.findById(id);

    if (!genre) {
      throw new Error(`Genre not found with id: ${id}`);
    }

    genre = await Genre.findByIdAndUpdate(
      id,
      genreData,
      { new: true, runValidators: true }
    );

    return {
      success: true,
      data: genre,
    };
  }

  // @desc    Delete genre
  // @route   DELETE /api/genres/:id
  // @access  Private/Admin
  @Delete('/:id')
  @HttpCode(200)
  async deleteGenre(@Param('id') id: string) {
    const genre = await Genre.findById(id);

    if (!genre) {
      throw new Error(`Genre not found with id: ${id}`);
    }

    // Check if genre has comics
    const comicCount = await Comic.countDocuments({ genres: genre._id });
    
    if (comicCount > 0) {
      // Throw an error that your AppErrorHandler can map to 400 Bad Request
      throw new Error(`Cannot delete genre with ${comicCount} comics. Remove comics from this genre first.`);
    }

    await genre.deleteOne();

    return {
      success: true,
      data: {},
    };
  }

  // @desc    Get genre with comics (Paginated)
  // @route   GET /api/genres/:slug/comics
  // @access  Public
  @Get('/:slug/comics')
  @HttpCode(200)
  async getGenreComics(@Param('slug') slug: string, @QueryParams() query: GenreQueryParams) {
    const {
      page = '1',
      limit = '20',
      sort = '-publishedAt',
      status = 'published',
      free,
    } = query;

    const genre = await Genre.findOne({ slug });

    if (!genre) {
      throw new Error(`Genre not found with slug: ${slug}`);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let mongoQuery: any = {
      genres: genre._id,
      status,
      deletedAt: null,
    };

    if (free === 'true') {
      mongoQuery.isFree = true;
    } else if (free === 'false') {
      mongoQuery.isFree = false;
    }

    // Get comics and total count concurrently
    const [comics, total] = await Promise.all([
      Comic.find(mongoQuery)
        .select('slug title coverImage description views averageRating totalPages isFree price publishedAt')
        .populate('genres', 'name slug color')
        .populate('tags', 'name slug')
        .sort(sort as string)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Comic.countDocuments(mongoQuery),
    ]);

    return {
      success: true,
      count: comics.length,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      data: {
        genre,
        comics,
      },
    };
  }
}