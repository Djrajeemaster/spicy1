/*
  # Fix for Pending Deals Feature

  This migration addresses an issue where deals could not be set to a 'pending' status.

  1. Alter `deals` table
    - The CHECK constraint for the `status` column is updated to include 'pending'.
    - This allows regular users to submit deals for moderation.
*/

-- Drop the existing constraint to redefine it.
-- This is safe because we immediately add a new one.
ALTER TABLE public.deals
DROP CONSTRAINT IF EXISTS deals_status_check;

-- Add the new constraint with 'pending' included.
ALTER TABLE public.deals
ADD CONSTRAINT deals_status_check CHECK (status IN ('draft', 'scheduled', 'live', 'expiring', 'expired', 'archived', 'pending'));