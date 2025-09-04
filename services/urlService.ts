import { apiClient } from '@/utils/apiClient';

/**
 * AI-Powered URL Data Extraction Service
 * Intelligently extracts product information from various store URLs
 * Includes store-specific handling and fallback methods
 */

interface UrlData {
  title: string | null;
  description: string | null;
  image: string | null;
  images: string[]; // Multiple images support
  price: string | null;
  originalPrice: string | null;
  store: string | null;
  category: string | null;
  brand: string | null;
  rating: string | null;
  reviewCount: string | null;
  availability: string | null;
  couponCode: string | null;
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
      '.a-size-large.product-title-word-break',
      'h1 span',
      '.a-size-large',
      'title' // Page title fallback
    ],
    priceSelectors: [
      '.a-price-whole',
      '.a-offscreen',
      '[data-automation-id="list-price"]',
      '.a-price.a-text-price.a-size-medium.apexPriceToPay',
      '.a-price-range',
      '.a-price .a-offscreen',
      '.a-price-current',
      'span[class*="a-price"]',
      'span[id*="price"]',
      '.price'
    ],
    imageSelectors: [
      '#landingImage',
      '.a-dynamic-image',
      '[data-automation-id="product-image"]',
      '.imgTagWrapper img',
      'img[data-old-hires]',
      'img[data-a-dynamic-image]',
      '.a-spacing-small img'
    ],
    descriptionSelectors: [
      '#feature-bullets ul',
      '.a-unordered-list.a-vertical.a-spacing-mini',
      '[data-automation-id="product-overview"]',
      '.feature',
      '.a-spacing-mini'
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
 * Enhanced URL-based extraction for Amazon products when HTML extraction fails
 */
function extractFromAmazonUrl(url: string): UrlData {
  console.log('🔍 Performing enhanced Amazon URL-based extraction...');
  
  // Extract product name from URL path
  const urlParts = url.split('/');
  let productName = 'Amazon Product';
  let brand = null;
  let category = null;
  
  // Find the product name part (usually before /dp/)
  for (let i = 0; i < urlParts.length; i++) {
    if (urlParts[i] === 'dp' && i > 0) {
      const productPart = urlParts[i - 1];
      if (productPart && productPart.length > 5 && productPart.includes('-')) {
        // Convert URL slug to readable product name
        productName = productPart
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        // Extract brand if it's Amazon Basics or similar pattern
        if (productName.toLowerCase().includes('amazon basics')) {
          brand = 'Amazon Basics';
        } else if (productName.toLowerCase().startsWith('amazon')) {
          brand = 'Amazon';
        }
        
        // Extract category hints from product name
        const lowerName = productName.toLowerCase();
        if (lowerName.includes('hangers') || lowerName.includes('clothes')) {
          category = 'Home & Garden';
        } else if (lowerName.includes('electronics') || lowerName.includes('cable')) {
          category = 'Electronics';
        } else if (lowerName.includes('kitchen') || lowerName.includes('cooking')) {
          category = 'Kitchen & Dining';
        }
        
        break;
      }
    }
  }
  
  // Extract ASIN if possible
  const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
  const asin = asinMatch ? asinMatch[1] : null;
  
  console.log(`📦 Extracted from URL: "${productName}" (ASIN: ${asin})`);
  
  return {
    title: productName,
    description: `${productName} - Available on Amazon. ${brand ? `From ${brand}.` : ''} Check out this great deal!`,
    image: null,
    images: [],
    price: null,
    originalPrice: null,
    store: 'Amazon',
    category,
    brand,
    rating: null,
    reviewCount: null,
    availability: 'Check Amazon for availability',
    couponCode: null,
    isStoreDetected: true
  };
}

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
    
    // Method 2b: More aggressive Amazon patterns
    /id=["']?productTitle["']?[^>]*>([^<]+)</i,
    /class=["'][^"']*a-size-large[^"']*["'][^>]*>([^<]+)</i,
    /<h1[^>]*>([^<]+)</i, // Any h1 tag
    
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
 * Enhanced intelligent price extraction with better Amazon patterns
 */
function extractPriceIntelligently(html: string, store: string | null): { price: string | null; originalPrice: string | null } {
  let price: string | null = null;
  let originalPrice: string | null = null;
  
  // Enhanced Amazon-specific price patterns
  if (store === 'amazon') {
    const amazonCurrentPricePatterns = [
      // Amazon specific current price patterns (from enhanced-test.js)
      /<span[^>]*class="[^"]*a-price[^"]*"[^>]*>.*?<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>\$?([\d,]+\.?\d*)<\/span>/is,
      /<span[^>]*class="[^"]*apexPriceToPay[^"]*"[^>]*>.*?\$?([\d,]+\.?\d*)/is,
      /<span[^>]*class="[^"]*a-price-current[^"]*"[^>]*>.*?\$?([\d,]+\.?\d*)/is,
      
      // JSON data patterns
      /"priceAmount":\s*"?\$?([\d,]+\.?\d*)"?/i,
      /"currentPrice":\s*"?\$?([\d,]+\.?\d*)"?/i,
      /"price":\s*"?\$?([\d,]+\.?\d*)"?/i,
      
      // Generic price patterns
      /price[^>]*>\s*\$?([\d,]+\.?\d*)/i,
      /\$\s*([\d,]+\.?\d*)/i,
      
      // Alternative formats
      /USD\s*([\d,]+\.?\d*)/i,
      /([\d,]+\.?\d*)\s*USD/i,
      
      // More aggressive patterns for partial content
      /a-offscreen[^>]*>\$?([\d,]+\.?\d*)/i,
      /a-price[^>]*>\$?([\d,]+\.?\d*)/i
    ];
    
    const amazonOriginalPricePatterns = [
      /<span[^>]*class="[^"]*a-text-strike[^"]*"[^>]*>.*?\$?([\d,]+\.?\d*)/is,
      /<span[^>]*class="[^"]*list-price[^"]*"[^>]*>.*?\$?([\d,]+\.?\d*)/is,
      /"listPrice":\s*"?\$?([\d,]+\.?\d*)"?/i,
      /"originalPrice":\s*"?\$?([\d,]+\.?\d*)"?/i,
      /was\s*\$?([\d,]+\.?\d*)/i,
      /List.*?\$?([\d,]+\.?\d*)/i,
      
      // More aggressive patterns
      /strike[^>]*>\$?([\d,]+\.?\d*)/i,
      /list-price[^>]*>\$?([\d,]+\.?\d*)/i
    ];
    
    // Extract current price
    for (const pattern of amazonCurrentPricePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const priceNum = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(priceNum) && priceNum > 0) {
          price = match[1]; // Remove $ symbol, return clean number
          break;
        }
      }
    }
    
    // Extract original price
    for (const pattern of amazonOriginalPricePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const priceNum = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(priceNum) && priceNum > 0) {
          originalPrice = match[1]; // Remove $ symbol, return clean number
          break;
        }
      }
    }
  }
  
  // Fallback to general price patterns if Amazon-specific didn't work
  if (!price || !originalPrice) {
    // Store-specific price extraction
    if (store && STORE_CONFIGS[store]) {
      const config = STORE_CONFIGS[store];
      
      for (const selector of config.priceSelectors) {
        const selectorRegex = new RegExp(`${escapeRegex(selector)}[^>]*>([^<]*\\$[\\d,]+\\.?\\d*[^<]*)<`, 'i');
        const match = html.match(selectorRegex);
        if (match && match[1]) {
          const priceText = match[1].match(/\$[\d,]+\.?\d*/);
          if (priceText && !price) {
            price = priceText[0].replace('$', ''); // Remove $ symbol
          }
        }
      }
    }
    
    // General price extraction patterns
    const generalPricePatterns = [
      // JSON data patterns
      /"priceAmount":\s*"?\$?([\d,]+\.?\d*)"?/i,
      /"currentPrice":\s*"?\$?([\d,]+\.?\d*)"?/i,
      /"price":\s*"?\$?([\d,]+\.?\d*)"?/i,
      
      // HTML patterns
      /price[^>]*>\s*\$?([\d,]+\.?\d*)/i,
      /class=["'][^"']*price[^"']*["'][^>]*>\s*\$?([\d,]+\.?\d*)/i,
      
      // Legacy patterns
      /["']price["']\s*:\s*["']?\$?([\d,]+\.?\d*)["']?/i,
      /["']currentPrice["']\s*:\s*["']?\$?([\d,]+\.?\d*)["']?/i,
      /["']salePrice["']\s*:\s*["']?\$?([\d,]+\.?\d*)["']?/i
    ];
    
    for (const pattern of generalPricePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const priceNum = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(priceNum) && priceNum > 0) {
          if (!price) {
            price = match[1]; // Clean numeric value without $
          } else if (!originalPrice && price !== match[1]) {
            originalPrice = match[1]; // Clean numeric value without $
          }
        }
      }
    }
  }
  
  // Final fallback: extract all price mentions and sort
  if (!price) {
    const allPrices = html.match(/\$[\d,]+\.?\d*/g);
    if (allPrices && allPrices.length > 0) {
      const uniquePrices = Array.from(new Set(allPrices));
      const sortedPrices = uniquePrices.sort((a, b) => {
        const aNum = parseFloat(a.replace(/[\$,]/g, ''));
        const bNum = parseFloat(b.replace(/[\$,]/g, ''));
        return aNum - bNum;
      });
      
      if (sortedPrices.length > 0) {
        price = sortedPrices[0].replace('$', ''); // Remove $ symbol
      }
      
      if (!originalPrice && sortedPrices.length > 1) {
        originalPrice = sortedPrices[sortedPrices.length - 1].replace('$', ''); // Remove $ symbol
      }
    }
  }
  
  return { price, originalPrice };
}

/**
 * Enhanced intelligent image extraction - extracts multiple images
 */
function extractImagesIntelligently(html: string, store: string | null): string[] {
  const images: string[] = [];
  
  // Store-specific image extraction
  if (store && STORE_CONFIGS[store]) {
    const config = STORE_CONFIGS[store];
    
    for (const selector of config.imageSelectors) {
      // Convert CSS selector to regex for common patterns
      const patterns = [
        new RegExp(`${escapeRegex(selector)}[^>]*src=["']([^"']+)["']`, 'gi'),
        new RegExp(`${escapeRegex(selector)}[^>]*data-src=["']([^"']+)["']`, 'gi'),
        new RegExp(`${escapeRegex(selector)}[^>]*data-lazy-src=["']([^"']+)["']`, 'gi')
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null && images.length < 10) {
          if (match[1] && !images.includes(match[1])) {
            const cleanUrl = match[1].startsWith('//') ? 'https:' + match[1] : match[1];
            if (cleanUrl.includes('http') && (cleanUrl.includes('.jpg') || cleanUrl.includes('.png') || cleanUrl.includes('.webp') || cleanUrl.includes('.jpeg'))) {
              images.push(cleanUrl);
            }
          }
        }
      }
    }
  }
  
  // Amazon-specific image extraction
  if (store === 'amazon') {
    const amazonImagePatterns = [
      // High-quality Amazon images
      /"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g,
      /"large":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g,
      /data-src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g,
      /src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g,
      // Additional Amazon image sources
      /"thumb":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g,
      /"main":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g
    ];
    
    for (const pattern of amazonImagePatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && images.length < 10) {
        if (match[1] && !images.includes(match[1])) {
          // Convert to high-resolution format
          const highResImage = match[1].replace(/\._.*?_/, '._AC_SX679_');
          images.push(highResImage);
        }
      }
    }
  }
  
  // General image extraction patterns
  const generalPatterns = [
    // Open Graph images
    /<meta[^>]*property=["']?og:image["']?[^>]*content=["']([^"']+)["']/gi,
    /<meta[^>]*name=["']?twitter:image["']?[^>]*content=["']([^"']+)["']/gi,
    
    // Product image patterns
    /<img[^>]*class=["'][^"']*product[^"']*["'][^>]*src=["']([^"']+)["']/gi,
    /<img[^>]*data-src=["']([^"']+)["'][^>]*class=["'][^"']*product[^"']*/gi,
    
    // Gallery and carousel images
    /<img[^>]*class=["'][^"']*(?:gallery|carousel|slider)[^"']*["'][^>]*src=["']([^"']+)["']/gi
  ];
  
  for (const pattern of generalPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null && images.length < 10) {
      if (match[1] && !images.includes(match[1])) {
        const cleanUrl = match[1].startsWith('//') ? 'https:' + match[1] : match[1];
        if (cleanUrl.includes('http') && (cleanUrl.includes('.jpg') || cleanUrl.includes('.png') || cleanUrl.includes('.webp') || cleanUrl.includes('.jpeg'))) {
          images.push(cleanUrl);
        }
      }
    }
  }
  
  return images.slice(0, 10); // Limit to 10 images
}

/**
 * Legacy single image extraction for backward compatibility
 */
function extractImageIntelligently(html: string, store: string | null): string | null {
  const images = extractImagesIntelligently(html, store);
  return images.length > 0 ? images[0] : null;
}

/**
 * Extract product category intelligently
 */
function extractCategoryIntelligently(html: string, store: string | null, url: string): string | null {
  // URL-based category detection
  const urlCategories = {
    'electronics': ['Electronics', 'Tech'],
    'computers': ['Computers', 'Laptops'],
    'tablet': ['Tablets', 'Electronics'],
    'phone': ['Smartphones', 'Mobile'],
    'tv': ['TV & Home Theater', 'Electronics'],
    'camera': ['Cameras', 'Photography'],
    'home': ['Home & Garden', 'Home'],
    'kitchen': ['Kitchen & Dining', 'Home'],
    'book': ['Books', 'Education'],
    'clothing': ['Clothing', 'Fashion'],
    'shoes': ['Shoes', 'Fashion'],
    'beauty': ['Beauty & Personal Care', 'Health'],
    'health': ['Health & Wellness', 'Health'],
    'toys': ['Toys & Games', 'Kids'],
    'sports': ['Sports & Outdoors', 'Fitness'],
    'automotive': ['Automotive', 'Cars'],
    'jewelry': ['Jewelry', 'Fashion'],
    'watch': ['Watches', 'Fashion']
  };
  
  const lowerUrl = url.toLowerCase();
  for (const [keyword, categories] of Object.entries(urlCategories)) {
    if (lowerUrl.includes(keyword)) {
      return categories[0];
    }
  }
  
  // HTML-based category extraction
  const categoryPatterns = [
    // Breadcrumb navigation
    /<nav[^>]*class=["'][^"']*breadcrumb[^"']*["'][^>]*>(.*?)<\/nav>/i,
    /<ol[^>]*class=["'][^"']*breadcrumb[^"']*["'][^>]*>(.*?)<\/ol>/i,
    
    // Category meta tags
    /<meta[^>]*name=["']?category["']?[^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']?product:category["']?[^>]*content=["']([^"']+)["']/i,
    
    // Amazon specific
    /"wayfinding-breadcrumbs_feature_div"[^>]*>(.*?)<\/div>/i
  ];
  
  for (const pattern of categoryPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      // Extract category from breadcrumb or category text
      const categoryText = match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const words = categoryText.split(/[>\|\/]/).map(w => w.trim()).filter(w => w.length > 2);
      if (words.length > 0) {
        return words[words.length - 1]; // Take the most specific category
      }
    }
  }
  
  return null;
}

/**
 * Enhanced brand extraction with better patterns
 */
function extractBrandIntelligently(html: string, store: string | null): string | null {
  // Amazon-specific brand extraction
  if (store === 'amazon') {
    const amazonBrandPatterns = [
      // Enhanced brand patterns from enhanced-test.js
      /<span[^>]*class="[^"]*po-brand[^"]*"[^>]*>([^<]+)<\/span>/i,
      /<tr[^>]*>.*?<td[^>]*class="[^"]*po-brand[^"]*"[^>]*>([^<]+)<\/td>/is,
      /"brand":\s*"([^"]+)"/i,
      /"manufacturer":\s*"([^"]+)"/i,
      /Brand:\s*([^<\n]+)/i,
      /by\s+([A-Z][a-zA-Z\s]+)(?:\s|$)/i,
      
      // Original patterns  
      /<tr[^>]*>.*?<td[^>]*class="[^"]*po-brand[^"]*"[^>]*>.*?<span[^>]*>([^<]+)<\/span>/is,
      /"brand":\s*{\s*"name":\s*"([^"]+)"/i,
      /Brand:\s*([A-Z][a-zA-Z\s&]+?)(?:\s|<|$)/i,
      /by\s+([A-Z][a-zA-Z\s&]+?)(?:\s+in\s|\s+for\s|\s*$)/i,
      /^([A-Z][a-zA-Z]+)\s+/i
    ];
    
    for (const pattern of amazonBrandPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].trim()) {
        const brand = cleanText(match[1].trim());
        
        // Validate brand name (should be reasonable length and not generic text)
        if (brand.length > 1 && brand.length < 50 && 
            !brand.toLowerCase().includes('your recent') &&
            !brand.toLowerCase().includes('customer') &&
            !brand.toLowerCase().includes('product') &&
            !brand.toLowerCase().includes('item') &&
            !brand.toLowerCase().includes('visit') &&
            /^[A-Za-z][A-Za-z\s&\-\.0-9]*$/.test(brand)) {
          return brand;
        }
      }
    }
  }
  
  // General brand patterns for other stores
  const generalBrandPatterns = [
    // Meta tags
    /<meta[^>]*name=["']?brand["']?[^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']?product:brand["']?[^>]*content=["']([^"']+)["']/i,
    
    // JSON-LD structured data
    /"brand"\s*:\s*{\s*"name"\s*:\s*"([^"]+)"/i,
    /"brand"\s*:\s*"([^"]+)"/i,
    /"manufacturer"\s*:\s*"([^"]+)"/i,
    
    // General brand patterns
    /<span[^>]*class=["'][^"']*brand[^"']*["'][^>]*>([^<]+)<\/span>/i,
    /<div[^>]*class=["'][^"']*brand[^"']*["'][^>]*>([^<]+)<\/div>/i,
    
    // Page content patterns
    /Brand:\s*([A-Z][a-zA-Z\s&\-\.]+?)(?:\s|<|$)/i,
    /Manufacturer:\s*([A-Z][a-zA-Z\s&\-\.]+?)(?:\s|<|$)/i
  ];
  
  for (const pattern of generalBrandPatterns) {
    const match = html.match(pattern);
    if (match && match[1] && match[1].trim()) {
      const brand = cleanText(match[1].trim());
      if (brand.length > 1 && brand.length < 50 && 
          /^[A-Za-z][A-Za-z\s&\-\.0-9]*$/.test(brand)) {
        return brand;
      }
    }
  }
  
  return null;
}

