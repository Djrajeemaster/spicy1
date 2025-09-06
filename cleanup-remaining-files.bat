@echo off
echo =======================================================
echo CLEANING UP REMAINING AGGREGATION AND PIPELINE FILES
echo =======================================================

echo.
echo Removing API files...
if exist "api\pipeline.js" (
    del "api\pipeline.js"
    echo ✓ Removed api\pipeline.js
) else (
    echo - api\pipeline.js not found
)

if exist "api\aggregation.js" (
    del "api\aggregation.js"
    echo ✓ Removed api\aggregation.js
) else (
    echo - api\aggregation.js not found
)

if exist "api\aggregation-filters.js" (
    del "api\aggregation-filters.js"
    echo ✓ Removed api\aggregation-filters.js
) else (
    echo - api\aggregation-filters.js not found
)

echo.
echo Removing database schema files...
if exist "database\aggregation-schema.sql" (
    del "database\aggregation-schema.sql"
    echo ✓ Removed database\aggregation-schema.sql
) else (
    echo - database\aggregation-schema.sql not found
)

if exist "database\aggregation-filters-schema.sql" (
    del "database\aggregation-filters-schema.sql"
    echo ✓ Removed database\aggregation-filters-schema.sql
) else (
    echo - database\aggregation-filters-schema.sql not found
)

echo.
echo Keeping cleanup-old-aggregation.sql for reference...
echo.
echo =======================================================
echo CLEANUP COMPLETE!
echo =======================================================
echo.
echo Files removed:
echo - api\pipeline.js
echo - api\aggregation.js
echo - api\aggregation-filters.js
echo - database\aggregation-schema.sql
echo - database\aggregation-filters-schema.sql
echo.
echo Files kept:
echo - database\cleanup-old-aggregation.sql (for reference)
echo.
pause
