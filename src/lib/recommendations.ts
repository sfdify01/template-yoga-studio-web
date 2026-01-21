/**
 * AI-powered menu item recommendations
 * Suggests best-selling items and items frequently bought together
 */

import { MenuItem } from '../hooks/useConfig';

export interface RecommendationRules {
  // Items frequently bought together (key = item ID, value = array of recommended item IDs)
  frequentlyBoughtTogether: Record<string, string[]>;
  // Best selling items by category
  bestSellers: Record<string, string[]>;
  // Cross-category pairings (e.g., burger → fries, entree → drink)
  crossCategoryPairs: Record<string, string[]>;
}

/**
 * Mock recommendation rules based on typical restaurant patterns
 * In production, this would come from analytics data
 */
export const mockRecommendationRules: RecommendationRules = {
  frequentlyBoughtTogether: {
    // Breakfast items
    'avocado-toast': ['cold-brew', 'orange-juice', 'breakfast-burrito'],
    'french-toast': ['coffee-latte', 'bacon-strips', 'fresh-fruit'],
    'breakfast-burrito': ['avocado-toast', 'hash-browns', 'orange-juice'],
    
    // Lunch items
    'truffle-burger': ['french-fries', 'craft-beer', 'onion-rings'],
    'caesar-salad': ['garlic-bread', 'iced-tea', 'soup-of-day'],
    'fish-tacos': ['chips-guac', 'margarita', 'mexican-rice'],
    
    // Pasta
    'carbonara': ['garlic-bread', 'house-wine', 'caesar-salad'],
    'margherita-pizza': ['buffalo-wings', 'soda', 'tiramisu'],
    
    // Desserts
    'chocolate-lava': ['espresso', 'vanilla-ice-cream', 'port-wine'],
    'tiramisu': ['espresso', 'cappuccino', 'limoncello'],
    
    // Beverages
    'craft-beer': ['truffle-burger', 'buffalo-wings', 'nachos'],
    'house-wine': ['carbonara', 'salmon-special', 'cheese-board'],
  },
  
  bestSellers: {
    breakfast: ['avocado-toast', 'french-toast', 'breakfast-burrito'],
    lunch: ['truffle-burger', 'caesar-salad', 'fish-tacos'],
    pasta: ['carbonara', 'margherita-pizza'],
    desserts: ['chocolate-lava', 'tiramisu', 'cheesecake'],
    drinks: ['craft-beer', 'house-wine', 'cold-brew', 'margarita'],
  },
  
  crossCategoryPairs: {
    // When ordering entree, suggest sides and drinks
    entree: ['french-fries', 'onion-rings', 'side-salad', 'craft-beer', 'iced-tea'],
    // When ordering salad, suggest protein add-ons and drinks
    salad: ['falafel', 'iced-tea', 'lemonade'],
    // When ordering main, suggest dessert
    main: ['chocolate-lava', 'tiramisu', 'ice-cream'],
    // When ordering breakfast, suggest beverage
    breakfast: ['coffee-latte', 'orange-juice', 'cold-brew'],
  },
};

export interface RecommendationItem extends MenuItem {
  reason: 'frequently-bought' | 'best-seller' | 'category-pairing';
  reasonText: string;
}

/**
 * Get recommended items for a given menu item
 */
