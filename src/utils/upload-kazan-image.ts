/**
 * Utility script to upload the Kazan Kebab image to Supabase Storage
 * This can be run from the browser console or triggered via a button
 */

import kazanImage from "figma:asset/c14dec2d5a19e922af70064320b84895029133d4.png";
import { uploadFigmaAsset } from "../lib/blog-images";

export async function uploadKazanImage(): Promise<string> {
  try {
    console.log('Uploading Kazan Kebab image to Supabase Storage...');
    const url = await uploadFigmaAsset(kazanImage, 'kazan-kebab.png');
    console.log('Upload successful! URL:', url);
    return url;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// For direct execution in browser console
if (typeof window !== 'undefined') {
  (window as any).uploadKazanImage = uploadKazanImage;
}
