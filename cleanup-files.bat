@echo off
echo ============================================
echo CLEANING UP OLD FILES
echo ============================================

echo Removing test files...
del /f /q test-*.js 2>nul
del /f /q deploy-*.js 2>nul

echo Removing old SQL files...
del /f /q add-sample-deals.sql 2>nul
del /f /q populate-aggregation-data.sql 2>nul
del /f /q insert_sample_deals.sql 2>nul

echo Removing old setup scripts...
del /f /q setup-filters.js 2>nul
del /f /q setup-smart-filters.js 2>nul
del /f /q run-filters-schema.js 2>nul
del /f /q populate-aggregation-data.js 2>nul

echo Removing old check scripts...
del /f /q check-deals-table.js 2>nul
del /f /q check-references.js 2>nul
del /f /q insert-test-deals.js 2>nul

echo Removing old service files...
del /f /q services\DealProcessingPipeline.js 2>nul
del /f /q services\SmartDealProcessor.js 2>nul

echo ============================================
echo CLEANUP COMPLETE!
echo ============================================
echo.
echo Next steps:
echo 1. Run the manual-database-reset.sql in your PostgreSQL
echo 2. We'll create the new clean services
echo ============================================
