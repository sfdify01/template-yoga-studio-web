import type { SupabaseClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.ts";
import { slugify } from "./utils.ts";

export type DietaryFilter = { id: string; label: string; icon: string };
export type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  imageUrl?: string;
  dietary: string[];
  popular?: boolean;
  unit?: string;
  unitLabel?: string;
  originalPrice?: number;
  discountedPrice?: number;
};

export type MenuCategory = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  items: MenuItem[];
};

export type MenuResponse = {
  categories: MenuCategory[];
  dietaryFilters: DietaryFilter[];
};

const DIETARY_ICON_MAP: Record<string, string> = {
  halal: "🥩",
  vegetarian: "🥗",
  vegan: "🌱",
  "gluten-free": "🌾",
  pescatarian: "🐟",
  "dairy-free": "🥛",
};

export const DEFAULT_DIETARY_FILTERS: DietaryFilter[] = [
  { id: "halal", label: "Halal", icon: "🥩" },
  { id: "vegetarian", label: "Vegetarian", icon: "🥗" },
  { id: "vegan", label: "Vegan", icon: "🌱" },
];

export const EMPTY_MENU: MenuResponse = {
  categories: [],
  dietaryFilters: DEFAULT_DIETARY_FILTERS,
};

function formatDietaryLabel(tag: string) {
  return tag
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function calcDietaryFilters(categories: MenuCategory[]): DietaryFilter[] {
  const tags = new Set<string>();
  categories.forEach((category) => {
    category.items?.forEach((item) => {
      (item.dietary ?? []).forEach((tag) => {
        if (tag) tags.add(tag.toLowerCase());
      });
    });
  });
  if (!tags.size) return [];
  return Array.from(tags).map((tag) => ({
    id: tag,
    label: formatDietaryLabel(tag),
    icon: DIETARY_ICON_MAP[tag] ?? "🥗",
  }));
}

export function sanitizeMenuPayload(payload: any): MenuResponse {
  if (!payload || !Array.isArray(payload.categories)) {
    throw new Error("Menu payload must include categories array");
  }

  const categories: MenuCategory[] = payload.categories.map((category: any, index: number) => {
    const name = category?.name?.toString()?.trim() || `Category ${index + 1}`;
    const id = category?.id?.toString()?.trim() || slugify(name) || `category-${index}`;
    const description = category?.description?.toString() ?? "";
    const icon = category?.icon?.toString() ?? "🍽️";
    const itemsArray = Array.isArray(category?.items) ? category.items : [];
    const items: MenuItem[] = itemsArray
      .map((item: any, idx: number) => {
        const itemName = item?.name?.toString()?.trim();
        const idValue = item?.id?.toString()?.trim() || `${id}-item-${idx}`;
        const priceNumber = Number(item?.price ?? 0);
        if (!itemName || !Number.isFinite(priceNumber) || priceNumber <= 0) return null;
        return {
          id: idValue,
          name: itemName,
          description: item?.description?.toString() ?? "",
          price: Number(priceNumber),
          image: item?.image?.toString(),
          imageUrl: item?.imageUrl?.toString(),
          dietary: Array.isArray(item?.dietary)
            ? item.dietary
              .filter((tag: any) => typeof tag === "string" && tag.trim())
              .map((tag: string) => tag.trim().toLowerCase())
            : [],
          popular: Boolean(item?.popular),
          unit: item?.unit?.toString() ?? item?.unitLabel?.toString(),
          unitLabel: item?.unitLabel?.toString() ?? item?.unit?.toString(),
          originalPrice: item?.originalPrice != null ? Number(item.originalPrice) : undefined,
          discountedPrice: item?.discountedPrice != null ? Number(item.discountedPrice) : undefined,
        };
      })
      .filter((v: MenuItem | null): v is MenuItem => Boolean(v));

    return { id, name, description, icon, items };
  });

  const providedFilters = Array.isArray(payload.dietaryFilters)
    ? payload.dietaryFilters
        .map((filter: any) => ({
          id: filter?.id?.toString()?.toLowerCase()?.trim() ?? "",
          label: filter?.label?.toString() ?? formatDietaryLabel(filter?.id ?? ""),
          icon: filter?.icon?.toString() ?? DIETARY_ICON_MAP[filter?.id?.toString()?.toLowerCase()] ?? "🥗",
        }))
        .filter((filter: DietaryFilter) => filter.id)
    : [];
  const dietaryFilters = providedFilters.length
    ? providedFilters
    : calcDietaryFilters(categories);

  return {
    categories,
    dietaryFilters: dietaryFilters.length ? dietaryFilters : DEFAULT_DIETARY_FILTERS,
  };
}

export async function getCachedMenu(): Promise<MenuResponse> {
  const cached = await kv.get("menu_data");
  if (cached?.categories) {
    return {
      categories: cached.categories,
      dietaryFilters: cached.dietaryFilters?.length ? cached.dietaryFilters : DEFAULT_DIETARY_FILTERS,
    };
  }
  return EMPTY_MENU;
}

export async function saveMenuData(menu: MenuResponse) {
  await kv.set("menu_data", menu);
}

export async function syncMenuToTable(
  supabase: SupabaseClient,
  menu: MenuResponse,
  tenantId: string,
) {
  const items: Array<{ category: MenuCategory; item: MenuItem }> = [];
  menu.categories.forEach((category) => {
    category.items.forEach((item) => {
      items.push({ category, item });
    });
  });

  if (!items.length) return;

  const upsertPayload = items.map(({ category, item }) => ({
    tenant_id: tenantId,
    external_id: item.id,
    name: item.name,
    category: category.name,
    description: item.description ?? "",
    image_url: item.imageUrl ?? null,
    price_cents: Math.round(item.price * 100),
    price_unit: item.unit ?? item.unitLabel ?? "each",
    dietary_tags: item.dietary ?? [],
    is_active: true,
    metadata: {
      categoryId: category.id,
      categoryName: category.name,
      categoryDescription: category.description,
      categoryIcon: category.icon,
      imageQuery: item.image,
      popular: item.popular ?? false,
      unit: item.unit ?? item.unitLabel,
      unitLabel: item.unitLabel ?? item.unit,
      originalPrice: item.originalPrice,
      discountedPrice: item.discountedPrice,
      imageUrl: item.imageUrl,
    },
  }));

  const { error } = await supabase
    .from("menu_items")
    .upsert(upsertPayload, { onConflict: "tenant_id,external_id" });
  if (error) throw new Error(`Failed to sync menu: ${error.message}`);

  const { data: existing, error: existingError } = await supabase
    .from("menu_items")
    .select("id, external_id")
    .eq("tenant_id", tenantId);

  if (existingError) throw new Error(existingError.message);

  const incomingIds = new Set(upsertPayload.map((row) => row.external_id));
  const staleIds = (existing ?? [])
    .filter((row) => !incomingIds.has(row.external_id))
    .map((row) => row.id);

  if (staleIds.length) {
    await supabase.from("menu_items").delete().in("id", staleIds);
  }
}

export async function loadMenu(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<MenuResponse> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (!error && data?.length) {
    const categories = new Map<string, MenuCategory>();

    data.forEach((row: any) => {
      // Use the actual category column as the primary key to prevent duplicates
      // Products with the same category name should always be grouped together
      const categoryName = row.category ?? "Menu";
      const categoryKey = categoryName.toLowerCase().trim();

      if (!categories.has(categoryKey)) {
        // Always use slugified category name as ID to ensure consistency
        // This prevents duplicate categories when products have different metadata.categoryId values
        categories.set(categoryKey, {
          id: slugify(categoryName),
          name: row.metadata?.categoryName ?? categoryName,
          description: row.metadata?.categoryDescription ?? "",
          icon: row.metadata?.categoryIcon ?? "🍽️",
          items: [],
        });
      }
      const category = categories.get(categoryKey)!;
      category.items.push({
        id: row.external_id ?? row.id,
        name: row.name,
        description: row.description ?? "",
        price: (row.price_cents ?? 0) / 100,
        image: row.metadata?.imageQuery ?? row.name,
        imageUrl: row.image_url ?? row.metadata?.imageUrl ?? undefined,
        dietary: row.dietary_tags ?? [],
        popular: row.metadata?.popular ?? false,
        unit: row.metadata?.unit ?? row.price_unit ?? "each",
        unitLabel: row.metadata?.unitLabel ?? row.price_unit ?? "each",
        originalPrice: row.metadata?.originalPrice ? Number(row.metadata.originalPrice) : undefined,
        discountedPrice: row.metadata?.discountedPrice ? Number(row.metadata.discountedPrice) : undefined,
      });
    });

    const list = Array.from(categories.values());
    const filters = calcDietaryFilters(list);
    const menu = {
      categories: list,
      dietaryFilters: filters.length ? filters : DEFAULT_DIETARY_FILTERS,
    };

    await saveMenuData(menu);
    return menu;
  }

  return getCachedMenu();
}
