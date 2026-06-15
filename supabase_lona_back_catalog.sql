-- Catálogo mínimo para la nueva ruta:
-- Caja de luz con Lona Back
-- Impresa = lona + impresión
-- Rotulada = lona + vinil, sin impresión

insert into public.cost_catalog (item_name, category, unit, internal_cost, sale_price, notes)
values
  (
    'LONA BACK LIGHT 2.00 x 50',
    'CARÁTULA',
    'm²',
    23.99,
    null,
    'Base de lona back light. Editar costo interno si cambia proveedor.'
  ),
  (
    'IMPRESION DE LONA BACK LIGHT EN GRAN FORMATO (EN ALLWIN)',
    'PRECIO VENTA - IMPRESION',
    'm²',
    200,
    200,
    'Servicio de impresión back light. Se carga solo cuando la carátula es LONA BACK LIGHT IMPRESA.'
  ),
  (
    'IMPRESION DE LONA BACK LIGHT EN ALTA RESOLUCION (EN HP)',
    'PRECIO VENTA - IMPRESION',
    'm²',
    260,
    260,
    'Servicio de impresión back light. Se carga solo cuando la carátula es LONA BACK LIGHT IMPRESA.'
  ),
  (
    'IMPRESION DE LONA BACK LIGHT EN ALTA RESOLUCION (EN HP, CON TINTA BLANCA)',
    'PRECIO VENTA - IMPRESION',
    'm²',
    275,
    275,
    'Servicio de impresión back light. Se carga solo cuando la carátula es LONA BACK LIGHT IMPRESA.'
  )
on conflict (item_name) do update
set category = excluded.category,
    unit = excluded.unit,
    internal_cost = excluded.internal_cost,
    sale_price = excluded.sale_price,
    notes = excluded.notes,
    updated_at = now();
