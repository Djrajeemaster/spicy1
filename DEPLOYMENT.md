# Deployment Guide

## Security Fixes Applied

### 1. Environment Configuration
- ✅ Separated development and production environment files
- ✅ Removed hardcoded credentials from codebase
- ✅ Added secure JWT token authentication
- ✅ Configured proper CORS for production

### 2. Security Middleware
- ✅ Added rate limiting (100 requests/15min general, 5 auth/15min)
- ✅ Input validation and sanitization
- ✅ Security headers (Helmet.js)
- ✅ Request/error logging with Winston

### 3. Authentication & Authorization
- ✅ JWT-based authentication with refresh tokens
- ✅ Role-based access control
- ✅ Secure password hashing (bcrypt rounds: 12 for prod)
- ✅ HTTP-only cookies for refresh tokens

### 4. Database Security
- ✅ SSL connection for production
- ✅ Connection pooling
- ✅ Database migrations script
- ✅ Proper indexes for performance

## Pre-Deployment Checklist

### 1. Environment Setup
```bash
# Install security dependencies
npm install express-rate-limit helmet jsonwebtoken validator winston dotenv

# Run database migrations
npm run migrate

# Test health check
npm run health-check
```

### 2. Configure Production Environment
1. Copy `.env.production` and update with real values:
   - Database URL with production credentials
   - Strong JWT secrets (use crypto.randomBytes(64).toString('hex'))
   - Production domain for CORS
   - SSL certificate paths

### 3. SSL Certificate Setup
```bash
# Create SSL directory
mkdir -p docker/ssl

# Add your SSL certificates
# - cert.pem (certificate)
# - private.key (private key)
```

### 4. Database Setup
1. Create production PostgreSQL database
2. Update DATABASE_URL in `.env.production`
3. Run migrations: `NODE_ENV=production npm run migrate`

### 5. Docker Deployment
```bash
# Build and start services
cd docker
docker-compose up -d

# Check logs
docker-compose logs -f app

# Health check
curl https://yourdomain.com/health
```

## Security Recommendations

### 1. Secrets Management
- Use AWS Secrets Manager, Azure Key Vault, or similar
- Rotate JWT secrets regularly
- Use different secrets for each environment

### 2. Monitoring
- Set up log aggregation (ELK stack, Splunk)
- Configure alerts for failed authentication attempts
- Monitor API rate limits and errors

### 3. Backup Strategy
- Automated database backups
- Test restore procedures
- Store backups in separate location

### 4. Additional Security
- Enable 2FA for admin accounts
- Regular security audits
- Keep dependencies updated
- Use Web Application Firewall (WAF)

## Production Deployment Commands

```bash
# 1. Install dependencies
npm ci --only=production

# 2. Run migrations
NODE_ENV=production npm run migrate

# 3. Start server
NODE_ENV=production npm run server:prod

# 4. Or use Docker
docker-compose -f docker/docker-compose.yml up -d
```

## Monitoring Endpoints

- Health Check: `GET /health`
- Metrics: Check application logs in `logs/` directory
- Error Tracking: Configured with Winston logger

## Emergency Procedures

### 1. Security Incident
1. Check logs: `tail -f logs/error.log`
2. Block suspicious IPs via nginx
3. Rotate JWT secrets if compromised
4. Review database for unauthorized access

### 2. Performance Issues
1. Check health endpoint
2. Monitor database connections
3. Review rate limiting logs
4. Scale horizontally if needed

## Post-Deployment Verification

1. ✅ Health check returns 200
2. ✅ Authentication works with JWT tokens
3. ✅ Rate limiting is active
4. ✅ HTTPS redirects working
5. ✅ Security headers present
6. ✅ Database connections secure
7. ✅ Logs are being written
8. ✅ Error handling works properly