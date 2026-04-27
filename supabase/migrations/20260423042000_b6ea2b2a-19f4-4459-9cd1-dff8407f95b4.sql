-- 1. Añadir columna prioridad a crm
ALTER TABLE public.crm
  ADD COLUMN IF NOT EXISTS prioridad text NOT NULL DEFAULT 'media';

ALTER TABLE public.crm
  DROP CONSTRAINT IF EXISTS crm_prioridad_check;
ALTER TABLE public.crm
  ADD CONSTRAINT crm_prioridad_check CHECK (prioridad IN ('alta','media','baja'));

-- Evitar duplicados por (user_id, negocio_id)
CREATE UNIQUE INDEX IF NOT EXISTS crm_user_negocio_uniq
  ON public.crm(user_id, negocio_id);

-- 2. Función que encola un negocio en el CRM de TODOS los usuarios autenticados
--    cuando cumple los criterios (score > 70 y tiene_web = false).
--    Como no tenemos contexto multi-tenant claro, guardamos por cada user_id que
--    ya tenga registros en crm; si no existe ninguno, se omite (se podrá llamar
--    manualmente desde el cliente con auth.uid()).
CREATE OR REPLACE FUNCTION public.enqueue_lead_for_negocio(_negocio_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score int;
  v_tiene_web boolean;
  v_prioridad text;
BEGIN
  SELECT s.score_total, n.tiene_web
    INTO v_score, v_tiene_web
  FROM public.negocios n
  LEFT JOIN public.score s ON s.negocio_id = n.id
  WHERE n.id = _negocio_id;

  IF v_score IS NULL OR v_score <= 70 OR v_tiene_web IS TRUE THEN
    RETURN;
  END IF;

  v_prioridad := CASE
    WHEN v_score >= 90 THEN 'alta'
    WHEN v_score >= 80 THEN 'media'
    ELSE 'baja'
  END;

  INSERT INTO public.crm (user_id, negocio_id, estado, prioridad)
  SELECT DISTINCT c.user_id, _negocio_id, 'no_contactado', v_prioridad
  FROM public.crm c
  ON CONFLICT (user_id, negocio_id) DO NOTHING;
END;
$$;

-- 3. Función masiva: recorre todos los negocios que cumplen y los encola
--    para el usuario que la invoca (auth.uid()).
CREATE OR REPLACE FUNCTION public.enqueue_high_potential_leads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_count int := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  WITH candidatos AS (
    SELECT n.id AS negocio_id,
           s.score_total,
           CASE
             WHEN s.score_total >= 90 THEN 'alta'
             WHEN s.score_total >= 80 THEN 'media'
             ELSE 'baja'
           END AS prioridad
    FROM public.negocios n
    JOIN public.score s ON s.negocio_id = n.id
    WHERE s.score_total > 70
      AND n.tiene_web = false
  ),
  inserted AS (
    INSERT INTO public.crm (user_id, negocio_id, estado, prioridad)
    SELECT v_user, c.negocio_id, 'no_contactado', c.prioridad
    FROM candidatos c
    ON CONFLICT (user_id, negocio_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;

-- 4. Trigger en score: al insertar/actualizar score, encolar si procede.
CREATE OR REPLACE FUNCTION public.trg_score_enqueue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.enqueue_lead_for_negocio(NEW.negocio_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS score_enqueue_after_write ON public.score;
CREATE TRIGGER score_enqueue_after_write
AFTER INSERT OR UPDATE OF score_total ON public.score
FOR EACH ROW
EXECUTE FUNCTION public.trg_score_enqueue();