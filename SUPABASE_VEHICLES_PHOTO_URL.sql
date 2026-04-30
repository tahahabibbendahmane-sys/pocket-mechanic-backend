-- Add photo_url column to vehicles table for vehicle photos (Supabase Storage URL)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS photo_url TEXT;
