require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const http = require('http');
const https = require('https');

const port = process.env.PORT || 3000;
const protocol = process.env.NODE_ENV === 'production' ? https : http;
const host = process.env.NODE_ENV === 'production' ? process.env.PRODUCTION_HOST : 'localhost';

function healthCheck() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: port,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.status === 'healthy') {
            resolve(response);
          } else {
            reject(new Error(`Health check failed: ${response.status}`));
          }
        } catch (err) {
          reject(new Error(`Invalid response: ${data}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });
    
    req.end();
  });
}

async function main() {
  try {
    console.log('Performing health check...');
    const result = await healthCheck();
    console.log('✅ Health check passed:', result);
    process.exit(0);
  } catch (err) {
    console.error('❌ Health check failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { healthCheck };