export function getRecommendations(
  currentItem: MenuItem,
  allItems: MenuItem[],
  categoryId: string,
  rules: RecommendationRules = mockRecommendationRules,
  maxRecommendations: number = 4
): RecommendationItem[] {
  const recommendations: RecommendationItem[] = [];
  const usedIds = new Set<string>([currentItem.id]);

  // Priority 1: Frequently bought together
  const frequentPairs = rules.frequentlyBoughtTogether[currentItem.id] || [];
  for (const itemId of frequentPairs.slice(0, 2)) {
    const item = allItems.find(i => i.id === itemId);
    if (item && !usedIds.has(item.id)) {
      recommendations.push({
        ...item,
        reason: 'frequently-bought',
        reasonText: '🔥 Frequently bought together',
      });
      usedIds.add(item.id);
    }
  }

  // Priority 2: Best sellers from same category
  if (recommendations.length < maxRecommendations) {
    const categoryBestSellers = rules.bestSellers[categoryId] || [];
    for (const itemId of categoryBestSellers) {
      if (recommendations.length >= maxRecommendations) break;
      const item = allItems.find(i => i.id === itemId);
      if (item && !usedIds.has(item.id)) {
        recommendations.push({
          ...item,
          reason: 'best-seller',
          reasonText: '⭐ Best Seller',
        });
        usedIds.add(item.id);
      }
    }
  }

  // Priority 3: Cross-category pairings
  if (recommendations.length < maxRecommendations) {
    const crossPairs = rules.crossCategoryPairs[categoryId] || 
                       rules.crossCategoryPairs['entree'] || [];
    for (const itemId of crossPairs) {
      if (recommendations.length >= maxRecommendations) break;
      const item = allItems.find(i => i.id === itemId);
      if (item && !usedIds.has(item.id)) {
        recommendations.push({
          ...item,
          reason: 'category-pairing',
          reasonText: '💡 Perfect pairing',
        });
        usedIds.add(item.id);
      }
    }
  }

  // Priority 4: Popular items from any category
  if (recommendations.length < maxRecommendations) {
    const popularItems = allItems.filter(item => 
      item.popular && !usedIds.has(item.id)
    );
    for (const item of popularItems.slice(0, maxRecommendations - recommendations.length)) {
      recommendations.push({
        ...item,
        reason: 'best-seller',
        reasonText: '🌟 Popular choice',
      });
      usedIds.add(item.id);
    }
  }

  return recommendations.slice(0, maxRecommendations);
}

/**
 * Get smart cart recommendations based on current cart contents
 */
export function getCartRecommendations(
  cartItems: { sku: string }[],
  allItems: MenuItem[],
  rules: RecommendationRules = mockRecommendationRules,
  maxRecommendations: number = 3
): RecommendationItem[] {
  const recommendations: RecommendationItem[] = [];
  const cartItemIds = new Set(cartItems.map(item => item.sku));
  const usedIds = new Set(cartItemIds);

  // Check if cart has entrees but no drinks
  const hasEntree = cartItems.some(item => {
    const menuItem = allItems.find(i => i.id === item.sku);
    return menuItem && ['lunch', 'breakfast', 'pasta'].includes(menuItem.id);
  });

  const hasDrink = cartItems.some(item => {
    const menuItem = allItems.find(i => i.id === item.sku);
    return menuItem && menuItem.id === 'drinks';
  });

  const hasDessert = cartItems.some(item => {
    const menuItem = allItems.find(i => i.id === item.sku);
    return menuItem && menuItem.id === 'desserts';
  });

  // Suggest drinks if cart has food but no drinks
  if (hasEntree && !hasDrink) {
    const drinks = allItems.filter(item => 
      !usedIds.has(item.id) && 
      ['drinks', 'beverages'].some(cat => item.id.includes(cat) || item.name.toLowerCase().includes('drink'))
    );
    recommendations.push(...drinks.slice(0, 1).map(item => ({
      ...item,
      reason: 'category-pairing' as const,
      reasonText: '🥤 Complete your meal',
    })));
  }

  // Suggest desserts if cart has mains but no dessert
  if (hasEntree && !hasDessert && recommendations.length < maxRecommendations) {
    const desserts = allItems.filter(item => 
      !usedIds.has(item.id) && 
      item.id.includes('dessert')
    );
    recommendations.push(...desserts.slice(0, 1).map(item => ({
      ...item,
      reason: 'category-pairing' as const,
      reasonText: '🍰 Save room for dessert',
    })));
  }

  // Fill remaining with popular items
  if (recommendations.length < maxRecommendations) {
    const popularItems = allItems.filter(item => 
      item.popular && !usedIds.has(item.id)
    );
    recommendations.push(...popularItems.slice(0, maxRecommendations - recommendations.length).map(item => ({
      ...item,
      reason: 'best-seller' as const,
      reasonText: '⭐ Customer favorite',
    })));
  }

  return recommendations.slice(0, maxRecommendations);
}

/**
 * Calculate recommendation score (for future ML integration)
 */
export function calculateRecommendationScore(
  itemId: string,
  cartItemIds: string[],
  rules: RecommendationRules
): number {
  let score = 0;

  // Check frequency in bought-together rules
  for (const cartItemId of cartItemIds) {
    const pairs = rules.frequentlyBoughtTogether[cartItemId] || [];
    if (pairs.includes(itemId)) {
      score += 10;
    }
  }

  // Check if best seller
  for (const bestSellers of Object.values(rules.bestSellers)) {
    if (bestSellers.includes(itemId)) {
      score += 5;
      break;
    }
  }

  return score;
}
