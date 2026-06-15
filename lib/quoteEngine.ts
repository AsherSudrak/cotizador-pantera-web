import { z } from "zod";
import { supabaseAdmin } from "./supabaseAdmin";
import {
  ceilPeso,
  priceForMargin,
  realMargin,
  round2,
  IVA_RATE,
  MIN_REAL_MARGIN,
  INDIRECT_RATE,
  LABOR_HOUR_COST,
  INSTALL_FACTORS
} from "./pricing";

export const QuoteInputSchema = z.object({
  access_key: z.string().min(1),
  client_name: z.string().min(1).default("CLIENTE NUEVO"),
  seller_name: z.string().optional().default(""),
  box_type: z.string().min(1),
  width_m: z.coerce.number().positive(),
  height_m: z.coerce.number().positive(),
  depth_cm: z.coerce.number().nonnegative().default(20),
  views: z.coerce.number().int().positive().default(1),
  face_material: z.string().min(1),
  canto: z.string().optional().default("LÁMINA GALVANIZADA CAL 26"),
  finish: z.string().optional().default(""),
  lighting_type: z.string().min(1),
  installation_included: z.boolean().default(true),
  installation_condition: z.string().default("A NIVEL DE PISO"),
  transfer_zone: z.string().default("ZONA A"),
  design_service: z.string().default("15MIN. DE DISEÑO GRAFICO"),
  backlight_print_service: z.string().optional().default(""),
  cut_vinyl: z.string().optional().default(""),
  vinyl_ml: z.coerce.number().nonnegative().default(0),
  vinyl_color: z.string().optional().default(""),
  vinyl_custom_color: z.string().optional().default(""),
  vinyl_items: z.array(z.object({
    vinyl_type: z.string().optional().default(""),
    ml: z.coerce.number().nonnegative().default(0),
    color: z.string().optional().default(""),
    custom_color: z.string().optional().default("")
  })).optional().default([]),
  extra_items: z.array(z.object({
    item_name: z.string().optional().default(""),
    quantity: z.coerce.number().nonnegative().default(0),
    unit: z.string().optional().default("PIEZA"),
    unit_cost: z.coerce.number().nonnegative().default(0)
  })).optional().default([]),
  commission: z.coerce.number().min(0).max(.30).default(0),
  discount: z.coerce.number().min(0).max(.90).default(0)
});

export type QuoteInput = z.infer<typeof QuoteInputSchema>;

export type QuoteSection = "material" | "labor" | "sale_service" | "extra";

export type QuoteLine = {
  section: QuoteSection;
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  visible_to_client?: boolean;
};

type CatalogItem = {
  item_name: string;
  unit: string | null;
  internal_cost: number;
  sale_price: number | null;
};

type RecipeRow = {
  recipe_name: string;
  box_type: string;
  face_material: string | null;
  canto: string | null;
  lighting_type: string | null;
  section: QuoteSection;
  item_name: string;
  formula_type: string;
  factor: number | null;
  min_qty: number | null;
  max_qty: number | null;
  round_step: number | null;
  prefer_sale_price: boolean | null;
  is_active: boolean | null;
};

const HP_BACKLIGHT_PRINT = "IMPRESION DE LONA BACK LIGHT EN ALTA RESOLUCION (EN HP)";

