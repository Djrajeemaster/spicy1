

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



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






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
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "vote_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "votes_vote_type_check" CHECK (("vote_type" = ANY (ARRAY['up'::"text", 'down'::"text"])))
);


ALTER TABLE "public"."votes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_actions"
    ADD CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_elevation_sessions"
    ADD CONSTRAINT "admin_elevation_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_elevation_sessions"
    ADD CONSTRAINT "admin_elevation_sessions_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."alert_notifications_sent"
    ADD CONSTRAINT "alert_notifications_sent_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banners"
    ADD CONSTRAINT "banners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."comment_mentions"
    ADD CONSTRAINT "comment_mentions_comment_id_mentioned_user_id_key" UNIQUE ("comment_id", "mentioned_user_id");



ALTER TABLE ONLY "public"."comment_mentions"
    ADD CONSTRAINT "comment_mentions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."impersonation_sessions"
    ADD CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_prefs"
    ADD CONSTRAINT "notification_prefs_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("token");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_deals"
    ADD CONSTRAINT "saved_deals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_deals"
    ADD CONSTRAINT "saved_deals_user_id_deal_id_key" UNIQUE ("user_id", "deal_id");



ALTER TABLE ONLY "public"."site_config"
    ADD CONSTRAINT "site_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."store_follows"
    ADD CONSTRAINT "store_follows_pkey" PRIMARY KEY ("follower_id", "store_id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alert_notifications_sent"
    ADD CONSTRAINT "unique_user_deal_alert" UNIQUE ("user_id", "deal_id", "alert_id");



ALTER TABLE ONLY "public"."user_activities"
    ADD CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_pkey" PRIMARY KEY ("follower_id", "followed_id");



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_user_id_deal_id_key" UNIQUE ("user_id", "deal_id");



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



ALTER TABLE ONLY "public"."admin_actions"
    ADD CONSTRAINT "admin_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_actions"
    ADD CONSTRAINT "admin_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alert_notifications_sent"
    ADD CONSTRAINT "alert_notifications_sent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comment_mentions"
    ADD CONSTRAINT "comment_mentions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_mentions"
    ADD CONSTRAINT "comment_mentions_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_flagged_by_fkey" FOREIGN KEY ("flagged_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."notification_prefs"
    ADD CONSTRAINT "notification_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."saved_deals"
    ADD CONSTRAINT "saved_deals_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_deals"
    ADD CONSTRAINT "saved_deals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_config"
    ADD CONSTRAINT "site_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."store_follows"
    ADD CONSTRAINT "store_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_follows"
    ADD CONSTRAINT "store_follows_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activities"
    ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_followed_id_fkey" FOREIGN KEY ("followed_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Active banners are viewable by everyone" ON "public"."banners" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Admins can insert admin actions" ON "public"."admin_actions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'moderator'::"text"]))))));



CREATE POLICY "Admins can manage reports" ON "public"."user_reports" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'moderator'::"text"]))))));



CREATE POLICY "Admins can view all admin actions" ON "public"."admin_actions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'moderator'::"text"]))))));



CREATE POLICY "Allow service_role access" ON "public"."admin_elevation_sessions" TO "service_role";



CREATE POLICY "Announcements are viewable by authenticated users" ON "public"."announcements" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Audit logs are viewable by admins only" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Authenticated users can insert own activities" ON "public"."user_activities" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can read app config" ON "public"."app_config" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read enabled flags" ON "public"."feature_flags" FOR SELECT TO "authenticated" USING (("enabled" = true));



CREATE POLICY "Authenticated users can read safe config" ON "public"."site_config" FOR SELECT TO "authenticated" USING (("key" = ANY (ARRAY['maintenance_mode'::"text", 'new_user_registration_enabled'::"text"])));



CREATE POLICY "Categories are viewable by everyone" ON "public"."categories" FOR SELECT TO "anon" USING (("is_active" = true));



CREATE POLICY "Comments are viewable by everyone" ON "public"."comments" FOR SELECT TO "anon" USING (("status" = 'active'::"text"));



