# Quick Fix for Deployment Issues

## Issues Fixed:

1. **Invalid URL Construction** - Fixed adminRoles.ts to use local API
2. **Missing Supabase References** - Replaced with direct API calls
3. **Missing API Endpoints** - Added `/api/reports`, `/api/user_reports`, `/api/affiliate-settings`
4. **Missing Database Tables** - Created SQL script for missing tables

## Quick Setup Commands:

```bash
# 1. Install missing dependencies (if not already installed)
npm install express-rate-limit helmet jsonwebtoken validator winston dotenv

# 2. Create missing database tables
npm run create-tables

# 3. Run database migrations
npm run migrate

# 4. Start the server
npm run server

# 5. Test the application
npm run health-check
```

## Manual Database Setup (if script fails):

```sql
-- Run this SQL directly in your PostgreSQL database:

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
```

## Files Modified:

- ✅ `services/admin/adminRoles.ts` - Fixed URL construction and API calls
- ✅ `services/affiliateService.ts` - Replaced Supabase with API calls  
- ✅ `server.js` - Added missing API endpoints
- ✅ `package.json` - Added create-tables script
- ✅ Created `scripts/create-missing-tables.sql`
- ✅ Created `scripts/run-missing-tables.js`

## Verification:

After running the setup commands, verify:

1. Server starts without errors: `npm run server`
2. Health check passes: `npm run health-check`
3. Admin pages load without 404 errors
4. No more "supabase is not defined" errors
5. No more "Invalid URL" errors

Your project should now be ready for deployment!