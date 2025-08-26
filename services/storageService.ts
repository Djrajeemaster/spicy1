import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  url: string;
  path: string;
}

class StorageService {
  private readonly BUCKET_NAME = 'deal-images';

  /**
   * Validates if a URI is safe to fetch
   * @param uri The URI to validate
   * @returns boolean indicating if URI is safe
   */
  private isValidUri(uri: string): boolean {
    try {
      const url = new URL(uri);
      
      // Only allow specific protocols
      if (!['http:', 'https:', 'file:'].includes(url.protocol)) {
        return false;
      }
      
      // Block private/internal IP ranges for http/https
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        const hostname = url.hostname;
        
        // Block localhost and private IPs
        if (
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.16.') ||
          hostname.startsWith('172.17.') ||
          hostname.startsWith('172.18.') ||
          hostname.startsWith('172.19.') ||
          hostname.startsWith('172.2') ||
          hostname.startsWith('172.30.') ||
          hostname.startsWith('172.31.') ||
          hostname === '0.0.0.0' ||
          hostname.startsWith('169.254.') // Link-local
        ) {
          return false;
        }
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Uploads an image to Supabase Storage
   * @param uri The local URI of the image to upload
   * @param fileName Optional custom filename
   * @returns Promise with the public URL and storage path
   */
  async uploadImage(uri: string, fileName?: string): Promise<{ data: UploadResult | null; error: any }> {
    try {
      // Validate URI to prevent SSRF
      if (!this.isValidUri(uri)) {
        throw new Error('Invalid or unsafe URI provided');
      }
      
      // Generate unique filename if not provided
      const fileExtension = uri.split('.').pop() || 'jpg';
      
      // Sanitize fileName to prevent path traversal
      let sanitizedFileName = fileName;
      if (fileName) {
        // Remove path traversal sequences and invalid characters
        sanitizedFileName = fileName
          .replace(/\.\./g, '') // Remove .. sequences
          .replace(/[\/\\]/g, '') // Remove path separators
          .replace(/[^a-zA-Z0-9._-]/g, '_'); // Replace invalid chars with underscore
      }
      
      const uniqueFileName = sanitizedFileName || `${uuidv4()}.${fileExtension}`;
      const filePath = `deals/${uniqueFileName}`;

      // Fetch the image as a blob with error handling and timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(uri, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'DealApp/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      // Validate content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error('Invalid content type: expected image');
      }
      
      const blob = await response.blob();
      
      // Convert blob to array buffer
      const arrayBuffer = await blob.arrayBuffer();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, arrayBuffer, {
          contentType: blob.type || 'image/jpeg',
          upsert: false, // Don't overwrite existing files
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        data: {
          url: publicUrlData.publicUrl,
          path: filePath,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      return { data: null, error };
    }
  }

  /**
   * Uploads multiple images to Supabase Storage
   * @param uris Array of local URIs to upload
   * @returns Promise with array of upload results
   */
  async uploadMultipleImages(uris: string[]): Promise<{ data: UploadResult[]; error: any }> {
    try {
      // Validate all URIs first
      for (const uri of uris) {
        if (!this.isValidUri(uri)) {
          throw new Error(`Invalid or unsafe URI: ${uri}`);
        }
      }
      
      const uploadPromises = uris.map(uri => this.uploadImage(uri));
      const results = await Promise.all(uploadPromises);

      // Check if any uploads failed
      const failedUploads = results.filter(result => result.error);
      if (failedUploads.length > 0) {
        console.error('Some uploads failed:', failedUploads);
        return { 
          data: [], 
          error: { message: `${failedUploads.length} image(s) failed to upload` } 
        };
      }

      const successfulUploads = results
        .filter(result => result.data)
        .map(result => result.data!);

      return { data: successfulUploads, error: null };
    } catch (error) {
      console.error('Error uploading multiple images:', error);
      return { data: [], error };
    }
  }

  /**
   * Deletes an image from Supabase Storage
   * @param path The storage path of the image to delete
   */
  async deleteImage(path: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([path]);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error deleting image:', error);
      return { error };
    }
  }
}

export const storageService = new StorageService();