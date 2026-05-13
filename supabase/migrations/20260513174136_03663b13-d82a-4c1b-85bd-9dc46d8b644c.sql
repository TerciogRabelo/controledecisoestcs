
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aprovado boolean NOT NULL DEFAULT false;

-- Aprova usuários já existentes (para não bloquear acesso após migração)
UPDATE public.profiles SET aprovado = true WHERE aprovado = false;

-- Atualiza trigger handle_new_user para marcar admin (primeiro user) como aprovado
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _is_first_user BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO _is_first_user;

  INSERT INTO public.profiles (id, nome, email, aprovado)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
    NEW.email,
    _is_first_user
  );

  IF _is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'consulta');
  END IF;

  RETURN NEW;
END;
$function$;
