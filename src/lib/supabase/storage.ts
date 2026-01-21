import { projectId } from '../../utils/supabase/info';

/**
 * Product images bucket name - same across all environments.
 */
export const PRODUCT_IMAGES_BUCKET = 'make-a05c3297-product-images';

/**
 * Get the product images bucket name.
 */
export function getProductImagesBucket(): string {
  return PRODUCT_IMAGES_BUCKET;
}

export { projectId };
