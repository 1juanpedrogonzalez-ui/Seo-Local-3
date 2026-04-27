UPDATE public.municipios SET provincia = CASE
  WHEN left(codigo_postal,2) = '03' THEN 'Alicante'
  WHEN left(codigo_postal,2) = '12' THEN 'Castellón'
  WHEN left(codigo_postal,2) = '46' THEN 'Valencia'
END
WHERE provincia IS NULL;