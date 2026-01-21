import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { 
  ArrowLeft, Save, Eye, Upload, X, AlertCircle, CheckCircle2,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { parseMarkdown } from '../../lib/markdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

interface BlogPost {
  id?: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  author: string;
  date: string;
  image: string;
  tags: string[];
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
  featured: boolean;
  readTime?: number;
}

interface EditorProps {
  postId?: string;
  onBack: () => void;
  onSave: () => void;
}

const CATEGORIES = ['Recipe', 'Guide', 'News', 'Event'];

export const Editor = ({ postId, onBack, onSave }: EditorProps) => {
  const [post, setPost] = useState<BlogPost>({
    slug: '',
    title: '',
    subtitle: '',
    category: 'Recipe',
    author: 'Team Shahirzada',
    date: new Date().toISOString().split('T')[0],
    image: '',
    tags: [],
    excerpt: '',
    content: '',
    meta_title: '',
    meta_description: '',
    keywords: [],
    featured: false,
    readTime: 5
  });

  const [loading, setLoading] = useState(!!postId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [unsaved, setUnsaved] = useState(false);

  useEffect(() => {
    if (postId) {
      loadPost();
    }
  }, [postId]);

  useEffect(() => {
    // Auto-save to localStorage every 10s
    const timer = setInterval(() => {
      if (unsaved) {
        localStorage.setItem('admin_draft', JSON.stringify(post));
        console.log('Draft auto-saved');
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [post, unsaved]);

  useEffect(() => {
    // Auto-generate slug from title
    if (!postId && post.title) {
      const slug = post.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setPost(prev => ({ ...prev, slug }));
    }
  }, [post.title, postId]);

  useEffect(() => {
    // Auto-calculate read time
    const words = post.content.split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    setPost(prev => ({ ...prev, readTime }));
  }, [post.content]);

  const loadPost = async () => {
    try {
      const { adminApi } = await import('../../lib/admin/api-client');
      const data = await adminApi.getPost(postId!);
      setPost(data);
    } catch (error) {
      toast.error('Failed to load post');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!post.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!post.slug.trim()) {
      toast.error('Slug is required');
      return;
    }
    if (!post.excerpt.trim()) {
      toast.error('Excerpt is required');
      return;
    }
    if (!post.content.trim()) {
      toast.error('Content is required');
      return;
    }

    setSaving(true);
    try {
      const { adminApi } = await import('../../lib/admin/api-client');
      
      if (postId) {
        await adminApi.updatePost(postId, post);
      } else {
        await adminApi.createPost(post);
      }

      toast.success(postId ? 'Post updated' : 'Post created');
      localStorage.removeItem('admin_draft');
      setUnsaved(false);
      onSave();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const { adminApi } = await import('../../lib/admin/api-client');
      const data = await adminApi.uploadImage(file, post.slug || 'temp');
      setPost(prev => ({ ...prev, image: data.url }));
      setUnsaved(true);
      toast.success('Image uploaded');
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !post.tags.includes(tagInput.trim())) {
      setPost(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
      setUnsaved(true);
    }
  };

  const removeTag = (tag: string) => {
    setPost(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    setUnsaved(true);
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !post.keywords.includes(keywordInput.trim())) {
      setPost(prev => ({ ...prev, keywords: [...prev.keywords, keywordInput.trim()] }));
      setKeywordInput('');
      setUnsaved(true);
    }
  };

  const removeKeyword = (keyword: string) => {
    setPost(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== keyword) }));
    setUnsaved(true);
  };

  const handlePreview = () => {
    window.open(`/blog/${post.slug}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SEO: Prevent indexing */}
      <meta name="robots" content="noindex,nofollow" />

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                onClick={onBack}
                className="gap-2 flex-shrink-0"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  {postId ? 'Edit Post' : 'New Post'}
                </h1>
                {unsaved && (
                  <p className="text-xs text-orange-600 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3" />
                    Unsaved changes
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
              {post.slug && (
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  className="gap-2 flex-1 sm:flex-none"
                  size="sm"
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Preview</span>
                </Button>
              )}
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                className="gap-2 hidden lg:flex"
                size="sm"
              >
                {showPreview ? 'Hide' : 'Show'} Live Preview
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-brand hover:bg-brand-hover text-white gap-2 flex-1 sm:flex-none"
                size="sm"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className={`grid ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-4 sm:gap-6`}>
          {/* Editor */}
          <div className="space-y-4 sm:space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg border p-4 sm:p-6 space-y-4">
              <h2 className="text-base sm:text-lg font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                Basic Information
              </h2>

              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={post.title}
                  onChange={(e) => {
                    setPost(prev => ({ ...prev, title: e.target.value }));
                    setUnsaved(true);
                  }}
                  placeholder="Enter post title"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={post.slug}
                  onChange={(e) => {
                    setPost(prev => ({ ...prev, slug: e.target.value }));
                    setUnsaved(true);
                  }}
                  placeholder="url-friendly-slug"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL: /blog/{post.slug || 'your-slug'}
                </p>
              </div>

              <div>
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={post.subtitle}
                  onChange={(e) => {
                    setPost(prev => ({ ...prev, subtitle: e.target.value }));
                    setUnsaved(true);
                  }}
                  placeholder="Brief subtitle"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="category" className="text-sm">Category</Label>
                  <Select
                    value={post.category}
                    onValueChange={(value) => {
                      setPost(prev => ({ ...prev, category: value }));
                      setUnsaved(true);
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="author" className="text-sm">Author</Label>
                  <Input
                    id="author"
                    value={post.author}
                    onChange={(e) => {
                      setPost(prev => ({ ...prev, author: e.target.value }));
                      setUnsaved(true);
                    }}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="date" className="text-sm">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={post.date}
                    onChange={(e) => {
                      setPost(prev => ({ ...prev, date: e.target.value }));
                      setUnsaved(true);
                    }}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="readTime" className="text-sm">Read Time (min)</Label>
                  <Input
                    id="readTime"
                    type="number"
                    value={post.readTime}
                    onChange={(e) => {
                      setPost(prev => ({ ...prev, readTime: parseInt(e.target.value) || 5 }));
                      setUnsaved(true);
                    }}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={post.featured}
                  onCheckedChange={(checked) => {
                    setPost(prev => ({ ...prev, featured: checked }));
                    setUnsaved(true);
                  }}
                  id="featured"
                />
                <Label htmlFor="featured" className="cursor-pointer">
                  Featured post
                </Label>
              </div>
            </div>

            {/* Image */}
            <div className="bg-white rounded-lg border p-4 sm:p-6 space-y-4">
              <h2 className="text-base sm:text-lg font-medium">Featured Image</h2>

              <div>
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  value={post.image}
                  onChange={(e) => {
                    setPost(prev => ({ ...prev, image: e.target.value }));
                    setUnsaved(true);
                  }}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>

              <div className="text-center py-4">
                <p className="text-sm text-gray-600 mb-2">— or —</p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    className="gap-2"
                    onClick={(e) => {
                      e.preventDefault();
                      (e.currentTarget.previousSibling as HTMLInputElement)?.click();
                    }}
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                </label>
              </div>

              {post.image && (
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={post.image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg border p-4 sm:p-6 space-y-4">
              <h2 className="text-base sm:text-lg font-medium">Tags</h2>
              
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag..."
                />
                <Button onClick={addTag} variant="outline">Add</Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {post.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="text-lg">Content</h2>

              <div>
                <Label htmlFor="excerpt">Excerpt * (160 chars recommended)</Label>
                <Textarea
                  id="excerpt"
                  value={post.excerpt}
                  onChange={(e) => {
                    setPost(prev => ({ ...prev, excerpt: e.target.value }));
                    setUnsaved(true);
                  }}
                  placeholder="Brief description..."
                  className="mt-1 h-20"
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {post.excerpt.length}/200 characters
                </p>
              </div>

              <div>
                <Label htmlFor="content">Content * (Markdown supported)</Label>
                <Textarea
                  id="content"
                  value={post.content}
                  onChange={(e) => {
                    setPost(prev => ({ ...prev, content: e.target.value }));
                    setUnsaved(true);
                  }}
                  placeholder="Write your content in markdown..."
                  className="mt-1 h-96 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {post.content.split(/\s+/).length} words • {post.readTime} min read
                </p>
              </div>
            </div>

            {/* SEO */}
            <div className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="text-lg">SEO & Metadata</h2>

              <div>
                <Label htmlFor="meta-title">Meta Title</Label>
                <Input
                  id="meta-title"
                  value={post.meta_title}
                  onChange={(e) => {
                    setPost(prev => ({ ...prev, meta_title: e.target.value }));
                    setUnsaved(true);
                  }}
                  placeholder="SEO title (60 chars)"
                  className="mt-1"
                  maxLength={70}
                />
              </div>

              <div>
                <Label htmlFor="meta-desc">Meta Description</Label>
                <Textarea
                  id="meta-desc"
                  value={post.meta_description}
                  onChange={(e) => {
                    setPost(prev => ({ ...prev, meta_description: e.target.value }));
                    setUnsaved(true);
                  }}
                  placeholder="SEO description (160 chars)"
                  className="mt-1 h-20"
                  maxLength={170}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {post.meta_description.length}/170 characters
                </p>
              </div>

              <div>
                <Label>Keywords</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder="Add keyword..."
                  />
                  <Button onClick={addKeyword} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {post.keywords.map(keyword => (
                    <Badge key={keyword} variant="outline" className="gap-1">
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div className="sticky top-24 h-fit">
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Live Preview
                </h2>
                
                <div className="prose prose-sm max-w-none">
                  {post.image && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 mb-4">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="mb-2">
                    <Badge>{post.category}</Badge>
                  </div>
                  
                  <h1 className="text-2xl mb-2">{post.title || 'Untitled'}</h1>
                  
                  {post.subtitle && (
                    <p className="text-lg text-gray-600 mb-4">{post.subtitle}</p>
                  )}
                  
                  <div className="text-sm text-gray-600 mb-4">
                    {post.author} • {new Date(post.date).toLocaleDateString()} • {post.readTime} min read
                  </div>
                  
                  {post.excerpt && (
                    <p className="text-gray-700 italic mb-4">{post.excerpt}</p>
                  )}
                  
                  {post.content && (
                    <div
                      className="markdown-content"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(post.content) }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
