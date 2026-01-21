import { atom } from 'jotai';
import type { MenuCategory, MenuItem } from '../../hooks/useConfig';
import { normalizeUnit } from '../../lib/units';

const normalizeCategories = (categories: MenuCategory[] = []): MenuCategory[] =>
  categories.map((category) => ({
    ...category,
    items: (category.items || []).map((item) => ({
      ...item,
      unit: normalizeUnit(item.unit),
    })),
  }));

export const menuCategoriesAtom = atom<MenuCategory[]>([]);

export const setMenuCategoriesAtom = atom(
  null,
  (_get, set, categories: MenuCategory[] = []) => {
    set(menuCategoriesAtom, normalizeCategories(categories));
  }
);

export const menuSearchQueryAtom = atom<string>('');
export const setMenuSearchQueryAtom = atom(
  null,
  (_get, set, query: string) => set(menuSearchQueryAtom, query)
);

export const menuDietaryFiltersAtom = atom<string[]>([]);
export const toggleMenuFilterAtom = atom(null, (get, set, filterId: string) => {
  const current = get(menuDietaryFiltersAtom);
  const next = current.includes(filterId)
    ? current.filter((id) => id !== filterId)
    : [...current, filterId];
  set(menuDietaryFiltersAtom, next);
});

export const resetMenuFiltersAtom = atom(null, (_get, set) => {
  set(menuSearchQueryAtom, '');
  set(menuDietaryFiltersAtom, []);
});

export const filteredMenuItemsByCategoryAtom = atom<Record<string, MenuItem[]>>(
  (get) => {
    const categories = get(menuCategoriesAtom);
    const search = get(menuSearchQueryAtom).trim().toLowerCase();
    const selectedFilters = get(menuDietaryFiltersAtom);

    return categories.reduce<Record<string, MenuItem[]>>((acc, category) => {
      const filteredItems = (category.items || []).filter((item) => {
        const name = item.name?.toLowerCase() || '';
        const description = item.description?.toLowerCase() || '';
        const matchesSearch =
          !search || name.includes(search) || description.includes(search);
        const matchesFilters =
          selectedFilters.length === 0 ||
          selectedFilters.every((filter) => (item.dietary || []).includes(filter));
        return matchesSearch && matchesFilters;
      });

      acc[category.id] = filteredItems;
      return acc;
    }, {});
  }
);
