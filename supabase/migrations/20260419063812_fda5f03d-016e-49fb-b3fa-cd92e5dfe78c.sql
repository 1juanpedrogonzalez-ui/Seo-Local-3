-- Añadir user_id a contactos y web_generada
ALTER TABLE public.contactos ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.web_generada ADD COLUMN IF NOT EXISTS user_id UUID;

-- Quitar políticas públicas existentes
DROP POLICY IF EXISTS "public read contactos" ON public.contactos;
DROP POLICY IF EXISTS "public write contactos" ON public.contactos;
DROP POLICY IF EXISTS "public read web_generada" ON public.web_generada;
DROP POLICY IF EXISTS "public write web_generada" ON public.web_generada;
DROP POLICY IF EXISTS "public read negocios" ON public.negocios;
DROP POLICY IF EXISTS "public write negocios" ON public.negocios;
DROP POLICY IF EXISTS "public read municipios" ON public.municipios;
DROP POLICY IF EXISTS "public write municipios" ON public.municipios;
DROP POLICY IF EXISTS "public read score" ON public.score;
DROP POLICY IF EXISTS "public write score" ON public.score;

-- Catálogo compartido entre autenticados
CREATE POLICY "auth read negocios" ON public.negocios FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write negocios" ON public.negocios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read municipios" ON public.municipios FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write municipios" ON public.municipios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read score" ON public.score FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write score" ON public.score FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Contactos: privados por usuario
CREATE POLICY "own select contactos" ON public.contactos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert contactos" ON public.contactos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update contactos" ON public.contactos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own delete contactos" ON public.contactos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Webs generadas: privadas por usuario
CREATE POLICY "own select web_generada" ON public.web_generada FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert web_generada" ON public.web_generada FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update web_generada" ON public.web_generada FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own delete web_generada" ON public.web_generada FOR DELETE TO authenticated USING (auth.uid() = user_id);