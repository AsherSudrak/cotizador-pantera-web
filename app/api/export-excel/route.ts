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

function setThinBorders(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } }
  };
}

function styleRangeBorders(ws: ExcelJS.Worksheet, fromRow: number, toRow: number, fromCol = 1, toCol = 5) {
  for (let r = fromRow; r <= toRow; r++) {
    for (let c = fromCol; c <= toCol; c++) {
      setThinBorders(ws.getCell(r, c));
    }
  }
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 18;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FF000000" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    setThinBorders(cell);
  });
}

function styleTotal(row: ExcelJS.Row, red = false) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: red ? "FFFFFFFF" : "FF000000" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: red ? "FFC00000" : "FFD9D9D9" }
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    setThinBorders(cell);
  });
}

function putHeader(ws: ExcelJS.Worksheet, rowNumber: number, title: string) {
  const row = ws.getRow(rowNumber);
  row.getCell(1).value = "CANT.";
  row.getCell(2).value = "UNIDAD";
  row.getCell(3).value = title;
  row.getCell(4).value = "COSTO";
  row.getCell(5).value = "PRECIO";
  styleHeader(row);
}

function putLine(ws: ExcelJS.Worksheet, rowNumber: number, line: any) {
  const row = ws.getRow(rowNumber);
  row.getCell(1).value = Number(line.quantity || 0);
  row.getCell(2).value = line.unit || "";
  row.getCell(3).value = line.item_name || "";
  row.getCell(4).value = Number(line.unit_cost || 0);
  row.getCell(5).value = { formula: `A${rowNumber}*D${rowNumber}` };

  row.getCell(4).numFmt = moneyFormat();
  row.getCell(5).numFmt = moneyFormat();

  row.getCell(3).alignment = { wrapText: true, vertical: "middle" };
  row.getCell(1).alignment = { horizontal: "center" };
  row.getCell(2).alignment = { horizontal: "center" };

  for (let c = 1; c <= 5; c++) {
    setThinBorders(row.getCell(c));
  }
}

function putBlankLine(ws: ExcelJS.Worksheet, rowNumber: number) {
  const row = ws.getRow(rowNumber);
  row.getCell(5).value = { formula: `A${rowNumber}*D${rowNumber}` };
  row.getCell(4).numFmt = moneyFormat();
  row.getCell(5).numFmt = moneyFormat();
  for (let c = 1; c <= 5; c++) {
    setThinBorders(row.getCell(c));
  }
}

function addSection(
  ws: ExcelJS.Worksheet,
  startRow: number,
  title: string,
  lines: any[],
  minRows: number
) {
  putHeader(ws, startRow, title);

  const bodyStart = startRow + 1;
  const bodyRows = Math.max(minRows, lines.length);

  for (let i = 0; i < bodyRows; i++) {
    const rowNumber = bodyStart + i;
    if (i < lines.length) putLine(ws, rowNumber, lines[i]);
    else putBlankLine(ws, rowNumber);
  }

  return {
    bodyStart,
    bodyEnd: bodyStart + bodyRows - 1,
    nextRow: bodyStart + bodyRows
  };
}

function addMaterialsTotals(ws: ExcelJS.Worksheet, row: number, bodyStart: number, bodyEnd: number) {
  const subtotalRow = ws.getRow(row);
  subtotalRow.getCell(4).value = "SUBTOTAL";
  subtotalRow.getCell(5).value = { formula: `SUM(E${bodyStart}:E${bodyEnd})` };
  subtotalRow.getCell(5).numFmt = moneyFormat();
  styleTotal(subtotalRow, false);

  const ivaRow = ws.getRow(row + 1);
  ivaRow.getCell(4).value = "TOTAL IVA";
  ivaRow.getCell(5).value = { formula: `E${row}*0.16` };
  ivaRow.getCell(5).numFmt = moneyFormat();
  styleTotal(ivaRow, false);

  const totalRow = ws.getRow(row + 2);
  totalRow.getCell(4).value = "TOTAL MAT";
  totalRow.getCell(5).value = { formula: `E${row}+E${row + 1}` };
  totalRow.getCell(5).numFmt = moneyFormat();
  styleTotal(totalRow, true);

  return row + 3;
}

function addSimpleTotal(ws: ExcelJS.Worksheet, row: number, label: string, bodyStart: number, bodyEnd: number) {
  const totalRow = ws.getRow(row);
  totalRow.getCell(4).value = label;
  totalRow.getCell(5).value = { formula: `SUM(E${bodyStart}:E${bodyEnd})` };
  totalRow.getCell(5).numFmt = moneyFormat();
  styleTotal(totalRow, true);
  return row + 1;
}

