-- Create missing tables for the application

-- User reports table
CREATE TABLE IF NOT EXISTS user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_content_id UUID,
    content_type VARCHAR(50) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Affiliate settings table
CREATE TABLE IF NOT EXISTS affiliate_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name VARCHAR(100) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    affiliate_id VARCHAR(255),
    affiliate_tag VARCHAR(255),
    commission_rate DECIMAL(5,2),
    tracking_template TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(store_name, country_code)
);

-- Admin announcements table (if not exists)
CREATE TABLE IF NOT EXISTS admin_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    target_audience VARCHAR(50) DEFAULT 'all',
    author_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    send_push BOOLEAN DEFAULT false,
    sent_count INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_settings_store ON affiliate_settings(store_name);
CREATE INDEX IF NOT EXISTS idx_affiliate_settings_active ON affiliate_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_announcements_active ON admin_announcements(is_active);

-- Insert sample data
INSERT INTO affiliate_settings (store_name, country_code, affiliate_id, is_active) VALUES
('Amazon', 'US', 'sample-affiliate-id', true),
('eBay', 'US', 'sample-ebay-id', true),
('Target', 'US', 'sample-target-id', false)
ON CONFLICT (store_name, country_code) DO NOTHING;