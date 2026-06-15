# Auditoría de catálogo

Corre `auditoria_conteo_catalogo.sql` en Supabase.

Te dirá:

- Total real de conceptos en `cost_catalog`
- Cuántos están activos e inactivos
- Conteo por categoría
- Si existen tablas de respaldo
- Duplicados por nombre normalizado
- Conceptos similares de vinil, lona, diseño, traslado y adicionales
- Recetas duplicadas exactas

Si el resultado de duplicados sale vacío, el catálogo ya está unificado.
