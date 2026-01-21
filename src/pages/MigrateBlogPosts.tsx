import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Upload, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { edgeFunctionBaseUrl } from '../lib/supabase-edge';

// Import the hardcoded blog posts
const HARDCODED_POSTS = [
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
    content: "Plov is more than a rice dish—it's a symbol of hospitality. Start by browning Shahirzada halal beef cubes until golden.\n\nAdd onions, carrots, and the signature blend of cumin and barberries before layering fragrant basmati rice.\n\nSteam slowly in a kazan for the perfect pull-apart texture and serve warm for a family feast.",
    tags: [],
    meta_title: "",
    meta_description: "",
    keywords: []
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
    content: "Marinate lamb chunks in onion puree, black pepper, salt, and vinegar for at least four hours.\n\nGrill over open coals until edges are lightly charred and meat is tender inside.\n\nServe with flatbread, tomato sauce, and sliced onions — the Uzbek way.",
    tags: [],
    meta_title: "",
    meta_description: "",
    keywords: []
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
6. Cover tightly and reduce heat to low. Cook for 1.5 to 2 hours, checking occasionally.
7. Serve directly from the kazan — hot, rich, and deeply aromatic.

## 🔥 Pro Tips

- Use a heavy cast-iron pot if you don't have a traditional kazan. The key is even, long heat retention.
- Don't rush the browning step. Deep caramelization = deep flavor.
- Some cooks add a splash of beef broth halfway through if the pot gets too dry.

## 🌿 What to Serve It With

- Fresh Uzbek bread (Lepyoshka)
- Pickled vegetables (achchiq or turshi)
- A side of salted tomatoes or onions
- A cold glass of ayran or black tea

---

Kazan Kebab is the ultimate dish for gathering around the table with family and friends. It's hearty, it's bold, and it's unforgettable.`,
    meta_title: "",
    meta_description: "",
    keywords: []
  },
  {
    id: "manti-recipe",
    slug: "manti-recipe",
    title: "Manti: The Ultimate Uzbek Dumplings",
    subtitle: "Steamed perfection wrapped in homemade dough",
    category: "Recipe",
    author: "Chef Madina",
    date: "2025-01-25",
    image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW50aSUyMGR1bXBsaW5ncyUyMHN0ZWFtZWR8ZW58MXx8fHwxNzYxMzY0MTExfDA&ixlib=rb-4.1.0&q=80&w=1080",
    excerpt: "Master the art of making soft, fluffy Manti dumplings filled with Shahirzada halal beef and onions, steamed to perfection.",
    featured: false,
    content: "Manti is a beloved dumpling dish across Central Asia. Start by preparing a simple dough from flour, water, eggs, and salt.\n\nRoll thin and cut into squares. Fill each square with ground halal beef, chopped onions, and a pinch of cumin.\n\nFold into neat parcels and steam for 40 minutes. Serve with sour cream and fresh herbs.",
    tags: [],
    meta_title: "",
    meta_description: "",
    keywords: []
  },
  {
    id: "lagman-noodles",
    slug: "lagman-noodles",
    title: "Hand-Pulled Lagman Noodles with Beef",
    subtitle: "Rich and savory Uzbek noodle soup",
    category: "Recipe",
    author: "Chef Rustam",
    date: "2025-01-28",
    image: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYWdtYW4lMjBub29kbGVzJTIwYmVlZiUyMHNvdXB8ZW58MXx8fHwxNzYxMzY0MTExfDA&ixlib=rb-4.1.0&q=80&w=1080",
    excerpt: "Thick hand-pulled noodles swim in a rich beef and vegetable broth seasoned with star anise and soy. A full meal in every bowl.",
    featured: false,
    content: "Lagman is the ultimate comfort noodle soup. Start with hand-pulled or thick wheat noodles.\n\nPrepare a stir-fried beef and vegetable base with onions, bell peppers, radish, and garlic.\n\nAdd beef broth, soy sauce, and star anise. Simmer until fragrant, then pour over cooked noodles. Top with fresh cilantro and chili oil.",
    tags: [],
    meta_title: "",
    meta_description: "",
    keywords: []
  },
  {
    id: "samsa-pastries",
    slug: "samsa-pastries",
    title: "Crispy Baked Samsa Pastries",
    subtitle: "Flaky meat-filled pockets, fresh from the oven",
    category: "Recipe",
    author: "Chef Gulnara",
    date: "2025-02-01",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYW1zYSUyMHBhc3RyeSUyMGJha2VkfGVufDF8fHx8MTc2MTM2NDExMXww&ixlib=rb-4.1.0&q=80&w=1080",
    excerpt: "Triangular pastries filled with spiced halal lamb and onions, brushed with egg wash and baked until golden — perfect as a snack or appetizer.",
    featured: false,
    content: "Samsa is the Central Asian answer to savory pies. Use puff pastry or yeast dough, rolled thin.\n\nFill with ground lamb, onions, cumin, salt, and black pepper. Fold into triangles and crimp the edges.\n\nBrush with egg yolk and bake at 375°F until golden and flaky. Serve hot with tea.",
    tags: [],
    meta_title: "",
    meta_description: "",
    keywords: []
  },
  {
    id: "halal-meat-guide",
    slug: "halal-meat-guide",
    title: "What Makes Meat Halal? A Complete Guide",
    subtitle: "Understanding halal certification and quality",
    category: "Education",
    author: "Shahirzada Team",
    date: "2025-02-05",
    image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWxhbCUyMG1lYXQlMjBidXRjaGVyJTIwZnJlc2h8ZW58MXx8fHwxNzYxMzY0MTExfDA&ixlib=rb-4.1.0&q=80&w=1080",
    excerpt: "Learn what halal means, how it differs from conventional meat, and why Shahirzada Fresh Market is your trusted source in Naperville.",
    featured: false,
    content: "Halal refers to what is permissible under Islamic law. For meat, this means the animal must be slaughtered by a trained Muslim, with a prayer said and the blood fully drained.\n\nAt Shahirzada Fresh Market, all our meat is certified halal and never frozen, ensuring both faith compliance and peak freshness.\n\nWhether it's beef, lamb, goat, or specialty cuts, you can shop with confidence knowing every product meets the highest halal standards.",
    tags: [],
    meta_title: "",
    meta_description: "",
    keywords: []
  }
];

