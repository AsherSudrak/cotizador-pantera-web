import { supabaseAdmin } from "./supabaseAdmin";

export type AccessValidation = {
  ok: boolean;
  message: string;
  keyId?: string;
  expiresAt?: string;
};

const ACCESS_PREFIX = "D3RY";

export async function validateAccessKey(keyCode: string): Promise<AccessValidation> {
  const cleanKey = (keyCode || "").trim().toUpperCase();

  if (!cleanKey) {
    return { ok: false, message: "Falta capturar llave de acceso." };
  }

  if (!cleanKey.startsWith(`${ACCESS_PREFIX}-`)) {
    return {
      ok: false,
      message: `Llave inválida. La llave vigente debe iniciar con ${ACCESS_PREFIX}-.`
    };
  }

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("access_keys")
    .select("id, key_code, expires_at, starts_at, is_active, max_uses, used_count")
    .eq("key_code", cleanKey)
    .eq("is_active", true)
    .lte("starts_at", now)
    .gt("expires_at", now)
    .maybeSingle();

  if (error) {
    return { ok: false, message: `Error al validar llave: ${error.message}` };
  }

  if (!data) {
    return { ok: false, message: "Llave incorrecta o vencida." };
  }

  if (data.max_uses !== null && data.used_count >= data.max_uses) {
    return { ok: false, message: "La llave llegó al límite de usos." };
  }

  return {
    ok: true,
    message: "Acceso autorizado.",
    keyId: data.id,
    expiresAt: data.expires_at
  };
}

export function generateAccessCode() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `${ACCESS_PREFIX}-${n}`;
}
