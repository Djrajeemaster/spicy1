const axios = require('axios');
const cheerio = require('cheerio');

class CompetitorResearcher {
  constructor() {
    this.competitors = {
      desiDime: {
        baseUrl: 'https://www.desidime.com',
        dealsEndpoint: '/deals'
      },
      cashKaro: {
        baseUrl: 'https://www.cashkaro.com',
        dealsEndpoint: '/deals'
      },
      couponDunia: {
        baseUrl: 'https://www.coupondunia.in',
        dealsEndpoint: '/deals'
      },
      grabOn: {
        baseUrl: 'https://www.grabon.in',
        dealsEndpoint: '/deals'
      }
    };

    this.stores = [
      'amazon',
      'flipkart',
      'myntra',
      'nykaa',
      'bigbasket'
    ];
  }

  async researchCompetitor(competitorName, requestedStores = null) {
    console.log(`🔍 researchCompetitor called with: ${competitorName}`);
    const competitor = this.competitors[competitorName];
    if (!competitor) {
      console.log(`❌ Unknown competitor: ${competitorName}`);
      throw new Error(`Unknown competitor: ${competitorName}`);
    }

    try {
      console.log(`🔍 Researching ${competitorName}...`);

      // Note: In a real implementation, you would need to handle:
      // 1. Rate limiting
      // 2. Anti-bot measures
      // 3. Terms of service compliance
      // 4. API keys if available

      const deals = [];
      
      // Use requested stores or all stores
      const storesToResearch = requestedStores || this.stores;
      console.log(`🏪 Stores for ${competitorName}:`, storesToResearch);

      // Mock data for demonstration
      // Replace with actual scraping logic
      for (const store of storesToResearch) {
        const mockDeals = await this.generateMockDeals(competitorName, store);
        deals.push(...mockDeals);
      }

      return deals;
    } catch (error) {
      console.error(`Error researching ${competitorName}:`, error);
      return [];
    }
  }

  async extractRealImages(url, store, product = null) {
    try {
      // Add delay to be respectful to servers
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Store-specific image selectors
      const imageSelectors = {
        'flipkart': ['._396cs4', '._2r_TV6 img', 'img[data-image-index]'],
        'bigbasket': ['img[data-qa="product-image"]', '.img-responsive', 'img[src*="bigbasket"]'],
        'nykaa': ['.css-1c4ww8m img', '.product-image img', 'img[alt*="product"]'],
        'myntra': ['.image-grid-image', '.product-image img', 'img[data-src]'],
        'amazon': ['img[data-image-index]', '.a-dynamic-image', 'img[alt*="product"]']
      };

      const selectors = imageSelectors[store.toLowerCase()] || imageSelectors['amazon'];

      // Fetch the page content
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0'
        },
        timeout: 15000,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      const images = [];

      // Try each selector
      for (const selector of selectors) {
        $(selector).each((index, element) => {
          if (images.length >= 3) return false; // Limit to 3 images

          const src = $(element).attr('src') || $(element).attr('data-src') || $(element).attr('data-lazy-src');
          if (src && src.startsWith('http') && !src.includes('placeholder') && !src.includes('default')) {
            images.push(src);
          }
        });

        if (images.length > 0) break; // Stop if we found images with this selector
      }

      if (images.length > 0) {
        return images.slice(0, 3); // Return up to 3 real images
      }
    } catch (error) {
      console.warn(`Failed to extract real images from ${url}:`, error.message);
    }

