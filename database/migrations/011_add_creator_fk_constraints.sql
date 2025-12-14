-- Migration: Add foreign key constraints for creator_id on chamas and escrows
-- This fixes the PGRST200 error when trying to join with profiles

-- Add foreign key constraint for chamas.creator_id -> profiles.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chamas_creator_id_fkey' 
        AND table_name = 'chamas'
    ) THEN
        ALTER TABLE chamas 
        ADD CONSTRAINT chamas_creator_id_fkey 
        FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key constraint for escrows.creator_id -> profiles.id  
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'escrows_creator_id_fkey' 
        AND table_name = 'escrows'
    ) THEN
        ALTER TABLE escrows 
        ADD CONSTRAINT escrows_creator_id_fkey 
        FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create a view to join chamas with creator profile info
CREATE OR REPLACE VIEW chamas_with_creator AS
SELECT 
    c.*,
    p.email as creator_email,
    p.phone_number as creator_phone,
    p.full_name as creator_name
FROM chamas c
LEFT JOIN profiles p ON c.creator_id = p.id;

-- Create a view to join escrows with creator profile info
CREATE OR REPLACE VIEW escrows_with_creator AS
SELECT 
    e.*,
    p.email as creator_email,
    p.phone_number as creator_phone,
    p.full_name as creator_name
FROM escrows e
LEFT JOIN profiles p ON e.creator_id = p.id;

-- Grant access to the views
GRANT SELECT ON chamas_with_creator TO authenticated;
GRANT SELECT ON escrows_with_creator TO authenticated;
