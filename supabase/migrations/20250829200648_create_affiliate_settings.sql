-- Create affiliate_settings table for managing affiliate IDs per store and country
CREATE TABLE IF NOT EXISTS public.affiliate_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_name TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'US', -- ISO 3166-1 alpha-2 country codes
    affiliate_id TEXT,
    affiliate_tag TEXT,
    commission_rate DECIMAL(5,2) DEFAULT 0.00,
    tracking_template TEXT, -- URL template with placeholders
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create unique constraint to prevent duplicate store-country combinations
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_settings_store_country_unique 
ON public.affiliate_settings (store_name, country_code);

-- Add RLS policies
ALTER TABLE public.affiliate_settings ENABLE ROW LEVEL SECURITY;

-- Only superadmins can read affiliate settings
CREATE POLICY "affiliate_settings_read_policy" ON public.affiliate_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('superadmin')
        )
    );

-- Only superadmins can insert affiliate settings
CREATE POLICY "affiliate_settings_insert_policy" ON public.affiliate_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('superadmin')
        )
    );

-- Only superadmins can update affiliate settings
CREATE POLICY "affiliate_settings_update_policy" ON public.affiliate_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('superadmin')
        )
    );

-- Only superadmins can delete affiliate settings
CREATE POLICY "affiliate_settings_delete_policy" ON public.affiliate_settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('superadmin')
        )
    );

-- Insert default affiliate settings for major stores
INSERT INTO public.affiliate_settings (store_name, country_code, affiliate_id, affiliate_tag, tracking_template, notes, is_active) VALUES
('Amazon', 'US', NULL, NULL, 'https://amazon.com/dp/{product_id}?tag={affiliate_tag}', 'Amazon Associates US - add your affiliate tag', false),
('Amazon', 'UK', NULL, NULL, 'https://amazon.co.uk/dp/{product_id}?tag={affiliate_tag}', 'Amazon Associates UK - add your affiliate tag', false),
('Amazon', 'CA', NULL, NULL, 'https://amazon.ca/dp/{product_id}?tag={affiliate_tag}', 'Amazon Associates Canada - add your affiliate tag', false),
('Amazon', 'DE', NULL, NULL, 'https://amazon.de/dp/{product_id}?tag={affiliate_tag}', 'Amazon Associates Germany - add your affiliate tag', false),
('Amazon', 'FR', NULL, NULL, 'https://amazon.fr/dp/{product_id}?tag={affiliate_tag}', 'Amazon Associates France - add your affiliate tag', false),
('Amazon', 'JP', NULL, NULL, 'https://amazon.co.jp/dp/{product_id}?tag={affiliate_tag}', 'Amazon Associates Japan - add your affiliate tag', false),
('Amazon', 'IN', NULL, NULL, 'https://amazon.in/dp/{product_id}?tag={affiliate_tag}', 'Amazon Associates India - add your affiliate tag', false),
('Walmart', 'US', NULL, NULL, 'https://walmart.com/ip/{product_id}?u1={affiliate_id}', 'Walmart Impact Radius - add your affiliate ID', false),
('Target', 'US', NULL, NULL, 'https://target.com/p/{product_id}?ref={affiliate_id}', 'Target Partners - add your affiliate ID', false),
('Best Buy', 'US', NULL, NULL, 'https://bestbuy.com/site/{product_id}?ref={affiliate_id}', 'Best Buy Affiliate Program - add your affiliate ID', false),
('eBay', 'US', NULL, NULL, 'https://ebay.com/itm/{product_id}?mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid={affiliate_id}', 'eBay Partner Network - add your campaign ID', false),
('Costco', 'US', NULL, NULL, 'https://costco.com/product/{product_id}?ref={affiliate_id}', 'Costco Affiliate Program - add your affiliate ID', false),
('Home Depot', 'US', NULL, NULL, 'https://homedepot.com/p/{product_id}?source={affiliate_id}', 'Home Depot Affiliate Program - add your affiliate ID', false),
('Lowes', 'US', NULL, NULL, 'https://lowes.com/pd/{product_id}?ref={affiliate_id}', 'Lowes Affiliate Program - add your affiliate ID', false),
('Macys', 'US', NULL, NULL, 'https://macys.com/shop/product/{product_id}?source={affiliate_id}', 'Macys Affiliate Program - add your affiliate ID', false),
('Kohls', 'US', NULL, NULL, 'https://kohls.com/product/{product_id}?ref={affiliate_id}', 'Kohls Affiliate Program - add your affiliate ID', false)
ON CONFLICT (store_name, country_code) DO NOTHING;

-- Create function to update affiliate links
CREATE OR REPLACE FUNCTION public.generate_affiliate_link(
    original_url TEXT,
    store_name TEXT,
    country_code TEXT DEFAULT 'US'
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    affiliate_config public.affiliate_settings%ROWTYPE;
    affiliate_url TEXT;
    product_id TEXT;
BEGIN
    -- Get affiliate configuration for the store and country
    SELECT * INTO affiliate_config 
    FROM public.affiliate_settings 
    WHERE affiliate_settings.store_name = generate_affiliate_link.store_name 
    AND affiliate_settings.country_code = generate_affiliate_link.country_code
    AND is_active = true
    LIMIT 1;
    
    -- If no affiliate config found or no tracking template, return original URL
    IF affiliate_config IS NULL OR affiliate_config.tracking_template IS NULL THEN
        RETURN original_url;
    END IF;
    
    -- If no affiliate tag/ID configured, return original URL
    IF affiliate_config.affiliate_tag IS NULL AND affiliate_config.affiliate_id IS NULL THEN
        RETURN original_url;
    END IF;
    
    -- Extract product ID based on store
    CASE affiliate_config.store_name
        WHEN 'Amazon' THEN
            -- Extract ASIN from Amazon URLs
            product_id := substring(original_url from '/dp/([A-Z0-9]{10})');
            IF product_id IS NULL THEN
                product_id := substring(original_url from '/gp/product/([A-Z0-9]{10})');
            END IF;
        WHEN 'Walmart' THEN
            -- Extract product ID from Walmart URLs
            product_id := substring(original_url from '/ip/[^/]+/([0-9]+)');
        WHEN 'Target' THEN
            -- Extract product ID from Target URLs
            product_id := substring(original_url from '/p/[^/]+/A-([0-9]+)');
        WHEN 'eBay' THEN
            -- Extract item ID from eBay URLs
            product_id := substring(original_url from '/itm/([0-9]+)');
        ELSE
            -- For other stores, try to extract numeric ID
            product_id := substring(original_url from '/([0-9]+)');
    END CASE;
    
    -- If no product ID found, return original URL
    IF product_id IS NULL THEN
        RETURN original_url;
    END IF;
    
    -- Generate affiliate URL from template
    affiliate_url := affiliate_config.tracking_template;
    affiliate_url := replace(affiliate_url, '{product_id}', product_id);
    affiliate_url := replace(affiliate_url, '{affiliate_tag}', COALESCE(affiliate_config.affiliate_tag, ''));
    affiliate_url := replace(affiliate_url, '{affiliate_id}', COALESCE(affiliate_config.affiliate_id, ''));
    
    RETURN affiliate_url;
END;
$$;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_affiliate_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER affiliate_settings_updated_at
    BEFORE UPDATE ON public.affiliate_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_affiliate_settings_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_settings TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
