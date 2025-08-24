# Admin Merge (Option B) — Full Project Update

Added to your existing admin (theme-matched):
- `app/admin/users.tsx`
- `app/admin/flags.tsx`
- `app/admin/settings.tsx`

Services:
- `services/admin/adminRoles.ts`
- `services/admin/impersonationService.ts`
- `services/admin/flagsService.ts`

Edge Functions (stable names):
- `supabase/functions/_shared/admin-guard/index.ts`
- `supabase/functions/admin-users/index.ts`
- `supabase/functions/admin-set-role/index.ts`
- `supabase/functions/admin-impersonate-start/index.ts`
- `supabase/functions/admin-impersonate-stop/index.ts`
- `supabase/functions/admin-flags/index.ts`
- `supabase/functions/admin-config/index.ts`

SQL (safe & additive):
- `supabase/sql/20250824_feature_flags.sql`
- `supabase/sql/20250824_impersonation_sessions.sql`
- `supabase/sql/20250824_prevent_last_super.sql`

## Deploy
```bash
supabase functions deploy admin-users admin-set-role admin-impersonate-start admin-impersonate-stop admin-flags admin-config
# Apply SQL (choose one)
supabase db push
# or run the .sql files under supabase/sql manually
```

## Nav
Link to:
- `/admin/users`
- `/admin/flags`
- `/admin/settings`
