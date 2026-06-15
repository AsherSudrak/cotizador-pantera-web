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

    const hours = Number(body.hours || 24);
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + hours * 60 * 60 * 1000);

    let keyCode = generateAccessCode();
    let insertResult = null;

    for (let i = 0; i < 5; i++) {
      keyCode = generateAccessCode();
      const { data, error } = await supabaseAdmin
        .from("access_keys")
        .insert({
          key_code: keyCode,
          label: body.label || "Llave diaria",
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true,
          max_uses: body.max_uses || null
        })
        .select("key_code, starts_at, expires_at")
        .single();

      if (!error) {
        insertResult = data;
        break;
      }
    }

    if (!insertResult) {
      return NextResponse.json(
        { ok: false, message: "No se pudo crear la llave. Intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Llave generada correctamente.",
      key: insertResult
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || "Error inesperado." },
      { status: 500 }
    );
  }
}
