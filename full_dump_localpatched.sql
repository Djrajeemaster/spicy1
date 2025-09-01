
-- =====================================================================
-- BOOTSTRAP SHIMS FOR MIGRATING FROM SUPABASE TO VANILLA POSTGRES
-- This block creates minimal schemas/roles/functions so a Supabase dump
-- can load on stock Postgres (no GraphQL/Vault).
-- =====================================================================

-- 1) Schemas expected by the dump
-- [removed supabase schema] CREATE SCHEMA IF NOT EXISTS extensions;
-- [removed supabase schema] CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS graphql;  -- placeholder schema (no pg_graphql installed)
CREATE SCHEMA IF NOT EXISTS vault;    -- placeholder schema (no supabase_vault installed)

-- 2) Roles that the dump may GRANT to
-- [removed supabase role bootstrap block]

-- 3) Vanilla-available extensions installed into "extensions" schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- 4) Minimal auth.users table (for FKs)
-- [removed DO block]

-- 5) Stub for NULL::uuid used by RLS policies (returns NULL locally)
-- [removed NULL::uuid stub]-- =====================================================================
-- END SHIMS
-- =====================================================================




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
COMMENT ON SCHEMA "public" IS 'standard public schema';
-- [patched] 
-- [removed supabase-only extension] 
-- [removed supabase-only extension]
-- [removed supabase-only extension] 
-- [removed supabase-only extension]
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- [patched] 
-- [removed supabase-only extension] 
-- [removed supabase-only extension]
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE OR REPLACE FUNCTION "public"."auto_flag_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If flag_count reaches 3 or more, automatically mark as flagged
  IF NEW.flag_count >= 3 AND NOT NEW.is_flagged THEN
    NEW.is_flagged = TRUE;
    NEW.flagged_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."auto_flag_comment"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."cleanup_expired_user_restrictions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Clean up expired bans
    UPDATE users 
    SET 
        is_banned = false,
        ban_expiry = NULL,
        status = 'active'
    WHERE 
        is_banned = true 
        AND ban_expiry IS NOT NULL 
        AND ban_expiry < NOW();
    -- Clean up expired suspensions
    UPDATE users 
    SET 
        status = 'active',
        suspend_expiry = NULL
    WHERE 
        status = 'suspended' 
        AND suspend_expiry IS NOT NULL 
        AND suspend_expiry < NOW();
