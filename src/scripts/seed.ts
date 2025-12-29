import { Genre } from '../models/genre.model';
import { Tag } from '../models/tag.model';

const seedGenres = async () => {
  const genres = [
    {
      name: 'Cyberpunk',
      description: 'High-tech low-life stories set in dystopian futures',
      icon: 'Cpu',
      color: '#00ffff',
      featured: true,
      order: 1,
      metaTitle: 'Cyberpunk Comics - Futuristic African Stories',
      metaDescription: 'Explore African-inspired cyberpunk comics set in futuristic cities like Neo-Accra',
    },
    {
      name: 'Mythology',
      description: 'Ancient African myths, legends, and folklore reimagined',
      icon: 'Sparkles',
      color: '#ff9900',
      featured: true,
      order: 2,
      metaTitle: 'African Mythology Comics - Gods & Legends',
      metaDescription: 'Discover comics based on Yoruba, Akan, and other African mythologies',
    },
    {
      name: 'Historical',
      description: 'Stories based on real African history and historical figures',
      icon: 'Castle',
      color: '#996633',
      featured: true,
      order: 3,
      metaTitle: 'Historical African Comics - True Stories',
      metaDescription: 'Comics based on African history, kingdoms, and historical events',
    },
    {
      name: 'Urban Fantasy',
      description: 'Magic and supernatural elements in modern African settings',
      icon: 'Wand2',
      color: '#9900ff',
      featured: true,
      order: 4,
    },
    {
      name: 'Adventure',
      description: 'Action-packed exploration and epic journeys across Africa',
      icon: 'Compass',
      color: '#ff3300',
      featured: false,
      order: 5,
    },
    {
      name: 'Romance',
      description: 'Love stories set in contemporary African contexts',
      icon: 'Heart',
      color: '#ff3366',
      featured: false,
      order: 6,
    },
    {
      name: 'Science Fiction',
      description: 'Futuristic stories exploring technology and space',
      icon: 'Rocket',
      color: '#3366ff',
      featured: false,
      order: 7,
    },
    {
      name: 'Superhero',
      description: 'African superheroes with unique powers and origins',
      icon: 'Shield',
      color: '#ff0000',
      featured: true,
      order: 8,
    },
  ];

  for (const genreData of genres) {
    const exists = await Genre.findOne({ name: genreData.name });
    if (!exists) {
      await Genre.create(genreData);
      console.log(`Created genre: ${genreData.name}`);
    }
  }

  console.log('Genres seeded successfully');
};

const seedTags = async () => {
  const tags = [
    // Theme tags
    { name: 'African', type: 'theme', featured: true },
    { name: 'Futuristic', type: 'theme' },
    { name: 'Folklore', type: 'theme' },
    { name: 'Dystopian', type: 'theme' },
    { name: 'Coming of Age', type: 'theme' },
    { name: 'Social Justice', type: 'theme' },
    
    // Style tags
    { name: 'Minimalist', type: 'style' },
    { name: 'Detailed', type: 'style' },
    { name: 'Colorful', type: 'style' },
    { name: 'Monochrome', type: 'style' },
    { name: 'Traditional Art', type: 'style' },
    { name: 'Digital Art', type: 'style' },
    
    // Setting tags
    { name: 'Urban', type: 'setting' },
    { name: 'Rural', type: 'setting' },
    { name: 'Fantasy World', type: 'setting' },
    { name: 'Space', type: 'setting' },
    { name: 'Historical Period', type: 'setting' },
    
    // Character tags
    { name: 'Strong Female Lead', type: 'character', featured: true },
    { name: 'Anti-hero', type: 'character' },
    { name: 'Mythical Creatures', type: 'character' },
    { name: 'AI Characters', type: 'character' },
    
    // Audience tags
    { name: 'Young Adult', type: 'audience', featured: true },
    { name: 'Adult', type: 'audience' },
    { name: 'All Ages', type: 'audience' },
    
    // Format tags
    { name: 'Webcomic', type: 'format' },
    { name: 'Graphic Novel', type: 'format' },
    { name: 'Short Story', type: 'format' },
    { name: 'Series', type: 'format' },
  ];

  for (const tagData of tags) {
    const exists = await Tag.findOne({ name: tagData.name });
    if (!exists) {
      await Tag.create(tagData);
      console.log(`Created tag: ${tagData.name}`);
    }
  }

  console.log('Tags seeded successfully');
};

// Add to main seed function
async function main() {
  await seedGenres();
  await seedTags();
  // ... rest of seeding
}