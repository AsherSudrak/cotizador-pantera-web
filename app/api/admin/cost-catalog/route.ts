import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function validateAdmin(secret: string) {
  return Boolean(process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const adminSecret = url.searchParams.get("admin_secret") || "";
    const q = (url.searchParams.get("q") || "").trim();

    if (!validateAdmin(adminSecret)) {
      return NextResponse.json(
        { ok: false, message: "Clave de administrador incorrecta." },
        { status: 401 }
      );
    }

    let query = supabaseAdmin
      .from("cost_catalog")
      .select("item_name, category, unit, internal_cost, sale_price, notes, is_active, updated_at")
      .order("category", { ascending: true })
      .order("item_name", { ascending: true })
      .limit(500);

    if (q) {
      query = query.ilike("item_name", `%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "Error al cargar catálogo de costos.",
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      items: data || []
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al cargar catálogo.",
        details: error.message || String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const adminSecret = body.admin_secret || "";

    if (!validateAdmin(adminSecret)) {
      return NextResponse.json(
        { ok: false, message: "Clave de administrador incorrecta." },
        { status: 401 }
      );
    }

    const item = body.item || {};
    const itemName = String(item.item_name || "").trim().toUpperCase();

    if (!itemName) {
      return NextResponse.json(
        { ok: false, message: "Falta el nombre del concepto." },
        { status: 400 }
      );
    }

    const payload = {
      item_name: itemName,
      category: String(item.category || "MATERIALES").trim().toUpperCase(),
      unit: String(item.unit || "PIEZA").trim(),
      internal_cost: Number(item.internal_cost || 0),
      sale_price: item.sale_price === null || item.sale_price === "" ? null : Number(item.sale_price || 0),
      notes: item.notes || "",
      is_active: item.is_active !== false,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from("cost_catalog")
      .upsert(payload, { onConflict: "item_name" })
      .select("item_name, category, unit, internal_cost, sale_price, notes, is_active, updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "Error al guardar concepto.",
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Concepto guardado correctamente.",
      item: data
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al guardar concepto.",
        details: error.message || String(error)
      },
      { status: 500 }
    );
  }
}
