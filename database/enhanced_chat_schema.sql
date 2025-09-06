-- Enhanced Chat System with Group Chat, Private Messages, and User Controls

-- Chat channels (group chats and private conversations)
CREATE TABLE IF NOT EXISTS chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255), -- NULL for private chats, has value for group chats
    description TEXT,
    type VARCHAR(50) DEFAULT 'private', -- 'private', 'group', 'global'
    is_global BOOLEAN DEFAULT false, -- true for main global chat
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    last_message_at TIMESTAMP DEFAULT NOW(),
    member_count INTEGER DEFAULT 0
);

-- Channel members and their permissions
CREATE TABLE IF NOT EXISTS channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- 'admin', 'moderator', 'member'
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    notifications_enabled BOOLEAN DEFAULT true,
    can_send_messages BOOLEAN DEFAULT true,
    UNIQUE(channel_id, user_id)
);

-- User blocking system
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    reason TEXT,
    UNIQUE(blocker_id, blocked_id)
);

-- Chat requests/pings for private messaging
CREATE TABLE IF NOT EXISTS chat_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT, -- Optional message with the request
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'ignored'
    created_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    UNIQUE(requester_id, recipient_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'file', 'deal_share', 'system', 'ping'
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    mentioned_users UUID[] DEFAULT '{}', -- Array of user IDs mentioned in message
    metadata JSONB, -- For storing additional data
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    edited_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Message reactions
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(10) NOT NULL, -- emoji reactions
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction)
);

-- Message read status
CREATE TABLE IF NOT EXISTS message_read_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- User chat preferences
CREATE TABLE IF NOT EXISTS user_chat_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    allow_private_messages BOOLEAN DEFAULT true,
    require_request_for_private BOOLEAN DEFAULT true,
    auto_accept_requests_from_followers BOOLEAN DEFAULT false,
    show_online_status BOOLEAN DEFAULT true,
    notifications_enabled BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_channels_type ON chat_channels(type);