END;
$$;
ALTER FUNCTION "public"."cleanup_expired_user_restrictions"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."cleanup_expired_user_restrictions"() IS 'Function to automatically clean up expired user bans and suspensions';
CREATE OR REPLACE FUNCTION "public"."deals_searchable_text_tg"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.searchable_text :=
      setweight(to_tsvector('pg_catalog.english', coalesce(NEW.title,'')), 'A')
   || setweight(to_tsvector('pg_catalog.english', coalesce(NEW.description,'')), 'B')
   || setweight(to_tsvector('pg_catalog.english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END
$$;
ALTER FUNCTION "public"."deals_searchable_text_tg"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."exec_sql"("sql" "text") RETURNS SETOF "record"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query execute sql;
end;
$$;
ALTER FUNCTION "public"."exec_sql"("sql" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."extract_usernames"("raw" "text") RETURNS "text"[]
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT lower(m[1])
      FROM regexp_matches(raw, '@([A-Za-z0-9_]{2,30})', 'g') AS m
    ), '{}'
  );
$$;
ALTER FUNCTION "public"."extract_usernames"("raw" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."handle_vote"("deal_id_param" "uuid", "user_id_param" "uuid", "vote_type_param" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  existing_vote_type text;
BEGIN
  -- Check for an existing vote
  SELECT vote_type INTO existing_vote_type FROM votes WHERE user_id = user_id_param AND deal_id = deal_id_param;
  -- Upsert the vote
  INSERT INTO votes (deal_id, user_id, vote_type)
  VALUES (deal_id_param, user_id_param, vote_type_param)
  ON CONFLICT (deal_id, user_id) DO UPDATE SET vote_type = vote_type_param;
  -- Update vote counts on deals table
  UPDATE deals SET
    votes_up = votes_up + (CASE WHEN vote_type_param = 'up' AND (existing_vote_type IS NULL OR existing_vote_type = 'down') THEN 1 WHEN vote_type_param = 'down' AND existing_vote_type = 'up' THEN -1 ELSE 0 END),
    votes_down = votes_down + (CASE WHEN vote_type_param = 'down' AND (existing_vote_type IS NULL OR existing_vote_type = 'up') THEN 1 WHEN vote_type_param = 'up' AND existing_vote_type = 'down' THEN -1 ELSE 0 END)
  WHERE id = deal_id_param;
END;
$$;
ALTER FUNCTION "public"."handle_vote"("deal_id_param" "uuid", "user_id_param" "uuid", "vote_type_param" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."increment_comment_count"("deal_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE deals 
  SET comment_count = COALESCE(comment_count, 0) + 1,
      updated_at = now()
  WHERE id = deal_id_param;
END;
$$;
ALTER FUNCTION "public"."increment_comment_count"("deal_id_param" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."is_superadmin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = user_id AND u.role = 'superadmin'
  );
$$;
ALTER FUNCTION "public"."is_superadmin"("user_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."log_admin_action"("p_action" "text", "p_entity_type" "text", "p_entity_id" "text", "p_admin_id" "uuid", "p_admin_username" "text", "p_details" "jsonb" DEFAULT NULL::"jsonb", "p_description" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        admin_id,
        admin_username,
        details,
        description
    ) VALUES (
        p_action,
        p_entity_type,
        p_entity_id,
        p_admin_id,
        p_admin_username,
        p_details,
        p_description
    ) RETURNING id INTO log_id;
    RETURN log_id;
END;
$$;
ALTER FUNCTION "public"."log_admin_action"("p_action" "text", "p_entity_type" "text", "p_entity_id" "text", "p_admin_id" "uuid", "p_admin_username" "text", "p_details" "jsonb", "p_description" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."on_comment_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  usernames text[];
  parent_author uuid;
BEGIN
  -- extract @mentions
  usernames := extract_usernames(NEW.content);
  -- create mention rows + notifications
  IF array_length(usernames,1) IS NOT NULL THEN
    INSERT INTO public.comment_mentions(comment_id, mentioned_user_id)
    SELECT NEW.id, u.id
    FROM public.users u
    WHERE lower(u.username) = ANY(usernames)
      AND u.id <> NEW.user_id
    ON CONFLICT DO NOTHING;
    INSERT INTO public.notifications(user_id, type, deal_id, comment_id)
    SELECT u.id, 'mention', NEW.deal_id, NEW.id
    FROM public.users u
    WHERE lower(u.username) = ANY(usernames)
      AND u.id <> NEW.user_id
    ON CONFLICT DO NOTHING;
  END IF;
  -- reply notification
  IF NEW.parent_id IS NOT NULL THEN
    SELECT c.user_id INTO parent_author
    FROM public.comments c
    WHERE c.id = NEW.parent_id;
    IF parent_author IS NOT NULL AND parent_author <> NEW.user_id THEN
      INSERT INTO public.notifications(user_id, type, deal_id, comment_id)
      VALUES (parent_author, 'reply', NEW.deal_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."on_comment_insert"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."prevent_last_super_admin"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Block demoting the last super_admin
  if TG_OP = 'UPDATE' and OLD.role = 'super_admin' and NEW.role <> 'super_admin' then
    if (select count(*) from public.users where role = 'super_admin' and id <> OLD.id) = 0 then
      raise exception 'Cannot demote the last super_admin';
    end if;
  end if;
  -- Block deleting the last super_admin
  if TG_OP = 'DELETE' and OLD.role = 'super_admin' then
    if (select count(*) from public.users where role = 'super_admin' and id <> OLD.id) = 0 then
      raise exception 'Cannot delete the last super_admin';
    end if;
  end if;
  return case when TG_OP='DELETE' then OLD else NEW end;
end $$;
ALTER FUNCTION "public"."prevent_last_super_admin"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."prevent_last_superadmin"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ begin if TG_OP = 'UPDATE' and OLD.role = 'superadmin' and NEW.role <> 'superadmin' then if (select count(*) from public.users where role = 'superadmin' and id <> OLD.id) = 0 then raise exception 'Cannot demote the last superadmin'; end if; end if; if TG_OP = 'DELETE' and OLD.role = 'superadmin' then if (select count(*) from public.users where role = 'superadmin' and id <> OLD.id) = 0 then raise exception 'Cannot delete the last superadmin'; end if; end if; return case when TG_OP='DELETE' then OLD else NEW end; end $$;
ALTER FUNCTION "public"."prevent_last_superadmin"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."prevent_last_superadmin_p1"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if TG_OP = 'UPDATE' and OLD.role = 'superadmin' and NEW.role <> 'superadmin' then
    if (select count(*) from public.users where role = 'superadmin' and id <> OLD.id) = 0 then
      raise exception 'Cannot demote the last superadmin (p1)';
    end if;
  end if;
  if TG_OP = 'DELETE' and OLD.role = 'superadmin' then
    if (select count(*) from public.users where role = 'superadmin' and id <> OLD.id) = 0 then
      raise exception 'Cannot delete the last superadmin (p1)';
    end if;
  end if;
  return case when TG_OP='DELETE' then OLD else NEW end;
end $$;
ALTER FUNCTION "public"."prevent_last_superadmin_p1"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_user_reports_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_user_reports_updated_at"() OWNER TO "postgres";
SET default_tablespace = '';
SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."admin_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "admin_id" "uuid",
    "action_type" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "duration_days" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "admin_actions_action_type_check" CHECK (("action_type" = ANY (ARRAY['ban'::"text", 'unban'::"text", 'verify'::"text", 'unverify'::"text", 'suspend'::"text", 'unsuspend'::"text", 'delete'::"text", 'restore'::"text", 'reset_password'::"text"])))
);
ALTER TABLE "public"."admin_actions" OWNER TO "postgres";
COMMENT ON TABLE "public"."admin_actions" IS 'Log of all administrative actions taken on users';
CREATE TABLE IF NOT EXISTS "public"."admin_elevation_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "valid_until" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "token_hash" "text"
);
ALTER TABLE "public"."admin_elevation_sessions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."alert_notifications_sent" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "alert_id" "uuid" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."alert_notifications_sent" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."alerts" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "rules" "jsonb" NOT NULL,
    "frequency" "text" DEFAULT 'instant'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "alerts_frequency_check" CHECK (("frequency" = ANY (ARRAY['instant'::"text", 'daily'::"text", 'weekly'::"text"]))),
    CONSTRAINT "alerts_type_check" CHECK (("type" = ANY (ARRAY['keyword'::"text", 'category'::"text", 'store'::"text", 'price_threshold'::"text"])))
);
ALTER TABLE "public"."alerts" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text" NOT NULL,
    "target_audience" "text" DEFAULT 'all'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "author_id" "uuid",
    "sent_count" integer DEFAULT 0,
    "views" integer DEFAULT 0,
    "send_push" boolean DEFAULT false,
    CONSTRAINT "announcements_target_audience_check" CHECK (("target_audience" = ANY (ARRAY['all'::"text", 'verified'::"text", 'business'::"text", 'moderators'::"text"]))),
    CONSTRAINT "announcements_type_check" CHECK (("type" = ANY (ARRAY['info'::"text", 'warning'::"text", 'urgent'::"text"])))
);
ALTER TABLE "public"."announcements" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."app_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "type" "text" DEFAULT 'json'::"text" NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."app_config" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "actor_role" "text" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text",
    "diff_json" "jsonb" DEFAULT '{}'::"jsonb",
    "ip" "text",
    "ua" "text",
    "impersonated_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."audit_log" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "admin_id" "uuid",
    "admin_username" "text",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "description" "text"
);
ALTER TABLE "public"."audit_logs" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."banners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "is_active" boolean DEFAULT true,
    "priority" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."banners" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "emoji" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "deal_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."categories" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."comment_mentions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "mentioned_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."comment_mentions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "content" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_flagged" boolean DEFAULT false,
    "flag_count" integer DEFAULT 0,
    "flagged_at" timestamp with time zone,
    "flagged_by" "uuid",
    "admin_reviewed" boolean DEFAULT false,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "comments_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'hidden'::"text", 'deleted'::"text"])))
);
ALTER TABLE "public"."comments" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."deals" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "original_price" numeric(10,2),
    "discount_percentage" integer,
    "category_id" "uuid" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "deal_url" "text",
    "coupon_code" "text",
    "images" "text"[] DEFAULT '{}'::"text"[],
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "country" "text" DEFAULT 'India'::"text",
    "is_online" boolean DEFAULT true,
    "start_date" timestamp with time zone,
    "expiry_date" timestamp with time zone,
    "status" "text" DEFAULT 'live'::"text",
    "created_by" "uuid" NOT NULL,
    "votes_up" integer DEFAULT 0,
    "votes_down" integer DEFAULT 0,
    "comment_count" integer DEFAULT 0,
    "view_count" integer DEFAULT 0,
    "click_count" integer DEFAULT 0,
    "save_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "searchable_text" "tsvector",
    CONSTRAINT "deals_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'live'::"text", 'expiring'::"text", 'expired'::"text", 'archived'::"text", 'pending'::"text"])))
);
ALTER TABLE "public"."deals" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."feature_flags" (
    "key" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "rollout" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."feature_flags" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."impersonation_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "target_user_id" "uuid" NOT NULL,
    "token_hash" "text" NOT NULL,
    "valid_until" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."impersonation_sessions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."notification_prefs" (
    "user_id" "uuid" NOT NULL,
    "mentions" boolean DEFAULT true,
    "replies" boolean DEFAULT true,
    "smart" boolean DEFAULT true,
    "marketing" boolean DEFAULT false,
    "quiet_hours_start" integer DEFAULT 22,
    "quiet_hours_end" integer DEFAULT 7
);
ALTER TABLE "public"."notification_prefs" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['mention'::"text", 'reply'::"text"])))
);
ALTER TABLE "public"."notifications" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "token" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "platform" "text" NOT NULL,
    "device_id" "text",
    "app_version" "text",
    "disabled" boolean DEFAULT false NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "push_tokens_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text", 'web'::"text"])))
);
ALTER TABLE "public"."push_tokens" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reports_reason_check" CHECK (("reason" = ANY (ARRAY['spam'::"text", 'expired'::"text", 'misleading'::"text", 'offensive'::"text", 'duplicate'::"text", 'other'::"text"]))),
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'resolved'::"text", 'dismissed'::"text"]))),
    CONSTRAINT "reports_target_type_check" CHECK (("target_type" = ANY (ARRAY['deal'::"text", 'comment'::"text", 'user'::"text"])))
);
ALTER TABLE "public"."reports" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."saved_deals" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."saved_deals" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."site_config" (
    "key" "text" NOT NULL,
    "value" "jsonb",
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);
ALTER TABLE "public"."site_config" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."store_follows" (
    "follower_id" "uuid" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."store_follows" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "description" "text",
    "website_url" "text",
    "verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."stores" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."system_settings" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."user_activities" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "target_type" "text",
    "target_id" "uuid",
    "description" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."user_activities" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."user_follows" (
    "follower_id" "uuid" NOT NULL,
    "followed_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."user_follows" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."user_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid",
    "reported_user_id" "uuid",
    "reported_content_id" "uuid",
    "content_type" "text",
    "reason" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "admin_notes" "text",
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'resolved'::"text", 'dismissed'::"text"])))
);
ALTER TABLE "public"."user_reports" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "is_verified_business" boolean DEFAULT false,
    "join_date" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'active'::"text",
    "reputation" numeric(3,1) DEFAULT 0.0,
    "total_posts" integer DEFAULT 0,
    "avatar_url" "text",
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_banned" boolean DEFAULT false,
    "ban_expiry" timestamp with time zone,
    "suspend_expiry" timestamp with time zone,
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'verified'::"text", 'business'::"text", 'moderator'::"text", 'admin'::"text", 'superadmin'::"text"]))),
    CONSTRAINT "users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'banned'::"text", 'suspended'::"text"])))
);
ALTER TABLE "public"."users" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."valid_admin_elevation_sessions" AS
 SELECT "id",
    "user_id",
    "token_hash"
   FROM "public"."admin_elevation_sessions"
  WHERE ("valid_until" > "now"());
