# Local Android Build Setup Guide

## Prerequisites for Local Building

### 1. Install Android Studio
- Download from: https://developer.android.com/studio
- Install Android SDK (API 34 recommended)
- Configure ANDROID_HOME environment variable

### 2. Install Java Development Kit (JDK)
- Download JDK 17 from: https://www.oracle.com/java/technologies/downloads/
- Configure JAVA_HOME environment variable

### 3. Environment Variables Setup (Windows)
Add to your system PATH:
```
ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Java\jdk-17

Add to PATH:
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
%JAVA_HOME%\bin
```

### 4. Local Build Commands
```bash
# Generate native Android project
expo prebuild --platform android

# Build debug APK locally
expo run:android --variant debug

# Build release APK locally (requires signing)
expo run:android --variant release
```

## APK Signing (Required for Release)
1. Generate keystore:
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Add to app.json:
```json
{
  "expo": {
    "android": {
      "package": "com.djrajeemix.saversdream",
      "buildType": "apk"
    }
  }
}
```