CREATE INDEX IF NOT EXISTS idx_chat_channels_is_global ON chat_channels(is_global);
CREATE INDEX IF NOT EXISTS idx_chat_channels_updated_at ON chat_channels(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_active ON channel_members(is_active);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON user_blocks(blocked_id);

CREATE INDEX IF NOT EXISTS idx_chat_requests_recipient_id ON chat_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_status ON chat_requests(status);
CREATE INDEX IF NOT EXISTS idx_chat_requests_expires_at ON chat_requests(expires_at);

CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_mentioned_users ON messages USING gin(mentioned_users);

CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON message_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON message_read_status(message_id);

-- Functions and triggers

-- Function to update channel last_message_at and member_count
CREATE OR REPLACE FUNCTION update_channel_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last_message_at for new messages
    IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'messages' THEN
        UPDATE chat_channels 
        SET last_message_at = NEW.created_at, updated_at = NEW.created_at
        WHERE id = NEW.channel_id;
        RETURN NEW;
    END IF;
    
    -- Update member_count for channel members changes
    IF TG_TABLE_NAME = 'channel_members' THEN
        UPDATE chat_channels 
        SET member_count = (
            SELECT COUNT(*) 
            FROM channel_members 
            WHERE channel_id = COALESCE(NEW.channel_id, OLD.channel_id) 
            AND is_active = true
        ),
        updated_at = NOW()
        WHERE id = COALESCE(NEW.channel_id, OLD.channel_id);
        
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_update_channel_last_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_channel_activity();

CREATE TRIGGER trigger_update_channel_member_count
    AFTER INSERT OR UPDATE OR DELETE ON channel_members
    FOR EACH ROW
    EXECUTE FUNCTION update_channel_activity();

-- Function to check if user can send message to another user
CREATE OR REPLACE FUNCTION can_send_private_message(sender_id UUID, recipient_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_blocked BOOLEAN := false;
    recipient_preferences RECORD;
    has_accepted_request BOOLEAN := false;
    is_following BOOLEAN := false;
BEGIN
    -- Check if sender is blocked by recipient
    SELECT EXISTS(
        SELECT 1 FROM user_blocks 
        WHERE blocker_id = recipient_id AND blocked_id = sender_id
    ) INTO is_blocked;
    
    IF is_blocked THEN
        RETURN false;
    END IF;
    
    -- Get recipient preferences
    SELECT * FROM user_chat_preferences 
    WHERE user_id = recipient_id 
    INTO recipient_preferences;
    
    -- If no preferences set, use defaults
    IF recipient_preferences IS NULL THEN
        recipient_preferences.allow_private_messages := true;
        recipient_preferences.require_request_for_private := true;
        recipient_preferences.auto_accept_requests_from_followers := false;
    END IF;
    
    -- If recipient doesn't allow private messages at all
    IF NOT recipient_preferences.allow_private_messages THEN
        RETURN false;
    END IF;
    
    -- If recipient doesn't require requests, allow
    IF NOT recipient_preferences.require_request_for_private THEN
        RETURN true;
    END IF;
    
    -- Check if there's an accepted chat request
    SELECT EXISTS(
        SELECT 1 FROM chat_requests 
        WHERE requester_id = sender_id 
        AND recipient_id = recipient_id 
        AND status = 'accepted'
    ) INTO has_accepted_request;
    
    IF has_accepted_request THEN
        RETURN true;
    END IF;
    
    -- Check if auto-accept from followers is enabled and sender is following recipient
    IF recipient_preferences.auto_accept_requests_from_followers THEN
        SELECT EXISTS(
            SELECT 1 FROM follows 
            WHERE follower_id = sender_id AND following_id = recipient_id
        ) INTO is_following;
        
        IF is_following THEN
            RETURN true;
        END IF;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create private chat channel
CREATE OR REPLACE FUNCTION get_or_create_private_channel(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    channel_id UUID;
    existing_channel_id UUID;
BEGIN
    -- Check if a private channel already exists between these users
    SELECT c.id INTO existing_channel_id
    FROM chat_channels c
    WHERE c.type = 'private'
    AND c.id IN (
        SELECT cm1.channel_id
        FROM channel_members cm1
        WHERE cm1.user_id = user1_id
        AND cm1.is_active = true
    )
    AND c.id IN (
        SELECT cm2.channel_id
        FROM channel_members cm2
        WHERE cm2.user_id = user2_id
        AND cm2.is_active = true
    );

    IF existing_channel_id IS NOT NULL THEN
        RETURN existing_channel_id;
    END IF;

    -- Create new private channel
    INSERT INTO chat_channels (type, created_by)
    VALUES ('private', user1_id)
    RETURNING id INTO channel_id;

    -- Add both users as members
    INSERT INTO channel_members (channel_id, user_id)
    VALUES 
        (channel_id, user1_id),
        (channel_id, user2_id);

    RETURN channel_id;
END;
$$ LANGUAGE plpgsql;

-- Create the global chat channel
INSERT INTO chat_channels (name, description, type, is_global, created_at)
VALUES ('Global Chat', 'Main chat room for all users', 'global', true, NOW())
ON CONFLICT DO NOTHING;

-- Function to add user to global chat when they sign up
CREATE OR REPLACE FUNCTION add_user_to_global_chat()
RETURNS TRIGGER AS $$
DECLARE
    global_channel_id UUID;
BEGIN
    -- Get the global chat channel ID
    SELECT id INTO global_channel_id
    FROM chat_channels
    WHERE is_global = true
    LIMIT 1;
    
    -- Add user to global chat
    IF global_channel_id IS NOT NULL THEN
        INSERT INTO channel_members (channel_id, user_id)
        VALUES (global_channel_id, NEW.id)
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Create default chat preferences for the user
    INSERT INTO user_chat_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to add new users to global chat
CREATE TRIGGER trigger_add_user_to_global_chat
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION add_user_to_global_chat();