export const MigrateBlogPosts = () => {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [currentPosts, setCurrentPosts] = useState<any[]>([]);

  const checkCurrentPosts = async () => {
    setChecking(true);
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
        setCurrentPosts(data.posts || []);
        toast.success(`Found ${data.posts?.length || 0} posts in database`);
      } else {
        toast.error('Failed to fetch current posts');
      }
    } catch (error) {
      console.error('Check error:', error);
      toast.error('Error checking posts');
    } finally {
      setChecking(false);
    }
  };

  const migratePosts = async () => {
    setMigrating(true);
    setResult(null);
    
    try {
        const response = await fetch(
          `${edgeFunctionBaseUrl}/migrate-blog-posts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
              'apikey': publicAnonKey,
            },
            body: JSON.stringify({ posts: HARDCODED_POSTS }),
          }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
        toast.success(`Migration complete! ${data.added} posts added, ${data.skipped} skipped`);
        // Refresh the current posts list
        await checkCurrentPosts();
      } else {
        setResult({ error: data.error });
        toast.error(`Migration failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Migration error:', error);
      setResult({ error: error.message });
      toast.error('Migration failed');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl mb-2">Blog Post Migration</h1>
            <p className="text-gray-600">
              Migrate {HARDCODED_POSTS.length} hardcoded blog posts to the database
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-8">
            <Button
              onClick={checkCurrentPosts}
              disabled={checking}
              variant="outline"
              className="gap-2"
            >
              {checking && <Loader2 className="w-4 h-4 animate-spin" />}
              Check Current Posts
            </Button>
            
            <Button
              onClick={migratePosts}
              disabled={migrating}
              className="gap-2"
            >
              {migrating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Migrate Posts
                </>
              )}
            </Button>
          </div>

          {/* Current Posts Display */}
          {currentPosts.length > 0 && (
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">
                    Database currently has {currentPosts.length} post{currentPosts.length !== 1 ? 's' : ''}
                  </h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    {currentPosts.slice(0, 5).map((post) => (
                      <div key={post.id}>• {post.title}</div>
                    ))}
                    {currentPosts.length > 5 && (
                      <div className="text-blue-600">... and {currentPosts.length - 5} more</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Migration Results */}
          {result && (
            <div className="space-y-4">
              {result.error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-red-900 mb-1">Migration Failed</h3>
                      <p className="text-sm text-red-700">{result.error}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-green-900 mb-1">Migration Complete!</h3>
                        <div className="text-sm text-green-700 space-y-1">
                          <div>✅ {result.added} posts added</div>
                          <div>⏭️ {result.skipped} posts skipped (already exist)</div>
                          <div>📊 Total processed: {result.total}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Results */}
                  <div>
                    <h3 className="font-medium mb-3">Detailed Results</h3>
                    <div className="space-y-2">
                      {result.results.map((r: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-white border rounded-lg"
                        >
                          <span className="text-sm">{r.slug}</span>
                          <Badge
                            variant={r.status === 'success' ? 'default' : 'secondary'}
                            className="gap-1"
                          >
                            {r.status === 'success' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {r.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next Steps */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">Next Steps</h3>
                    <div className="space-y-2 text-sm text-blue-700">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        <a href="/blog" className="underline hover:text-blue-900">
                          View migrated posts on the blog
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        <a href="/admin" className="underline hover:text-blue-900">
                          Manage posts in the admin dashboard
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Posts to Migrate Preview */}
          {!result && (
            <div>
              <h3 className="font-medium mb-3">Posts Ready to Migrate</h3>
              <div className="space-y-2">
                {HARDCODED_POSTS.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between p-3 bg-white border rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-sm">{post.title}</div>
                      <div className="text-xs text-gray-500">{post.slug}</div>
                    </div>
                    <Badge variant="outline">{post.category}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
