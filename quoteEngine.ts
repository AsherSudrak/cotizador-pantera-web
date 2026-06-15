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
  lighting_type: z.string().min(1),
  installation_included: z.boolean().default(true),
  installation_condition: z.string().default("A NIVEL DE PISO"),
  transfer_zone: z.string().default("ZONA A"),
  design_service: z.string().default("15MIN. DE DISEÑO GRAFICO"),
  cut_vinyl: z.string().default("VINIL DE CORTE ARCLAD 61CM NEGRO 6C VNB"),
  commission: z.coerce.number().min(0).max(.30).default(0),
  discount: z.coerce.number().min(0).max(.90).default(0)
});

export type QuoteInput = z.infer<typeof QuoteInputSchema>;

type CatalogItem = {
  item_name: string;
  unit: string | null;
  internal_cost: number;
  sale_price: number | null;
};

type QuoteLine = {
  section: "material" | "labor" | "sale_service" | "extra";
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  visible_to_client?: boolean;
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

function lineFromCatalog(
  catalog: Map<string, CatalogItem>,
  section: QuoteLine["section"],
  itemName: string,
  quantity: number,
  visible_to_client = false
): QuoteLine {
  const item = catalog.get(itemName);
  const unitCost = Number(item?.internal_cost || 0);
  return {
    section,
    item_name: itemName,
    quantity: round2(quantity),
    unit: item?.unit || "UNIDAD",
    unit_cost: unitCost,
    total_cost: round2(quantity * unitCost),
    visible_to_client
  };
}

function manualLine(
  section: QuoteLine["section"],
  itemName: string,
  quantity: number,
  unit: string,
  unitCost: number,
  visible_to_client = false
): QuoteLine {
  return {
    section,
    item_name: itemName,
    quantity: round2(quantity),
    unit,
    unit_cost: round2(unitCost),
    total_cost: round2(quantity * unitCost),
    visible_to_client
  };
}

function isSmallTwoViewAcrylicSuajada(input: QuoteInput) {
  const totalFaceArea = input.width_m * input.height_m * input.views;
  return (
    input.box_type === "CAJA SUAJADA A DOS VISTAS" &&
    input.face_material.toUpperCase().includes("ACRILICO") &&
    input.views === 2 &&
    totalFaceArea <= 1.0
  );
}

export async function calculateQuote(input: QuoteInput) {
  const catalog = await loadCatalog();
  const lines: QuoteLine[] = [];
  const faceArea = input.width_m * input.height_m;
  const totalFaceArea = faceArea * input.views;
  const installFactor = INSTALL_FACTORS[input.installation_condition] || 1;

  const calibrated = isSmallTwoViewAcrylicSuajada(input);

  if (calibrated) {
    lines.push(lineFromCatalog(catalog, "material", "HOJA DE ACRILICO BLANCO LECHOSO 3MM - 1.22 X 2.44 OK", 0.75));
    lines.push(lineFromCatalog(catalog, "material", "LAMINA GALVANIZADA CALIBRE 26 3.05 X 1.22", 0.50));
    lines.push(lineFromCatalog(catalog, "material", "TUBULAR PINTADO DE 1/2 X 1/2", 1.50));
    lines.push(lineFromCatalog(catalog, "material", "LEDS BLANCOS LUMINOSIDAD NORMAL (C/20 PZ)", 2));
    lines.push(lineFromCatalog(catalog, "material", "FUENTE DE PODER DE 60 W", 1));
    lines.push(lineFromCatalog(catalog, "material", "CABLE DUPLEX TRANSPARENTE # 18 OK", 5));
    lines.push(lineFromCatalog(catalog, "material", "THINNER STD", 2));
    lines.push(lineFromCatalog(catalog, "material", "PINTURA ESMALTE ACRILICO S/RAPIDO COLOR NEGRO", 1));
    lines.push(lineFromCatalog(catalog, "material", "SILVATRIM NEGRO", 6));
    lines.push(lineFromCatalog(catalog, "material", "TAQUETE TX 3/8 X 3", 4));
    lines.push(lineFromCatalog(catalog, "material", "ESTOPA", 0.25));
    lines.push(lineFromCatalog(catalog, "material", "LIJA # 100", 1));
    lines.push(lineFromCatalog(catalog, "material", "ADECRIL EXTRA ENVASE DE (960gr)", 0.10));
    lines.push(lineFromCatalog(catalog, "material", "CLOROFORMO ENVASE DE (960gr)", 0.10));
    lines.push(lineFromCatalog(catalog, "material", "PEGAMENTO P/ESPEJO GUNTHER (USAR)", 1));
    lines.push(lineFromCatalog(catalog, "material", "JERINGA GRANDE 3ML", 1));
    lines.push(lineFromCatalog(catalog, "material", input.cut_vinyl, 0.61, true));

    lines.push(manualLine("labor", "FABRICACIÓN", 18, "Hora(s)", LABOR_HOUR_COST));
    lines.push(manualLine("labor", `INSTALACIÓN · ${input.installation_condition}`, 1.5, "Hora(s)", LABOR_HOUR_COST * installFactor));
    lines.push(manualLine("labor", "TIEMPO MUERTO", 1.15, "Hora(s)", 60));
  } else {
    // Regla general inicial. Esta parte se irá ampliando con las rutas del Excel.
    const acrylicSheets = input.face_material.toUpperCase().includes("ACRILICO")
      ? Math.ceil(((totalFaceArea * 1.15) / 2.9768) / 0.25) * 0.25
      : 0;

    const galvanizedSheets = Math.ceil(((totalFaceArea + (input.width_m + input.height_m) * 2 * (input.depth_cm / 100)) / 3.721) / 0.25) * 0.25;
    const tubularPieces = Math.max(1, Math.ceil(((input.width_m + input.height_m) * 2 * input.views * 1.2) / 6));

    if (acrylicSheets > 0) {
      lines.push(lineFromCatalog(catalog, "material", "HOJA DE ACRILICO BLANCO LECHOSO 3MM - 1.22 X 2.44 OK", acrylicSheets));
    }

    lines.push(lineFromCatalog(catalog, "material", "LAMINA GALVANIZADA CALIBRE 26 3.05 X 1.22", galvanizedSheets));
    lines.push(lineFromCatalog(catalog, "material", "TUBULAR PINTADO DE 3/4 X 3/4 OK", tubularPieces));

    if (input.lighting_type.includes("LEDS BLANCOS")) {
      const packages = Math.max(1, Math.ceil((totalFaceArea * 18) / 20));
      lines.push(lineFromCatalog(catalog, "material", "LEDS BLANCOS LUMINOSIDAD NORMAL (C/20 PZ)", packages));
      lines.push(lineFromCatalog(catalog, "material", "FUENTE DE PODER DE 100 W", Math.max(1, Math.ceil((packages * 14.4) / 70))));
      lines.push(lineFromCatalog(catalog, "material", "PEGAMENTO P/ESPEJO GUNTHER (USAR)", Math.max(1, Math.ceil(totalFaceArea / 4))));
    }

    if (input.face_material.toUpperCase().includes("ROTULAD")) {
      lines.push(lineFromCatalog(catalog, "material", input.cut_vinyl, Math.ceil(totalFaceArea * 1.2 * 100) / 100, true));
    }

    const fabricationHours = Math.max(14, totalFaceArea * 12 * 1.35);
    const installationHours = input.installation_included ? (totalFaceArea >= 40 ? 18 : 8) : 0;

    lines.push(manualLine("labor", "FABRICACIÓN", fabricationHours, "Hora(s)", LABOR_HOUR_COST));
    if (installationHours > 0) {
      lines.push(manualLine("labor", `INSTALACIÓN · ${input.installation_condition}`, installationHours, "Hora(s)", LABOR_HOUR_COST * installFactor));
    }
  }

  // Servicios comerciales / costos directos.
  lines.push(lineFromCatalog(catalog, "sale_service", input.design_service, 1, true));
  lines.push(lineFromCatalog(catalog, "sale_service", `TRASLADO - ${input.transfer_zone}`, 1, true));

  const directCost = round2(lines.reduce((sum, line) => sum + line.total_cost, 0));
  const indirectCost = round2(directCost * INDIRECT_RATE);
  const totalCost = ceilPeso(directCost + indirectCost);
  const targetPrice = priceForMargin(totalCost, MIN_REAL_MARGIN, input.commission);
  const discounted = Math.round(targetPrice * (1 - input.discount));
  const subtotal = Math.max(discounted, targetPrice);
  const iva = round2(subtotal * IVA_RATE);
  const total = round2(subtotal + iva);
  const margin = realMargin(subtotal, totalCost, input.commission);

  const marginValidated = margin >= MIN_REAL_MARGIN;

  return {
    input,
    calibrated,
    description:
      `FABRICACIÓN ${input.box_type} — MEDIDAS ${input.width_m.toFixed(2)} X ${input.height_m.toFixed(2)} M, ` +
      `FONDO ${input.depth_cm} CM, ${input.views} VISTA(S). CARÁTULA: ${input.face_material}. ` +
      `ILUMINACIÓN: ${input.lighting_type}. ` +
      `${input.installation_included ? `INCLUYE INSTALACIÓN ${input.installation_condition}.` : "SIN INSTALACIÓN."} ` +
      `TRASLADO: ${input.transfer_zone}. DISEÑO: ${input.design_service}.`,
    lines,
    totals: {
      direct_cost: directCost,
      indirect_cost: indirectCost,
      total_cost: totalCost,
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
