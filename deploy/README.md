# 🚀 VPS Deployment Package

## 📁 Deploy Folder Contents

This folder contains all the essential files needed to deploy your SaversDream application to a VPS.

### 📋 Files Included:

#### **Backend Server Files:**
- `server.js` - Main server application
- `package.json` - Dependencies and scripts
- `package-lock.json` - Dependency lock file

#### **Configuration Files:**
- `.env.production` - Production environment variables
- `site-settings.json` - Application settings
- `app.json` - Expo app configuration

#### **Built Web Application:**
- `dist/` - Complete built React web app
- `index.html` - Launching page

#### **Static Assets:**
- `assets/` - Images, icons, and static files

#### **Database & Scripts:**
- `scripts/` - Database setup and utility scripts
- `database/` - Database related files
- `apply-chat-schema.js` - Database schema setup

## 🚀 Deployment Instructions

### **1. Upload to VPS**
```bash
# Upload the entire deploy folder to your VPS
scp -r deploy/ user@your-vps:/path/to/app/
```

### **2. Setup on VPS**
```bash
# Navigate to your app directory
cd /path/to/app

# Install dependencies
npm install

# Setup database (if needed)
node scripts/create-tables.js
node apply-chat-schema.js

# Start the server
npm run server:prod
```

### **3. Configure Environment**
- Update `.env.production` with your actual database credentials
- Update domain URLs if needed
- Ensure database is accessible from your VPS

### **4. Web Server Configuration**
Configure your web server (Nginx/Apache) to:
- Serve static files from `dist/` folder
- Proxy API requests to your Node.js server
- Handle SSL certificates for HTTPS

## 🔧 Post-Deployment Checklist

- [ ] Server starts without errors
- [ ] Database connection works
- [ ] Static assets load correctly
- [ ] API endpoints respond
- [ ] Admin panel accessible
- [ ] Maintenance mode toggle works
- [ ] SSL certificate configured

## ⚠️ Dependency Resolution

**Fixed:** Removed `lucide-react-native` dependency conflict with React 19. The deployment package now uses `--legacy-peer-deps` flag to handle any remaining peer dependency conflicts.

## 📊 File Sizes

- **Total Deploy Package**: ~15-25MB
- **Built Web App (dist/)**: ~8-12MB
- **Assets**: ~2-5MB
- **Server Files**: ~1-2MB

## 🔐 Security Notes

- Change all default passwords and secrets in `.env.production`
- Use strong database credentials
- Configure firewall rules
- Keep dependencies updated
- Monitor server logs

## 📞 Support

If you encounter issues:
1. Check server logs: `tail -f logs/app.log`
2. Verify database connection
3. Test API endpoints manually
4. Check file permissions

## 🎯 Next Steps

After successful deployment:
1. ✅ Test all functionality
2. ✅ Configure domain and SSL
3. ✅ Setup monitoring
4. ✅ Configure backups
5. ✅ Build and deploy mobile app

---

**Happy Deploying! 🚀**
