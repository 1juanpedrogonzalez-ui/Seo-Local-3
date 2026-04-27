
-- 1. NEGOCIOS: renombrar columnas
ALTER TABLE public.negocios RENAME COLUMN has_web TO tiene_web;
ALTER TABLE public.negocios RENAME COLUMN website TO url_web;
ALTER TABLE public.negocios RENAME COLUMN reviews TO numero_resenas;

-- 2. SCORE: renombrar columnas
ALTER TABLE public.score RENAME COLUMN puntuacion TO score_total;
ALTER TABLE public.score RENAME COLUMN desglose TO factores;

-- 3. WEB_GENERADA: renombrar y reestructurar
ALTER TABLE public.web_generada RENAME COLUMN html TO contenido;
ALTER TABLE public.web_generada DROP COLUMN IF EXISTS estilo;
ALTER TABLE public.web_generada DROP COLUMN IF EXISTS editado_por_usuario;
ALTER TABLE public.web_generada ADD COLUMN IF NOT EXISTS url_publicacion text;

-- 4. FOREIGN KEYS explícitas (idempotente)
ALTER TABLE public.negocios DROP CONSTRAINT IF EXISTS negocios_municipio_id_fkey;
ALTER TABLE public.negocios
  ADD CONSTRAINT negocios_municipio_id_fkey
  FOREIGN KEY (municipio_id) REFERENCES public.municipios(id) ON DELETE SET NULL;

ALTER TABLE public.score DROP CONSTRAINT IF EXISTS score_negocio_id_fkey;
ALTER TABLE public.score
  ADD CONSTRAINT score_negocio_id_fkey
  FOREIGN KEY (negocio_id) REFERENCES public.negocios(id) ON DELETE CASCADE;

ALTER TABLE public.score DROP CONSTRAINT IF EXISTS score_negocio_id_unique;
ALTER TABLE public.score
  ADD CONSTRAINT score_negocio_id_unique UNIQUE (negocio_id);

ALTER TABLE public.web_generada DROP CONSTRAINT IF EXISTS web_generada_negocio_id_fkey;
ALTER TABLE public.web_generada
  ADD CONSTRAINT web_generada_negocio_id_fkey
  FOREIGN KEY (negocio_id) REFERENCES public.negocios(id) ON DELETE CASCADE;

ALTER TABLE public.contactos DROP CONSTRAINT IF EXISTS contactos_negocio_id_fkey;
ALTER TABLE public.contactos
  ADD CONSTRAINT contactos_negocio_id_fkey
  FOREIGN KEY (negocio_id) REFERENCES public.negocios(id) ON DELETE CASCADE;

-- 5. Nueva tabla CRM
CREATE TABLE IF NOT EXISTS public.crm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  negocio_id uuid NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  estado text NOT NULL DEFAULT 'no_contactado' CHECK (estado IN ('no_contactado','contactado','cerrado')),
  notas text,
  fecha_contacto timestamptz,
  presupuesto_enviado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, negocio_id)
);

ALTER TABLE public.crm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own select crm" ON public.crm;
DROP POLICY IF EXISTS "own insert crm" ON public.crm;
DROP POLICY IF EXISTS "own update crm" ON public.crm;
DROP POLICY IF EXISTS "own delete crm" ON public.crm;

CREATE POLICY "own select crm" ON public.crm
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert crm" ON public.crm
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update crm" ON public.crm
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own delete crm" ON public.crm
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS crm_touch_updated_at ON public.crm;
CREATE TRIGGER crm_touch_updated_at
  BEFORE UPDATE ON public.crm
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
