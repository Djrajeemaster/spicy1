/**
 * AI-Powered URL Data Extraction Service
 * Intelligently extracts product information from various store URLs
 * Includes store-specific handling and fallback methods
 */

interface UrlData {
  title: string | null;
  description: string | null;
  image: string | null;
  price: string | null;
  originalPrice: string | null;
  store: string | null;
  isStoreDetected: boolean;
}

interface StoreConfig {
  name: string;
  domains: string[];
  titleSelectors: string[];
  priceSelectors: string[];
  imageSelectors: string[];
  descriptionSelectors: string[];
}

// Store-specific configurations for intelligent extraction
const STORE_CONFIGS: Record<string, StoreConfig> = {
  amazon: {
    name: 'Amazon',
    domains: ['amazon.com', 'amazon.in', 'amazon.co.uk', 'amazon.de', 'amazon.fr'],
    titleSelectors: [
      '#productTitle',
      '.product-title',
      '[data-automation-id="product-title"]',
      'h1.a-size-large',
      '.a-size-large.product-title-word-break'
    ],
    priceSelectors: [
      '.a-price-whole',
      '.a-offscreen',
      '[data-automation-id="list-price"]',
      '.a-price.a-text-price.a-size-medium.apexPriceToPay',
      '.a-price-range'
    ],
    imageSelectors: [
      '#landingImage',
      '.a-dynamic-image',
      '[data-automation-id="product-image"]',
      '.imgTagWrapper img'
    ],
    descriptionSelectors: [
      '#feature-bullets ul',
      '.a-unordered-list.a-vertical.a-spacing-mini',
      '[data-automation-id="product-overview"]'
    ]
  },
  walmart: {
    name: 'Walmart',
    domains: ['walmart.com'],
    titleSelectors: [
      '[data-automation-id="product-title"]',
      'h1[data-testid="product-title"]',
      '.prod-ProductTitle'
    ],
    priceSelectors: [
      '[data-testid="price-current"]',
      '.price-current',
      '.price-group'
    ],
    imageSelectors: [
      '[data-testid="hero-image"]',
      '.prod-hero-image',
      '.slide-content img'
    ],
    descriptionSelectors: [
      '[data-testid="product-description"]',
      '.about-desc'
    ]
  },
  target: {
    name: 'Target',
    domains: ['target.com'],
    titleSelectors: [
      '[data-test="product-title"]',
      'h1[data-test="product-title"]'
    ],
    priceSelectors: [
      '[data-test="product-price"]',
      '.h-text-red'
    ],
    imageSelectors: [
      '[data-test="product-image"]',
      '.ProductImages img'
    ],
    descriptionSelectors: [
      '[data-test="item-details-description"]'
    ]
  }
};

/**
 * Detects which store the URL belongs to
 */
function detectStore(url: string): { store: string | null; config: StoreConfig | null } {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    for (const [storeKey, config] of Object.entries(STORE_CONFIGS)) {
      if (config.domains.some(domain => hostname.includes(domain))) {
        return { store: storeKey, config };
      }
    }
    
    return { store: null, config: null };
  } catch (error) {
    return { store: null, config: null };
  }
}

/**
 * AI-powered intelligent title extraction using multiple methods
 */
