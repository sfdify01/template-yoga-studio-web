/**
 * Admin utility page to upload blog images to Supabase Storage
 * Navigate to /upload-blog-images to use this tool
 */

import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import kazanImage from "figma:asset/c14dec2d5a19e922af70064320b84895029133d4.png";
import { uploadFigmaAsset } from '../lib/blog-images';
import { CheckCircle2, Upload, AlertCircle } from 'lucide-react';

export default function UploadBlogImages() {
  const [uploading, setUploading] = useState(false);
  const [kazanUrl, setKazanUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUploadKazan = async () => {
    setUploading(true);
    setError(null);
    
    try {
      console.log('Starting upload of Kazan Kebab image...');
      const url = await uploadFigmaAsset(kazanImage, 'kazan-kebab.png');
      console.log('Upload successful! URL:', url);
      setKazanUrl(url);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl mb-2">Blog Image Uploader</h1>
          <p className="text-gray-600">
            Upload blog post images to Supabase Storage for permanent hosting
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Kazan Kebab Image</CardTitle>
            <CardDescription>
              Upload the beautiful Kazan Kebab image for the "Secrets to Make Delicious Kazan Kebab" blog post
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <img 
                src={kazanImage} 
                alt="Kazan Kebab - beef with potatoes and onions"
                className="w-full h-64 object-cover"
              />
            </div>

            {!kazanUrl ? (
              <Button 
                onClick={handleUploadKazan}
                disabled={uploading}
                className="w-full"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Uploading to Supabase...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload to Supabase Storage
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Upload successful! Image is now hosted in Supabase Storage.
                  </AlertDescription>
                </Alert>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Signed URL:</p>
                  <code className="text-xs break-all bg-white p-2 rounded border block">
                    {kazanUrl}
                  </code>
                </div>

                <p className="text-sm text-gray-600">
                  Copy this URL and update the Kazan Kebab blog post in <code>/hooks/useConfig.ts</code> and <code>/data/sample/blog.json</code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <ol className="list-decimal list-inside space-y-2">
              <li>Click "Upload to Supabase Storage" to upload the image</li>
              <li>Copy the generated signed URL</li>
              <li>Update the blog post configuration with the new URL</li>
              <li>The image will be permanently hosted in your Supabase Storage bucket</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