ALTER VIEW "public"."valid_admin_elevation_sessions" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."valid_impersonation_sessions" AS
 SELECT "id",
    "admin_id",
    "target_user_id",
    "token_hash"
   FROM "public"."impersonation_sessions"
  WHERE ("valid_until" > "now"());
ALTER VIEW "public"."valid_impersonation_sessions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."votes" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "vote_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "votes_vote_type_check" CHECK (("vote_type" = ANY (ARRAY['up'::"text", 'down'::"text"])))
);
ALTER TABLE "public"."votes" OWNER TO "postgres";







































CREATE INDEX "admin_elevation_sessions_user_id_idx" ON "public"."admin_elevation_sessions" USING "btree" ("user_id", "valid_until");
CREATE INDEX "admin_elevation_user_idx" ON "public"."admin_elevation_sessions" USING "btree" ("user_id");
CREATE INDEX "admin_elevation_valid_idx" ON "public"."admin_elevation_sessions" USING "btree" ("valid_until");
CREATE INDEX "audit_log_action_idx" ON "public"."audit_log" USING "btree" ("action", "created_at" DESC);
CREATE INDEX "audit_log_actor_idx" ON "public"."audit_log" USING "btree" ("actor_id", "created_at" DESC);
CREATE INDEX "audit_log_created_idx" ON "public"."audit_log" USING "btree" ("created_at" DESC);
CREATE INDEX "audit_log_target_idx" ON "public"."audit_log" USING "btree" ("target_type", "target_id");
CREATE INDEX "idx_admin_actions_action_type" ON "public"."admin_actions" USING "btree" ("action_type");
CREATE INDEX "idx_admin_actions_admin_id" ON "public"."admin_actions" USING "btree" ("admin_id");
CREATE INDEX "idx_admin_actions_created_at" ON "public"."admin_actions" USING "btree" ("created_at");
CREATE INDEX "idx_admin_actions_user_id" ON "public"."admin_actions" USING "btree" ("user_id");
CREATE INDEX "idx_alert_notifications_sent_sent_at" ON "public"."alert_notifications_sent" USING "btree" ("sent_at");
CREATE INDEX "idx_alert_notifications_sent_user_id" ON "public"."alert_notifications_sent" USING "btree" ("user_id");
CREATE INDEX "idx_alerts_user" ON "public"."alerts" USING "btree" ("user_id");
CREATE INDEX "idx_announcements_created_at" ON "public"."announcements" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_announcements_is_active" ON "public"."announcements" USING "btree" ("is_active");
CREATE INDEX "idx_announcements_target_audience" ON "public"."announcements" USING "btree" ("target_audience");
CREATE INDEX "idx_audit_logs_admin" ON "public"."audit_logs" USING "btree" ("admin_id");
CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_audit_logs_entity" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id");
CREATE INDEX "idx_comments_admin_reviewed" ON "public"."comments" USING "btree" ("admin_reviewed");
CREATE INDEX "idx_comments_deal" ON "public"."comments" USING "btree" ("deal_id");
CREATE INDEX "idx_comments_flag_count" ON "public"."comments" USING "btree" ("flag_count");
CREATE INDEX "idx_comments_is_flagged" ON "public"."comments" USING "btree" ("is_flagged");
CREATE INDEX "idx_comments_parent" ON "public"."comments" USING "btree" ("parent_id");
CREATE INDEX "idx_comments_user" ON "public"."comments" USING "btree" ("user_id");
CREATE INDEX "idx_deals_category" ON "public"."deals" USING "btree" ("category_id");
CREATE INDEX "idx_deals_created_at" ON "public"."deals" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_deals_created_by" ON "public"."deals" USING "btree" ("created_by");
CREATE INDEX "idx_deals_expiry" ON "public"."deals" USING "btree" ("expiry_date");
CREATE INDEX "idx_deals_location" ON "public"."deals" USING "btree" ("city", "state");
CREATE INDEX "idx_deals_search" ON "public"."deals" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("title" || ' '::"text") || "description")));
CREATE INDEX "idx_deals_searchable_text" ON "public"."deals" USING "gin" ("searchable_text");
CREATE INDEX "idx_deals_status" ON "public"."deals" USING "btree" ("status");
CREATE INDEX "idx_deals_store" ON "public"."deals" USING "btree" ("store_id");
CREATE INDEX "idx_deals_votes" ON "public"."deals" USING "btree" ("votes_up" DESC, "votes_down");
CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id") WHERE ("read_at" IS NULL);
CREATE INDEX "idx_reports_created_at" ON "public"."reports" USING "btree" ("created_at");
CREATE INDEX "idx_reports_reporter_id" ON "public"."reports" USING "btree" ("reporter_id");
CREATE INDEX "idx_reports_status" ON "public"."reports" USING "btree" ("status");
CREATE INDEX "idx_reports_target" ON "public"."reports" USING "btree" ("target_type", "target_id");
CREATE INDEX "idx_reports_target_id" ON "public"."reports" USING "btree" ("target_id");
CREATE INDEX "idx_reports_target_type" ON "public"."reports" USING "btree" ("target_type");
CREATE INDEX "idx_saved_deals_deal" ON "public"."saved_deals" USING "btree" ("deal_id");
CREATE INDEX "idx_saved_deals_user" ON "public"."saved_deals" USING "btree" ("user_id");
CREATE INDEX "idx_store_follows_store" ON "public"."store_follows" USING "btree" ("store_id");
CREATE INDEX "idx_user_activities_created_at" ON "public"."user_activities" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_user_activities_target" ON "public"."user_activities" USING "btree" ("target_type", "target_id");
CREATE INDEX "idx_user_activities_user_id" ON "public"."user_activities" USING "btree" ("user_id");
CREATE INDEX "idx_user_follows_followed" ON "public"."user_follows" USING "btree" ("followed_id");
CREATE INDEX "idx_user_reports_created_at" ON "public"."user_reports" USING "btree" ("created_at");
CREATE INDEX "idx_user_reports_reported_user" ON "public"."user_reports" USING "btree" ("reported_user_id");
CREATE INDEX "idx_user_reports_reporter" ON "public"."user_reports" USING "btree" ("reporter_id");
CREATE INDEX "idx_user_reports_status" ON "public"."user_reports" USING "btree" ("status");
CREATE INDEX "idx_users_ban_expiry" ON "public"."users" USING "btree" ("ban_expiry") WHERE ("ban_expiry" IS NOT NULL);
CREATE INDEX "idx_users_is_banned" ON "public"."users" USING "btree" ("is_banned") WHERE ("is_banned" = true);
CREATE INDEX "idx_users_suspend_expiry" ON "public"."users" USING "btree" ("suspend_expiry") WHERE ("suspend_expiry" IS NOT NULL);
CREATE INDEX "idx_votes_deal" ON "public"."votes" USING "btree" ("deal_id");
CREATE INDEX "idx_votes_user" ON "public"."votes" USING "btree" ("user_id");
CREATE INDEX "impersonation_sessions_admin_idx" ON "public"."impersonation_sessions" USING "btree" ("admin_id", "valid_until");
CREATE INDEX "impersonation_sessions_target_idx" ON "public"."impersonation_sessions" USING "btree" ("target_user_id");
CREATE INDEX "notifications_user_idx" ON "public"."notifications" USING "btree" ("user_id", "read_at");
CREATE INDEX "push_tokens_user_id_idx" ON "public"."push_tokens" USING "btree" ("user_id");
CREATE OR REPLACE TRIGGER "trg_on_comment_insert" AFTER INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."on_comment_insert"();
CREATE OR REPLACE TRIGGER "trg_prevent_last_super_admin_delete" BEFORE DELETE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_last_super_admin"();
CREATE OR REPLACE TRIGGER "trg_prevent_last_super_admin_update" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_last_super_admin"();
CREATE OR REPLACE TRIGGER "trg_prevent_last_superadmin_delete" BEFORE DELETE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_last_superadmin"();
CREATE OR REPLACE TRIGGER "trg_prevent_last_superadmin_delete_p1" BEFORE DELETE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_last_superadmin_p1"();
CREATE OR REPLACE TRIGGER "trg_prevent_last_superadmin_update" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_last_superadmin"();
CREATE OR REPLACE TRIGGER "trg_prevent_last_superadmin_update_p1" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_last_superadmin_p1"();
CREATE OR REPLACE TRIGGER "trigger_auto_flag_comment" BEFORE UPDATE OF "flag_count" ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."auto_flag_comment"();
CREATE OR REPLACE TRIGGER "trigger_update_user_reports_updated_at" BEFORE UPDATE ON "public"."user_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_reports_updated_at"();
CREATE OR REPLACE TRIGGER "tsv_deals_searchable_text" BEFORE INSERT OR UPDATE OF "title", "description", "tags" ON "public"."deals" FOR EACH ROW EXECUTE FUNCTION "public"."deals_searchable_text_tg"();
CREATE OR REPLACE TRIGGER "update_alerts_updated_at" BEFORE UPDATE ON "public"."alerts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_banners_updated_at" BEFORE UPDATE ON "public"."banners" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_comments_updated_at" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_deals_updated_at" BEFORE UPDATE ON "public"."deals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_site_config_updated_at" BEFORE UPDATE ON "public"."site_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_stores_updated_at" BEFORE UPDATE ON "public"."stores" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_system_settings_updated_at" BEFORE UPDATE ON "public"."system_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


































