CREATE OR REPLACE FUNCTION public.protect_road_report_verification()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF coalesce(current_setting('app.verifying_report', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verification_count := 0;
    NEW.verified_by := '{}';
  ELSE
    NEW.verification_count := OLD.verification_count;
    NEW.verified_by := OLD.verified_by;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_road_report_verification ON public.road_reports;
CREATE TRIGGER protect_road_report_verification BEFORE INSERT OR UPDATE ON public.road_reports
FOR EACH ROW EXECUTE FUNCTION public.protect_road_report_verification();

CREATE OR REPLACE FUNCTION public.verify_report(report_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE current_user_id uuid; current_verified_by uuid[];
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RETURN false; END IF;
  SELECT verified_by INTO current_verified_by FROM public.road_reports WHERE id = report_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF current_user_id = ANY(current_verified_by) THEN RETURN false; END IF;
  PERFORM set_config('app.verifying_report', 'on', true);
  UPDATE public.road_reports
  SET verified_by = array_append(verified_by, current_user_id),
      verification_count = verification_count + 1
  WHERE id = report_id;
  PERFORM set_config('app.verifying_report', 'off', true);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.unverify_report(report_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE current_user_id uuid; current_verified_by uuid[];
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RETURN false; END IF;
  SELECT verified_by INTO current_verified_by FROM public.road_reports WHERE id = report_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT (current_user_id = ANY(current_verified_by)) THEN RETURN false; END IF;
  PERFORM set_config('app.verifying_report', 'on', true);
  UPDATE public.road_reports
  SET verified_by = array_remove(verified_by, current_user_id),
      verification_count = GREATEST(verification_count - 1, 0)
  WHERE id = report_id;
  PERFORM set_config('app.verifying_report', 'off', true);
  RETURN true;
END;
$$;