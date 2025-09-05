@echo off
REM APK Build Script for SaversDream App (Windows)

echo 🚀 Starting APK build process...

REM Step 1: Navigate to project directory
cd /d "f:\bolt\spicy\project"

REM Step 2: Set production environment
set NODE_ENV=production

REM Step 3: Clean previous builds
echo 🧹 Cleaning previous builds...
call expo prebuild --clean --platform android

REM Step 4: Build APK using EAS
echo 📱 Building APK for production...
call eas build --platform android --profile production

echo ✅ Build submitted! Check https://expo.dev for build status
echo 📧 You'll receive an email when the build is complete
echo 📲 Download link will be provided in the email and EAS dashboard

pause
