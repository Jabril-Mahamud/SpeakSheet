drop policy "Admins can view all files" on "public"."files";

drop policy "Users can manage their own files" on "public"."files";

drop policy "Admins can view all usage" on "public"."polly_usage";

drop policy "Service role can insert usage" on "public"."polly_usage";

drop policy "Users can view their own usage" on "public"."polly_usage";

drop policy "Users can manage their own messages" on "public"."speech_messages";

drop policy "Users can manage their own TTS settings" on "public"."user_tts_settings";

drop policy "Admins can view all users" on "public"."users";

drop policy "Users can view and update their own data" on "public"."users";

revoke delete on table "public"."files" from "anon";

revoke insert on table "public"."files" from "anon";

revoke references on table "public"."files" from "anon";

revoke select on table "public"."files" from "anon";

revoke trigger on table "public"."files" from "anon";

revoke truncate on table "public"."files" from "anon";

revoke update on table "public"."files" from "anon";

revoke delete on table "public"."files" from "authenticated";

revoke insert on table "public"."files" from "authenticated";

revoke references on table "public"."files" from "authenticated";

revoke select on table "public"."files" from "authenticated";

revoke trigger on table "public"."files" from "authenticated";

revoke truncate on table "public"."files" from "authenticated";

revoke update on table "public"."files" from "authenticated";

revoke delete on table "public"."files" from "service_role";

revoke insert on table "public"."files" from "service_role";

revoke references on table "public"."files" from "service_role";

revoke select on table "public"."files" from "service_role";

revoke trigger on table "public"."files" from "service_role";

revoke truncate on table "public"."files" from "service_role";

revoke update on table "public"."files" from "service_role";

revoke delete on table "public"."polly_usage" from "anon";

revoke insert on table "public"."polly_usage" from "anon";

revoke references on table "public"."polly_usage" from "anon";

revoke select on table "public"."polly_usage" from "anon";

revoke trigger on table "public"."polly_usage" from "anon";

revoke truncate on table "public"."polly_usage" from "anon";

revoke update on table "public"."polly_usage" from "anon";

revoke delete on table "public"."polly_usage" from "authenticated";

revoke insert on table "public"."polly_usage" from "authenticated";

revoke references on table "public"."polly_usage" from "authenticated";

revoke select on table "public"."polly_usage" from "authenticated";

revoke trigger on table "public"."polly_usage" from "authenticated";

revoke truncate on table "public"."polly_usage" from "authenticated";

revoke update on table "public"."polly_usage" from "authenticated";

revoke delete on table "public"."polly_usage" from "service_role";

revoke insert on table "public"."polly_usage" from "service_role";

revoke references on table "public"."polly_usage" from "service_role";

revoke select on table "public"."polly_usage" from "service_role";

revoke trigger on table "public"."polly_usage" from "service_role";

revoke truncate on table "public"."polly_usage" from "service_role";

revoke update on table "public"."polly_usage" from "service_role";

revoke delete on table "public"."speech_messages" from "anon";

revoke insert on table "public"."speech_messages" from "anon";

revoke references on table "public"."speech_messages" from "anon";

revoke select on table "public"."speech_messages" from "anon";

revoke trigger on table "public"."speech_messages" from "anon";

revoke truncate on table "public"."speech_messages" from "anon";

revoke update on table "public"."speech_messages" from "anon";

revoke delete on table "public"."speech_messages" from "authenticated";

revoke insert on table "public"."speech_messages" from "authenticated";

revoke references on table "public"."speech_messages" from "authenticated";

revoke select on table "public"."speech_messages" from "authenticated";

revoke trigger on table "public"."speech_messages" from "authenticated";

revoke truncate on table "public"."speech_messages" from "authenticated";

revoke update on table "public"."speech_messages" from "authenticated";

revoke delete on table "public"."speech_messages" from "service_role";

revoke insert on table "public"."speech_messages" from "service_role";

revoke references on table "public"."speech_messages" from "service_role";

revoke select on table "public"."speech_messages" from "service_role";

revoke trigger on table "public"."speech_messages" from "service_role";

