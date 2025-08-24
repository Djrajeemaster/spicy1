/*
  # Create storage bucket for deal images

  1. Storage Setup
    - Create `deal-images` bucket for storing deal photos
    - Enable public access for uploaded images
    - Set up RLS policies for secure uploads

  2. Security
    - Only authenticated users can upload images
    - Public read access for all images
    - Users can only delete their own uploaded images
*/

-- Create the storage bucket for deal images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deal-images',
  'deal-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload deal images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'deal-images');

-- Policy: Allow public read access to all images
CREATE POLICY "Public read access for deal images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'deal-images');

-- Policy: Allow users to delete their own uploaded images
CREATE POLICY "Users can delete own uploaded images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'deal-images' AND auth.uid()::text = owner);

-- Policy: Allow users to update their own uploaded images
CREATE POLICY "Users can update own uploaded images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'deal-images' AND auth.uid()::text = owner);