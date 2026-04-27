ALTER TABLE public.municipios DROP CONSTRAINT IF EXISTS municipios_codigo_postal_key;
ALTER TABLE public.municipios ADD CONSTRAINT municipios_nombre_cp_key UNIQUE (nombre, codigo_postal);
CREATE INDEX IF NOT EXISTS idx_municipios_codigo_postal ON public.municipios (codigo_postal);