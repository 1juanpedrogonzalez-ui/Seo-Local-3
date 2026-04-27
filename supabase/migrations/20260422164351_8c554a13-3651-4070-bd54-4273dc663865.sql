
-- Añadir columna provincia
ALTER TABLE public.municipios ADD COLUMN IF NOT EXISTS provincia text;

-- Índice único en codigo_postal
CREATE UNIQUE INDEX IF NOT EXISTS idx_municipios_cp_unique ON public.municipios(codigo_postal);

-- Validación: CP debe ser 5 dígitos
ALTER TABLE public.municipios DROP CONSTRAINT IF EXISTS municipios_cp_format_chk;
ALTER TABLE public.municipios ADD CONSTRAINT municipios_cp_format_chk
  CHECK (codigo_postal ~ '^[0-9]{5}$');

-- Validación: nombre no vacío
ALTER TABLE public.municipios DROP CONSTRAINT IF EXISTS municipios_nombre_not_empty_chk;
ALTER TABLE public.municipios ADD CONSTRAINT municipios_nombre_not_empty_chk
  CHECK (length(trim(nombre)) > 0);
