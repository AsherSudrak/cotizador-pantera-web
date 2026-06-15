import { NextResponse } from "next/server";
import { validateAccessKey } from "@/lib/access";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await validateAccessKey(body.key_code || "");
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || "Error inesperado." },
      { status: 500 }
    );
  }
}
