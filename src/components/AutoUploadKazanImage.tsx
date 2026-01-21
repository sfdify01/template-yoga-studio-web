/**
 * Auto-Upload Component for Kazan Kebab Image
 * This component automatically uploads the Kazan image to Supabase on first mount
 * and stores the URL in localStorage for the blog post to use
 */

import { useEffect, useState } from 'react';
import kazanImage from "figma:asset/c14dec2d5a19e922af70064320b84895029133d4.png";
import { uploadFigmaAsset } from '../lib/blog-images';

const KAZAN_IMAGE_URL_KEY = 'kazan-kebab-image-url';

export function AutoUploadKazanImage() {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  useEffect(() => {
    // Check if already uploaded
    const existingUrl = localStorage.getItem(KAZAN_IMAGE_URL_KEY);
    if (existingUrl) {
      setUploaded(true);
      return;
    }

    // Auto-upload on first load
    const uploadImage = async () => {
      setUploading(true);
      try {
        console.log('[AutoUpload] Uploading Kazan Kebab image to Supabase Storage...');
        const url = await uploadFigmaAsset(kazanImage, 'kazan-kebab.png');
        console.log('[AutoUpload] Upload successful! URL:', url);
        
        // Store URL in localStorage
        localStorage.setItem(KAZAN_IMAGE_URL_KEY, url);
        setUploaded(true);
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('kazan-image-uploaded', { detail: { url } }));
      } catch (error) {
        console.error('[AutoUpload] Failed to upload Kazan image:', error);
      } finally {
        setUploading(false);
      }
    };

    uploadImage();
  }, []);

  // This component doesn't render anything visible
  return null;
}

/**
 * Get the uploaded Kazan image URL from localStorage
 */
export function getKazanImageUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KAZAN_IMAGE_URL_KEY);
}

/**
 * Listen for Kazan image upload completion
 */
export function onKazanImageUploaded(callback: (url: string) => void) {
  if (typeof window === 'undefined') return () => {};
  
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ url: string }>;
    callback(customEvent.detail.url);
  };
  
  window.addEventListener('kazan-image-uploaded', handler);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('kazan-image-uploaded', handler);
  };
}
