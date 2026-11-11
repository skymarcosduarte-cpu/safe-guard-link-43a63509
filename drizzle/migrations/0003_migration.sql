-- Role helpers: only answer for the caller, admins, or server-side (no JWT) contexts
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT (auth.uid() IS NULL OR _user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'SOS_ACTIVO'))
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'SOS_ACTIVO')
$$;
CREATE OR REPLACE FUNCTION public.is_rescatista(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT (auth.uid() IS NULL OR _user_id = auth.uid() OR public.is_admin(auth.uid()))
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'SOS_ACTIVO')
$$;
CREATE OR REPLACE FUNCTION public.is_ex_sos(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT (auth.uid() IS NULL OR _user_id = auth.uid() OR public.is_admin(auth.uid()))
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'EX_SOS')
$$;
CREATE OR REPLACE FUNCTION public.is_avisos_moderator(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT (auth.uid() IS NULL OR _user_id = auth.uid() OR public.is_admin(auth.uid()))
     AND EXISTS (SELECT 1 FROM public.avisos_moderators WHERE user_id = _user_id)
$$;
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
    AND (auth.uid() IS NULL OR _user_id = auth.uid() OR public.is_admin(auth.uid()))
  LIMIT 1
$$;

-- Community membership = has a completed profile (created only through invite registration)
CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) $$;

-- Birthdays: only members, and no birth dates of others
CREATE OR REPLACE FUNCTION public.get_todays_birthdays()
 RETURNS TABLE(user_id uuid, full_name text, nickname text, birthday date)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT id, NULL::text, nickname, NULL::date
  FROM public.profiles
  WHERE public.is_member(auth.uid())
    AND birthday IS NOT NULL
    AND EXTRACT(MONTH FROM birthday) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM birthday) = EXTRACT(DAY FROM CURRENT_DATE)
$$;

DROP POLICY IF EXISTS "Authenticated users can view panic events" ON public.panic_events;
CREATE POLICY "Members can view panic events" ON public.panic_events FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can view help requests" ON public.help_requests;
CREATE POLICY "Members can view help requests" ON public.help_requests FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can view report media" ON public.report_media;
CREATE POLICY "Members can view report media" ON public.report_media FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can view public profiles" ON public.profiles_public;
CREATE POLICY "Members can view public profiles" ON public.profiles_public FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_member(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can view clave100 checkins" ON public.clave100_checkins;
CREATE POLICY "Members can view clave100 checkins" ON public.clave100_checkins FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can view gallery photos" ON public.memory_gallery;
CREATE POLICY "Members can view gallery photos" ON public.memory_gallery FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.memory_gallery_comments;
CREATE POLICY "Members can view comments" ON public.memory_gallery_comments FOR SELECT TO authenticated USING (public.is_member(auth.uid()));