const FALLBACK_COSTS: Record<string, { unit: string; cost: number; sale?: number }> = {
  "ALUMINIO PARA CANTO": { unit: "ML", cost: 175 },
  "LAMINA GALVANIZADA CALIBRE 26 3.05 X 1.22": { unit: "PIEZA", cost: 526 },
  "TUBULAR PINTADO DE 3/4 X 3/4 OK": { unit: "PIEZA", cost: 166 },
  "SOLDADURA 6013 X 1/8\" VERDE": { unit: "kg", cost: 60 },
  "DISCO DE CORTE METAL 4 1/2 X 3/64": { unit: "PIEZA", cost: 7.86 },
  "DISCO DE DESBASTE 4 1/2 X 1/4": { unit: "PIEZA", cost: 21.13 },
  "PIJA TEK 1/2\"": { unit: "PIEZA", cost: 0.24 },
  "REMACHE 5/32 X 1/2": { unit: "PIEZA", cost: 0.4 },
  "LIJA # 100": { unit: "PIEZA", cost: 12 },
  "PRIMER GRIS/ROJO/BLANCO": { unit: "Litro", cost: 113.43 },
  "PINTURA ESMALTE ACRILICO S/RAPIDO BLANCO": { unit: "LITRO", cost: 127.04 },
  "THINNER STD": { unit: "LITRO", cost: 28.45 },
  "ESTOPA": { unit: "kg", cost: 50 },
  "LONA BACK LIGHT 2.00 x 50": { unit: "m2", cost: 23.99 },
  "VINIL DE CORTE ARCLAD 61CM NEGRO 6C VNB": { unit: "ML", cost: 31.03 },
  "VINIL DE CORTE CON BASE 1.22 MTS CORTE AMPLIO": { unit: "ML", cost: 885, sale: 885 },
  "VINIL DE CORTE CON BASE 1.22 MTS CORTE DETALLADO": { unit: "ML", cost: 1150, sale: 1150 },
  "VINIL DE CORTE CON BASE 1.22 MTS CORTE SUPER DETALLADO": { unit: "ML", cost: 1450, sale: 1450 },
  "VINIL DE CORTE CON BASE 60 CMS CORTE AMPLIO": { unit: "ML", cost: 545, sale: 545 },
  "VINIL DE CORTE CON BASE 60 CMS CORTE DETALLADO": { unit: "ML", cost: 680, sale: 680 },
  "VINIL DE CORTE CON BASE 60 CMS CORTE SUPER DETALLADO": { unit: "ML", cost: 965, sale: 965 },
  "TRANSFER DE .61": { unit: "SER", cost: 11.21 },
  "LAMPARA DE LEDS 16 WATS": { unit: "PIEZA", cost: 41.81 },
  "BASES P/LAMPARA DE PICOS T8": { unit: "PIEZA", cost: 17 },
  "CABLE # 14 DUPLEX": { unit: "Metro", cost: 18.32 },
  "CINTA DE AISLAR 3M TEMFLEX": { unit: "PIEZA", cost: 22.22 },
  "15MIN. DE DISEÑO GRAFICO": { unit: "Unit(s)", cost: 80, sale: 80 },
  "30MIN. DE DISEÑO GRAFICO": { unit: "Unit(s)", cost: 155, sale: 155 },
  "60MIN. DE DISEÑO GRAFICO": { unit: "Unit(s)", cost: 305, sale: 305 },
  "TRASLADO - ZONA A": { unit: "Unit(s)", cost: 0, sale: 0 },
  "TRASLADO - ZONA B": { unit: "Unit(s)", cost: 250, sale: 250 },
  "TRASLADO - ZONA C": { unit: "Unit(s)", cost: 450, sale: 450 },
  "TRASLADO - ZONA D": { unit: "Unit(s)", cost: 650, sale: 650 },
  "TRASLADO - ZONA E": { unit: "Unit(s)", cost: 950, sale: 950 },
  [HP_BACKLIGHT_PRINT]: { unit: "m2", cost: 260, sale: 260 }
};

async function loadCatalog() {
  const { data, error } = await supabaseAdmin
    .from("cost_catalog")
    .select("item_name, unit, internal_cost, sale_price")
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  const map = new Map<string, CatalogItem>();

  for (const row of data || []) {
    map.set(row.item_name, {
      item_name: row.item_name,
      unit: row.unit,
      internal_cost: Number(row.internal_cost || 0),
      sale_price: row.sale_price === null ? null : Number(row.sale_price)
    });
  }

  return map;
}

