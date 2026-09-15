-- Atualiza somente o antigo tema laranja padrão. Cores personalizadas permanecem intactas.
UPDATE stores
SET details = jsonb_set(
  details,
  '{menu_theme,primary_color}',
  '"#22C55E"'::jsonb,
  true
)
WHERE upper(COALESCE(details #>> '{menu_theme,primary_color}', '')) = '#F97316';

UPDATE stores
SET details = jsonb_set(details, '{primary_color}', '"#22C55E"'::jsonb, true)
WHERE upper(COALESCE(details ->> 'primary_color', '')) = '#F97316';
