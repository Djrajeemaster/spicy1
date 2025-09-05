# 🗑️ PROJECT CLEANUP PLAN

## FILES TO REMOVE

### 1. **Duplicate/Old Markdown Documentation** (20+ files)
```
ADMIN_ENHANCEMENTS.md
ADMIN_UX_ENHANCEMENTS.md
AUTOMATED_TESTING_SUCCESS.md
BOTTOM_NAVIGATION_IMPROVEMENTS.md
COMPLETE_E2E_TESTING_PLAN.md
COVERAGE_GUIDE.md
DEPLOYMENT.md
ENVIRONMENT_CONFIG.md
IMAGE_DISPLAY_INFO.md
NAVIGATION_OPTIMIZATIONS.md
PATCH_NOTES.md
PLAYWRIGHT_GENERATION_PROMPT.md
PRODUCTION_READY.md
SCROLL_HEADER_ANIMATION.md
SECURITY_FIXES.md
TEST_USERS.md
TESTING_GUIDE.md
VPS_MOBILE_CONFIG.md
fix-deployment-issues.md
```

### 2. **Test HTML Files** (for manual testing)
```
test-auth.html
test-auth-secure.html
debug-api.html
```

### 3. **Temporary/Backup Files**
```
temp_make_admin.sql
cookies.txt
[username].tsx
site-logo-backup-1756867839078.png (and other backups)
```

### 4. **Old Test Results**
```
test-results.xml
test-results.json
test-results/.last-run.json
playwright-report/ (folder)
```

### 5. **Duplicate Script Files**
```
test-runner.js
test-asset-url.js
```

### 6. **PowerShell Scripts** (if not needed)
```
update-services.ps1
update-admin-services.ps1
fix-empty-lines.ps1
run-role-based-tests.bat
run-complete-e2e.bat
```

### 7. **Database Dumps** (old)
```
full_dump.sql
full_dump_localpatched.sql
```

### 8. **Old Service Duplicates**
```
services/admin/ (entire folder - duplicates main services/)
services/adminUserService.ts (duplicate of admin/adminUserService.ts)
services/adminElevation.ts (duplicate)
services/adminCrud.ts (duplicate)
services/flagsService.ts (duplicate)
services/impersonationService.ts (duplicate)
```

### 9. **Old Test Files**
```
tests/ (entire folder - replaced by e2e-tests/)
e2e-tests/simple-debug-test.test.js
e2e-tests/complete-navigation-flow.test.js
e2e-tests/auth-complete-flow.ts
```

## ESTIMATED SPACE SAVINGS: **~50MB+**

## RECOMMENDED CLEANUP ORDER:
1. Remove documentation files (keep only essential ones)
2. Remove test HTML files
3. Remove old test results and reports
4. Remove duplicate service files
5. Remove old SQL dumps
6. Remove PowerShell scripts (if not using Windows deployment)
7. Remove old test folders

## FILES TO KEEP:
- package.json, tsconfig.json, eas.json (essential config)
- Current working e2e tests
- Active service files
- Current database migration files
- Essential documentation (README.md if it exists)