async function loadRecipes() {
  const { data, error } = await supabaseAdmin
    .from("quote_recipes")
    .select(
      "recipe_name, box_type, face_material, canto, lighting_type, section, item_name, formula_type, factor, min_qty, max_qty, round_step, prefer_sale_price, is_active"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    ...row,
    factor: row.factor === null ? null : Number(row.factor),
    min_qty: row.min_qty === null ? null : Number(row.min_qty),
    max_qty: row.max_qty === null ? null : Number(row.max_qty),
    round_step: row.round_step === null ? null : Number(row.round_step)
  })) as RecipeRow[];
}

function normalize(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
}

function canonicalBoxType(input: QuoteInput) {
  const boxType = normalize(input.box_type);

  // Evita diferencia de precios por el nombre viejo/ambiguo.
  // Para caja suajada con acrílico de 2 vistas debe usar la receta calibrada de DOS VISTAS.
  if (boxType === "CAJA SUAJADA CON ACRILICO") {
    return Number(input.views || 1) >= 2 ? "CAJA SUAJADA A DOS VISTAS" : "CAJA CON ACRILICO";
  }

  return input.box_type;
}

function matchesRecipe(recipe: RecipeRow, input: QuoteInput) {
  if (normalize(recipe.box_type) !== normalize(canonicalBoxType(input))) return false;

  if (recipe.face_material && normalize(recipe.face_material) !== normalize(input.face_material)) {
    return false;
  }

  if (recipe.canto && normalize(recipe.canto) !== normalize(input.canto)) {
    return false;
  }

  if (recipe.lighting_type && normalize(recipe.lighting_type) !== normalize(input.lighting_type)) {
    return false;
  }

  return true;
}

function roundUp(value: number, step: number) {
  if (value <= 0) return 0;
  if (!step || step <= 0) return value;
  return Math.ceil(value / step) * step;
}

function clampQty(value: number, minQty: number, maxQty: number | null) {
  let result = value;
  if (minQty && result < minQty) result = minQty;
  if (maxQty !== null && maxQty !== undefined && maxQty > 0 && result > maxQty) {
    result = maxQty;
  }
  return result;
}

function catalogValue(
  catalog: Map<string, CatalogItem>,
  itemName: string,
  preferSalePrice = false
) {
  const item = catalog.get(itemName);
  const fallback = FALLBACK_COSTS[itemName];

  const unit = item?.unit || fallback?.unit || "UNIDAD";
  const internalCost = Number(item?.internal_cost || fallback?.cost || 0);
  const salePrice =
    item?.sale_price === null || item?.sale_price === undefined
      ? fallback?.sale || null
      : Number(item.sale_price || 0);

  const unitCost =
    preferSalePrice && salePrice && salePrice > 0 ? salePrice : internalCost;

  return { unit, unitCost };
}

function makeLine(
  catalog: Map<string, CatalogItem>,
  section: QuoteSection,
  itemName: string,
  quantity: number,
  preferSalePrice: boolean,
  visibleToClient = false,
  forcedUnitCost?: number
): QuoteLine {
  const { unit, unitCost } = catalogValue(catalog, itemName, preferSalePrice);
  const finalUnitCost = forcedUnitCost ?? unitCost;

  return {
    section,
    item_name: itemName,
    quantity: round2(quantity),
    unit,
    unit_cost: round2(finalUnitCost),
    total_cost: round2(quantity * finalUnitCost),
    visible_to_client: visibleToClient
  };
}

function cleanLines(lines: QuoteLine[]) {
  return lines.filter((line) => {
    const qty = Number(line.quantity || 0);
    const total = Number(line.total_cost || 0);
    const unitCost = Number(line.unit_cost || 0);

    return qty > 0 && unitCost > 0 && total > 0;
  });
}

function groupLines(lines: QuoteLine[]) {
  return {
    materials: lines.filter((line) => line.section === "material"),
    labor: lines.filter((line) => line.section === "labor"),
    sale_services: lines.filter((line) => line.section === "sale_service"),
    extras: lines.filter((line) => line.section === "extra")
  };
}

function sumLines(lines: QuoteLine[]) {
  return round2(lines.reduce((sum, line) => sum + Number(line.total_cost || 0), 0));
}

