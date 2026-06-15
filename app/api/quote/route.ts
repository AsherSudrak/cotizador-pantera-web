import { NextResponse } from "next/server";
import { validateAccessKey } from "@/lib/access";
import { calculateQuote, QuoteInputSchema } from "@/lib/quoteEngine";

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

    return NextResponse.json({
      ok: true,
      access,
      quote
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || "Error inesperado." },
      { status: 400 }
    );
  }
}
