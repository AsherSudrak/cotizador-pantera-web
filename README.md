# Unificar duplicados de catálogo

## Archivos

- `supabase_unificar_duplicados_catalogo.sql`
  - Unifica duplicados en `cost_catalog`
  - Actualiza `quote_recipes`
  - Elimina recetas duplicadas exactas
  - Crea respaldo antes de modificar
  - Crea índice único para evitar duplicados futuros

- `app/api/admin/cost-catalog/route.ts`
  - Limpia nombres antes de guardar:
    - Mayúsculas
    - Espacios dobles
    - Trim

## Cómo usar

1. Reemplaza en GitHub:

```text
app/api/admin/cost-catalog/route.ts
```

2. Corre en Supabase:

```text
supabase_unificar_duplicados_catalogo.sql
```

3. Si al final el SELECT de duplicados sale vacío, quedó limpio.

## Respaldo

El SQL crea:

```text
cost_catalog_backup_before_dedupe
quote_recipes_backup_before_dedupe
```