function isBacklightPrinted(input: QuoteInput) {
  return input.face_material === "LONA BACK LIGHT IMPRESA";
}

function isBacklightRotulada(input: QuoteInput) {
  return input.face_material === "LONA BACK LIGHT ROTULADA";
}

function calculateBaseValues(input: QuoteInput) {
  const faceArea = input.width_m * input.height_m;
  const totalFaceArea = faceArea * input.views;
  const depthM = input.depth_cm / 100;
  const perimeter = (input.width_m + input.height_m) * 2 * input.views;
  const sideArea = perimeter * depthM;
  const paintedArea = totalFaceArea + sideArea;

  const lampCount = Math.max(1, Math.ceil(totalFaceArea * 1.6));
  const ledPackages = Math.max(1, Math.ceil(totalFaceArea * 2));
  const ledWatts = ledPackages * 14.4;

  return {
    faceArea,
    totalFaceArea,
    depthM,
    perimeter,
    sideArea,
    paintedArea,
    lampCount,
    ledPackages,
    ledWatts
  };
}

function itemNameFromRecipe(recipe: RecipeRow, input: QuoteInput) {
  const recipeItem = normalize(recipe.item_name);

  if (recipeItem.includes("VINIL DE CORTE") && input.cut_vinyl) {
    return input.cut_vinyl;
  }

  if (recipe.formula_type === "design_service") {
    return input.design_service;
  }

  if (recipe.formula_type === "transfer_zone") {
    return `TRASLADO - ${input.transfer_zone}`;
  }

  if (recipe.formula_type === "power_supply_60w") {
    return "FUENTE DE PODER DE 60 W";
  }

  if (recipe.formula_type === "power_supply_100w") {
    return "FUENTE DE PODER DE 100 W";
  }

  return recipe.item_name;
}

function quantityFromRecipe(recipe: RecipeRow, input: QuoteInput) {
  const selectedItemName = itemNameFromRecipe(recipe, input);
  const totalVinylMl = selectedVinylItems(input).reduce((sum, item) => sum + Number(item.ml || 0), 0);

  if (totalVinylMl > 0 && isTransferItem(selectedItemName)) {
    return round2(totalVinylMl);
  }

  const factor = Number(recipe.factor || 1);
  const minQty = Number(recipe.min_qty || 0);
  const maxQty = recipe.max_qty === null || recipe.max_qty === undefined ? null : Number(recipe.max_qty);
  const roundStep = Number(recipe.round_step || 0.01);
  const base = calculateBaseValues(input);

  let qty = 0;

  switch (recipe.formula_type) {
    case "fixed":
      qty = factor;
      break;

    case "area":
      qty = base.totalFaceArea * factor;
      break;

    case "area_waste":
      qty = base.totalFaceArea * factor;
      break;

    case "perimeter":
      qty = base.perimeter * factor;
      break;

    case "perimeter_waste":
      qty = base.perimeter * factor;
      break;

    case "sheet_3_05x1_22":
      qty = (base.totalFaceArea + base.sideArea) / 3.721 * factor;
      break;

    case "acrylic_sheet_1_22x2_44":
      qty = base.totalFaceArea / 2.9768 * factor;
      break;

    case "tube_6m":
      qty = (base.perimeter * factor) / 6;
      break;

    case "lamp_t8":
      qty = Math.max(1, Math.ceil(base.totalFaceArea * factor));
      break;

    case "lamp_bases":
      qty = base.lampCount * factor;
      break;

    case "led_package":
      qty = Math.max(1, Math.ceil(base.totalFaceArea * factor));
      break;

    case "power_supply_60w":
      qty = base.ledWatts <= 42 ? 1 : 0;
      break;

    case "power_supply_100w":
      qty = base.ledWatts > 42 ? Math.max(1, Math.ceil(base.ledWatts / 70)) : 0;
      break;

    case "cable_by_area":
      qty = base.totalFaceArea * factor;
      break;

    case "fabrication_hours":
      qty = Math.max(minQty || 10, base.totalFaceArea * factor);
      break;

    case "installation_hours":
      if (!input.installation_included) {
        qty = 0;
      } else if (base.totalFaceArea <= 1) {
        qty = 3;
      } else if (base.totalFaceArea <= 3) {
        qty = 8;
      } else if (base.totalFaceArea <= 10) {
        qty = 12;
      } else {
        qty = 18;
      }
      break;

    case "design_service":
      qty = 1;
      break;

    case "transfer_zone":
      qty = 1;
      break;

    default:
      qty = 0;
      break;
  }

  qty = roundUp(qty, roundStep);
  qty = clampQty(qty, minQty, maxQty);

  return round2(qty);
}

