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

const HP_BACKLIGHT_PRINT = "IMPRESION DE LONA BACK LIGHT EN ALTA RESOLUCION (EN HP)";

const FALLBACK_COSTS: Record<string, { unit: string; cost: number; sale?: number }> = {
  "ALUMINIO PARA CANTO": { unit: "ML", cost: 175 },
  "LAMINA GALVANIZADA CALIBRE 26 3.05 X 1.22": { unit: "PIEZA", cost: 526 },
  "TUBULAR PINTADO DE 3/4 X 3/4 OK": { unit: "PIEZA", cost: 166 },
  "TUBULAR PINTADO DE 1/2 X 1/2": { unit: "PIEZA", cost: 121 },
  "ANGULO DE ACERO 1/8 X 1": { unit: "PIEZA", cost: 221 },
  "SOLDADURA 6013 X 1/8\" VERDE": { unit: "kg", cost: 60 },
  "DISCO DE CORTE METAL 4 1/2 X 3/64": { unit: "PIEZA", cost: 7.86 },
  "DISCO DE DESBASTE 4 1/2 X 1/4": { unit: "PIEZA", cost: 21.13 },
  "PIJA TEK 1/2\"": { unit: "PIEZA", cost: 0.24 },
  "PIJA TALADRANTE 1/4 X 1 1/2\"": { unit: "PIEZA", cost: 0.90 },
  "REMACHE 5/32 X 1/2": { unit: "PIEZA", cost: 0.40 },
  "THINNER STD": { unit: "LITRO", cost: 28.45 },
  "ESTOPA": { unit: "kg", cost: 50 },
  "LIJA # 100": { unit: "PIEZA", cost: 12 },
  "PRIMER GRIS/ROJO/BLANCO": { unit: "Litro", cost: 113.43 },
  "PINTURA ESMALTE ACRILICO S/RAPIDO BLANCO": { unit: "LITRO", cost: 127.04 },
  "TAQUETE TX 3/8 X 3": { unit: "PIEZA", cost: 9.04 },
  "TAQUETE TX 1/4 X 2 1/2": { unit: "PIEZA", cost: 6.40 },
  "LONA BACK LIGHT 2.00 x 50": { unit: "m2", cost: 23.99 },
  "LAMPARA DE LEDS 16 WATS": { unit: "PIEZA", cost: 41.81 },
  "BASES P/LAMPARA DE PICOS T8": { unit: "PIEZA", cost: 17 },
  "CABLE # 14 DUPLEX": { unit: "Metro", cost: 18.32 },
  "CABLE # 18": { unit: "METRO", cost: 8 },
  "CABLE DUPLEX TRANSPARENTE # 18 OK": { unit: "METRO", cost: 9.74 },
  "CINTA DE AISLAR 3M TEMFLEX": { unit: "PIEZA", cost: 22.22 },
  "TIRA DE LEDS BLANCOS LUMINOSIDAD NORMAL (C/20 PZ)": { unit: "PIEZA", cost: 110 },
  "LEDS BLANCOS LUMINOSIDAD NORMAL (C/20 PZ)": { unit: "PIEZA", cost: 110 },
  "LEDS ULTRABRILLANTES": { unit: "PIEZA", cost: 240 },
  "FUENTE DE PODER DE 60 W": { unit: "PIEZA", cost: 240 },
  "FUENTE DE PODER DE 100 W": { unit: "PIEZA", cost: 450 },
  "PEGAMENTO P/ESPEJO GUNTHER (USAR)": { unit: "PIEZA", cost: 160 },
  "HOJA DE ACRILICO BLANCO LECHOSO 3MM - 1.22 X 2.44 OK": { unit: "PIEZA", cost: 840 },
  "ADECRIL EXTRA ENVASE DE (960gr)": { unit: "KG", cost: 202.10 },
  "CLOROFORMO ENVASE DE (960gr)": { unit: "KILO", cost: 337.78 },
  "JERINGA GRANDE 3ML": { unit: "PIEZA", cost: 5 },
  "SILVATRIM NEGRO": { unit: "ML", cost: 35 },
  "VINIL DE CORTE ARCLAD 61CM NEGRO 6C VNB": { unit: "ML", cost: 31.03 },
  "VINIL DE CORTE ARCLAD 122 CM": { unit: "ML", cost: 62.07 },
  "TRANSFER DE .61": { unit: "SER", cost: 11.21 },
  "VINIL DE IMPRESION 1.52 MTS": { unit: "SER", cost: 120 },
  "Impresion De Vinil Autoadherible": { unit: "m2", cost: 100, sale: 140 },
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

function roundUp(value: number, step: number) {
  if (value <= 0) return 0;
  return Math.ceil(value / step) * step;
}

function minMax(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function lineFromCatalog(
  catalog: Map<string, CatalogItem>,
  section: QuoteLine["section"],
  itemName: string,
  quantity: number,
  visible_to_client = false,
  preferSalePrice = false
): QuoteLine {
  const { unit, unitCost } = catalogValue(catalog, itemName, preferSalePrice);

  return {
    section,
    item_name: itemName,
    quantity: round2(quantity),
    unit,
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

function isSmallTwoViewAcrylicSuajada(input: QuoteInput) {
  const totalFaceArea = input.width_m * input.height_m * input.views;

  return (
    input.box_type === "CAJA SUAJADA A DOS VISTAS" &&
    input.face_material.toUpperCase().includes("ACRILICO") &&
    input.views === 2 &&
    totalFaceArea <= 1.0
  );
}

function isLonaBackBox(input: QuoteInput) {
  return input.box_type.toUpperCase().includes("LONA BACK");
}

function isTipoBandera(input: QuoteInput) {
  return input.box_type.toUpperCase().includes("BANDERA");
}

function isSuajada(input: QuoteInput) {
  return input.box_type.toUpperCase().includes("SUAJADA");
}

function isBacklightPrinted(input: QuoteInput) {
  return input.face_material === "LONA BACK LIGHT IMPRESA";
}

function isBacklightRotulada(input: QuoteInput) {
  return input.face_material === "LONA BACK LIGHT ROTULADA";
}

function isAcrylic(input: QuoteInput) {
  return input.face_material.toUpperCase().includes("ACRILICO");
}

function isAcrylicPrinted(input: QuoteInput) {
  return input.face_material.toUpperCase().includes("ACRILICO IMPRESO");
}

function isAcrylicRotulated(input: QuoteInput) {
  return input.face_material.toUpperCase().includes("ACRILICO") &&
    input.face_material.toUpperCase().includes("ROTULAD");
}

function addStructureAndConsumables(
  lines: QuoteLine[],
  catalog: Map<string, CatalogItem>,
  input: QuoteInput,
  totalFaceArea: number
) {
  const depthM = input.depth_cm / 100;
  const perimeterOneView = (input.width_m + input.height_m) * 2;
  const perimeter = perimeterOneView * input.views;
  const sideArea = perimeter * depthM;
  const paintedArea = totalFaceArea + sideArea;

  const galvanizedSheets = roundUp((totalFaceArea + sideArea) / 3.721, 0.25);
  const tubularPieces = Math.max(1, Math.ceil((perimeter * 1.2) / 6));
  const aluminumMl = roundUp(perimeter, 0.1);

  if (input.canto === "ALUMINIO") {
    lines.push(lineFromCatalog(catalog, "material", "ALUMINIO PARA CANTO", aluminumMl));
  } else {
    lines.push(lineFromCatalog(catalog, "material", "LAMINA GALVANIZADA CALIBRE 26 3.05 X 1.22", galvanizedSheets));
  }

  lines.push(lineFromCatalog(catalog, "material", "TUBULAR PINTADO DE 3/4 X 3/4 OK", tubularPieces));

  if (isSuajada(input) || isTipoBandera(input) || totalFaceArea >= 3) {
    lines.push(lineFromCatalog(catalog, "material", "ANGULO DE ACERO 1/8 X 1", Math.max(1, Math.ceil(perimeter / 6))));
  }

  lines.push(lineFromCatalog(catalog, "material", "SOLDADURA 6013 X 1/8\" VERDE", roundUp(perimeter * 0.04, 0.25)));
  lines.push(lineFromCatalog(catalog, "material", "DISCO DE CORTE METAL 4 1/2 X 3/64", Math.max(1, Math.ceil((tubularPieces + galvanizedSheets) / 4))));
  lines.push(lineFromCatalog(catalog, "material", "DISCO DE DESBASTE 4 1/2 X 1/4", Math.max(1, Math.ceil(tubularPieces / 6))));
  lines.push(lineFromCatalog(catalog, "material", "PIJA TEK 1/2\"", Math.max(20, Math.ceil(perimeter * 8))));
  lines.push(lineFromCatalog(catalog, "material", "PIJA TALADRANTE 1/4 X 1 1/2\"", Math.max(12, Math.ceil(perimeter * 4))));
  lines.push(lineFromCatalog(catalog, "material", "REMACHE 5/32 X 1/2", Math.max(12, Math.ceil(perimeter * 4))));
  lines.push(lineFromCatalog(catalog, "material", "LIJA # 100", Math.max(1, Math.ceil(paintedArea / 2))));
  lines.push(lineFromCatalog(catalog, "material", "PRIMER GRIS/ROJO/BLANCO", Math.max(1, Math.ceil(paintedArea / 8))));
  lines.push(lineFromCatalog(catalog, "material", "PINTURA ESMALTE ACRILICO S/RAPIDO BLANCO", Math.max(1, Math.ceil(paintedArea / 6))));
  lines.push(lineFromCatalog(catalog, "material", "THINNER STD", Math.max(1, Math.ceil(paintedArea / 8))));
  lines.push(lineFromCatalog(catalog, "material", "ESTOPA", minMax(roundUp(paintedArea * 0.03, 0.25), 0.25, 0.5)));
}

function addFaceMaterials(
  lines: QuoteLine[],
  catalog: Map<string, CatalogItem>,
  input: QuoteInput,
  totalFaceArea: number
) {
  const faceAreaWithWaste = totalFaceArea * 1.1;

  if (isLonaBackBox(input)) {
    lines.push(lineFromCatalog(catalog, "material", "LONA BACK LIGHT 2.00 x 50", faceAreaWithWaste));

    if (isBacklightPrinted(input)) {
      lines.push(lineFromCatalog(catalog, "sale_service", HP_BACKLIGHT_PRINT, totalFaceArea, true, true));
    }

    if (isBacklightRotulada(input)) {
      const vinyl = input.cut_vinyl || "VINIL DE CORTE ARCLAD 61CM NEGRO 6C VNB";
      lines.push(lineFromCatalog(catalog, "material", vinyl, roundUp(totalFaceArea * 1.2, 0.1), true));
      lines.push(lineFromCatalog(catalog, "material", "TRANSFER DE .61", roundUp(totalFaceArea, 0.1)));
    }

    return;
  }

  if (isAcrylic(input)) {
    const acrylicSheets = roundUp((totalFaceArea * 1.15) / 2.9768, 0.25);
    const perimeter = (input.width_m + input.height_m) * 2 * input.views;

    lines.push(lineFromCatalog(catalog, "material", "HOJA DE ACRILICO BLANCO LECHOSO 3MM - 1.22 X 2.44 OK", acrylicSheets));
    lines.push(lineFromCatalog(catalog, "material", "ADECRIL EXTRA ENVASE DE (960gr)", minMax(roundUp(totalFaceArea * 0.08, 0.05), 0.1, 0.25)));
    lines.push(lineFromCatalog(catalog, "material", "CLOROFORMO ENVASE DE (960gr)", minMax(roundUp(totalFaceArea * 0.08, 0.05), 0.1, 0.25)));
    lines.push(lineFromCatalog(catalog, "material", "JERINGA GRANDE 3ML", 1));
    lines.push(lineFromCatalog(catalog, "material", "SILVATRIM NEGRO", roundUp(perimeter, 0.5)));

    if (isAcrylicPrinted(input)) {
      lines.push(lineFromCatalog(catalog, "material", "VINIL DE IMPRESION 1.52 MTS", roundUp(totalFaceArea * 1.1, 0.1)));
      lines.push(lineFromCatalog(catalog, "sale_service", "Impresion De Vinil Autoadherible", totalFaceArea, true, true));
    }

    if (isAcrylicRotulated(input)) {
      const vinyl = input.cut_vinyl || "VINIL DE CORTE ARCLAD 61CM NEGRO 6C VNB";
      lines.push(lineFromCatalog(catalog, "material", vinyl, roundUp(totalFaceArea * 1.2, 0.1), true));
      lines.push(lineFromCatalog(catalog, "material", "TRANSFER DE .61", roundUp(totalFaceArea, 0.1)));
    }
  }
}

function addLighting(
  lines: QuoteLine[],
  catalog: Map<string, CatalogItem>,
  input: QuoteInput,
  totalFaceArea: number
) {
  const lighting = input.lighting_type.toUpperCase();

  if (lighting.includes("SIN ILUMINACION")) return;

  if (lighting.includes("LAMPARA") || lighting.includes("T8")) {
    const lamps = Math.max(1, Math.ceil(totalFaceArea * 1.6));
    const bases = lamps * 2;
    const cableM = Math.max(5, roundUp(totalFaceArea * 2.5, 1));

    lines.push(lineFromCatalog(catalog, "material", "LAMPARA DE LEDS 16 WATS", lamps));
    lines.push(lineFromCatalog(catalog, "material", "BASES P/LAMPARA DE PICOS T8", bases));
    lines.push(lineFromCatalog(catalog, "material", "CABLE # 14 DUPLEX", cableM));
    lines.push(lineFromCatalog(catalog, "material", "CINTA DE AISLAR 3M TEMFLEX", 1));
    return;
  }

  if (lighting.includes("ULTRABRILLANTE")) {
    const packages = Math.max(1, Math.ceil(totalFaceArea * 2));
    const watts = packages * 14.4;
    const source60 = watts <= 42 ? 1 : 0;
    const source100 = source60 ? 0 : Math.max(1, Math.ceil(watts / 70));

    lines.push(lineFromCatalog(catalog, "material", "LEDS ULTRABRILLANTES", packages));
    if (source60 > 0) lines.push(lineFromCatalog(catalog, "material", "FUENTE DE PODER DE 60 W", source60));
    if (source100 > 0) lines.push(lineFromCatalog(catalog, "material", "FUENTE DE PODER DE 100 W", source100));
    lines.push(lineFromCatalog(catalog, "material", "CABLE DUPLEX TRANSPARENTE # 18 OK", Math.max(5, roundUp(totalFaceArea * 2, 1))));
    lines.push(lineFromCatalog(catalog, "material", "PEGAMENTO P/ESPEJO GUNTHER (USAR)", Math.max(1, Math.ceil(totalFaceArea / 4))));
    return;
  }

  if (lighting.includes("LEDS BLANCOS")) {
    const packages = Math.max(1, Math.ceil(totalFaceArea * 2));
    const watts = packages * 14.4;
    const source60 = watts <= 42 ? 1 : 0;
    const source100 = source60 ? 0 : Math.max(1, Math.ceil(watts / 70));

    lines.push(lineFromCatalog(catalog, "material", "TIRA DE LEDS BLANCOS LUMINOSIDAD NORMAL (C/20 PZ)", packages));
    if (source60 > 0) lines.push(lineFromCatalog(catalog, "material", "FUENTE DE PODER DE 60 W", source60));
    if (source100 > 0) lines.push(lineFromCatalog(catalog, "material", "FUENTE DE PODER DE 100 W", source100));
    lines.push(lineFromCatalog(catalog, "material", "CABLE DUPLEX TRANSPARENTE # 18 OK", Math.max(5, roundUp(totalFaceArea * 2, 1))));
    lines.push(lineFromCatalog(catalog, "material", "PEGAMENTO P/ESPEJO GUNTHER (USAR)", Math.max(1, Math.ceil(totalFaceArea / 4))));
  }
}

function addInstallationMaterials(
  lines: QuoteLine[],
  catalog: Map<string, CatalogItem>,
  input: QuoteInput,
  totalFaceArea: number
) {
  if (!input.installation_included) return;

  const anchors = Math.max(4, Math.ceil(totalFaceArea * 4));
  lines.push(lineFromCatalog(catalog, "material", "TAQUETE TX 3/8 X 3", anchors));
}

function addLabor(
  lines: QuoteLine[],
  input: QuoteInput,
  totalFaceArea: number
) {
  const installFactor = INSTALL_FACTORS[input.installation_condition] || 1;

  let fabricationHours = Math.max(10, totalFaceArea * 10);

  if (isAcrylic(input)) fabricationHours = Math.max(14, totalFaceArea * 12);
  if (isSuajada(input)) fabricationHours *= 1.25;
  if (isTipoBandera(input)) fabricationHours *= 1.15;
  if (isSmallTwoViewAcrylicSuajada(input)) fabricationHours = 18;

  lines.push(manualLine("labor", "FABRICACIÓN", round2(fabricationHours), "Hora(s)", LABOR_HOUR_COST));

  if (input.installation_included) {
    let installationHours = 8;
    if (totalFaceArea <= 1) installationHours = 3;
    else if (totalFaceArea <= 3) installationHours = 8;
    else if (totalFaceArea <= 10) installationHours = 12;
    else installationHours = 18;

    if (isSmallTwoViewAcrylicSuajada(input)) installationHours = 1.5;

    lines.push(
      manualLine(
        "labor",
        `INSTALACIÓN · ${input.installation_condition}`,
        round2(installationHours),
        "Hora(s)",
        LABOR_HOUR_COST * installFactor
      )
    );
  }
}

function addSaleServices(
  lines: QuoteLine[],
  catalog: Map<string, CatalogItem>,
  input: QuoteInput
) {
  lines.push(lineFromCatalog(catalog, "sale_service", input.design_service, 1, true, true));
  lines.push(lineFromCatalog(catalog, "sale_service", `TRASLADO - ${input.transfer_zone}`, 1, true, true));
}

export async function calculateQuote(input: QuoteInput) {
  const catalog = await loadCatalog();
  const rawLines: QuoteLine[] = [];

  const faceArea = input.width_m * input.height_m;
  const totalFaceArea = faceArea * input.views;

  addStructureAndConsumables(rawLines, catalog, input, totalFaceArea);
  addFaceMaterials(rawLines, catalog, input, totalFaceArea);
  addLighting(rawLines, catalog, input, totalFaceArea);
  addInstallationMaterials(rawLines, catalog, input, totalFaceArea);
  addLabor(rawLines, input, totalFaceArea);
  addSaleServices(rawLines, catalog, input);

  if (isSmallTwoViewAcrylicSuajada(input)) {
    rawLines.push(manualLine("labor", "TIEMPO MUERTO", 1.15, "Hora(s)", 60));
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
    calibrated: isSmallTwoViewAcrylicSuajada(input),
    description:
      `FABRICACIÓN ${input.box_type} — MEDIDAS ${input.width_m.toFixed(2)} X ${input.height_m.toFixed(2)} M, ` +
      `FONDO ${input.depth_cm} CM, ${input.views} VISTA(S). CARÁTULA: ${input.face_material}. ` +
      `CANTO: ${input.canto || "NO ESPECIFICADO"}. ACABADO: ${input.finish || "AUTOMÁTICO"}. ` +
      `${
        isBacklightPrinted(input)
          ? `IMPRESIÓN: ${HP_BACKLIGHT_PRINT}. `
          : ""
      }` +
      `${isBacklightRotulada(input) ? `ROTULADO: ${input.cut_vinyl}. ` : ""}` +
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
