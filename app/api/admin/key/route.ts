import { NextResponse } from "next/server";
import { generateAccessCode } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const adminSecret = body.admin_secret || "";

    if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { ok: false, message: "Clave de administrador incorrecta." },
        { status: 401 }
      );
    }

    const label = String(body.label || "EQUIPO SIN NOMBRE").trim().toUpperCase();
    const nowIso = new Date().toISOString();

    // Si ya existe una llave activa para este equipo/vendedor, devuelve la misma.
    const { data: existingKey, error: existingError } = await supabaseAdmin
      .from("access_keys")
      .select("key_code, starts_at, expires_at, label")
      .eq("label", label)
      .eq("is_active", true)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Error al buscar llave activa del equipo.",
          details: existingError.message,
          code: existingError.code,
          hint: existingError.hint
        },
        { status: 500 }
      );
    }

    if (existingKey) {
      return NextResponse.json({
        ok: true,
        reused: true,
        message: "Este equipo ya tenía una llave activa. Se devolvió la misma.",
        key: existingKey
      });
    }

    const hours = 24;
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + hours * 60 * 60 * 1000);
    const keyCode = generateAccessCode();

    const { data, error } = await supabaseAdmin
      .from("access_keys")
      .insert({
        key_code: keyCode,
        label,
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
        max_uses: null
      })
      .select("key_code, starts_at, expires_at, label")
      .single();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "Error real de Supabase al crear la llave.",
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      reused: false,
      message: "Llave diaria generada correctamente. Vigencia fija: 24 horas.",
      key: data
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado del servidor.",
        details: error.message || String(error)
      },
      { status: 500 }
    );
  }
}
