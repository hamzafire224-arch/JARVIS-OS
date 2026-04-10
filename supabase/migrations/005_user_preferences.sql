-- Migration 005: User Preferences Cloud Sync
-- Adds a preferences JSONB column to profiles for cross-device sync

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Allow users to update their own preferences
-- (profile RLS already allows users to read/update their own row)

COMMENT ON COLUMN profiles.preferences IS 'User preferences synced across devices: theme, provider, notification settings, etc.';
