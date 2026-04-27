-- Municipios
CREATE TABLE public.municipios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  codigo_postal TEXT NOT NULL UNIQUE,
  poblacion INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Negocios
CREATE TABLE public.negocios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  website TEXT,
  reviews INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  has_web BOOLEAN NOT NULL DEFAULT false,
  municipio_id UUID REFERENCES public.municipios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_negocios_municipio ON public.negocios(municipio_id);

-- Score
CREATE TABLE public.score (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  puntuacion INTEGER NOT NULL DEFAULT 0,
  etiqueta TEXT NOT NULL DEFAULT 'Frío',
  desglose JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(negocio_id)
);

-- WebGenerada
CREATE TABLE public.web_generada (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  html TEXT NOT NULL,
  estilo TEXT,
  estado TEXT NOT NULL DEFAULT 'borrador',
  editado_por_usuario BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contactos
CREATE TABLE public.contactos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
  asunto TEXT NOT NULL,
  cuerpo TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'email',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_generada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de prototipo (sin auth)
CREATE POLICY "public read municipios" ON public.municipios FOR SELECT USING (true);
CREATE POLICY "public write municipios" ON public.municipios FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read negocios" ON public.negocios FOR SELECT USING (true);
CREATE POLICY "public write negocios" ON public.negocios FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read score" ON public.score FOR SELECT USING (true);
CREATE POLICY "public write score" ON public.score FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read web_generada" ON public.web_generada FOR SELECT USING (true);
CREATE POLICY "public write web_generada" ON public.web_generada FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read contactos" ON public.contactos FOR SELECT USING (true);
CREATE POLICY "public write contactos" ON public.contactos FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_negocios_upd BEFORE UPDATE ON public.negocios FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_score_upd BEFORE UPDATE ON public.score FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_web_upd BEFORE UPDATE ON public.web_generada FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_contactos_upd BEFORE UPDATE ON public.contactos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();