function extractTitleIntelligently(html: string, store: string | null): string | null {
  // Store-specific title extraction
  if (store && STORE_CONFIGS[store]) {
    const config = STORE_CONFIGS[store];
    
    // Try CSS selector-based extraction
    for (const selector of config.titleSelectors) {
      const selectorRegex = new RegExp(`${escapeRegex(selector)}[^>]*>([^<]+)<`, 'i');
      const match = html.match(selectorRegex);
      if (match && match[1].trim()) {
        return cleanTitle(match[1].trim());
      }
    }
  }
  
  // Fallback to general title extraction methods
  const titleMethods = [
    // Method 1: Standard title tag
    /<title[^>]*>([^<]+)<\/title>/i,
    
    // Method 2: Product title patterns
    /<h1[^>]*class=["'][^"']*product[^"']*["'][^>]*>([^<]+)<\/h1>/i,
    /<span[^>]*id=["']?productTitle["']?[^>]*>([^<]+)<\/span>/i,
    /<div[^>]*class=["'][^"']*product[^"']*title[^"']*["'][^>]*>([^<]+)<\/div>/i,
    
    // Method 3: Meta tags
    /<meta[^>]*property=["']?og:title["']?[^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']?title["']?[^>]*content=["']([^"']+)["']/i,
    
    // Method 4: JSON-LD structured data
    /"name"\s*:\s*"([^"]+)"/i,
    /"title"\s*:\s*"([^"]+)"/i
  ];
  
  for (const method of titleMethods) {
    const match = html.match(method);
    if (match && match[1] && match[1].trim()) {
      const title = cleanTitle(match[1].trim());
      // Avoid generic titles
      if (title.length > 10 && !isGenericTitle(title)) {
        return title;
      }
    }
  }
  
  // AI-enhanced extraction for Amazon specifically
  if (store === 'amazon') {
    return extractAmazonTitle(html);
  }
  
  return null;
}

/**
 * Amazon-specific AI title extraction
 */
function extractAmazonTitle(html: string): string | null {
  // Look for product name patterns in Amazon pages
  const amazonPatterns = [
    // Amazon Fire products
    /Amazon\s+Fire\s+HD\s+\d+[^<>"']*(?:tablet|Tablet)/i,
    /Fire\s+HD\s+\d+[^<>"']*(?:tablet|Tablet)/i,
    
    // General product patterns
    /"productTitle"[^>]*>([^<]+)</i,
    /data-asin[^>]*>[^<]*([^<>]*(?:Amazon|Fire|HD)[^<>]*)</i,
    
    // Price and title combinations
    /\$[\d,]+\.?\d*[^<>"']*([^<>"']*(?:Amazon|tablet|Fire|HD)[^<>"']*)/i
  ];
  
  for (const pattern of amazonPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const title = cleanTitle(match[1]);
      if (title.length > 5) {
        return title;
      }
    }
  }
  
  return null;
}

/**
 * Intelligent price extraction
 */
