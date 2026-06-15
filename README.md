# Cotizador Pantera Web

Proyecto base para desplegar el cotizador de cajas de luz en Vercel con Supabase.

## Incluye

- Acceso por llave de 24 horas.
- Panel admin para generar llaves.
- Cálculo protegido desde servidor.
- Utilidad real mínima obligatoria del 40%.
- Ruta calibrada para caja suajada pequeña a dos vistas con acrílico.
- Catálogo de costos desde Supabase.

## Variables de entorno en Vercel

Crear estas variables en Vercel:

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
ADMIN_SECRET=TU_CLAVE_ADMIN_LARGA
NEXT_PUBLIC_APP_NAME=Cotizador Pantera
```

No subas `.env` a GitHub.

## Comandos locales

```bash
npm install
npm run dev
```

## Flujo

1. Admin entra a la pestaña "Admin llaves".
2. Captura ADMIN_SECRET.
3. Genera una llave de 24 horas.
4. Vendedor captura la llave en Cotizador.
5. Si la llave es válida, puede calcular precios.
6. Si la llave vence, se bloquea.

## Notas de seguridad

El cálculo se ejecuta del lado servidor en `/api/quote`, usando `SUPABASE_SERVICE_ROLE_KEY`.
Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` en el navegador ni en GitHub.

## Siguiente fase

Migrar todas las reglas del Excel:
- cajas con lona back light;
- acrílico impreso;
- vinil impreso;
- lámparas T8;
- traslados por zona;
- viáticos;
- impresiones;
- calibraciones adicionales.
