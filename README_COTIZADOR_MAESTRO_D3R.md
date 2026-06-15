# COTIZADOR MAESTRO D 3 R

Sistema web para cotizar cajas de luz, materiales, servicios, mano de obra, precios de venta y exportación en formato de calculadora interna.

Este proyecto inició como un cotizador maestro para cajas de luz de Pantera Publicidad y fue evolucionando hasta convertirse en un sistema web conectado a Supabase, desplegado en Vercel, con control de acceso por llave diaria, catálogo de precios editable, recetas dinámicas por tipo de caja y exportación a Excel.

---

## 1. Objetivo del sistema

El objetivo principal del sistema es permitir que el vendedor o usuario autorizado pueda capturar las características de una caja de luz y obtener un precio recomendado con utilidad mínima obligatoria, desglose interno y exportación a Excel.

El sistema busca evitar errores como:

- Cotizar con materiales incompatibles.
- Omitir materiales del desglose.
- Mezclar lona, vinil, acrílico o impresión incorrectamente.
- Usar precios desactualizados.
- Cotizar por debajo de la utilidad mínima.
- Cargar mano de obra incorrectamente.
- Repetir productos duplicados en el catálogo.
- Generar llaves de acceso indefinidas o duplicadas sin control.

---

## 2. Tecnologías usadas

El proyecto está construido con:

- Next.js 14
- React
- TypeScript
- Supabase
- Vercel
- ExcelJS / generación de archivo Excel
- GitHub como repositorio principal

Repositorio usado durante el desarrollo:

```text
AsherSudrak/cotizador-pantera-web
```

Proyecto desplegado en Vercel:

```text
cotizador-pantera-web
```

Nombre actual del proyecto:

```text
COTIZADOR MAESTRO D 3 R
```

---

## 3. Variables de entorno requeridas

