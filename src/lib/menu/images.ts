/**
 * Menu Image Auto-Fetch Utility
 * 
 * Generates royalty-free sample images for menu items using Unsplash Source API.
 * Caches URLs to avoid re-fetching on each load.
 */

import type { MenuItem } from './types';

/**
 * Generate a clean search query from menu item name
 */
function generateImageQuery(itemName: string): string {
  return itemName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .trim();
}

/**
 * Generate Unsplash Source API URL for a menu item
 * Uses 800x600 dimensions for optimal quality and performance
 */
export function generateImageUrl(item: MenuItem): string {
  // If imageUrl already exists, return it
  if (item.imageUrl) {
    return item.imageUrl;
  }

  // Use item.image field if available (pre-defined search term)
  const query = item.image 
    ? encodeURIComponent(item.image)
    : encodeURIComponent(generateImageQuery(item.name));

  // Unsplash Source API - random image matching query
  return `https://source.unsplash.com/800x600/?${query}`;
}

/**
 * Attach sample images to menu items missing imageUrl
 */
export async function attachSampleImages(menuItems: MenuItem[]): Promise<MenuItem[]> {
  return menuItems.map(item => {
    if (item.imageUrl) {
      return item; // Already has an image
    }

    return {
      ...item,
      imageUrl: generateImageUrl(item),
    };
  });
}

/**
 * Generate static URLs for all menu items (for pre-caching in menu.json)
 * Returns a map of item ID to image URL
 */
export function generateImageUrlMap(menuItems: MenuItem[]): Record<string, string> {
  const urlMap: Record<string, string> = {};
  
  menuItems.forEach(item => {
    urlMap[item.id] = generateImageUrl(item);
  });

  return urlMap;
}

/**
 * Popular food image search terms mapped to specific queries
 * for better image quality and relevance
 */
export const FOOD_IMAGE_QUERIES: Record<string, string> = {
  // Breakfast
  'avocado-toast': 'avocado+toast+breakfast',
  'french-toast': 'french+toast+brioche',
  'breakfast-burrito': 'breakfast+burrito+eggs',
  'pancakes': 'pancakes+syrup',
  'eggs-benedict': 'eggs+benedict',
  'omelette': 'omelette+breakfast',
  
  // Lunch & Dinner
  'truffle-burger': 'gourmet+burger',
  'caesar-salad': 'caesar+salad',
  'salmon-bowl': 'salmon+bowl+quinoa',
  'margherita-pizza': 'margherita+pizza',
  'pasta': 'pasta+italian',
  'steak': 'grilled+steak',
  'tacos': 'tacos+mexican',
  'ramen': 'ramen+bowl',
  
  // Drinks
  'cold-brew': 'cold+brew+coffee',
  'matcha-latte': 'matcha+latte+green',
  'fresh-juice': 'fresh+orange+juice',
  'smoothie': 'smoothie+bowl',
  'espresso': 'espresso+coffee',
  
  // Desserts
  'tiramisu': 'tiramisu+dessert',
  'cheesecake': 'cheesecake+dessert',
  'chocolate-cake': 'chocolate+cake',
  'ice-cream': 'ice+cream+scoop',
  'brownie': 'chocolate+brownie',
};

/**
 * Get optimized image query for a menu item
 */
export function getOptimizedImageQuery(item: MenuItem): string {
  const itemId = item.id;
  
  // Check if we have a predefined optimized query
  if (FOOD_IMAGE_QUERIES[itemId]) {
    return FOOD_IMAGE_QUERIES[itemId];
  }
  
  // Use item.image if available
  if (item.image) {
    return item.image.replace(/\s+/g, '+');
  }
  
  // Fallback to generated query from item name
  return generateImageQuery(item.name).replace(/-/g, '+');
}