-- [removed invalid FK on id] 


-- [removed policy]
-- [removed policy]

-- [removed policy]

-- [removed policy]

-- [removed policy]
-- [removed policy]
-- [removed policy]

-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]

-- [removed policy]

-- [removed policy]

-- [removed policy]

-- [removed policy]

-- [removed policy]

-- [removed policy]

-- [removed policy]

-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]

-- [removed policy]

-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed policy]
-- [removed policy]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed policy]
-- [removed RLS toggle]
-- [removed policy]
-- [removed RLS toggle]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed RLS toggle]
-- [removed policy]
-- [removed policy]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed policy]
-- [removed policy]
-- [removed policy]
-- [removed RLS toggle]
-- [removed RLS toggle]
-- [removed policy]
-- [removed RLS toggle]
-- [removed publication]


GRANT USAGE ON SCHEMA "public" TO "postgres";
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]
-- [removed supabase grant]









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
-- [removed default privs to supabase roles]
-- [removed default privs to supabase roles]
-- [removed default privs to supabase roles]






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
-- [removed default privs to supabase roles]
-- [removed default privs to supabase roles]
-- [removed default privs to supabase roles]






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
-- [removed default privs to supabase roles]
-- [removed default privs to supabase roles]
-- [removed default privs to supabase roles]






























RESET ALL;