En Vercel deben existir estas variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_SECRET=
```

Notas importantes:

- `NEXT_PUBLIC_SUPABASE_URL` debe ser solo la URL base de Supabase.
- No debe terminar en `/rest/v1`.
- Ejemplo correcto:

```text
https://xxxxxxxxxxxxxxxxxxxx.supabase.co
```

- Ejemplo incorrecto:

```text
https://xxxxxxxxxxxxxxxxxxxx.supabase.co/rest/v1/
```

---

## 4. Módulos principales del sistema

El sistema contiene los siguientes módulos:

```text
Cotizador
Admin llaves
Catálogo de precios
Exportación Excel
Motor de recetas
Control de utilidad
Catálogo Supabase
```

---

## 5. Control de acceso

El sistema usa llaves de acceso para permitir que vendedores entren al cotizador.

### 5.1 Nombre de llave

La llave dejó de usar el prefijo anterior:

```text
PANTERA-
```

Ahora la llave debe generarse con prefijo:

```text
D3RY-
```

Ejemplo:

```text
D3RY-123456
```

---

### 5.2 Duración de llave

Todas las llaves duran exactamente:

```text
24 horas
```

La duración ya no es editable desde pantalla.

Aunque alguien intente mandar otra duración por API, el backend fuerza:

```ts
hours = 24
```

---

### 5.3 Llave por equipo o vendedor

La llave se genera por:

```text
Equipo / vendedor
```

Si el mismo equipo vuelve a generar una llave mientras todavía tiene una llave activa, el sistema devuelve la misma llave y no crea otra nueva.

Esto evita llenar Supabase con llaves duplicadas.

No se recomienda manejar la llave por IP porque:

- Varias computadoras pueden compartir la misma IP.
- La IP puede cambiar.
- Una misma red puede tener muchos vendedores.
- Un celular o módem puede cambiar la IP constantemente.

Por eso se usa el campo:

```text
Equipo / vendedor
```

---

## 6. Tablas principales de Supabase

### 6.1 `access_keys`

Controla las llaves de acceso.

Campos principales:

```text
id
key_code
label
starts_at
expires_at
is_active
max_uses
used_count
created_at
```

Uso:

- `key_code`: llave tipo `D3RY-000000`
- `label`: equipo o vendedor
- `expires_at`: fecha de vencimiento
- `is_active`: permite activar o desactivar la llave

---

### 6.2 `cost_catalog`

Catálogo maestro de costos, precios y servicios.

Campos principales:

```text
item_name
category
unit
internal_cost
sale_price
notes
is_active
updated_at
```

Uso:

- Materiales
- Mano de obra
- Precios venta
- Servicios
- Viniles
- Diseño gráfico
- Traslados
- Andamios
- Descolgadas
- Material extra

Ejemplos:

```text
LONA BACK LITE 13 OZ 1.60 X 50
LAMINA GALVANIZADA CALIBRE 26 3.05 X 1.22 MTS
MANO DE OBRA HORA
ANDAMIOS
NÚM. DE DESCOLGADAS
15MIN. DE DISEÑO GRAFICO
VINIL DE CORTE CON BASE 60 CMS CORTE AMPLIO
```

---

### 6.3 `quote_recipes`

Tabla que define qué materiales y servicios se cargan según el tipo de caja.

Campos principales:

```text
recipe_name
box_type
face_material
canto
lighting_type
section
item_name
formula_type
factor
min_qty
max_qty
round_step
prefer_sale_price
is_active
notes
```

Se usa para que el sistema no dependa de reglas quemadas en el código, sino de recetas editables desde Supabase.

---

### 6.4 `vinyl_colors`

Tabla opcional para colores de vinil.

Campos principales:

```text
id
color_name
is_active
notes
created_at
updated_at
```

Permite manejar colores como:

```text
NEGRO
BLANCO
ROJO
AZUL
AMARILLO
VERDE
GRIS
DORADO
PLATA
NARANJA
MORADO
ROSA
TURQUESA
CAFÉ
OTRO
```

---

## 7. Reglas de utilidad

La utilidad mínima obligatoria del sistema es:

```text
40% real sobre precio de venta
```

La fórmula base es:

```text
Precio mínimo = Total inversión / 0.60
```

Ejemplo:

```text
Total inversión = $10,764.41
Precio mínimo = 10,764.41 / 0.60
Precio mínimo = $17,940.68
```

Si el precio histórico o calculado está debajo de ese mínimo, el sistema debe recomendar un precio más alto.

---

## 8. IVA

El sistema contempla IVA del:

```text
16%
```

El precio puede mostrarse como:

```text
Subtotal sin IVA
IVA
Total con IVA
```

---

## 9. Mano de obra

La mano de obra se calcula con costo hora:

```text
$98.72 por hora
```

Regla importante:

Las horas-hombre no se multiplican incorrectamente por el número de personas. Se reparten.

Ejemplo:

```text
12 horas-hombre con 3 personas = 4 horas por persona
```

No significa:

```text
12 x 3
```

---

## 10. Tipos de caja considerados

El sistema considera tipos como:

```text
CAJA DE LUZ CON LONA BACK
CAJA CON ACRILICO
CAJA SUAJADA A UNA VISTA
CAJA SUAJADA A DOS VISTAS
CAJA TIPO BANDERA
CAJAS GRANDES
CAJAS PEQUEÑAS
```

---

## 11. Estructura de captura del cotizador

La pantalla del cotizador trabaja con campos como:

```text
Vendedor
Tipo de caja
Carátula / frente
Canto
Vistas
Acabado
Viniles por color
Ancho
Alto
Fondo
Iluminación
Altura / condición de instalación
Traslado
Diseño gráfico
Adicionales del proyecto
Descuento
Comisión
```

---

## 12. Reglas para caja de luz con lona back

Para:

```text
CAJA DE LUZ CON LONA BACK
```

La carátula solo debe permitir:

```text
LONA BACK LIGHT IMPRESA
LONA BACK LIGHT ROTULADA
```

No debe permitir acrílico, vinil impreso, trovicel u otros materiales de carátula.

---

### 12.1 Lona Back impresa

Cuando se selecciona:

```text
LONA BACK LIGHT IMPRESA
```

Debe cargar:

```text
LONA BACK LITE 13 OZ
IMPRESION DE LONA BACK LIGHT EN ALTA RESOLUCION (EN HP)
```

No debe cargar vinil de corte.

La impresión siempre es en HP.

No debe haber selector Allwin ni tinta blanca.

Nombre usado:

```text
IMPRESION DE LONA BACK LIGHT EN ALTA RESOLUCION (EN HP)
```

---

### 12.2 Lona Back rotulada

Cuando se selecciona:

```text
LONA BACK LIGHT ROTULADA
```

Debe cargar:

```text
LONA BACK LITE 13 OZ
VINIL DE CORTE
TRANSFER
```

No debe cargar impresión HP.

---

## 13. Canto

Las opciones principales de canto son:

```text
LÁMINA GALVANIZADA CAL 26
ALUMINIO
```

Para lona back con lámina galvanizada, se usan materiales como:

```text
LAMINA GALVANIZADA CALIBRE 26 3.05 X 1.22 MTS
TUBULAR ZINTRO 3/4 X 3/4
PTR
ÁNGULO
SOLDADURA
PIJAS
TORNILLOS
TAQUETES
PINTURA
THINNER
ESTOPA
LIJA
```

---

## 14. Viniles por color

El sistema permite agregar varias líneas de vinil.

Ejemplo:

```text
1 ML vinil negro
2 ML vinil rojo
0.50 ML vinil dorado
```

La captura se muestra como tabla:

```text
Tipo de vinil | ML | Color | Otro color | Quitar
```

Cada fila se manda completa al desglose.

Ejemplo de línea:

```text
VINIL DE CORTE CON BASE 60 CMS CORTE AMPLIO · COLOR NEGRO
Cantidad: 1 ML
```

---

### 14.1 Opciones de vinil

Las opciones de vinil ya no deben decir:

```text
INCLUYE INSTALACION
```

Ahora deben mostrarse limpias:

```text
VINIL DE CORTE CON BASE 1.22 MTS CORTE AMPLIO
VINIL DE CORTE CON BASE 1.22 MTS CORTE DETALLADO
VINIL DE CORTE CON BASE 1.22 MTS CORTE SUPER DETALLADO
VINIL DE CORTE CON BASE 60 CMS CORTE AMPLIO
VINIL DE CORTE CON BASE 60 CMS CORTE DETALLADO
VINIL DE CORTE CON BASE 60 CMS CORTE SUPER DETALLADO
```

---

### 14.2 Precios base de vinil

Precios tomados como referencia de OpenERP:

```text
VINIL DE CORTE CON BASE 1.22 MTS CORTE AMPLIO = $885
VINIL DE CORTE CON BASE 1.22 MTS CORTE DETALLADO = $1,150
VINIL DE CORTE CON BASE 1.22 MTS CORTE SUPER DETALLADO = $1,450
VINIL DE CORTE CON BASE 60 CMS CORTE AMPLIO = $545
VINIL DE CORTE CON BASE 60 CMS CORTE DETALLADO = $680
VINIL DE CORTE CON BASE 60 CMS CORTE SUPER DETALLADO = $965
```

Estos precios deben poder editarse desde el catálogo de precios.

---

## 15. Diseño gráfico

Se agregó selector de diseño gráfico:

```text
SIN DISEÑO
15MIN. DE DISEÑO GRAFICO
30MIN. DE DISEÑO GRAFICO
45MIN. DE DISEÑO GRAFICO
60MIN. DE DISEÑO GRAFICO
90MIN. DE DISEÑO GRAFICO
120MIN. DE DISEÑO GRAFICO
```

Precios base:

```text
SIN DISEÑO = $0
15MIN. DE DISEÑO GRAFICO = $80
30MIN. DE DISEÑO GRAFICO = $155
45MIN. DE DISEÑO GRAFICO = $230
60MIN. DE DISEÑO GRAFICO = $305
90MIN. DE DISEÑO GRAFICO = $380
120MIN. DE DISEÑO GRAFICO = $455
```

Si se selecciona:

```text
SIN DISEÑO
```

No se cobra diseño.

---

## 16. Adicionales del proyecto

El apartado debe verse como:

```text
ADICIONALES DEL PROYECTO

