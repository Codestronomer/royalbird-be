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
  QueryParam
} from 'routing-controllers';
import { Service } from 'typedi';
import { Tag } from '../models/tag.model';
import { Comic } from '../models/comic.model';
// Assuming ITag interface is correctly defined elsewhere or inline
import { ITag } from '../types/types'; 

// Interface for query parameters
interface TagQueryParams {
  type?: string;
  featured?: string;
  sort?: string;
  limit?: string;
  minCount?: string;
}

@Service()
@JsonController('/tags') // Base route: /api/tags
export class TagController {

  // @desc    Get all tags
  // @route   GET /api/tags
  // @access  Public
  @Get('/')
  @HttpCode(200)
  async getTags(@QueryParams() query: TagQueryParams) {
    const {
      type,
      featured,
      sort = 'comicCount',
      limit = '50',
    } = query;

    let mongoQuery: any = {};

    if (type) {
      mongoQuery.type = type;
    }

    if (featured === 'true') {
      mongoQuery.featured = true;
    }

    const tags = await Tag.find(mongoQuery)
      .sort(sort as string)
      .limit(parseInt(limit as string))
      .lean();

    return {
      success: true,
      count: tags.length,
      data: tags,
    };
  }

  // @desc    Get popular tags
  // @route   GET /api/tags/popular
  // @access  Public
  @Get('/popular')
  @HttpCode(200)
  async getPopularTags(@QueryParam('limit') limitQuery?: string) {
    const limit = parseInt(limitQuery as string) || 20;

    const tags = await Tag.find()
      .sort('-comicCount')
      .limit(limit)
      .lean();

    return {
      success: true,
      count: tags.length,
      data: tags,
    };
  }
  
  // @desc    Get tag cloud
  // @route   GET /api/tags/cloud
  // @access  Public
  @Get('/cloud')
  @HttpCode(200)
  async getTagCloud(@QueryParams() query: TagQueryParams) {
    const minCount = parseInt(query.minCount as string) || 1;
    const limit = parseInt(query.limit as string) || 50;

    const tags = await Tag.find({ comicCount: { $gte: minCount } })
      .select('name slug comicCount type')
      .sort('-comicCount')
      .limit(limit)
      .lean() as ITag[];

    // Calculate font sizes for tag cloud
    const maxCount = tags[0]?.comicCount || 1;
    const minFontSize = 12;
    const maxFontSize = 32;

    const tagCloud = tags.map(tag  => {
      // Ensure maxCount is greater than minCount to avoid division by zero/NaN
      const divisor = maxCount - minCount > 0 ? (maxCount - minCount) : 1; 

      const fontSize = minFontSize + 
        ((tag.comicCount - minCount) / divisor) * (maxFontSize - minFontSize);
      
      return {
        ...tag,
        fontSize: Math.round(fontSize),
      };
    });

    return {
      success: true,
      count: tagCloud.length,
      data: tagCloud,
    };
  }

  // @desc    Get single tag
  // @route   GET /api/tags/:slug
  // @access  Public
  @Get('/:slug')
  @HttpCode(200)
  async getTag(@Param('slug') slug: string) {
    const tag = await Tag.findOne({ slug }).lean();

    if (!tag) {
      throw new Error(`Tag not found with slug: ${slug}`);
    }

    // Get comics with this tag
    const comics = await Comic.find({
      tags: tag._id,
      status: 'published',
      deletedAt: null
    })
      .select('slug title coverImage description views averageRating')
      .sort('-publishedAt')
      .limit(12)
      .populate('genres', 'name slug color')
      .populate('tags', 'name slug')
      .lean();

    return {
      success: true,
      data: {
        ...tag,
        comics,
      },
    };
  }

  // @desc    Create tag
  // @route   POST /api/tags
  // @access  Private/Admin
  @Post('/')
  @HttpCode(201)
  async createTag(@Body() tagData: any) { // Use dedicated interface for tagData
    const tag = await Tag.create(tagData);

    return {
      success: true,
      data: tag,
    };
  }

  // @desc    Update tag
  // @route   PUT /api/tags/:id
  // @access  Private/Admin
  @Put('/:id')
  @HttpCode(200)
  async updateTag(@Param('id') id: string, @Body() tagData: any) { // Use dedicated interface for tagData
    let tag = await Tag.findById(id);

    if (!tag) {
      throw new Error(`Tag not found with id: ${id}`);
    }

    tag = await Tag.findByIdAndUpdate(
      id,
      tagData,
      { new: true, runValidators: true }
    );

    return {
      success: true,
      data: tag,
    };
  }

  // @desc    Delete tag
  // @route   DELETE /api/tags/:id
  // @access  Private/Admin
  @Delete('/:id')
  @HttpCode(200)
  async deleteTag(@Param('id') id: string) {
    const tag = await Tag.findById(id);

    if (!tag) {
      throw new Error(`Tag not found with id: ${id}`);
    }

    // Check if tag has comics
    const comicCount = await Comic.countDocuments({ tags: tag._id });
    
    if (comicCount > 0) {
      // Throw an error that your AppErrorHandler can map to 400 Bad Request
      throw new Error(
        `Cannot delete tag with ${comicCount} comics. Remove tag from comics first.`
      );
    }

    await tag.deleteOne();

    return {
      success: true,
      data: {},
    };
  }
}