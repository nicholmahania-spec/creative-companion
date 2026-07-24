// Asset Service for handling file uploads, optimization, and management
import { supabase } from '../lib/supabase'

/**
 * Upload an image file to Supabase storage
 * @param {File} file - The file to upload
 * @param {string} bucket - Storage bucket name
 * @param {string} path - Path within the bucket
 * @returns {Promise<{url: string, path: string}>} Upload result
 */
export async function uploadImage(file, bucket = 'assets', path = null) {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  // Generate unique filename if path not provided
  const fileExt = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const filePath = path || `${Date.now()}/${fileName}`

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return {
      url: publicUrl,
      path: filePath,
      bucket
    }
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

/**
 * Delete an image from storage
 * @param {string} path - File path in bucket
 * @param {string} bucket - Storage bucket name
 * @returns {Promise<void>}
 */
export async function deleteImage(path, bucket = 'assets') {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) throw error
}

/**
 * Get optimized image URL (if transformations are needed)
 * @param {string} path - File path in bucket
 * @param {Object} options - Transformation options
 * @param {string} bucket - Storage bucket name
 * @returns {string} Optimized image URL
 */
export function getImageUrl(path, options = {}, bucket = 'assets') {
  if (!supabase) return ''

  // For now, return the basic URL
  // In the future, this could integrate with image optimization services
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return publicUrl
}

/**
 * Upload multiple assets at once
 * @param {Array<File>} files - Files to upload
 * @param {string} bucket - Storage bucket name
 * @returns {Promise<Array<{url: string, path: string, file: File}>>} Upload results
 */
export async function uploadMultipleAssets(files, bucket = 'assets') {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const uploadPromises = files.map(file => uploadImage(file, bucket))
  return Promise.all(uploadPromises)
}

// Initialize required storage buckets
export async function initializeStorageBuckets() {
  if (!supabase) return

  try {
    // Check if assets bucket exists, create if not
    const { data: buckets } = await supabase.storage.listBuckets()
    const assetBucketExists = buckets?.some(b => b.name === 'assets')

    if (!assetBucketExists) {
      await supabase.storage.createBucket('assets', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
      })
    }
  } catch (error) {
    console.warn('Could not initialize storage buckets:', error)
  }
}

export default {
  uploadImage,
  deleteImage,
  getImageUrl,
  uploadMultipleAssets,
  initializeStorageBuckets
}