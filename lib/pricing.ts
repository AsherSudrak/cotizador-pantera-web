export function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  }).format(value || 0);
}

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function ceilPeso(value: number) {
  return Math.ceil(value || 0);
}

export function priceForMargin(totalCost: number, margin = 0.40, commission = 0) {
  const divisor = 1 - margin - commission;
  if (totalCost <= 0 || divisor <= 0) return 0;
  return Math.ceil(totalCost / divisor);
}

export function realMargin(price: number, totalCost: number, commission = 0) {
  if (!price) return 0;
  return (price - totalCost - price * commission) / price;
}

export const IVA_RATE = 0.16;
export const MIN_REAL_MARGIN = 0.40;
export const INDIRECT_RATE = 0.15;
export const LABOR_HOUR_COST = 98.72;

export const INSTALL_FACTORS: Record<string, number> = {
  "A NIVEL DE PISO": 1,
  "A 3 M": 1.10,
  "A 4 M": 1.15,
  ">4 M": 1.25,
  "CON ESCALERA": 1.15,
  "CON ANDAMIOS": 1.35,
  "EN FACHADA": 1.20,
  "EN TECHO": 1.30,
  "EN ALTURA CON DESCOLGADA": 1.60,
  "ESPECIAL": 1.50
};
