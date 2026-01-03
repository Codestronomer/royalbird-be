import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsEnum, 
  IsBoolean, 
  IsNumber, 
  IsArray, 
  IsUrl, 
  Min, 
  IsDateString 
} from 'class-validator';

export class CreateComicDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  // Media
  @IsString()
  @IsNotEmpty()
  coverImage!: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsString()
  @IsOptional()
  bannerImage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  previewImages?: string[];

  @IsString()
  @IsOptional()
  pdfUrl?: string;

  // Content configuration
  @IsEnum(['digital', 'print', 'both'])
  @IsOptional()
  format?: 'digital' | 'print' | 'both';

  @IsEnum(['images', 'pdf', 'both'])
  @IsOptional()
  contentType?: 'images' | 'pdf' | 'both';

  @IsEnum(['draft', 'published', 'scheduled', 'archived'])
  @IsOptional()
  status?: 'draft' | 'published' | 'scheduled' | 'archived';

  @IsEnum(['Ongoing', 'Completed', 'Coming Soon'])
  @IsOptional()
  availability?: 'Completed' | 'Ongoing' | 'Coming Soon'; 

  @IsEnum(['ALL', '13+', '16+', '18+'])
  @IsOptional()
  ageRating?: 'ALL' | '13+' | '16+' | '18+';

  @IsString()
  @IsOptional()
  language?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  // Metadata
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalPages?: number;

  @IsString()
  @IsOptional()
  writer?: string;

  @IsString()
  @IsOptional()
  artist?: string;

  @IsString()
  @IsOptional()
  colorist?: string;

  @IsString()
  @IsOptional()
  letterer?: string;

  @IsNumber()
  @IsOptional()
  issueNumber?: number;

  // Relations (Expecting IDs as strings)
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  genres!: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsString()
  @IsOptional()
  estimatedReadTime?: string;
}

export interface LikeComicDto {
  userId: string;
}