MATERIAL EXTRA
ANDAMIOS
NÚM. DE DESCOLGADAS
```

Reglas:

```text
MATERIAL EXTRA = importe manual
ANDAMIOS = cantidad × $150
NÚM. DE DESCOLGADAS = cantidad × $250
```

Estos conceptos deben ir en:

```text
PRECIOS VENTA / SERVICIOS
```

No deben aparecer como sección separada de extras.

Ejemplo:

```text
Material extra: $500
Andamios: 2
Descolgadas: 3
```

Resultado:

```text
MATERIAL EXTRA = $500
ANDAMIOS = 2 × $150 = $300
NÚM. DE DESCOLGADAS = 3 × $250 = $750
```

---

## 17. Catálogo de precios

Se agregó una pestaña:

```text
Catálogo de precios
```

Permite editar desde pantalla:

```text
Concepto
Categoría
Unidad
Costo
Precio venta
Activo / inactivo
Notas
```

También permite agregar conceptos nuevos.

El acceso usa la misma clave de administrador:

```text
ADMIN_SECRET
```

---

### 17.1 Qué se puede actualizar desde el catálogo

Desde el catálogo se pueden actualizar:

```text
Materiales
Mano de obra
Servicios
Diseño gráfico
Viniles
Traslados
Andamios
Descolgadas
Material extra
Lona
Acrílico
Lámina galvanizada
LEDs
Fuentes
Pinturas
Consumibles
```

---

## 18. Duplicados del catálogo

Se agregó SQL para unificar duplicados.

El sistema debe evitar duplicados por diferencias como:

```text
vinil de corte
VINIL DE CORTE
VINIL   DE   CORTE
```

La limpieza normaliza:

```text
Mayúsculas
Espacios dobles
Acentos básicos
```

El SQL de unificación:

```text
1. Crea respaldo de cost_catalog
2. Crea respaldo de quote_recipes
3. Detecta duplicados por nombre normalizado
4. Conserva un concepto canónico
5. Actualiza quote_recipes
6. Elimina duplicados sobrantes
7. Elimina recetas duplicadas exactas
8. Crea índice único para evitar duplicados futuros
```

Tablas de respaldo creadas:

```text
cost_catalog_backup_before_dedupe
quote_recipes_backup_before_dedupe
```

---

## 19. Exportación a Excel

El sistema exporta un Excel con formato similar al formato interno de calculadora.

Debe incluir secciones:

```text
MATERIALES
MANO DE OBRA
PRECIOS VENTA / SERVICIOS
```

Y totales:

```text
SUBTOTAL
TOTAL IVA
TOTAL MAT
TOTAL MO
TOTAL VEN
SUB-TOTAL. MAT-MO
UTILIDAD
GASTOS INDIRECTOS
TOTAL PRECIO VENTA
TOTAL
```

Los adicionales del proyecto deben exportarse en:

```text
PRECIOS VENTA / SERVICIOS
```

---

## 20. Desglose interno

El desglose debe mostrar todos los conceptos realmente usados.

No debe mostrar materiales incompatibles.

Ejemplos:

- Si es lona back impresa, no debe aparecer vinil.
- Si es lona back rotulada, no debe aparecer impresión HP.
- Si no hay diseño, no debe cobrar diseño.
- Si no hay andamios, no debe aparecer andamios.
- Si no hay descolgadas, no debe aparecer descolgadas.
- Si se capturan varios colores de vinil, deben aparecer varias líneas.

---

## 21. Reportes reales usados para calibración

### 21.1 UTIL/19096

Caso:

```text
CAJA SUAJADA A DOS VISTAS
ACRÍLICO BLANCO LECHOSO ROTULADO
LED NORMAL
```

Resultado histórico:

```text
Precio venta: $8,106.30
Ganancia: 26%
```

Conclusión:

```text
Quedó bajo.
Debe ajustarse a utilidad real mínima del 40%.
```

Precio mínimo calculado:

```text
Total inversión / 0.60
```

---

### 21.2 SO56225 / UTIL19726

Caso:

```text
FABRICACION E INSTALACION DE CAJA DE LUZ A UNA VISTA
LONA BACK LIGHT IMPRESA
TINTA LATEX Y ALTA RESOLUCION
CANTOS Y RESPALDO DE LAMINA GALV. CAL. 26
PINTADOS DE COLOR BLANCO
```

Datos:

```text
Medida: 3.50 x 1.30 m
Cantos: 20 cm
Instalación: 3.50 m aprox.
Arte: METLIFE
Acabado: Rebase para tensado
```

Resultado histórico:

```text
Total inversión: $10,764.41
Precio venta: $19,932.20
Ganancia: 46%
```

Conclusión:

```text
Este precio sí estaba arriba del 40%.
Sirve como base para calibrar lona back impresa a una vista.
```

---

## 22. Fórmulas usadas en recetas

Tipos de fórmula usados en `quote_recipes`:

```text
fixed
area
area_waste
perimeter
perimeter_waste
sheet_3_05x1_22
acrylic_sheet_1_22x2_44
tube_6m
lamp_t8
lamp_bases
led_package
power_supply_60w
power_supply_100w
cable_by_area
fabrication_hours
installation_hours
design_service
transfer_zone
```

---

## 23. Reglas de iluminación

Se consideran opciones como:

```text
LAMPARAS LED T8
LEDS BLANCOS LUMINOSIDAD NORMAL (C/20 PZ)
LEDS ULTRABRILLANTES
SIN ILUMINACIÓN
```

Para lámparas T8 se usan:

```text
LAMPARA DE LEDS T8 16 WATS 1.20 MTS
BASES P/LAMPARA DE PICOS T8
CABLE #14
CABLE #18
CINTA DE AISLAR
```

Para LED normal o ultrabrillante se usan:

```text
Tiras LED
Fuente de poder 60 W
Fuente de poder 100 W
Cableado
Cinta de aislar
```

---

## 24. Reglas importantes de instalación

La instalación depende de:

```text
Altura
Condición de instalación
Andamios
Descolgadas
Fachada
Trabe
Techo
Escalera
```

Alturas base usadas:

```text
A nivel de piso
A 3 m
A 4 m
Mayor a 4 m
Con escalera
Con andamios
En fachada
En techo
Con descolgada
Especial
```

---

## 25. Archivos importantes del proyecto

Archivos principales:

```text
app/page.tsx
lib/quoteEngine.ts
lib/access.ts
lib/pricing.ts
lib/supabaseAdmin.ts
app/api/quote/route.ts
app/api/export-excel/route.ts
app/api/admin/key/route.ts
app/api/admin/cost-catalog/route.ts
app/api/vinyl-colors/route.ts
```

---

## 26. SQL importantes generados durante el proyecto

Durante el desarrollo se generaron SQL para:

```text
Crear cost_catalog
Crear quote_recipes
Cargar recetas de cajas de luz
Cargar lona back impresa
Cargar calibración SO56225
Cargar calibración UTIL19096
Cargar viniles por ML
Cargar colores de vinil
Cargar diseño gráfico
Cargar adicionales del proyecto
Unificar duplicados
Auditar conteo del catálogo
Crear índice para llaves por equipo
```

---

## 27. Paquetes de actualización generados

Durante el desarrollo se generaron paquetes como:

```text
update-lona-back-estructura.zip
update-desglose-export-excel.zip
update-hp-canto-limitado.zip
update-reglas-ocultas.zip
fix-use-server-quoteengine.zip
update-cotizador-recetas-completas.zip
update-export-excel-formato-calculadora.zip
update-quoteengine-desde-recipes.zip
update-recetas-todos-los-tipos.zip
update-nombre-d3ry-clave.zip
update-vinil-ml-sin-instalacion.zip
update-vinil-color.zip
update-vinil-colores-dinamicos.zip
update-vinil-multiple-extras.zip
update-key-24h-fija.zip
update-adicionales-y-llave-por-equipo.zip
fix-quitar-hours-page-v2.zip
update-adicionales-precio-venta.zip
fix-selector-diseno.zip
fix-viniles-tabla-completa.zip
update-panel-catalogo-precios.zip
update-unificar-duplicados-catalogo.zip
auditoria-conteo-catalogo.zip
```

---

## 28. Errores corregidos durante el desarrollo

### 28.1 Error de Supabase URL

Problema:

```text
NEXT_PUBLIC_SUPABASE_URL tenía /rest/v1/
```

Solución:

```text
Usar solo la URL base de Supabase.
```

---

### 28.2 Error `"use server"`

Error:

```text
A "use server" file can only export async functions
```

Causa:

```text
"use server" estaba en archivos donde no debía estar.
```

Solución:

Quitar `"use server"` de:

```text
lib/quoteEngine.ts
lib/pricing.ts
app/api/quote/route.ts
app/api/export-excel/route.ts
```

---

### 28.3 Error `Cannot find name 'hours'`

Error:

```text
Cannot find name 'hours'
```

Causa:

```text
Se eliminó el state de hours pero quedó visible el input de Vigencia horas.
```

Solución:

Eliminar el campo viejo:

```tsx
<input type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
```

Y dejar solo:

```text
Vigencia: 24 horas
```

---

### 28.4 Error por `vinyl_custom_color` duplicado

Error:

```text
An object literal cannot have multiple properties with the same name.
```

Causa:

```text
vinyl_custom_color aparecía dos veces en el payload.
```

Solución:

Eliminar la propiedad duplicada.

---

## 29. Flujo recomendado para actualizar el sistema

Cuando se haga una actualización:

```text
1. Descargar ZIP generado
2. Reemplazar archivos indicados en GitHub
3. Commit changes
4. Esperar build de Vercel
5. Si el paquete trae SQL, correrlo en Supabase
6. Probar el cotizador con un caso real
7. Exportar Excel y comparar desglose
```

---

## 30. Flujo para actualizar precios

Para actualizar precios:

```text
1. Entrar al sistema
2. Ir a Catálogo de precios
3. Capturar clave admin
4. Buscar concepto
5. Editar costo o precio venta
6. Guardar
7. Volver a cotizar
```

Ejemplo:

```text
ANDAMIOS
Precio venta: 150
```

```text
NÚM. DE DESCOLGADAS
Precio venta: 250
```

```text
MANO DE OBRA HORA
Costo: 98.72
```

---

## 31. Flujo para agregar un color de vinil

Si se usa tabla `vinyl_colors`:

```sql
insert into public.vinyl_colors (color_name, is_active, notes)
values ('FIUSHA', true, 'Color agregado')
on conflict (color_name) do update
set is_active = true,
    updated_at = now();
