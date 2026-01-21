/**
 * Auto Image Generator for Menu Items
 * 
 * This utility automatically generates and caches image URLs for menu items.
 * Can be run on menu load or as a build-time script to populate menu.json files.
 */

import type { MenuItem } from './types';

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  items: MenuItem[];
}

export interface MenuData {
  categories: MenuCategory[];
  dietaryFilters?: Array<{
    id: string;
    label: string;
    icon: string;
  }>;
}

/**
 * Image source providers
 */
export enum ImageProvider {
  UNSPLASH = 'unsplash',
  PEXELS = 'pexels',
  FOODISH = 'foodish',
  LOREMFLICKR = 'loremflickr',
}

/**
 * Generate image URL based on provider
 * NOTE: Unsplash Source API is deprecated. Use LOREMFLICKR for free placeholder images
 * or upload your own images to Supabase Storage.
 */
export function generateImageUrlByProvider(
  query: string,
  provider: ImageProvider = ImageProvider.LOREMFLICKR,
  width: number = 800,
  height: number = 600
): string {
  // Clean query for better results
  const cleanQuery = query.replace(/\s+/g, ',');

  switch (provider) {
    case ImageProvider.UNSPLASH:
      // DEPRECATED: Unsplash Source API no longer works
      // Fallback to LoremFlickr
      console.warn('Unsplash Source is deprecated. Using LoremFlickr instead.');
      return `https://loremflickr.com/${width}/${height}/${cleanQuery}`;

    case ImageProvider.LOREMFLICKR:
      // LoremFlickr still works and supports search queries
      return `https://loremflickr.com/${width}/${height}/${cleanQuery}`;

    case ImageProvider.PEXELS:
      // Pexels doesn't have a simple source API, would need API key
      // Fallback to LoremFlickr
      return `https://loremflickr.com/${width}/${height}/${cleanQuery}`;

    case ImageProvider.FOODISH:
      // Foodish API returns random food images (no query support)
      // Fallback to LoremFlickr with food query
      return `https://loremflickr.com/${width}/${height}/food,${cleanQuery}`;

    default:
      return `https://loremflickr.com/${width}/${height}/${cleanQuery}`;
  }
}

/**
 * Process menu data and attach image URLs to items missing them
 */
export function attachImagesToMenuData(
  menuData: MenuData,
  provider: ImageProvider = ImageProvider.UNSPLASH
): MenuData {
  const processedCategories = menuData.categories.map(category => ({
    ...category,
    items: category.items.map(item => {
      // Skip if item already has imageUrl
      if (item.imageUrl) {
        return item;
      }

      // Generate query from item.image or item.name
      const query = item.image 
        ? item.image.replace(/\s+/g, '+')
        : item.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '+');

      return {
        ...item,
        imageUrl: generateImageUrlByProvider(query, provider),
      };
    }),
  }));

  return {
    ...menuData,
    categories: processedCategories,
  };
}

/**
 * Extract all items from menu data
 */
export function getAllMenuItems(menuData: MenuData): MenuItem[] {
  return menuData.categories.flatMap(category => category.items);
}

/**
 * Count items missing images
 */
export function countItemsMissingImages(menuData: MenuData): number {
  const allItems = getAllMenuItems(menuData);
  return allItems.filter(item => !item.imageUrl).length;
}

/**
 * Generate a report of items missing images
 */
export function generateMissingImagesReport(menuData: MenuData): {
  total: number;
  missing: number;
  items: Array<{ id: string; name: string; category: string }>;
} {
  const missingItems: Array<{ id: string; name: string; category: string }> = [];
  
  menuData.categories.forEach(category => {
    category.items.forEach(item => {
      if (!item.imageUrl) {
        missingItems.push({
          id: item.id,
          name: item.name,
          category: category.name,
        });
      }
    });
  });

  const allItems = getAllMenuItems(menuData);

  return {
    total: allItems.length,
    missing: missingItems.length,
    items: missingItems,
  };
}

/**
 * Example usage for build-time generation:
 * 
 * import menuData from '../supabase/seed/menu.json';
 * const updatedMenu = attachImagesToMenuData(menuData);
 * // Write updatedMenu back to menu.json
 */
