/**
 * Local storage for persisting menu item selections
 * Enables quick reorders of favorite customizations
 */

import { SelectionState } from './types';

const STORAGE_KEY_PREFIX = 'menu_item_selection_';

export function saveSelection(itemId: string, selection: SelectionState): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${itemId}`;
    localStorage.setItem(key, JSON.stringify(selection));
  } catch (error) {
    console.warn('Failed to save menu item selection:', error);
  }
}

export function loadSelection(itemId: string): SelectionState | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${itemId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Validate the structure
    if (
      typeof parsed === 'object' &&
      parsed.variants &&
      parsed.addons &&
      typeof parsed.quantity === 'number' &&
      typeof parsed.notes === 'string'
    ) {
      return parsed as SelectionState;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to load menu item selection:', error);
    return null;
  }
}

export function clearSelection(itemId: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${itemId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear menu item selection:', error);
  }
}
