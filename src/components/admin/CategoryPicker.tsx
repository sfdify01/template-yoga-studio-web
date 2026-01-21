import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus, Sparkles } from 'lucide-react';
import { cn } from '../ui/utils';
import { Button } from '../ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';

// Extract emoji from category string (first character if it's an emoji)
const extractEmoji = (category: string): string | null => {
  if (!category) return null;
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u;
  const match = category.match(emojiRegex);
  return match ? match[0] : null;
};

// Extract name from category string (everything after emoji)
const extractName = (category: string): string => {
  if (!category) return '';
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u;
  return category.replace(emojiRegex, '').trim();
};

// Normalize category name for comparison (lowercase, trimmed, collapsed spaces)
const normalizeForComparison = (name: string): string => {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
};

// Common category emojis for food/grocery
const CATEGORY_EMOJIS = [
  '🥩', '🍖', '🍗', '🥓', '🌭', '🍔', // Meats
  '🐟', '🦐', '🦞', '🦀', '🐙', '🦑', // Seafood
  '🥬', '🥦', '🥕', '🌽', '🥔', '🧅', // Vegetables
  '🍎', '🍊', '🍋', '🍇', '🍓', '🫐', // Fruits
  '🥛', '🧀', '🥚', '🧈', '🍦', '🧁', // Dairy/Desserts
  '🍞', '🥐', '🥖', '🥯', '🧇', '🥞', // Bakery
  '🍚', '🍝', '🥫', '🥣', '🍜', '🍲', // Grains/Prepared
  '🧂', '🫒', '🍯', '🥜', '🌰', '☕', // Pantry/Misc
  '🍽️', '📦', '🛒', '⭐', '🔥', '💎', // Special/General
];

interface CategoryPickerProps {
  value: string;
  onChange: (value: string) => void;
  existingCategories: string[];
  placeholder?: string;
  icon?: string;
  onIconChange?: (icon: string) => void;
  categoryIconMap?: Record<string, string>;
}

export function CategoryPicker({
  value,
  onChange,
  existingCategories,
  placeholder = 'Select or create category',
  icon,
  onIconChange,
  categoryIconMap = {},
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Use provided icon or extract from value, default to folder
  const displayIcon = icon || (value ? extractEmoji(value) : null) || '📁';

  const normalizedCategories = useMemo(
    () =>
      Array.from(new Set(existingCategories.filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      ),
    [existingCategories]
  );

  // Filter existing categories based on search
  const filteredCategories = useMemo(
    () =>
      normalizedCategories.filter((cat) =>
        cat.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [normalizedCategories, searchQuery]
  );

  const trimmedQuery = searchQuery.trim();
  // Check if category name already exists (compare names only, ignoring emojis)
  // Use robust normalization to prevent duplicate categories
  const canCreate =
    trimmedQuery.length > 0 &&
    !normalizedCategories.some((cat: string) => {
      const catName = extractName(cat) || cat;
      return normalizeForComparison(catName) === normalizeForComparison(trimmedQuery);
    });

  // Handle selecting an existing category - always use just the name (no emoji)
  const handleSelectCategory = (category: string) => {
    const nameOnly = extractName(category) || category;
    onChange(nameOnly);
    setOpen(false);
  };

  // Handle creating a new category directly from the combobox
  const handleCreateCategory = () => {
    if (!canCreate) return;
    onChange(trimmedQuery);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const selectedName = value ? extractName(value) : '';

  const handleEmojiSelect = (emoji: string) => {
    onIconChange?.(emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex gap-2">
      {/* Emoji Picker Button */}
      <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            type="button"
            className="h-10 w-12 rounded-xl p-0 text-xl hover:bg-gray-50 transition-colors shrink-0"
            title="Click to change category icon"
          >
            {displayIcon}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[280px] p-3 rounded-2xl shadow-xl border-gray-200"
          align="start"
          sideOffset={4}
          style={{ zIndex: 9999 }}
        >
          <p className="text-xs font-medium text-gray-500 mb-2">Select category icon</p>
          <div className="grid grid-cols-6 gap-1">
            {CATEGORY_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiSelect(emoji)}
                className={cn(
                  'w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-gray-100 transition-colors',
                  displayIcon === emoji && 'bg-amber-100 ring-2 ring-amber-500'
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Category Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'flex-1 justify-between rounded-xl h-10 font-normal',
              'hover:bg-gray-50 transition-colors',
              !value && 'text-gray-500'
            )}
          >
            <span className="truncate">
              {value ? selectedName || value : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
      <PopoverContent
        className="p-0 rounded-2xl shadow-xl border-gray-200"
        align="start"
        sideOffset={4}
        style={{ zIndex: 9999, width: 'var(--radix-popover-trigger-width)' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} className="rounded-2xl">
          <CommandInput
            placeholder="Search or create category..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canCreate) {
                e.preventDefault();
                handleCreateCategory();
              }
            }}
            className="h-11"
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="py-6 text-center text-sm space-y-2">
              <p className="text-gray-500">No category found</p>
              {canCreate && (
                <Button
                  size="sm"
                  onClick={handleCreateCategory}
                  className="gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <Plus className="w-4 h-4" />
                  Create "{trimmedQuery}"
                </Button>
              )}
            </CommandEmpty>

            {/* Hint to create new category - shown when dropdown opens with no search */}
            {!searchQuery && filteredCategories.length > 0 && (
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Type to create a new category</span>
                </div>
              </div>
            )}

            {canCreate && (
              <CommandGroup>
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Create New</span>
                </div>
                <CommandItem
                  value={`create-${trimmedQuery}`}
                  onSelect={handleCreateCategory}
                  className="cursor-pointer py-2.5 px-3 rounded-xl mx-1 my-0.5 bg-amber-50/50 hover:bg-amber-100/70"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-lg shadow-sm">
                      <Plus className="w-4 h-4" />
                    </span>
                    <span className="font-medium text-amber-900">
                      Create "{trimmedQuery}"
                    </span>
                  </div>
                </CommandItem>
              </CommandGroup>
            )}

            {filteredCategories.length > 0 && (
              <CommandGroup>
                <div className="px-3 pt-3 pb-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {searchQuery ? 'Matching Categories' : 'Existing Categories'}
                  </span>
                </div>
                {filteredCategories.map((category: string) => {
                  const name = extractName(category) || category;
                  // Use icon from map, then try extracting from string, fallback to folder
                  const categoryIcon = categoryIconMap[name] || categoryIconMap[category] || extractEmoji(category) || '📁';
                  const isSelected = normalizeForComparison(value) === normalizeForComparison(name) ||
                                     normalizeForComparison(value) === normalizeForComparison(category);
                  return (
                    <CommandItem
                      key={category}
                      value={category}
                      onSelect={() => handleSelectCategory(category)}
                      className="cursor-pointer py-2.5 px-3 rounded-xl mx-1 my-0.5"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-xl w-7 h-7 flex items-center justify-center bg-gray-100 rounded-lg">
                          {categoryIcon}
                        </span>
                        <span className="font-medium">{name}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
      </Popover>
    </div>
  );
}
