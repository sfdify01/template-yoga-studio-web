import { useState, useEffect } from 'react';
import { BlogPost } from '../components/blog/BlogPostCard';
import { publicAnonKey } from '../utils/supabase/info';
import { edgeFunctionBaseUrl } from '../lib/supabase-edge';
import type { PriceUnit } from '../atoms/cart';

export interface Config {
  name: string;
  tagline: string;
  logo: string;
  theme: {
    brand: string;
    accent: string;
    bg: string;
    text: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  address: {
    line1: string;
    city: string;
    state: string;
    zip: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  integrations: {
    pos: string;
    ordering: {
      enabled: boolean;
      mode: string;
    };
    pickup: {
      enabled: boolean;
    };
    delivery: {
      enabled: boolean;
      provider: string;
      max_distance_miles: number;
    };
    reservations: {
      type: string;
      url: string;
    };
  };
  social: {
    instagram: string;
    facebook: string;
  };
  instagramFeed?: {
    enabled: boolean;
    handle: string;
    userId?: string;
    useMockData?: boolean;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
  announcement?: string;
  newsletter: boolean;
  loyalty?: {
    enabled: boolean;
    earnPerDollar: number;
    rewardThreshold: number;
    loyaltyHref: string;
  };
  features: {
    catering: boolean;
    events: boolean;
    giftCards: boolean;
    careers: boolean;
  };
  stripe?: {
    publishableKey: string;
    connectAccountId?: string;
    applicationFeePercent?: number;
  };
}

export interface Hours {
  timezone: string;
  schedule: {
    [key: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;    // Original price before discount
  discountedPrice?: number;  // Discounted sale price
  image: string;
  imageUrl?: string;
  dietary: string[];
  popular?: boolean;
  addOns?: string[];
  unit?: PriceUnit;
  unitLabel?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  items: MenuItem[];
}

export interface MenuData {
  categories: MenuCategory[];
  dietaryFilters: {
    id: string;
    label: string;
    icon: string;
  }[];
}

export interface BlogData {
  posts: BlogPost[];
  categories: Array<{ id: string; name: string; icon: string }>;
}

// Embedded configuration data
const configData: Config = {
  name: "Tabsy Yoga",
  tagline: "Find your balance and inner peace.",
  logo: "/data/sample/logo.svg",
  theme: {
    brand: "#0F766E",
    accent: "#CCFBF1",
    bg: "#F0FDFA",
    text: "#1B1B1B"
  },
  contact: {
    phone: "+1 (772) 773-7680",
    email: "shahirzadafreshmarket@gmail.com"
  },
  address: {
    line1: "3124 Illinois Rte 59 Suite 154",
    city: "Naperville",
    state: "IL",
    zip: "60564",
    coordinates: {
      lat: 41.7508,
      lng: -88.1535
    }
  },
  integrations: {
    pos: "toast",
    ordering: {
      enabled: true,
      mode: "stripe"
    },
    pickup: {
      enabled: true
    },
    delivery: {
      enabled: true,
      provider: "doordash",
      max_distance_miles: 8
    },
    reservations: {
      type: "opentable",
      url: "https://www.opentable.com/sample-bistro"
    }
  },
  social: {
    instagram: "shahirizadafreshmarket",
    facebook: ""
  },
  seo: {
    title: "Tabsy Yoga | Premium Halal Meats & Groceries | Online Ordering",
    description: "Shop Tabsy Yoga for premium halal meats and groceries. Find your balance and inner peace. Order online for pickup or delivery today.",
    keywords: "halal meat, halal grocery, online ordering, food delivery, pickup, fresh market, halal butcher, naperville, shahirizada"
  },
  announcement: "🧘‍♀️ New Beginner Series starts this Monday!",
  newsletter: true,
  loyalty: {
    enabled: true,
    earnPerDollar: 10,
    rewardThreshold: 500,
    loyaltyHref: "/loyalty"
  },
  features: {
    catering: true,
    events: true,
    giftCards: true,
    careers: true
  },
  stripe: {
    publishableKey: '', // Loaded from backend API
    connectAccountId: '',
    applicationFeePercent: 1,
  }
};

const hoursData: Hours = {
  timezone: "America/Chicago",
  schedule: {
    monday: { open: "11:00", close: "21:00", closed: false },
    tuesday: { open: "11:00", close: "21:00", closed: false },
    wednesday: { open: "11:00", close: "21:00", closed: false },
    thursday: { open: "11:00", close: "22:00", closed: false },
    friday: { open: "11:00", close: "23:00", closed: false },
    saturday: { open: "10:00", close: "23:00", closed: false },
    sunday: { open: "10:00", close: "20:00", closed: false }
  }
};

const EMPTY_MENU: MenuData = {
  categories: [],
  dietaryFilters: [],
};

const blogData: BlogData = {
  posts: [
    {
      id: "uzbek-plov-recipe",
      slug: "uzbek-plov-recipe",
      title: "Uzbek Plov: A Hearty Classic Made with Shahirzada Beef",
      subtitle: "Traditional Central Asian rice dish perfected with halal beef",
      category: "Recipe",
      author: "Chef Otabek",
      date: "2025-01-15",
      image: "https://images.unsplash.com/photo-1649777476920-0eef34169cdb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1emJlayUyMHBsb3YlMjByaWNlJTIwYmVlZnxlbnwxfHx8fDE3NjEzNjQxMTB8MA&ixlib=rb-4.1.0&q=80&w=1080",
      excerpt: "Discover how authentic Uzbek Plov comes alive with tender halal beef from Shahirzada Fresh Market. Our never-frozen cuts bring unmatched flavor to this timeless Central Asian dish.",
      featured: false,
      content: [
        "Plov is more than a rice dish—it's a symbol of hospitality. Start by browning Shahirzada halal beef cubes until golden.",
        "Add onions, carrots, and the signature blend of cumin and barberries before layering fragrant basmati rice.",
        "Steam slowly in a kazan for the perfect pull-apart texture and serve warm for a family feast."
      ]
    },
    {
      id: "best-shashlik-recipe",
      slug: "best-shashlik-recipe",
      title: "How to Cook the Best Shashlik with Halal Lamb",
      subtitle: "Juicy, smoky kebabs grilled to perfection",
      category: "Recipe",
      author: "Chef Zamira",
      date: "2025-01-18",
      image: "https://images.unsplash.com/photo-1660262849063-63c52a1fa2e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYW1iJTIwc2hhc2hsaWslMjBrZWJhYiUyMGdyaWxsfGVufDF8fHx8MTc2MTM2NDExMXww&ixlib=rb-4.1.0&q=80&w=1080",
      excerpt: "Juicy, smoky, and perfectly tender — learn the secrets to real Shashlik using Shahirzada's halal lamb, cut fresh daily in Naperville.",
      featured: false,
      content: [
        "Marinate lamb chunks in onion puree, black pepper, salt, and vinegar for at least four hours.",
        "Grill over open coals until edges are lightly charred and meat is tender inside.",
        "Serve with flatbread, tomato sauce, and sliced onions — the Uzbek way."
      ]
    },
    {
      id: "kazan-kebab",
      slug: "kazan-kebab",
      title: "Secrets to Make Delicious Kazan Kebab",
      subtitle: "Rich and flavorful slow-cooked beef perfection",
      category: "Recipe",
      author: "Chef Adil",
      date: "2025-01-22",
      image: "figma:asset/c14dec2d5a19e922af70064320b84895029133d4.png",
      excerpt: "If there's one dish that captures the heart of Central Asian comfort food, it's Kazan Kebab — a slow-cooked masterpiece of tender beef, caramelized vegetables, and deep, aromatic spices simmered together in a cast-iron cauldron known as the kazan.",
      featured: false,
      readTime: 8,
      tags: ["Kazan Kebab", "Central Asian Cuisine", "Beef Recipes", "Slow Cooking", "Food Culture"],
      content: `This dish is not just a meal — it's an experience built around patience, fire, and flavor.

## 🔥 What is Kazan Kebab?

Originating from the nomadic traditions of Central Asia, Kazan Kebab (also called Qozon Kabob) is a one-pot dish that brings together chunks of marinated beef or lamb, potatoes, onions, and sometimes carrots — all slow-cooked over an open flame.

Unlike grilled kebabs, the meat in Kazan Kebab is braised in its own juices and oil, resulting in melt-in-your-mouth tenderness and deep, smoky richness.

## 🥩 The Secret Ingredients

### 1. The Right Cut of Meat
Use beef brisket, short ribs, or lamb shoulder — cuts with a balance of fat and connective tissue. These pieces turn silky and tender during slow cooking.

### 2. Onion and Garlic Base
Onions caramelize in oil before the meat goes in. This forms a sweet foundation for the dish. Garlic cloves are often left whole to roast gently in the steam.

### 3. Spices That Matter
Traditionally, Kazan Kebab includes black pepper, cumin, coriander, paprika, and bay leaves. Some regional variations add chili flakes or ground sumac for tang.

### 4. Potatoes — the Flavor Absorbers
The sliced potatoes soak up all that rendered fat and spice-infused broth, becoming golden, crispy, and buttery-soft inside.

## 🍳 How to Make Kazan Kebab at Home

### Ingredients

- 2 lbs (1 kg) beef or lamb, cut into large chunks
- 4–5 medium potatoes, thickly sliced
- 2 large onions, sliced into rings
- 5–6 whole garlic cloves
- 1 tsp ground cumin
- 1 tsp paprika
- 1 tsp black pepper
- 1 bay leaf
- Salt to taste
- 1/3 cup vegetable or sunflower oil

### Method

1. Heat your kazan or heavy cast-iron pot over medium flame and pour in the oil.
2. Add onions and fry until golden brown and slightly crisp. Remove and set aside.
3. Place meat chunks into the hot oil. Sear all sides until browned and a crust forms.
4. Add garlic, cumin, paprika, salt, pepper, and bay leaf. Stir well.
5. Return onions to the pot and layer sliced potatoes on top.
6. Reduce heat to low, cover tightly, and let it cook slowly for 1.5 to 2 hours. Don't stir — the layers will cook evenly in the trapped steam and oil.
7. When ready, gently toss everything to coat potatoes in the flavorful oil.
8. Serve hot, garnished with parsley or fresh cilantro.

## 💡 Pro Tips for Authentic Flavor

- **Use animal fat** (tallow or lamb fat) instead of oil for deeper aroma.
- **Keep the lid on** — Kazan Kebab thrives on steam and pressure.
- **Cook outdoors** on open fire for smoky authenticity.
- **Let it rest** for 10 minutes before serving to let juices redistribute.

## 🍽️ Serving Suggestions

Serve Kazan Kebab family-style right from the pot. Pair it with fresh flatbread or naan, a side of pickled onions, and a refreshing tomato-cucumber salad.

Traditionally, it's enjoyed with a cup of hot black tea — a perfect balance to its rich, meaty flavors.

## 🌿 Final Thoughts

Kazan Kebab is more than just a recipe — it's a ritual of patience and love. The longer you let the flavors develop, the richer and more irresistible the result. 

So next time you crave comfort food that tells a story, light up your stove (or your campfire), and let the magic of the kazan do the rest.`
    },
    {
      id: "why-americans-love-steak",
      slug: "why-americans-love-steak",
      title: "Why Americans Love a Good Steak — and How Halal Makes It Better",
      subtitle: "Exploring steak culture with halal-certified quality",
      category: "News",
      author: "Team Shahirzada",
      date: "2025-01-28",
      image: "https://images.unsplash.com/photo-1657143378324-83c1609f32a8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmlsbGVkJTIwc3RlYWslMjBkaW5uZXJ8ZW58MXx8fHwxNzYxMzE1MDMxfDA&ixlib=rb-4.1.0&q=80&w=1080",
      excerpt: "Steak culture is thriving in the U.S., but nothing compares to the purity and flavor of halal-certified, never-frozen beef from Shahirzada Fresh Market.",
      featured: false,
      content: [
        "Americans cherish steak nights — a celebration of quality and simplicity.",
        "Halal beef elevates this tradition with ethical sourcing and exceptional freshness.",
        "Visit our Naperville location for ribeye, striploin, and filet cuts that make every bite memorable."
      ]
    },
    {
      id: "choose-best-steak",
      slug: "choose-best-steak",
      title: "How to Choose the Best Steak in Town",
      subtitle: "Expert butcher tips for selecting premium cuts",
      category: "Guide",
      author: "Butcher Rahim",
      date: "2025-02-02",
      image: "https://images.unsplash.com/photo-1690983325970-185c8a6c0ba6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXJibGVkJTIwcmliZXllJTIwc3RlYWt8ZW58MXx8fHwxNzYxMzkzNzk0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      excerpt: "A step-by-step guide to picking the perfect steak—fresh, halal, and never frozen—from Shahirzada Fresh Market in Naperville.",
      featured: true,
      tags: ["steak", "halal", "butcher-tips", "Naperville"],
      readTime: 5,
      content: "## How to Choose the Best Steak in Town\n**By Butcher Rahim | Shahirzada Fresh Market – Naperville, IL**\n\nThere's nothing quite like cutting into a perfectly cooked steak—the sear, the aroma, and that first juicy bite. But before you fire up the grill, one question matters most: how do you choose the right steak?\n\nAt **Shahirzada Fresh Market**, a halal butcher at 3124 Illinois Rte 59 #158, Naperville, we believe a great steak starts with quality halal meat, expert butchering, and genuine freshness. Here's your guide.\n\n### 1) Start with Fresh, Never-Frozen Meat\nFrozen steaks can lose moisture and cook unevenly. We cut fresh daily—no thawing, no compromises—so your steak sears beautifully right away.\n\n### 2) Look for Color and Marbling\nChoose vibrant red beef with fine white marbling. \n- **Ribeye:** richest marbling, big flavor.\n- **New York Strip:** balanced marbling, firmer bite.\n- **Tenderloin:** lean and buttery for those who prefer less fat.\n\n### 3) Understand Grades (and Handling)\nLabels like Select, Choice, and Prime are helpful, but ethical sourcing and careful handling matter most. Our beef is **USDA-inspected and halal-certified**—processed with integrity and kept immaculate from farm to counter.\n\n### 4) Match the Cut to the Occasion\n- **Ribeye:** grill or cast-iron; deep flavor.\n- **Sirloin:** leaner, great weeknight choice.\n- **Tenderloin/Filet:** ultra-tender; cook gently to medium-rare.\n- **T-Bone/Porterhouse:** strip + tenderloin in one.\n- **Flank/Skirt:** thin, quick; perfect for marinades and fajitas.\n\nOur butchers help you pair the right cut with your recipe and cooking method.\n\n### 5) Smell and Feel the Quality\nFresh beef has a clean scent and a firm, springy feel—never sticky or sour. We inspect every piece before it hits the case.\n\n### 6) Ask Your Butcher\nWe love questions. Ask about trim level, thickness, and cooking tips—we'll even prep custom cuts on the spot.\n\n### 7) Choose Local, Choose Halal\nBuying from a local halal butcher supports your community and ensures humane, transparent practices. Every cut at Shahirzada is **100% halal-certified** and **never frozen**.",
      meta_title: "How to Choose the Best Steak in Town | Shahirzada Fresh Market Naperville",
      meta_description: "Learn how to pick the perfect halal steak—fresh, never frozen—plus cuts, marbling, and cooking tips from Shahirzada Fresh Market in Naperville, IL.",
      keywords: ["halal steak", "best steak Naperville", "Shahirzada Fresh Market", "how to choose steak", "ribeye vs strip", "never frozen halal meat"]
    },
    {
      id: "italian-meatballs",
      slug: "italian-meatballs",
      title: "Italian Meatballs Made to Perfection with Our Halal Meats",
      subtitle: "Authentic Italian comfort food with halal quality",
      category: "Recipe",
      author: "Chef Giulia",
      date: "2025-02-05",
      image: "https://images.unsplash.com/photo-1565086869529-8c7802cca7a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpdGFsaWFuJTIwbWVhdGJhbGxzJTIwcGFzdGF8ZW58MXx8fHwxNzYxMzY0MTE0fDA&ixlib=rb-4.1.0&q=80&w=1080",
      excerpt: "Experience authentic Italian comfort food using fresh halal beef and lamb from Shahirzada Fresh Market — soft, juicy, and full of flavor.",
      featured: false,
      content: [
        "Mix equal parts halal beef and lamb with breadcrumbs, garlic, and herbs.",
        "Pan-sear until golden, then simmer in tomato sauce for 30 minutes.",
        "Serve with spaghetti or crusty bread — simple and delicious."
      ]
    },
    {
      id: "best-halal-burgers",
      slug: "best-halal-burgers",
      title: "How to Make the Best Halal Hamburgers at Home",
      subtitle: "Never-frozen ground beef for unmatched juiciness",
      category: "Recipe",
      author: "Chef Marco",
      date: "2025-02-10",
      image: "https://images.unsplash.com/photo-1551000484-9feb8d3c2b2c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXJnZXIlMjBiZWVmJTIwZ291cm1ldHxlbnwxfHx8fDE3NjEzNjQxMTV8MA&ixlib=rb-4.1.0&q=80&w=1080",
      excerpt: "Perfecting a halal burger starts with the freshest beef. Learn how Shahirzada Fresh Market's never-frozen grind gives your burgers unmatched juiciness.",
      featured: false,
      content: [
        "Form loose patties from freshly ground halal beef — no fillers, no freezing.",
        "Season generously and grill until lightly charred.",
        "Top with caramelized onions, cheese, and a soft bun for an unbeatable burger night."
      ]
    }
  ],
  categories: [
    { id: "recipe", name: "Recipe", icon: "🍝" },
    { id: "guide", name: "Guide", icon: "📖" },
    { id: "news", name: "News", icon: "📰" },
    { id: "event", name: "Event", icon: "🎉" }
  ]
};

export const useConfig = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [hours, setHours] = useState<Hours | null>(null);
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [blog, setBlog] = useState<BlogData | null>(null);

  useEffect(() => {
    // Load config, hours, and menu immediately
    setConfig(configData);
    setHours(hoursData);

    let isMounted = true;

    // Fetch menu from server (authoritative source)
    const fetchMenu = async () => {
      try {
        const response = await fetch(
          `${edgeFunctionBaseUrl}/menu`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'apikey': publicAnonKey,
            },
          }
        );
        if (!response.ok) {
          throw new Error(`Menu fetch failed with status ${response.status}`);
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.categories)) {
          throw new Error('Supabase menu returned invalid payload');
        }

        if (isMounted) {
          console.log('✅ Menu loaded from Supabase:', data.categories.length, 'categories');
          setMenu(data);
        }
      } catch (error: any) {
        console.error('⚠️ Menu fetch error:', error?.message || error);
        if (isMounted) {
          setMenu(EMPTY_MENU);
        }
      }
    };
    
    // Fetch blog posts from server
    const fetchBlogPosts = async () => {
      try {
        const response = await fetch(
          `${edgeFunctionBaseUrl}/blog/posts`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'apikey': publicAnonKey,
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Blog posts loaded from server:', data.posts?.length || 0, 'posts');
          setBlog(data);
        } else {
          // Fallback to hardcoded data if server fails
          console.log('ℹ️ Server blog fetch failed. Using local fallback. Visit /migrate-blog-posts to upload.');
          setBlog(blogData);
        }
      } catch (error) {
        // Fallback to hardcoded data on error
        console.log('ℹ️ Blog fetch error (using local fallback):', error.message || error);
        setBlog(blogData);
      }
    };
    
    fetchMenu();
    fetchBlogPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  return { config, hours, menu, blog };
};