revoke truncate on table "public"."speech_messages" from "service_role";

revoke update on table "public"."speech_messages" from "service_role";

revoke delete on table "public"."user_tts_settings" from "anon";

revoke insert on table "public"."user_tts_settings" from "anon";

revoke references on table "public"."user_tts_settings" from "anon";

revoke select on table "public"."user_tts_settings" from "anon";

revoke trigger on table "public"."user_tts_settings" from "anon";

revoke truncate on table "public"."user_tts_settings" from "anon";

revoke update on table "public"."user_tts_settings" from "anon";

revoke delete on table "public"."user_tts_settings" from "authenticated";

revoke insert on table "public"."user_tts_settings" from "authenticated";

revoke references on table "public"."user_tts_settings" from "authenticated";

revoke select on table "public"."user_tts_settings" from "authenticated";

revoke trigger on table "public"."user_tts_settings" from "authenticated";

revoke truncate on table "public"."user_tts_settings" from "authenticated";

revoke update on table "public"."user_tts_settings" from "authenticated";

revoke delete on table "public"."user_tts_settings" from "service_role";

revoke insert on table "public"."user_tts_settings" from "service_role";

revoke references on table "public"."user_tts_settings" from "service_role";

revoke select on table "public"."user_tts_settings" from "service_role";

revoke trigger on table "public"."user_tts_settings" from "service_role";

revoke truncate on table "public"."user_tts_settings" from "service_role";

revoke update on table "public"."user_tts_settings" from "service_role";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke select on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "authenticated";

revoke select on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

revoke delete on table "public"."users" from "service_role";

revoke insert on table "public"."users" from "service_role";

revoke references on table "public"."users" from "service_role";

revoke select on table "public"."users" from "service_role";

revoke trigger on table "public"."users" from "service_role";

revoke truncate on table "public"."users" from "service_role";

revoke update on table "public"."users" from "service_role";

alter table "public"."files" drop constraint "files_user_id_fkey";

alter table "public"."polly_usage" drop constraint "polly_usage_user_id_fkey";

alter table "public"."speech_messages" drop constraint "speech_messages_file_id_fkey";

alter table "public"."speech_messages" drop constraint "speech_messages_user_id_fkey";

alter table "public"."user_tts_settings" drop constraint "user_tts_settings_id_fkey";

alter table "public"."users" drop constraint "users_id_fkey";

alter table "public"."files" drop constraint "files_pkey";

alter table "public"."polly_usage" drop constraint "polly_usage_pkey";

alter table "public"."speech_messages" drop constraint "speech_messages_pkey";

alter table "public"."user_tts_settings" drop constraint "user_tts_settings_pkey";

alter table "public"."users" drop constraint "users_pkey";

drop index if exists "public"."files_pkey";

drop index if exists "public"."polly_usage_pkey";

drop index if exists "public"."speech_messages_pkey";

drop index if exists "public"."user_tts_settings_pkey";

drop index if exists "public"."users_pkey";

drop table "public"."files";

drop table "public"."polly_usage";

drop table "public"."speech_messages";

drop table "public"."user_tts_settings";

drop table "public"."users";

drop sequence if exists "public"."polly_usage_id_seq";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_monthly_character_usage(user_id_param uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  total_chars BIGINT;
BEGIN
  -- Get current month's start date
  WITH month_start AS (
    SELECT DATE_TRUNC('month', NOW()) as start_date
  )
  
  -- Sum up characters from various sources
  SELECT COALESCE(SUM(chars), 0) INTO total_chars FROM (
    -- From Polly usage
    SELECT COALESCE(SUM(characters_synthesized), 0) as chars
    FROM polly_usage
    WHERE user_id = user_id_param
    AND synthesis_date >= (SELECT start_date FROM month_start)
    
    UNION ALL
    
    -- From general TTS usage
    SELECT COALESCE(SUM(characters), 0) as chars
    FROM tts_usage
    WHERE user_id = user_id_param
    AND synthesis_date >= (SELECT start_date FROM month_start)
  ) AS combined_usage;
  
  RETURN total_chars;
END;
$function$
;