function addFinalSummary(
  ws: ExcelJS.Worksheet,
  startRow: number,
  materialTotalRow: number,
  moTotalRow: number,
  ventaTotalRow: number
) {
  const labels = [
    "SUB-TOTAL. MAT-MO",
    "UTILIDAD",
    "GASTOS INDIRECTOS",
    "TOTAL PRECIO VENTA",
    "TOTAL"
  ];

  for (let i = 0; i < labels.length; i++) {
    const r = startRow + i;
    const row = ws.getRow(r);
    row.getCell(4).value = labels[i];

    if (i === 0) row.getCell(5).value = { formula: `E${materialTotalRow}+E${moTotalRow}` };
    if (i === 1) row.getCell(5).value = { formula: `E${startRow}*0.4` };
    if (i === 2) row.getCell(5).value = { formula: `E${startRow}*0.4` };
    if (i === 3) row.getCell(5).value = { formula: `E${ventaTotalRow}` };
    if (i === 4) row.getCell(5).value = { formula: `SUM(E${startRow}:E${startRow + 3})` };

    row.getCell(5).numFmt = moneyFormat();
    styleTotal(row, i === 4);
  }
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

    const materials = quote.grouped_lines.materials || [];
    const labor = quote.grouped_lines.labor || [];
    const saleServices = [ ...(quote.grouped_lines.sale_services || []), ...(quote.grouped_lines.extras || []) ];

    const wb = new ExcelJS.Workbook();
    wb.creator = "Cotizador Pantera";
    wb.created = new Date();

    const ws = wb.addWorksheet("Hoja1", {
      pageSetup: {
        paperSize: 9,
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      }
    });

    ws.columns = [
      { key: "cantidad", width: 10 },
      { key: "unidad", width: 12 },
      { key: "concepto", width: 54 },
      { key: "costo", width: 14 },
      { key: "precio", width: 14 }
    ];

    ws.views = [{ state: "frozen", ySplit: 3 }];

    ws.getRow(1).height = 10;
    ws.getRow(2).height = 10;

    const mat = addSection(ws, 3, "MATERIALES", materials, 31);
    const afterMatTotals = addMaterialsTotals(ws, mat.nextRow, mat.bodyStart, mat.bodyEnd);
    const materialTotalRow = afterMatTotals - 1;

    const moHeaderRow = afterMatTotals + 1;
    const mo = addSection(ws, moHeaderRow, "MANO DE OBRA", labor, 4);
    const afterMoTotal = addSimpleTotal(ws, mo.nextRow, "TOTAL MO", mo.bodyStart, mo.bodyEnd);
    const moTotalRow = afterMoTotal - 1;

    const pvHeaderRow = afterMoTotal + 1;
    const pv = addSection(ws, pvHeaderRow, "PRECIOS VENTA", saleServices, 2);
    const afterPvTotal = addSimpleTotal(ws, pv.nextRow, "TOTAL VEN", pv.bodyStart, pv.bodyEnd);
    const ventaTotalRow = afterPvTotal - 1;

    const summaryRow = afterPvTotal + 1;
    addFinalSummary(ws, summaryRow, materialTotalRow, moTotalRow, ventaTotalRow);

    // Formato general tipo calculadora.
    ws.getColumn(1).alignment = { horizontal: "center" };
    ws.getColumn(2).alignment = { horizontal: "center" };
    ws.getColumn(3).alignment = { wrapText: true };
    ws.getColumn(4).numFmt = moneyFormat();
    ws.getColumn(5).numFmt = moneyFormat();

    // Altura compacta y visual semejante al formato base.
    for (let r = 1; r <= summaryRow + 5; r++) {
      ws.getRow(r).height = 18;
    }

    // Datos de referencia ocultos a la derecha para no alterar el formato visible.
    ws.getColumn(7).hidden = true;
    ws.getColumn(8).hidden = true;
    ws.getColumn(7).values = [
      "",
      "Cliente",
      input.client_name,
      "Vendedor",
      input.seller_name || "",
      "Tipo de caja",
      input.box_type,
      "Medidas",
      `${input.width_m} x ${input.height_m} m · fondo ${input.depth_cm} cm · ${input.views} vista(s)`,
      "Carátula",
      input.face_material,
      "Canto",
      input.canto || "",
      "Concepto",
      quote.description
    ];

    const filename = `formato-calculadora-${safeName(input.client_name)}.xlsx`;
    const buffer = await wb.xlsx.writeBuffer();

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
        message: "No se pudo exportar el formato de calculadora.",
        details: error.message || String(error)
      },
      { status: 500 }
    );
  }
}