```

Después recargar el cotizador.

---

## 32. Flujo para agregar un producto nuevo

Desde el catálogo de precios:

```text
1. Ir a Catálogo de precios
2. Agregar nuevo concepto
3. Capturar nombre
4. Capturar categoría
5. Capturar unidad
6. Capturar costo
7. Capturar precio venta si aplica
8. Guardar
```

Ejemplo:

```text
Concepto: FUENTE DE PODER DE 150 W
Categoría: MATERIALES
Unidad: PIEZA
Costo: 650
Precio venta: 0
Activo: Sí
```

---

## 33. Notas de mantenimiento

- No editar precios directamente en código si ya existe el catálogo.
- No duplicar nombres de productos.
- Usar nombres en mayúsculas.
- Evitar espacios dobles.
- Revisar que las recetas apunten exactamente al `item_name` del catálogo.
- Si un concepto no aparece en el desglose, revisar que exista en `cost_catalog` y que esté activo.
- Si una receta no aplica, revisar `box_type`, `face_material`, `canto` y `lighting_type`.

---

## 34. Estado actual del sistema

Estado actual esperado:

```text
Nombre del sistema: COTIZADOR MAESTRO D 3 R
Llaves: D3RY, duración 24 horas
Cotizador: activo
Catálogo de precios: activo
Viniles por color: activo
Diseño gráfico: activo
Adicionales del proyecto: activo
Exportación Excel: activo
Utilidad mínima: 40%
Supabase: fuente principal de precios y recetas
Vercel: despliegue principal
```

---

## 35. Pendientes recomendados

Pendientes sugeridos:

```text
1. Revisar visualmente el panel de catálogo de precios.
2. Auditar duplicados después de correr el SQL.
3. Validar 3 casos reales más de OpenERP.
4. Comparar desglose del Excel contra formato interno.
5. Verificar que cada tipo de caja cargue solo materiales compatibles.
6. Ajustar recetas con más reportes reales.
7. Agregar más zonas de traslado si se requiere.
8. Documentar usuarios/equipos autorizados.
```

---

## 36. Responsable de uso

Este sistema debe usarse como apoyo para cotización, revisión de costos y control de utilidad.

La decisión final de precio puede depender de:

```text
Cliente
Urgencia
Instalación
Zona
Riesgo
Material especial
Condición real del sitio
Autorización administrativa
```

Pero el sistema debe bloquear o advertir cuando el precio no alcance la utilidad mínima configurada.

---

## 37. Resumen final

`COTIZADOR MAESTRO D 3 R` es un sistema web de cotización conectado a Supabase que permite calcular cajas de luz con desglose interno, control de utilidad, precios editables, recetas dinámicas, viniles por color, adicionales del proyecto, diseño gráfico, llaves de acceso diarias y exportación a Excel.

El sistema fue diseñado para reducir errores de cotización, unificar criterios, mantener precios actualizados y asegurar que las ventas respeten una utilidad mínima real del 40%.