function forcedUnitCostForRecipe(recipe: RecipeRow, input: QuoteInput) {
  if (recipe.section === "labor") {
    const factor = recipe.formula_type === "installation_hours"
      ? INSTALL_FACTORS[input.installation_condition] || 1
      : 1;

    return LABOR_HOUR_COST * factor;
  }

  return undefined;
}


function selectedVinylColor(input: QuoteInput) {
  const color = (input.vinyl_color || "").trim().toUpperCase();
  const custom = (input.vinyl_custom_color || "").trim().toUpperCase();

  if (color === "OTRO" && custom) return custom;
  return color || "";
}

function isVinylItem(itemName: string) {
  const name = normalize(itemName);
  return name.includes("VINIL DE CORTE");
}

function isTransferItem(itemName: string) {
  const name = normalize(itemName);
  return name.includes("TRANSFER");
}

function selectedVinylItems(input: QuoteInput) {
  const items = (input.vinyl_items || [])
    .map((item) => ({
      vinyl_type: (item.vinyl_type || "").trim(),
      ml: Number(item.ml || 0),
      color: (item.color || "").trim().toUpperCase(),
      custom_color: (item.custom_color || "").trim().toUpperCase()
    }))
    .filter((item) => item.vinyl_type && item.ml > 0);

  if (items.length > 0) return items;

  const legacyMl = Number(input.vinyl_ml || 0);
  if (legacyMl > 0 && input.cut_vinyl) {
    return [
      {
        vinyl_type: input.cut_vinyl,
        ml: legacyMl,
        color: (input.vinyl_color || "").trim().toUpperCase(),
        custom_color: (input.vinyl_custom_color || "").trim().toUpperCase()
      }
    ];
  }

  return [];
}

function vinylColorLabel(item: { color?: string; custom_color?: string }) {
  const color = (item.color || "").trim().toUpperCase();
  const custom = (item.custom_color || "").trim().toUpperCase();

  if (color === "OTRO" && custom) return custom;
  return color || "";
}

function vinylDescription(input: QuoteInput) {
  const items = selectedVinylItems(input);
  if (!items.length) return "";

  return items
    .map((item) => {
      const color = vinylColorLabel(item);
      const colorText = color ? ` COLOR ${color}` : "";
      return `${item.vinyl_type}${colorText} · ${item.ml} ML`;
    })
    .join(", ");
}