/**
 * Extract rating and review information
 */
function extractRatingAndReviews(html: string, store: string | null): { rating: string | null; reviewCount: string | null } {
  let rating: string | null = null;
  let reviewCount: string | null = null;
  
  const ratingPatterns = [
    // General rating patterns
    /"ratingValue"\s*:\s*"?([\d.]+)"?/i,
    /<span[^>]*class=["'][^"']*rating[^"']*["'][^>]*>([\d.]+)[^<]*<\/span>/i,
    /<div[^>]*class=["'][^"']*rating[^"']*["'][^>]*>([\d.]+)[^<]*<\/div>/i,
    
    // Amazon specific
    /<span[^>]*class=["'][^"']*a-icon-alt[^"']*["'][^>]*>([\d.]+)[^<]*<\/span>/i,
    /<a[^>]*class=["'][^"']*reviewCountTextLinkedHistogram[^"']*["'][^>]*>([\d.]+)[^<]*<\/a>/i
  ];
  
  const reviewCountPatterns = [
    /"reviewCount"\s*:\s*"?([\d,]+)"?/i,
    /<span[^>]*class=["'][^"']*review[^"']*count[^"']*["'][^>]*>([\d,]+)[^<]*<\/span>/i,
    /<a[^>]*class=["'][^"']*reviewCountTextLinkedHistogram[^"']*["'][^>]*>[^<]*([\d,]+)[^<]*reviews?[^<]*<\/a>/i,
    
    // Amazon specific
    />([\d,]+)\s*(?:customer\s*)?reviews?</i,
    />([\d,]+)\s*ratings?</i
  ];
  
  for (const pattern of ratingPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const ratingNum = parseFloat(match[1]);
      if (!isNaN(ratingNum) && ratingNum >= 0 && ratingNum <= 5) {
        rating = match[1];
        break;
      }
    }
  }
  
  for (const pattern of reviewCountPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      reviewCount = match[1].replace(/,/g, '');
      break;
    }
  }
  
  return { rating, reviewCount };
}

/**
 * Extract availability information
 */
function extractAvailability(html: string, store: string | null): string | null {
  const availabilityPatterns = [
    // General availability
    /"availability"\s*:\s*"([^"]+)"/i,
    /<span[^>]*class=["'][^"']*availability[^"']*["'][^>]*>([^<]+)<\/span>/i,
    /<div[^>]*class=["'][^"']*availability[^"']*["'][^>]*>([^<]+)<\/div>/i,
    
    // Amazon specific
    /<div[^>]*id=["']?availability["']?[^>]*>.*?<span[^>]*>([^<]+)<\/span>/i,
    /<span[^>]*class=["'][^"']*a-text-success[^"']*["'][^>]*>([^<]+)<\/span>/i,
    
    // Common availability indicators
    /In Stock|Available|Ships.*?days?|Ready to ship/i,
    /Out of Stock|Temporarily Unavailable|Currently Unavailable/i
  ];
  
  for (const pattern of availabilityPatterns) {
    const match = html.match(pattern);
    if (match && match[1] && match[1].trim()) {
      const availability = cleanText(match[1].trim());
      if (availability.length > 3 && availability.length < 100) {
        return availability;
      }
    }
  }
  
  return null;
}

/**
 * Clean and normalize text
 */
function cleanText(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[\r\n\t]/g, ' ')
    .trim();
}

/**
 * Enhanced product description extraction
 */
function extractDescription(html: string, store: string | null, title: string | null): string | null {
  // Amazon-specific description patterns
  if (store === 'amazon') {
    const amazonDescriptionPatterns = [
      // Enhanced patterns from enhanced-test.js
      /<div[^>]*id="feature-bullets"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i,
      /<div[^>]*class="[^"]*product-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /"description":\s*"([^"]+)"/i,
      
      // Original patterns
      /<div[^>]*class="[^"]*feature[^"]*"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i,
      /<div[^>]*id="productDescription"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*about-this-item[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<meta[^>]*name=["']?description["']?[^>]*content=["']([^"']+)["']/i
    ];
    
    for (const pattern of amazonDescriptionPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let description = match[1]
          .replace(/<li[^>]*>/gi, '• ')
          .replace(/<\/li>/gi, '\n')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .trim();
        
        // Clean up and format
        description = cleanText(description);
        
        if (description.length > 50 && description.length < 2000) {
          // Limit to reasonable length
          return description.substring(0, 500).trim();
        }
      }
    }
  }
  
  // General store description patterns
  const generalDescriptionPatterns = [
    // Meta description
    /<meta[^>]*name=["']?description["']?[^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']?og:description["']?[^>]*content=["']([^"']+)["']/i,
    
    // Product description divs
    /<div[^>]*class=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*product[^"']*detail[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    
    // JSON structured data
    /"description":\s*"([^"]+)"/i,
    
    // Store-specific selectors
    ...STORE_CONFIGS[store || '']?.descriptionSelectors?.map(selector => 
      new RegExp(`${escapeRegex(selector)}[^>]*>([^<]+)<`, 'i')
    ) || []
  ];
  
  for (const pattern of generalDescriptionPatterns) {
    const match = html.match(pattern);
    if (match && match[1] && match[1].trim()) {
      let description = cleanText(match[1].trim());
      if (description.length > 20 && description.length < 1000) {
        return description.substring(0, 500);
      }
    }
  }
  
  // Fallback: Generate smart description based on title and store
  if (title && store) {
    const storeName = STORE_CONFIGS[store]?.name || store;
    return `Great ${storeName} deal! ${title} - Check out this amazing offer with excellent value and quality.`;
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
    
    // Method 3: proxy-cors.vercel.app (alternative)
    {
      name: 'proxy-cors',
      getUrl: (url: string) => `https://proxy-cors.vercel.app/api/proxy?url=${encodeURIComponent(url)}`
    },
    
    // Method 4: codetabs.com
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
        if (html.length > 500 && !html.includes('automated access') && !html.includes('captcha')) {
          console.log(`✅ Successfully fetched via ${method.name} (${html.length} chars)`);
          return html;
        } else if (html.length > 200 && (html.includes('price') || html.includes('product') || html.includes('title'))) {
          console.log(`🔍 Using partial content from ${method.name} (${html.length} chars - contains product data)`);
          console.log(`🔍 Sample content:`, html.substring(0, 500).replace(/\s+/g, ' '));
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
      console.log('⚠️ Proxy fetch failed, attempting smart URL-based extraction');
      
      // Enhanced Amazon URL pattern extraction
      if (store === 'amazon') {
        const urlParts = url.split('/');
        
        // Extract product title from URL segments (Amazon puts product name in URL)
        let productTitle = 'Amazon Product';
        for (let i = 0; i < urlParts.length; i++) {
          const part = urlParts[i];
          if (part && part.length > 10 && !part.includes('.') && part.includes('-') && !part.includes('dp')) {
            productTitle = part.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            break;
          }
        }
        
        // Try to extract ASIN (Amazon product ID) for future reference
        const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
        const asin = asinMatch ? asinMatch[1] : null;
        
        const category = extractCategoryIntelligently('', store, url);
        
        // Return enriched data based on URL analysis
        return {
          title: productTitle,
          description: `${productTitle} - Amazon product. Get this great deal with fast shipping and reliable service.`,
          image: null,
          images: [],
          price: null,
          originalPrice: null,
          store: 'Amazon',
          category,
          brand: 'Amazon',
          rating: null,
          reviewCount: null,
          availability: 'Check availability on Amazon',
          couponCode: null,
          isStoreDetected: true
        };
      }
      
      // Fallback: Generate data based on URL and store detection
      if (store) {
        const storeName = config?.name || store;
        const category = extractCategoryIntelligently('', store, url);
        return {
          title: `${storeName} Product Deal`,
          description: `Great deal from ${storeName}! Check out this amazing offer.`,
          image: null,
          images: [],
          price: null,
          originalPrice: null,
          store: storeName,
          category,
          brand: null,
          rating: null,
          reviewCount: null,
          availability: null,
          couponCode: null,
          isStoreDetected: true
        };
      }
      
      // Generic fallback
      const title = url.split('/').pop()?.replace(/[-_]/g, ' ') || 'Great Deal';
      return {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        description: 'Amazing deal! Limited time offer.',
        image: null,
        images: [],
        price: null,
        originalPrice: null,
        store: null,
        category: null,
        brand: null,
        rating: null,
        reviewCount: null,
        availability: null,
        couponCode: null,
        isStoreDetected: false
      };
    }
    
    // AI-powered extraction
    console.log('🤖 Performing comprehensive AI-powered content extraction...');
    console.log('📝 HTML length:', html.length, 'chars');
    console.log('📝 HTML preview:', html.substring(0, 200).replace(/\s+/g, ' '));
    
    const title = extractTitleIntelligently(html, store);
    console.log('🏷️ Extracted title:', title);
    
    const { price, originalPrice } = extractPriceIntelligently(html, store);
    console.log('💰 Extracted prices:', { price, originalPrice });
    
    const image = extractImageIntelligently(html, store);
    const images = extractImagesIntelligently(html, store);
    console.log('🖼️ Extracted images:', images?.length || 0);
    
    const description = extractDescription(html, store, title);
    const category = extractCategoryIntelligently(html, store, url);
    const brand = extractBrandIntelligently(html, store);
    const { rating, reviewCount } = extractRatingAndReviews(html, store);
    const availability = extractAvailability(html, store);
    
    const result: UrlData = {
      title: title || (store ? `${config?.name || store} Product` : 'Product Deal'),
      description: description || 'Great deal! Limited time offer.',
      image,
      images,
      price,
      originalPrice,
      store: config?.name || store,
      category,
      brand,
      rating,
      reviewCount,
      availability,
      couponCode: null, // Will be extracted if patterns are found
      isStoreDetected: !!store
    };
    
    console.log('✅ Enhanced AI extraction complete:', result);
    console.log(`📊 Extracted data summary: 
      - Title: ${result.title ? '✓' : '✗'}
      - Images: ${result.images.length} found
      - Price: ${result.price ? '✓' : '✗'}
      - Brand: ${result.brand ? '✓' : '✗'}
      - Category: ${result.category ? '✓' : '✗'}
      - Rating: ${result.rating ? '✓' : '✗'}
      - Reviews: ${result.reviewCount ? '✓' : '✗'}
    `);
    
    // Check if extraction was successful (got meaningful data)
    const hasRealData = result.price || result.originalPrice || result.images.length > 0 || 
                       (result.title && result.title !== 'Amazon Product' && result.title !== 'Amazoncom' && result.title.length > 10);
    
    if (!hasRealData && store === 'amazon') {
      console.log('⚠️ Poor extraction results, using enhanced URL-based fallback');
      return extractFromAmazonUrl(url);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ URL extraction failed:', error);
    
    // Ultimate fallback with all required properties
    return {
      title: 'Deal Alert',
      description: 'Check out this amazing deal!',
      image: null,
      images: [],
      price: null,
      originalPrice: null,
      store: null,
      category: null,
      brand: null,
      rating: null,
      reviewCount: null,
      availability: null,
      couponCode: null,
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
 * Enhanced validation function with comprehensive data extraction
 */
export async function validateUrl(url: string): Promise<any> {
  try {
    if (!isValidUrlFormat(url)) {
      return { isReachable: false, error: 'Invalid URL format' };
    }

    // Use our enhanced AI extraction for validation
    const extractedData = await extractUrlData(url);
    
    return {
      isReachable: true,
      title: extractedData.title,
      description: extractedData.description,
      price: extractedData.price?.replace('$', '') || null, // Remove $ symbol for form compatibility
      originalPrice: extractedData.originalPrice?.replace('$', '') || null, // Remove $ symbol
      images: extractedData.images || [], // Multiple images support
      image: extractedData.image, // Legacy single image support
      store: extractedData.store,
      category: extractedData.category,
      brand: extractedData.brand,
      rating: extractedData.rating,
      reviewCount: extractedData.reviewCount,
      availability: extractedData.availability,
      couponCode: extractedData.couponCode,
      isStoreDetected: extractedData.isStoreDetected
    };
  } catch (error: any) {
    console.error('URL validation failed:', error);
    return { isReachable: false, error: error?.message || 'Validation failed' };
  }
}
