
-- 1) Promote tercio.rabelo to master and link to TCE-PI
UPDATE public.profiles
SET is_master = true,
    tribunal_id = (SELECT id FROM public.tribunais WHERE sigla = 'TCE-PI' LIMIT 1)
WHERE email = 'tercio.rabelo@tce.pi.gov.br';

-- 2) Allow signup to carry tribunal_id via user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _is_first_user BOOLEAN;
  _tribunal_id UUID;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO _is_first_user;

  BEGIN
    _tribunal_id := NULLIF(NEW.raw_user_meta_data ->> 'tribunal_id', '')::uuid;
  EXCEPTION WHEN others THEN
    _tribunal_id := NULL;
  END;

  INSERT INTO public.profiles (id, nome, email, aprovado, tribunal_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
    NEW.email,
    _is_first_user,
    _tribunal_id
  );

  IF _is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'consulta');
  END IF;

  RETURN NEW;
END;
$function$;