CREATE POLICY "Follows are visible to authenticated users" ON "public"."user_follows" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Live deals are viewable by everyone" ON "public"."deals" FOR SELECT TO "anon" USING (("status" = 'live'::"text"));



CREATE POLICY "Moderators can manage all deals" ON "public"."deals" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['moderator'::"text", 'admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Moderators can manage all reports" ON "public"."reports" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['moderator'::"text", 'admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Only admins can access system settings" ON "public"."system_settings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Only admins can manage announcements" ON "public"."announcements" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Only admins can manage banners" ON "public"."banners" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Only admins can manage categories" ON "public"."categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Only admins can manage stores" ON "public"."stores" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "Only system can insert audit logs" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Public profiles are viewable" ON "public"."users" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Public read access" ON "public"."deals" FOR SELECT USING (true);



CREATE POLICY "Service role can insert notifications" ON "public"."alert_notifications_sent" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Store follows are visible to authenticated users" ON "public"."store_follows" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Stores are viewable by everyone" ON "public"."stores" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Superadmins can manage all users" ON "public"."users" USING ("public"."is_superadmin"("auth"."uid"())) WITH CHECK ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can manage app config" ON "public"."app_config" USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can manage feature flags" ON "public"."feature_flags" USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can manage site config" ON "public"."site_config" USING ("public"."is_superadmin"("auth"."uid"())) WITH CHECK ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Users can create comments" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."status" = 'active'::"text"))))));



CREATE POLICY "Users can create deals" ON "public"."deals" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "created_by") AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['user'::"text", 'verified'::"text", 'business'::"text", 'moderator'::"text", 'admin'::"text", 'superadmin'::"text"])) AND ("users"."status" = 'active'::"text"))))));



CREATE POLICY "Users can create reports" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can create reports" ON "public"."user_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can insert only their own rows" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can insert own notifications" ON "public"."alert_notifications_sent" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage own alerts" ON "public"."alerts" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own saved deals" ON "public"."saved_deals" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own votes" ON "public"."votes" TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own follows" ON "public"."user_follows" TO "authenticated" USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can manage their own store follows" ON "public"."store_follows" TO "authenticated" USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can read own profile" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own comments" ON "public"."comments" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own deals" ON "public"."deals" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view all deals when authenticated" ON "public"."deals" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view own activities" ON "public"."user_activities" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notification history" ON "public"."alert_notifications_sent" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own reports" ON "public"."reports" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can view own reports" ON "public"."user_reports" FOR SELECT USING (("auth"."uid"() = "reporter_id"));



ALTER TABLE "public"."admin_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_elevation_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alert_notifications_sent" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comment_mentions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comments_insert" ON "public"."comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "comments_select" ON "public"."comments" FOR SELECT USING (true);



ALTER TABLE "public"."deals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."impersonation_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mentions_select" ON "public"."comment_mentions" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."notification_prefs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_prefs_owner_all" ON "public"."notification_prefs" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_owner_select" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_select" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_update" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "push_tokens_owner_select" ON "public"."push_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "push_tokens_owner_upsert" ON "public"."push_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_deals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_follows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "store_follows_delete" ON "public"."store_follows" FOR DELETE USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "store_follows_insert" ON "public"."store_follows" FOR INSERT WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "store_follows_select" ON "public"."store_follows" FOR SELECT USING (true);



ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_follows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_follows_delete" ON "public"."user_follows" FOR DELETE USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "user_follows_insert" ON "public"."user_follows" FOR INSERT WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "user_follows_select" ON "public"."user_follows" FOR SELECT USING (true);



ALTER TABLE "public"."user_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users are readable by everyone" ON "public"."users" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."auto_flag_comment"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_flag_comment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_flag_comment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_user_restrictions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_user_restrictions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_user_restrictions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."deals_searchable_text_tg"() TO "anon";
GRANT ALL ON FUNCTION "public"."deals_searchable_text_tg"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."deals_searchable_text_tg"() TO "service_role";



GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."extract_usernames"("raw" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."extract_usernames"("raw" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."extract_usernames"("raw" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_vote"("deal_id_param" "uuid", "user_id_param" "uuid", "vote_type_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_vote"("deal_id_param" "uuid", "user_id_param" "uuid", "vote_type_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_vote"("deal_id_param" "uuid", "user_id_param" "uuid", "vote_type_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_comment_count"("deal_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_comment_count"("deal_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_comment_count"("deal_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_superadmin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_superadmin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_superadmin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_admin_action"("p_action" "text", "p_entity_type" "text", "p_entity_id" "text", "p_admin_id" "uuid", "p_admin_username" "text", "p_details" "jsonb", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_admin_action"("p_action" "text", "p_entity_type" "text", "p_entity_id" "text", "p_admin_id" "uuid", "p_admin_username" "text", "p_details" "jsonb", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_admin_action"("p_action" "text", "p_entity_type" "text", "p_entity_id" "text", "p_admin_id" "uuid", "p_admin_username" "text", "p_details" "jsonb", "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."on_comment_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_comment_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_comment_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_last_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_last_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_last_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_last_superadmin"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_last_superadmin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_last_superadmin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_last_superadmin_p1"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_last_superadmin_p1"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_last_superadmin_p1"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_reports_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_reports_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_reports_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."admin_actions" TO "anon";
GRANT ALL ON TABLE "public"."admin_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_actions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_elevation_sessions" TO "anon";
GRANT ALL ON TABLE "public"."admin_elevation_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_elevation_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."alert_notifications_sent" TO "anon";
GRANT ALL ON TABLE "public"."alert_notifications_sent" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_notifications_sent" TO "service_role";



GRANT ALL ON TABLE "public"."alerts" TO "anon";
GRANT ALL ON TABLE "public"."alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."alerts" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."app_config" TO "anon";
GRANT ALL ON TABLE "public"."app_config" TO "authenticated";
GRANT ALL ON TABLE "public"."app_config" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."banners" TO "anon";
GRANT ALL ON TABLE "public"."banners" TO "authenticated";
GRANT ALL ON TABLE "public"."banners" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."comment_mentions" TO "anon";
GRANT ALL ON TABLE "public"."comment_mentions" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_mentions" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."deals" TO "anon";
GRANT ALL ON TABLE "public"."deals" TO "authenticated";
GRANT ALL ON TABLE "public"."deals" TO "service_role";



GRANT ALL ON TABLE "public"."feature_flags" TO "anon";
GRANT ALL ON TABLE "public"."feature_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_flags" TO "service_role";



GRANT ALL ON TABLE "public"."impersonation_sessions" TO "anon";
GRANT ALL ON TABLE "public"."impersonation_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."impersonation_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."notification_prefs" TO "anon";
GRANT ALL ON TABLE "public"."notification_prefs" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_prefs" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."saved_deals" TO "anon";
GRANT ALL ON TABLE "public"."saved_deals" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_deals" TO "service_role";



GRANT ALL ON TABLE "public"."site_config" TO "anon";
GRANT ALL ON TABLE "public"."site_config" TO "authenticated";
GRANT ALL ON TABLE "public"."site_config" TO "service_role";



GRANT ALL ON TABLE "public"."store_follows" TO "anon";
GRANT ALL ON TABLE "public"."store_follows" TO "authenticated";
GRANT ALL ON TABLE "public"."store_follows" TO "service_role";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_activities" TO "anon";
GRANT ALL ON TABLE "public"."user_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activities" TO "service_role";



GRANT ALL ON TABLE "public"."user_follows" TO "anon";
GRANT ALL ON TABLE "public"."user_follows" TO "authenticated";
GRANT ALL ON TABLE "public"."user_follows" TO "service_role";



GRANT ALL ON TABLE "public"."user_reports" TO "anon";
GRANT ALL ON TABLE "public"."user_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."user_reports" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."valid_admin_elevation_sessions" TO "anon";
GRANT ALL ON TABLE "public"."valid_admin_elevation_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."valid_admin_elevation_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."valid_impersonation_sessions" TO "anon";
GRANT ALL ON TABLE "public"."valid_impersonation_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."valid_impersonation_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."votes" TO "anon";
GRANT ALL ON TABLE "public"."votes" TO "authenticated";
GRANT ALL ON TABLE "public"."votes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