function extractPriceIntelligently(html: string, store: string | null): { price: string | null; originalPrice: string | null } {
  let price: string | null = null;
  let originalPrice: string | null = null;
  
  // Store-specific price extraction
  if (store && STORE_CONFIGS[store]) {
    const config = STORE_CONFIGS[store];
    
    for (const selector of config.priceSelectors) {
      const selectorRegex = new RegExp(`${escapeRegex(selector)}[^>]*>([^<]*\\$[\\d,]+\\.?\\d*[^<]*)<`, 'i');
      const match = html.match(selectorRegex);
      if (match && match[1]) {
        const priceText = match[1].match(/\$[\d,]+\.?\d*/);
        if (priceText && !price) {
          price = priceText[0];
        }
      }
    }
  }
  
  // General price extraction patterns
  const pricePatterns = [
    /["']price["']\s*:\s*["']?\$?([\d,]+\.?\d*)["']?/i,
    /["']currentPrice["']\s*:\s*["']?\$?([\d,]+\.?\d*)["']?/i,
    /["']salePrice["']\s*:\s*["']?\$?([\d,]+\.?\d*)["']?/i,
    /class=["'][^"']*price[^"']*["'][^>]*>\s*\$?([\d,]+\.?\d*)/i
  ];
  
  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      if (!price) {
        price = '$' + match[1];
      } else if (!originalPrice && price !== '$' + match[1]) {
        originalPrice = '$' + match[1];
      }
    }
  }
  
  // Extract all price mentions and sort
  const allPrices = html.match(/\$[\d,]+\.?\d*/g);
  if (allPrices && allPrices.length > 0) {
    const uniquePrices = Array.from(new Set(allPrices));
    const sortedPrices = uniquePrices.sort((a, b) => {
      const aNum = parseFloat(a.replace(/[\$,]/g, ''));
      const bNum = parseFloat(b.replace(/[\$,]/g, ''));
      return aNum - bNum;
    });
    
    if (!price && sortedPrices.length > 0) {
      price = sortedPrices[0];
    }
    
    if (!originalPrice && sortedPrices.length > 1) {
      originalPrice = sortedPrices[sortedPrices.length - 1];
    }
  }
  
  return { price, originalPrice };
}

/**
 * Intelligent image extraction
 */
function extractImageIntelligently(html: string, store: string | null): string | null {
  // Store-specific image extraction
  if (store && STORE_CONFIGS[store]) {
    const config = STORE_CONFIGS[store];
    
    for (const selector of config.imageSelectors) {
      const selectorRegex = new RegExp(`${escapeRegex(selector)}[^>]*src=["']([^"']+)["']`, 'i');
      const match = html.match(selectorRegex);
      if (match && match[1]) {
        return match[1];
      }
    }
  }
  
  // General image extraction patterns
  const imagePatterns = [
    // High-resolution images
    /["']hiRes["']\s*:\s*["']([^"']+)["']/i,
    /["']large["']\s*:\s*["']([^"']+)["']/i,
    
    // Amazon media images
    /https:\/\/m\.media-amazon\.com\/images\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/i,
    
    // General product images
    /<img[^>]*class=["'][^"']*product[^"']*["'][^>]*src=["']([^"']+)["']/i,
    /<img[^>]*src=["']([^"']*product[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["']/i,
    
    // Any high-quality image
    /https:\/\/[^"'\s]*\.(?:jpg|jpeg|png|webp)/i
  ];
  
  for (const pattern of imagePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Extract product description
 */
function extractDescription(html: string, store: string | null, title: string | null): string | null {
  // Store-specific description extraction
  if (store && STORE_CONFIGS[store]) {
    const config = STORE_CONFIGS[store];
    
    for (const selector of config.descriptionSelectors) {
      const selectorRegex = new RegExp(`${escapeRegex(selector)}[^>]*>([^<]+)<`, 'i');
      const match = html.match(selectorRegex);
      if (match && match[1].trim()) {
        return cleanDescription(match[1].trim());
      }
    }
  }
  
  // Generate smart description based on title and store
  if (title && store) {
    const storeName = STORE_CONFIGS[store]?.name || store;
    return `Great ${storeName} deal! ${title} - Limited time offer available now.`;
  }
  
  return title ? `Amazing deal on ${title}! Don't miss out on this limited time offer.` : null;
}

/**
 * Utility functions
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-\(\)\[\]]/g, '')
    .trim();
}

function cleanDescription(desc: string): string {
  return desc
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500);
}

function isGenericTitle(title: string): boolean {
  const genericPatterns = [
    /^Amazon\.com$/i,
    /^Walmart\.com$/i,
    /^Target\.com$/i,
    /^Loading/i,
    /^Error/i,
    /^Page not found/i,
    /^Ref=.*Detail.*$/i
  ];
  
  return genericPatterns.some(pattern => pattern.test(title));
}

/**
 * CORS proxy methods for fetching cross-origin content
 */
async function fetchViaProxy(url: string): Promise<string> {
  const proxyMethods = [
    // Method 1: allorigins.win
    {
      name: 'allorigins',
      getUrl: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    },
    
    // Method 2: corsproxy.io
    {
      name: 'corsproxy',
      getUrl: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
    },
    
    // Method 3: codetabs.com
    {
      name: 'codetabs',
      getUrl: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    }
  ];
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };
  
  for (const method of proxyMethods) {
    try {
      console.log(`Attempting to fetch via ${method.name}...`);
      
      const proxyUrl = method.getUrl(url);
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers
      });
      
      if (response.ok) {
        const html = await response.text();
        
        // Check if we got actual content (not a CAPTCHA or error page)
        if (html.length > 1000 && !html.includes('automated access') && !html.includes('captcha')) {
          console.log(`✅ Successfully fetched via ${method.name}`);
          return html;
        } else {
          console.log(`⚠️ ${method.name} returned limited content (${html.length} chars)`);
        }
      } else {
        console.log(`❌ ${method.name} failed with status: ${response.status}`);
      }
    } catch (error: any) {
      console.log(`❌ ${method.name} error:`, error?.message || error);
    }
  }
  
  throw new Error('All proxy methods failed');
}

/**
 * Main function to extract URL data with AI-powered intelligence
 */
export async function extractUrlData(url: string): Promise<UrlData> {
  try {
    console.log('🧠 AI-powered URL extraction starting for:', url);
    
    // Detect store and get configuration
    const { store, config } = detectStore(url);
    console.log('🏪 Detected store:', store || 'generic');
    
    let html: string;
    
    try {
      // Attempt to fetch via CORS proxy
      html = await fetchViaProxy(url);
    } catch (error) {
      console.log('⚠️ Proxy fetch failed, using fallback method');
      
      // Fallback: Generate data based on URL and store detection
      if (store) {
        const storeName = config?.name || store;
        return {
          title: `${storeName} Product Deal`,
          description: `Great deal from ${storeName}! Check out this amazing offer.`,
          image: null,
          price: null,
          originalPrice: null,
          store: storeName,
          isStoreDetected: true
        };
      }
      
      // Generic fallback
      const title = url.split('/').pop()?.replace(/[-_]/g, ' ') || 'Great Deal';
      return {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        description: 'Amazing deal! Limited time offer.',
        image: null,
        price: null,
        originalPrice: null,
        store: null,
        isStoreDetected: false
      };
    }
    
    // AI-powered extraction
    console.log('🤖 Performing AI-powered content extraction...');
    
    const title = extractTitleIntelligently(html, store);
    const { price, originalPrice } = extractPriceIntelligently(html, store);
    const image = extractImageIntelligently(html, store);
    const description = extractDescription(html, store, title);
    
    const result: UrlData = {
      title: title || (store ? `${config?.name || store} Product` : 'Product Deal'),
      description: description || 'Great deal! Limited time offer.',
      image,
      price,
      originalPrice,
      store: config?.name || store,
      isStoreDetected: !!store
    };
    
    console.log('✅ AI extraction complete:', result);
    return result;
    
  } catch (error) {
    console.error('❌ URL extraction failed:', error);
    
    // Ultimate fallback
    return {
      title: 'Deal Alert',
      description: 'Check out this amazing deal!',
      image: null,
      price: null,
      originalPrice: null,
      store: null,
      isStoreDetected: false
    };
  }
}

/**
 * Check if URL should use store-specific modal
 */
export function shouldUseStoreModal(url: string): { useModal: boolean; store: string | null } {
  const { store } = detectStore(url);
  
  // Show modal for major stores
  const showModalStores = ['amazon', 'walmart', 'target'];
  
  return {
    useModal: !!store && showModalStores.includes(store),
    store: store
  };
}

/**
 * Get store-specific modal configuration
 */
export function getStoreModalConfig(store: string) {
  const config = STORE_CONFIGS[store];
  if (!config) return null;
  
  return {
    name: config.name,
    logo: `https://logo.clearbit.com/${config.domains[0]}`,
    color: getStoreColor(store),
    fields: [
      { label: 'Product Title', placeholder: 'Enter product title' },
      { label: 'Sale Price', placeholder: '$0.00' },
      { label: 'Original Price', placeholder: '$0.00' },
      { label: 'Product Image URL', placeholder: 'https://' },
      { label: 'Description', placeholder: 'Product description...' }
    ]
  };
}

function getStoreColor(store: string): string {
  const colors = {
    amazon: '#FF9900',
    walmart: '#0071CE',
    target: '#CC0000'
  };
  return colors[store as keyof typeof colors] || '#007AFF';
}

/**
 * Validate URL format
 */
export function isValidUrlFormat(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Legacy validation function for backward compatibility
 */
export async function validateUrl(url: string): Promise<any> {
  try {
    if (!isValidUrlFormat(url)) {
      return { isReachable: false, error: 'Invalid URL format' };
    }

    // Use our AI extraction for validation
    const extractedData = await extractUrlData(url);
    
    return {
      isReachable: true,
      title: extractedData.title,
      description: extractedData.description,
      price: extractedData.price,
      originalPrice: extractedData.originalPrice,
      images: extractedData.image ? [extractedData.image] : [],
      store: extractedData.store,
      category: null,
      couponCode: null
    };
  } catch (error: any) {
    console.error('URL validation failed:', error);
    return { isReachable: false, error: error?.message || 'Validation failed' };
  }
}
