/**
 * Blog Image Upload Utilities
 * Handles uploading images to Supabase Storage via the server
 */

import { publicAnonKey } from '../utils/supabase/info';
import { edgeFunctionBaseUrl } from './supabase-edge';

const SERVER_URL = edgeFunctionBaseUrl;

/**
 * Upload an image to Supabase Storage for blog posts
 * @param file - File object or Blob to upload
 * @param filename - Name for the file
 * @returns Promise with the signed URL of the uploaded image
 */
export async function uploadBlogImage(file: File | Blob, filename: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('filename', filename);

  const response = await fetch(`${SERVER_URL}/blog/upload-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'apikey': publicAnonKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload image');
  }

  const data = await response.json();
  return data.url;
}

/**
 * Upload a figma:asset image to Supabase Storage
 * @param assetPath - The figma:asset import (e.g., imported image)
 * @param filename - Name for the file
 * @returns Promise with the signed URL of the uploaded image
 */
export async function uploadFigmaAsset(assetPath: string, filename: string): Promise<string> {
  // Fetch the figma asset as a blob
  const response = await fetch(assetPath);
  if (!response.ok) {
    throw new Error('Failed to fetch figma asset');
  }

  const blob = await response.blob();
  return uploadBlogImage(blob, filename);
}

/**
 * Get a signed URL for an existing blog image
 * @param path - The storage path of the image
 * @returns Promise with the signed URL
 */
export async function getBlogImageUrl(path: string): Promise<string> {
  const response = await fetch(`${SERVER_URL}/blog/image/${encodeURIComponent(path)}`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'apikey': publicAnonKey,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get image URL');
  }

  const data = await response.json();
  return data.url;
}
