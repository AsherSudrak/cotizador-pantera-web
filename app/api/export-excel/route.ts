import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { validateAccessKey } from "@/lib/access";
import { calculateQuote, QuoteInputSchema } from "@/lib/quoteEngine";

export const runtime = "nodejs";

function moneyFormat() {
  return '"$"#,##0.00;[Red]-"$"#,##0.00';
}

function safeName(value: string) {
  return (value || "cotizacion")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF303238" } };
  row.alignment = { vertical: "middle", horizontal: "center" };
}

function styleSection(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2232A" } };
}

function styleSubtotal(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3BF" } };
}

function addSection(
  ws: ExcelJS.Worksheet,
  title: string,
  lines: any[],
  subtotal: number,
  startRow: number
) {
  let rowIndex = startRow;

  ws.mergeCells(rowIndex, 1, rowIndex, 5);
  const sectionRow = ws.getRow(rowIndex);
  sectionRow.getCell(1).value = title;
  styleSection(sectionRow);
  rowIndex++;

  const header = ws.getRow(rowIndex);
  header.values = ["CANT.", "UNIDAD", "CONCEPTO", "COSTO UNIT.", "TOTAL"];
  styleHeader(header);
  rowIndex++;

  for (const line of lines) {
    const row = ws.getRow(rowIndex);
    row.values = [
      Number(line.quantity || 0),
      line.unit || "",
      line.item_name || "",
      Number(line.unit_cost || 0),
      Number(line.total_cost || 0)
    ];
    row.getCell(4).numFmt = moneyFormat();
    row.getCell(5).numFmt = moneyFormat();
    rowIndex++;
  }

  const subtotalRow = ws.getRow(rowIndex);
  subtotalRow.values = ["", "", `SUBTOTAL ${title}`, "", Number(subtotal || 0)];
  subtotalRow.getCell(5).numFmt = moneyFormat();
  styleSubtotal(subtotalRow);
  rowIndex += 2;

  return rowIndex;
}

export async function POST(req: Request) {
  try {
    const json = await req.json();

    const access = await validateAccessKey(json.access_key || "");
    if (!access.ok) {
      return NextResponse.json(
        { ok: false, message: access.message, locked: true },
        { status: 401 }
      );
    }

    const input = QuoteInputSchema.parse(json);
    const quote = await calculateQuote(input);

    const wb = new ExcelJS.Workbook();
    wb.creator = "Cotizador Pantera";
    wb.created = new Date();

    const ws = wb.addWorksheet("DESGLOSE");

    ws.columns = [
      { header: "", key: "cantidad", width: 14 },
      { header: "", key: "unidad", width: 18 },
      { header: "", key: "concepto", width: 62 },
      { header: "", key: "costo_unit", width: 16 },
      { header: "", key: "total", width: 16 }
    ];

    ws.mergeCells("A1:E1");
    ws.getCell("A1").value = "PANTERA PUBLICIDAD · DESGLOSE INTERNO DE COTIZACIÓN";
    ws.getCell("A1").font = { bold: true, color: { argb: "FFFFFFFF" }, size: 14 };
    ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF202124" } };
    ws.getCell("A1").alignment = { horizontal: "center" };

    ws.getCell("A3").value = "Cliente";
    ws.getCell("B3").value = input.client_name;
    ws.getCell("A4").value = "Vendedor";
    ws.getCell("B4").value = input.seller_name || "";
    ws.getCell("A5").value = "Tipo de caja";
    ws.getCell("B5").value = input.box_type;
    ws.getCell("A6").value = "Medidas";
    ws.getCell("B6").value = `${input.width_m} x ${input.height_m} m · fondo ${input.depth_cm} cm · ${input.views} vista(s)`;
    ws.getCell("A7").value = "Carátula";
    ws.getCell("B7").value = input.face_material;
    ws.getCell("A8").value = "Canto";
    ws.getCell("B8").value = input.canto || "";
    ws.getCell("A9").value = "Concepto";
    ws.getCell("B9").value = quote.description;

    for (let r = 3; r <= 9; r++) ws.getCell(`A${r}`).font = { bold: true };
    ws.getCell("B9").alignment = { wrapText: true, vertical: "top" };

    let row = 11;
    row = addSection(ws, "MATERIALES", quote.grouped_lines.materials || [], quote.section_totals.materials || 0, row);
    row = addSection(ws, "MANO DE OBRA", quote.grouped_lines.labor || [], quote.section_totals.labor || 0, row);
    row = addSection(ws, "PRECIOS VENTA", quote.grouped_lines.sale_services || [], quote.section_totals.sale_services || 0, row);

    ws.mergeCells(row, 1, row, 5);
    const summaryTitle = ws.getRow(row);
    summaryTitle.getCell(1).value = "RESUMEN FINANCIERO";
    styleSection(summaryTitle);
    row++;

    const summaryRows = [
      ["Subtotal materiales", quote.section_totals.materials],
      ["Subtotal mano de obra", quote.section_totals.labor],
      ["Subtotal precios venta", quote.section_totals.sale_services],
      ["Costo directo", quote.totals.direct_cost],
      ["Gastos indirectos", quote.totals.indirect_cost],
      ["Costo total", quote.totals.total_cost],
      ["Utilidad", quote.totals.utility],
      ["Precio a cotizar sin IVA", quote.totals.subtotal_without_iva],
      ["IVA", quote.totals.iva],
      ["Total final con IVA", quote.totals.total_with_iva],
      ["Margen real", `${quote.totals.real_margin.toFixed(2)}%`],
      ["Margen mínimo obligatorio", `${quote.totals.minimum_margin.toFixed(2)}%`],
      ["Estado", quote.totals.margin_validated ? "VALIDADO · UTILIDAD REAL ≥ 40%" : "NO VALIDADO"]
    ];

    for (const [label, value] of summaryRows) {
      const r = ws.getRow(row);
      r.getCell(3).value = label as string;
      r.getCell(5).value = value as any;
      r.getCell(3).font = { bold: true };
      if (typeof value === "number") r.getCell(5).numFmt = moneyFormat();
      row++;
    }

    ws.eachRow((r) => {
      r.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FF808080" } },
          left: { style: "thin", color: { argb: "FF808080" } },
          bottom: { style: "thin", color: { argb: "FF808080" } },
          right: { style: "thin", color: { argb: "FF808080" } }
        };
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `desglose-${safeName(input.client_name)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: "No se pudo exportar el desglose a Excel.",
        details: error.message || String(error)
      },
      { status: 500 }
    );
  }
}