export async function calculateQuote(input: QuoteInput) {
  const catalog = await loadCatalog();
  const recipes = await loadRecipes();

  const applicableRecipes = recipes.filter((recipe) => matchesRecipe(recipe, input));

  const rawLines: QuoteLine[] = [];

  for (const recipe of applicableRecipes) {
    const itemName = itemNameFromRecipe(recipe, input);
    const forcedUnitCost = forcedUnitCostForRecipe(recipe, input);

    const visibleToClient =
      recipe.section === "sale_service" ||
      recipe.formula_type === "design_service" ||
      recipe.formula_type === "transfer_zone";

    if (isVinylItem(itemName)) {
      const vinylItems = selectedVinylItems(input);

      if (vinylItems.length > 0) {
        for (const vinylItem of vinylItems) {
          const line = makeLine(
            catalog,
            recipe.section,
            vinylItem.vinyl_type,
            Number(vinylItem.ml || 0),
            Boolean(recipe.prefer_sale_price),
            visibleToClient,
            forcedUnitCost
          );

          const color = vinylColorLabel(vinylItem);
          if (color) {
            line.item_name = `${line.item_name} · COLOR ${color}`;
          }

          rawLines.push(line);
        }

        continue;
      }
    }

    const quantity = quantityFromRecipe(recipe, input);

    rawLines.push(
      makeLine(
        catalog,
        recipe.section,
        itemName,
        quantity,
        Boolean(recipe.prefer_sale_price),
        visibleToClient,
        forcedUnitCost
      )
    );
  }

  for (const extra of input.extra_items || []) {
    const itemName = (extra.item_name || "").trim().toUpperCase();
    const quantity = Number(extra.quantity || 0);
    const unit = (extra.unit || "PIEZA").trim().toUpperCase();
    const unitCost = Number(extra.unit_cost || 0);

    if (itemName && quantity > 0 && unitCost > 0) {
      rawLines.push({
        section: "sale_service",
        item_name: itemName,
        quantity: round2(quantity),
        unit,
        unit_cost: round2(unitCost),
        total_cost: round2(quantity * unitCost),
        visible_to_client: true
      });
    }
  }

  const lines = cleanLines(rawLines);
  const grouped = groupLines(lines);

  const sectionTotals = {
    materials: sumLines(grouped.materials),
    labor: sumLines(grouped.labor),
    sale_services: sumLines(grouped.sale_services),
    extras: sumLines(grouped.extras)
  };

  const directCost = round2(
    sectionTotals.materials +
      sectionTotals.labor +
      sectionTotals.sale_services +
      sectionTotals.extras
  );

  const indirectCost = round2(directCost * INDIRECT_RATE);
  const totalCost = ceilPeso(directCost + indirectCost);
  const targetPrice = priceForMargin(totalCost, MIN_REAL_MARGIN, input.commission);
  const discounted = Math.round(targetPrice * (1 - input.discount));
  const subtotal = Math.max(discounted, targetPrice);
  const iva = round2(subtotal * IVA_RATE);
  const total = round2(subtotal + iva);
  const margin = realMargin(subtotal, totalCost, input.commission);
  const utility = round2(subtotal - totalCost - subtotal * input.commission);
  const marginValidated = margin >= MIN_REAL_MARGIN;

  return {
    input,
    calibrated: false,
    recipe_count: applicableRecipes.length,
    description:
      `FABRICACIÓN ${canonicalBoxType(input)} — MEDIDAS ${input.width_m.toFixed(2)} X ${input.height_m.toFixed(2)} M, ` +
      `FONDO ${input.depth_cm} CM, ${input.views} VISTA(S). CARÁTULA: ${input.face_material}. ` +
      `CANTO: ${input.canto || "NO ESPECIFICADO"}. ACABADO: ${input.finish || "AUTOMÁTICO"}. ` +
      `${
        isBacklightPrinted(input)
          ? `IMPRESIÓN: ${HP_BACKLIGHT_PRINT}. `
          : ""
      }` +
      `${isBacklightRotulada(input) ? `ROTULADO: ${vinylDescription(input)}. ` : ""}` +
      `ILUMINACIÓN: ${input.lighting_type}. ` +
      `${
        input.installation_included
          ? `INCLUYE INSTALACIÓN ${input.installation_condition}.`
          : "SIN INSTALACIÓN."
      } ` +
      `TRASLADO: ${input.transfer_zone}. DISEÑO: ${input.design_service}.`,
    lines,
    grouped_lines: grouped,
    section_totals: sectionTotals,
    totals: {
      direct_cost: directCost,
      indirect_cost: indirectCost,
      total_cost: totalCost,
      utility,
      subtotal_without_iva: subtotal,
      iva,
      total_with_iva: total,
      real_margin: round2(margin * 100),
      minimum_margin: MIN_REAL_MARGIN * 100,
      margin_validated: marginValidated,
      discount_blocked: input.discount > 0 && discounted < targetPrice
    }
  };
}