    // Fallback to store-specific Unsplash images if extraction fails
    return this.getFallbackImages(store, product);
  }

  getFallbackImages(store, product = null) {
    // Product-specific image mapping
    const productImageMap = {
      // Electronics
      'phone': [
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
        'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400'
      ],
      'laptop': [
        'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400'
      ],
      'headphone': [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400'
      ],
      'tv': [
        'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400',
        'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=400',
        'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400'
      ],
      'watch': [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
        'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400',
        'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=400'
      ],

      // Fashion
      'jeans': [
        'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
        'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=400',
        'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400'
      ],
      'shirt': [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        'https://images.unsplash.com/photo-1604695573706-53170668f6a6?w=400',
        'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400'
      ],
      'shoes': [
        'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400',
        'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=400'
      ],
      'jacket': [
        'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400',
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400'
      ],

      // Beauty
      'makeup': [
        'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
        'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400',
        'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=400'
      ],
      'skincare': [
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
        'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=400',
        'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400'
      ],

      // Grocery
      'milk': [
        'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
        'https://images.unsplash.com/photo-1563636619-e9143da7977e?w=400',
        'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400'
      ],
      'vegetable': [
        'https://images.unsplash.com/photo-1582515073490-39981397c445?w=400',
        'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400',
        'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400'
      ],
      'snack': [
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
        'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400',
        'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400'
      ]
    };

    // Function to determine product type from name
    const getProductType = (productName, category) => {
      const name = productName.toLowerCase();

      if (name.includes('phone') || name.includes('nord') || name.includes('samsung') || name.includes('realme') || name.includes('oneplus')) return 'phone';
      if (name.includes('laptop') || name.includes('macbook') || name.includes('air')) return 'laptop';
      if (name.includes('headphone') || name.includes('earphone') || name.includes('rockerz') || name.includes('boat')) return 'headphone';
      if (name.includes('tv') || name.includes('television') || name.includes('led')) return 'tv';
      if (name.includes('watch') || name.includes('colorfit') || name.includes('noise')) return 'watch';
      if (name.includes('jean') || name.includes('511')) return 'jeans';
      if (name.includes('shirt') || name.includes('t-shirt') || name.includes('cotton')) return 'shirt';
      if (name.includes('shoe') || name.includes('sneaker') || name.includes('air max') || name.includes('nike')) return 'shoes';
      if (name.includes('coat') || name.includes('jacket') || name.includes('wool')) return 'jacket';
      if (name.includes('milk') || name.includes('amul')) return 'milk';
      if (name.includes('carrot') || name.includes('apple') || name.includes('vegetable') || name.includes('fresho')) return 'vegetable';
      if (name.includes('bhujia') || name.includes('snack') || name.includes('chips')) return 'snack';
      if (name.includes('cream') || name.includes('lotion') || name.includes('skincare') || name.includes('cetaphil') || name.includes('loreal')) return 'skincare';
      if (name.includes('lipstick') || name.includes('mascara') || name.includes('makeup') || name.includes('lakme') || name.includes('maybelline')) return 'makeup';

      // Fallback to category-based matching
      if (category) {
        const cat = category.toLowerCase();
        if (cat.includes('electronics')) return 'phone';
        if (cat.includes('fashion') || cat.includes('clothing')) return 'shirt';
        if (cat.includes('beauty')) return 'makeup';
        if (cat.includes('grocery') || cat.includes('food')) return 'milk';
      }

      return 'phone'; // Default fallback
    };

    // Get product-specific images
    if (product) {
      const productType = getProductType(product.name, product.category);
      if (productImageMap[productType]) {
        return productImageMap[productType];
      }
    }

    // Fallback to store-specific images
    const fallbackImages = {
      'amazon': productImageMap['phone'],
      'flipkart': productImageMap['phone'],
      'myntra': productImageMap['shirt'],
      'nykaa': productImageMap['makeup'],
      'bigbasket': productImageMap['milk']
    };

    return fallbackImages[store.toLowerCase()] || productImageMap['phone'];
  }

  async generateMockDeals(competitor, store) {
    console.log(`🔍 Scraping real products from ${store}...`);

    try {
      const products = await this.scrapeStoreProducts(store);
      const storeConfig = this.getStoreConfig(store);

      return products.map((product, index) => {
        const urlPattern = storeConfig.urlPatterns[index % storeConfig.urlPatterns.length];
        const url = urlPattern(product);

        return {
          id: `${competitor}-${store}-${index}`,
          title: `${product.name} - ${store.charAt(0).toUpperCase() + store.slice(1)} Deal`,
          price: product.price,
          original_price: product.original_price || product.price * 1.2,
          discount_percentage: product.discount_percentage || Math.round(((product.original_price || product.price * 1.2) - product.price) / (product.original_price || product.price * 1.2) * 100),
          store: store.charAt(0).toUpperCase() + store.slice(1),
          competitor: competitor,
          url: url,
          description: product.description || `${product.name} - Great deal from ${store}`,
          images: product.images || this.getFallbackImages(store, product),
          category: product.category || 'General',
          found_at: new Date().toISOString()
        };
      });
    } catch (error) {
      console.error(`❌ Failed to scrape ${store}:`, error.message);
      return [];
    }
  }

  getStoreConfig(store) {
    const storeConfigs = {
      'amazon': {
        domain: 'amazon.in',
        urlPatterns: [
          (product) => `https://www.amazon.in/dp/${product.sku}`
        ]
      },
      'flipkart': {
        domain: 'flipkart.com',
        urlPatterns: [
          (product) => `https://www.flipkart.com/${product.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}/p/${product.sku}`
        ]
      },
      'myntra': {
        domain: 'myntra.com',
        urlPatterns: [
          (product) => `https://www.myntra.com/${product.sku}`
        ]
      },
      'nykaa': {
        domain: 'nykaafashion.com',
        urlPatterns: [
          (product) => `https://www.nykaafashion.com/product/${product.sku}`
        ]
      },
      'bigbasket': {
        domain: 'bigbasket.com',
        urlPatterns: [
          (product) => `https://www.bigbasket.com/pd/${product.sku}/${product.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}/`
        ]
      }
    };

    return storeConfigs[store.toLowerCase()] || storeConfigs['amazon'];
  }

  async scrapeStoreProducts(store) {
    console.log(`🔍 Starting to scrape ${store}...`);

    switch (store.toLowerCase()) {
      case 'amazon':
        return await this.scrapeAmazon();
      case 'flipkart':
        return await this.scrapeFlipkart();
      case 'myntra':
        return await this.scrapeMyntra();
      case 'nykaa':
        return await this.scrapeNykaa();
      case 'bigbasket':
        return await this.scrapeBigBasket();
      default:
        console.log(`⚠️ No scraper available for ${store}, using fallback`);
        return this.getFallbackProducts(store);
    }
  }

  async scrapeAmazon() {
    try {
      // Scrape Amazon's deals page or search for popular products
      const searchUrls = [
        'https://www.amazon.in/s?k=smartphones&ref=sr_pg_1',
        'https://www.amazon.in/s?k=laptops&ref=sr_pg_1',
        'https://www.amazon.in/s?k=headphones&ref=sr_pg_1'
      ];

      const products = [];

      for (const url of searchUrls) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Cache-Control': 'max-age=0'
            },
            timeout: 15000
          });

          const $ = cheerio.load(response.data);

          // Extract product data from Amazon search results
          $('.s-result-item[data-component-type="s-search-result"]').each((index, element) => {
            if (products.length >= 10) return false; // Limit to 10 products

            const $el = $(element);
            const title = $el.find('h2 a span').text().trim();
            const priceText = $el.find('.a-price-whole').first().text().replace(/,/g, '');
            const price = parseInt(priceText) || 0;
            const image = $el.find('.s-image').attr('src');
            const link = $el.find('h2 a').attr('href');
            const asin = link ? link.match(/\/dp\/([A-Z0-9]+)/)?.[1] : null;

            if (title && price > 0 && asin) {
              products.push({
                name: title,
                price: price,
                original_price: Math.round(price * 1.3), // Estimate original price
                sku: asin,
                images: image ? [image] : [],
                category: 'Electronics',
                description: `${title} - Available on Amazon`
              });
            }
          });

          await new Promise(resolve => setTimeout(resolve, 2000)); // Respectful delay
        } catch (error) {
          console.warn(`Failed to scrape Amazon URL ${url}:`, error.message);
        }
      }

      return products.length > 0 ? products : this.getFallbackProducts('amazon');
    } catch (error) {
      console.error('Amazon scraping failed:', error.message);
      return this.getFallbackProducts('amazon');
    }
  }

  async scrapeFlipkart() {
    try {
      // Scrape Flipkart's search pages
      const searchUrls = [
        'https://www.flipkart.com/search?q=smartphones',
        'https://www.flipkart.com/search?q=laptops',
        'https://www.flipkart.com/search?q=headphones'
      ];

      const products = [];

      for (const url of searchUrls) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Cache-Control': 'max-age=0'
            },
            timeout: 15000
          });

          const $ = cheerio.load(response.data);

          // Extract product data from Flipkart search results
          $('._1AtVbE').each((index, element) => {
            if (products.length >= 10) return false;

            const $el = $(element);
            const title = $el.find('a[title]').attr('title') || $el.find('.IRpwTa').text().trim();
            const priceText = $el.find('._30jeq3').text().replace(/[^\d]/g, '');
            const price = parseInt(priceText) || 0;
            const originalPriceText = $el.find('._3I9_wc').text().replace(/[^\d]/g, '');
            const originalPrice = parseInt(originalPriceText) || price * 1.2;
            const image = $el.find('img').attr('src');
            const link = $el.find('a').attr('href');
            const sku = link ? link.match(/\/p\/([^?]+)/)?.[1] : null;

            if (title && price > 0 && sku) {
              products.push({
                name: title,
                price: price,
                original_price: originalPrice,
                sku: sku,
                images: image ? [image] : [],
                category: 'Electronics',
                description: `${title} - Available on Flipkart`
              });
            }
          });

          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.warn(`Failed to scrape Flipkart URL ${url}:`, error.message);
        }
      }

      return products.length > 0 ? products : this.getFallbackProducts('flipkart');
    } catch (error) {
      console.error('Flipkart scraping failed:', error.message);
      return this.getFallbackProducts('flipkart');
    }
  }

  async scrapeMyntra() {
    try {
      // Scrape Myntra's search pages
      const searchUrls = [
        'https://www.myntra.com/jeans-men',
        'https://www.myntra.com/tshirts-men',
        'https://www.myntra.com/shoes-men'
      ];

      const products = [];

      for (const url of searchUrls) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Cache-Control': 'max-age=0'
            },
            timeout: 15000
          });

          const $ = cheerio.load(response.data);

          // Extract product data from Myntra
          $('.product-base').each((index, element) => {
            if (products.length >= 10) return false;

            const $el = $(element);
            const title = $el.find('.product-product').text().trim();
            const priceText = $el.find('.product-discountedPrice').text().replace(/[^\d]/g, '');
            const price = parseInt(priceText) || 0;
            const originalPriceText = $el.find('.product-strike').text().replace(/[^\d]/g, '');
            const originalPrice = parseInt(originalPriceText) || price * 1.2;
            const image = $el.find('img').attr('src');
            const link = $el.find('a').attr('href');
            const sku = link ? link.split('/').pop() : null;

            if (title && price > 0 && sku) {
              products.push({
                name: title,
                price: price,
                original_price: originalPrice,
                sku: sku,
                images: image ? [image] : [],
                category: 'Fashion',
                description: `${title} - Available on Myntra`
              });
            }
          });

          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.warn(`Failed to scrape Myntra URL ${url}:`, error.message);
        }
      }

      return products.length > 0 ? products : this.getFallbackProducts('myntra');
    } catch (error) {
      console.error('Myntra scraping failed:', error.message);
      return this.getFallbackProducts('myntra');
    }
  }

  async scrapeNykaa() {
    try {
      // Scrape Nykaa's product pages
      const categoryUrls = [
        'https://www.nykaafashion.com/catalogue/makeup/c/20',
        'https://www.nykaafashion.com/catalogue/skincare/c/16',
        'https://www.nykaafashion.com/catalogue/hair/c/15'
      ];

      const products = [];

      for (const url of categoryUrls) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Cache-Control': 'max-age=0'
            },
            timeout: 15000
          });

          const $ = cheerio.load(response.data);

          // Extract product data from Nykaa
          $('.product-item').each((index, element) => {
            if (products.length >= 10) return false;

            const $el = $(element);
            const title = $el.find('.product-title').text().trim();
            const priceText = $el.find('.product-price').text().replace(/[^\d]/g, '');
            const price = parseInt(priceText) || 0;
            const originalPriceText = $el.find('.product-mrp').text().replace(/[^\d]/g, '');
            const originalPrice = parseInt(originalPriceText) || price * 1.2;
            const image = $el.find('img').attr('src');
            const link = $el.find('a').attr('href');
            const sku = link ? link.split('/').pop() : null;

            if (title && price > 0 && sku) {
              products.push({
                name: title,
                price: price,
                original_price: originalPrice,
                sku: sku,
                images: image ? [image] : [],
                category: 'Beauty',
                description: `${title} - Available on Nykaa`
              });
            }
          });

          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.warn(`Failed to scrape Nykaa URL ${url}:`, error.message);
        }
      }

      return products.length > 0 ? products : this.getFallbackProducts('nykaa');
    } catch (error) {
      console.error('Nykaa scraping failed:', error.message);
      return this.getFallbackProducts('nykaa');
    }
  }

  async scrapeBigBasket() {
    try {
      // Scrape BigBasket's category pages
      const categoryUrls = [
        'https://www.bigbasket.com/pc/fruits-vegetables/fresh-fruits/',
        'https://www.bigbasket.com/pc/foodgrains-oil-masala/cooking-oil/',
        'https://www.bigbasket.com/pc/dairy-eggs/dairy/'
      ];

      const products = [];

      for (const url of categoryUrls) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Cache-Control': 'max-age=0'
            },
            timeout: 15000
          });

          const $ = cheerio.load(response.data);

          // Extract product data from BigBasket
          $('.item').each((index, element) => {
            if (products.length >= 10) return false;

            const $el = $(element);
            const title = $el.find('.ng-binding').first().text().trim();
            const priceText = $el.find('.discnt-price').text().replace(/[^\d]/g, '');
            const price = parseInt(priceText) || 0;
            const originalPriceText = $el.find('.mp-price').text().replace(/[^\d]/g, '');
            const originalPrice = parseInt(originalPriceText) || price * 1.2;
            const image = $el.find('img').attr('src');
            const link = $el.find('a').attr('href');
            const sku = link ? link.match(/\/pd\/(\d+)/)?.[1] : null;

            if (title && price > 0 && sku) {
              products.push({
                name: title,
                price: price,
                original_price: originalPrice,
                sku: sku,
                images: image ? [image] : [],
                category: 'Grocery',
                description: `${title} - Available on BigBasket`
              });
            }
          });

          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.warn(`Failed to scrape BigBasket URL ${url}:`, error.message);
        }
      }

      return products.length > 0 ? products : this.getFallbackProducts('bigbasket');
    } catch (error) {
      console.error('BigBasket scraping failed:', error.message);
      return this.getFallbackProducts('bigbasket');
    }
  }

  getFallbackProducts(store) {
    // Return some basic fallback products if scraping fails
    const fallbacks = {
      'amazon': [{
        name: 'Sample Electronics Product',
        price: 999,
        original_price: 1299,
        sku: 'SAMPLE001',
        images: [],
        category: 'Electronics',
        description: 'Sample product from Amazon'
      }],
      'flipkart': [{
        name: 'Sample Electronics Product',
        price: 999,
        original_price: 1299,
        sku: 'SAMPLE001',
        images: [],
        category: 'Electronics',
        description: 'Sample product from Flipkart'
      }],
      'myntra': [{
        name: 'Sample Fashion Product',
        price: 999,
        original_price: 1299,
        sku: 'SAMPLE001',
        images: [],
        category: 'Fashion',
        description: 'Sample product from Myntra'
      }],
      'nykaa': [{
        name: 'Sample Beauty Product',
        price: 999,
        original_price: 1299,
        sku: 'SAMPLE001',
        images: [],
        category: 'Beauty',
        description: 'Sample product from Nykaa'
      }],
      'bigbasket': [{
        name: 'Sample Grocery Product',
        price: 999,
        original_price: 1299,
        sku: 'SAMPLE001',
        images: [],
        category: 'Grocery',
        description: 'Sample product from BigBasket'
      }]
    };

    return fallbacks[store.toLowerCase()] || fallbacks['amazon'];
  }

  async researchAllCompetitors(requestedCompetitors = null, requestedStores = null) {
    const allDeals = [];
    
    // Use requested competitors or all competitors
    const competitorsToResearch = requestedCompetitors || Object.keys(this.competitors);
    console.log('🔍 Competitors to research:', competitorsToResearch);
    
    // Use requested stores or all stores
    const storesToResearch = requestedStores || this.stores;
    console.log('🏪 Stores to research:', storesToResearch);

    for (const competitorName of competitorsToResearch) {
      console.log(`🔍 Researching competitor: ${competitorName}`);
      const deals = await this.researchCompetitor(competitorName, storesToResearch);
      console.log(`📊 Found ${deals.length} deals from ${competitorName}`);
      allDeals.push(...deals);

      // Add delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`📊 Total deals found: ${allDeals.length}`);
    return allDeals;
  }

  async checkForDuplicates(deals, pool) {
    const results = [];

    for (const deal of deals) {
      const duplicateCheck = await this.findDuplicates(deal, pool);
      results.push({
        ...deal,
        isDuplicate: duplicateCheck.isDuplicate,
        duplicateReason: duplicateCheck.reason,
        existingDealId: duplicateCheck.existingDealId,
        similarityScore: duplicateCheck.similarityScore
      });
    }

    return results;
  }

  async findDuplicates(deal, pool) {
    try {
      // Check for exact URL match
      const urlCheck = await pool.query(
        'SELECT id, title FROM deals WHERE deal_url = $1 AND status != $2',
        [deal.url, 'deleted']
      );

      if (urlCheck.rows.length > 0) {
        return {
          isDuplicate: true,
          reason: 'Exact URL match',
          existingDealId: urlCheck.rows[0].id,
          similarityScore: 100
        };
      }

      // Check for similar titles (basic similarity check)
      const titleWords = deal.title.toLowerCase().split(' ');
      const significantWords = titleWords.filter(word => word.length > 3);

      if (significantWords.length > 0) {
        const titleQuery = significantWords.map((_, i) => `LOWER(title) LIKE $${i + 1}`).join(' AND ');
        const titleParams = significantWords.map(word => `%${word}%`);

        const titleCheck = await pool.query(
          `SELECT id, title FROM deals WHERE ${titleQuery} AND status != $(${significantWords.length + 1})`,
          [...titleParams, 'deleted']
        );

        for (const existingDeal of titleCheck.rows) {
          const similarity = this.calculateTitleSimilarity(deal.title, existingDeal.title);
          if (similarity > 70) { // 70% similarity threshold
            return {
              isDuplicate: true,
              reason: 'Similar title found',
              existingDealId: existingDeal.id,
              similarityScore: similarity
            };
          }
        }
      }

      return {
        isDuplicate: false,
        reason: null,
        existingDealId: null,
        similarityScore: 0
      };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return {
        isDuplicate: false,
        reason: null,
        existingDealId: null,
        similarityScore: 0
      };
    }
  }

  calculateTitleSimilarity(title1, title2) {
    const words1 = title1.toLowerCase().split(' ').filter(word => word.length > 2);
    const words2 = title2.toLowerCase().split(' ').filter(word => word.length > 2);

    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;

    return totalWords > 0 ? (commonWords.length / totalWords) * 100 : 0;
  }

  async saveDealsToDatabase(deals, pool, createdBy = '00000000-0000-0000-0000-000000000000') {
    // Store UUID mappings
    const storeMappings = {
      'Amazon': '660e8400-e29b-41d4-a716-446655440001',
      'Flipkart': '660e8400-e29b-41d4-a716-446655440002',
      'Myntra': '660e8400-e29b-41d4-a716-446655440004',
      'Nykaa': '660e8400-e29b-41d4-a716-446655440005',
      'BigBasket': '660e8400-e29b-41d4-a716-446655440003'
    };

    // Category UUID mappings
    const categoryMappings = {
      'Electronics': '550e8400-e29b-41d4-a716-446655440002',
      'Fashion': '550e8400-e29b-41d4-a716-446655440003',
      'Food & Beverages': '550e8400-e29b-41d4-a716-446655440001',
      'Health & Beauty': '550e8400-e29b-41d4-a716-446655440005',
      'Home & Garden': '550e8400-e29b-41d4-a716-446655440004'
    };

    const insertedDeals = [];

    for (const deal of deals) {
      try {
        const storeId = storeMappings[deal.store] || '660e8400-e29b-41d4-a716-446655440001'; // Default to Amazon
        const categoryId = categoryMappings[deal.category] || '550e8400-e29b-41d4-a716-446655440002'; // Default to Electronics

        const query = `
          INSERT INTO deals (
            title, description, price, original_price, discount_percentage,
            deal_url, category_id, store_id, created_by, city, state, status, images, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          RETURNING *
        `;

        const values = [
          deal.title,
          deal.description || `Great deal on ${deal.title.split(' - ')[0]} with ${deal.discount_percentage}% discount`,
          deal.price,
          deal.original_price,
          deal.discount_percentage,
          deal.url,
          categoryId,
          storeId,
          createdBy,
          'Unknown',
          'Unknown',
          'pending',
          deal.images || []
        ];

        const result = await pool.query(query, values);
        insertedDeals.push(result.rows[0]);

        console.log(`✅ Inserted deal: ${deal.title}`);
      } catch (error) {
        console.error(`❌ Failed to insert deal ${deal.title}:`, error);
      }
    }

    return insertedDeals;
  }
}

module.exports = CompetitorResearcher;
