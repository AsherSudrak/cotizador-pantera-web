"use client";

import { useState } from "react";

type QuoteResponse = any;

const BOX_TYPES = [
  "CAJA DE LUZ CON LONA BACK",
  "CAJA SUAJADA A DOS VISTAS",
  "CAJA CON ACRILICO",
  "CAJA SUAJADA CON ACRILICO",
  "CAJA TIPO BANDERA CON LONA",
  "CAJA TIPO BANDERA CON ACRILICO"
];

const GENERAL_CARATULAS = [
  "ACRILICO BLANCO LECHOSO ROTULADO",
  "ACRILICO IMPRESO",
  "LONA BACK LIGHT IMPRESA",
  "LONA BACK LIGHT ROTULADA"
];

const LONA_BACK_CARATULAS = [
  "LONA BACK LIGHT IMPRESA",
  "LONA BACK LIGHT ROTULADA"
];

const CANTO_OPTIONS = ["LÁMINA GALVANIZADA CAL 26", "ALUMINIO"];

const BACKLIGHT_PRINT_HP = "IMPRESION DE LONA BACK LIGHT EN ALTA RESOLUCION (EN HP)";

const VINYL_OPTIONS = ["VINIL DE CORTE ARCLAD 61CM NEGRO 6C VNB"];

const defaultForm = {
  client_name: "CLIENTE NUEVO",
  seller_name: "",
  box_type: "CAJA DE LUZ CON LONA BACK",
  width_m: 3,
  height_m: 1,
  depth_cm: 20,
  views: 1,
  face_material: "LONA BACK LIGHT IMPRESA",
  canto: "LÁMINA GALVANIZADA CAL 26",
  finish: "IMPRESA",
  lighting_type: "LAMPARAS LED T8",
  installation_included: true,
  installation_condition: "A NIVEL DE PISO",
  transfer_zone: "ZONA A",
  design_service: "15MIN. DE DISEÑO GRAFICO",
  backlight_print_service: BACKLIGHT_PRINT_HP,
  cut_vinyl: "VINIL DE CORTE ARCLAD 61CM NEGRO 6C VNB",
  commission: 0,
  discount: 0
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value || 0);
}

function isLonaBackBox(boxType: string) {
  return boxType.toUpperCase().includes("LONA BACK");
}

function isBacklightPrinted(faceMaterial: string) {
  return faceMaterial === "LONA BACK LIGHT IMPRESA";
}

function isBacklightVinyl(faceMaterial: string) {
  return faceMaterial === "LONA BACK LIGHT ROTULADA";
}

function getCaratulaOptions(boxType: string) {
  return isLonaBackBox(boxType) ? LONA_BACK_CARATULAS : GENERAL_CARATULAS;
}

function getAutomaticFinish(faceMaterial: string) {
  if (faceMaterial === "LONA BACK LIGHT IMPRESA") return "IMPRESA";
  if (faceMaterial === "LONA BACK LIGHT ROTULADA") return "ROTULADA CON VINIL";
  if (faceMaterial === "ACRILICO IMPRESO") return "IMPRESA";
  if (faceMaterial.includes("ROTULADO")) return "ROTULADA CON VINIL";
  return "SIN ROTULAR";
}

export default function HomePage() {
  const [tab, setTab] = useState<"cotizador" | "admin">("cotizador");
  const [accessKey, setAccessKey] = useState("");
  const [accessStatus, setAccessStatus] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const locked = !accessStatus?.ok;
  const caratulaOptions = getCaratulaOptions(form.box_type);
  const showBacklightPrint = isLonaBackBox(form.box_type) && isBacklightPrinted(form.face_material);
  const showCutVinyl = isBacklightVinyl(form.face_material) || (!isLonaBackBox(form.box_type) && form.face_material.toUpperCase().includes("ROTULAD"));

  function updateBoxType(value: string) {
    const options = getCaratulaOptions(value);
    const nextFace = options[0];

    setForm({
      ...form,
      box_type: value,
      face_material: nextFace,
      finish: getAutomaticFinish(nextFace)
    });
    setQuote(null);
  }

  function updateFaceMaterial(value: string) {
    setForm({ ...form, face_material: value, finish: getAutomaticFinish(value) });
    setQuote(null);
  }

  async function validateKey() {
    setLoading(true);
    setQuote(null);

    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key_code: accessKey })
      });

      const data = await res.json();
      setAccessStatus(data);
    } catch (error: any) {
      setAccessStatus({ ok: false, message: "Error al validar acceso.", details: error.message || String(error) });
    } finally {
      setLoading(false);
    }
  }

  function buildPayload() {
    return {
      ...form,
      access_key: accessKey,
      cut_vinyl: showCutVinyl ? form.cut_vinyl : "",
      backlight_print_service: showBacklightPrint ? BACKLIGHT_PRINT_HP : ""
    };
  }

  async function calculate() {
    setLoading(true);

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildPayload())
      });

      const data = await res.json();

      if (!data.ok) {
        setAccessStatus({ ok: false, message: data.message, details: data.details, code: data.code, hint: data.hint });
        setQuote(null);
      } else {
        setQuote(data.quote);
      }
    } catch (error: any) {
      setAccessStatus({ ok: false, message: "Error al calcular cotización.", details: error.message || String(error) });
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }

  async function exportExcel() {
    if (!quote || locked) return;

    const res = await fetch("/api/export-excel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildPayload())
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.message || "No se pudo exportar el Excel.");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `desglose-cotizacion-${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <>
      <header className="header">
        <div className="brand"><span>COTIZADOR MAESTRO</span> - D 3 R Y</div>
        <div className="badge">Sistema privado · utilidad mínima 40%</div>
      </header>

      <main className="container">
        <div className="tabs">
          <button className={`tab ${tab === "cotizador" ? "active" : ""}`} onClick={() => setTab("cotizador")}>Cotizador</button>
          <button className={`tab ${tab === "admin" ? "active" : ""}`} onClick={() => setTab("admin")}>Admin llaves</button>
        </div>

        {tab === "admin" ? (
          <AdminPanel />
        ) : (
          <div className="grid">
            <section className="card">
              <h2>Acceso</h2>

              <div className={accessStatus?.ok ? "status ok" : "status bad"}>
                {accessStatus?.message || "Sin acceso. Captura la llave vigente."}
                {accessStatus?.details && <div className="small" style={{ marginTop: 8 }}>Detalle: {accessStatus.details}</div>}
                {accessStatus?.code && <div className="small">Código: {accessStatus.code}</div>}
                {accessStatus?.hint && <div className="small">Hint: {accessStatus.hint}</div>}
                {accessStatus?.expiresAt && <div className="small">Expira: {new Date(accessStatus.expiresAt).toLocaleString("es-MX")}</div>}
              </div>

              <div className="row">
                <label>Llave diaria</label>
                <input value={accessKey} onChange={(e) => setAccessKey(e.target.value.toUpperCase())} placeholder="D3RY-000000" />
              </div>

              <div className="actions">
                <button onClick={validateKey} disabled={loading}>Validar acceso</button>
              </div>

              <hr style={{ borderColor: "#3b3f46", margin: "18px 0" }} />

              <h2>Captura del proyecto</h2>

              <Input label="Cliente" value={form.client_name} onChange={(v) => setForm({ ...form, client_name: v })} />
              <Input label="Vendedor" value={form.seller_name} onChange={(v) => setForm({ ...form, seller_name: v })} />
              <Select label="Tipo de caja" value={form.box_type} onChange={updateBoxType} options={BOX_TYPES} />
              <Select label="Carátula / frente" value={form.face_material} onChange={updateFaceMaterial} options={caratulaOptions} />
              <Select label="Canto" value={form.canto} onChange={(v) => setForm({ ...form, canto: v })} options={CANTO_OPTIONS} />

              <div className="row">
                <label>Vistas</label>
                <select value={form.views} onChange={(e) => setForm({ ...form, views: Number(e.target.value) })}>
                  <option value={1}>1 vista</option>
                  <option value={2}>2 vistas</option>
                </select>
              </div>

              <div className="row">
                <label>Acabado</label>
                <input value={form.finish} readOnly />
              </div>

              {showBacklightPrint && (
                <div className="row">
                  <label>Impresión back light</label>
                  <input value="HP · ALTA RESOLUCIÓN" readOnly />
                </div>
              )}

              {showCutVinyl && (
                <Select label="Vinil de corte / rotulado" value={form.cut_vinyl} onChange={(v) => setForm({ ...form, cut_vinyl: v })} options={VINYL_OPTIONS} />
              )}
              <div className="row">
                <label>Ancho × Alto</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input type="number" step="0.01" value={form.width_m} onChange={(e) => setForm({ ...form, width_m: Number(e.target.value) })} />
                  <input type="number" step="0.01" value={form.height_m} onChange={(e) => setForm({ ...form, height_m: Number(e.target.value) })} />
                </div>
              </div>

              <div className="row">
                <label>Fondo cm</label>
                <input type="number" value={form.depth_cm} onChange={(e) => setForm({ ...form, depth_cm: Number(e.target.value) })} />
              </div>

              <Select label="Iluminación" value={form.lighting_type} onChange={(v) => setForm({ ...form, lighting_type: v })} options={[
                "LEDS BLANCOS LUMINOSIDAD NORMAL (C/20 PZ)", "LEDS ULTRABRILLANTES", "LAMPARAS LED T8", "SIN ILUMINACION"
              ]} />

              <Select label="Altura / condición" value={form.installation_condition} onChange={(v) => setForm({ ...form, installation_condition: v })} options={[
                "A NIVEL DE PISO", "A 3 M", "A 4 M", ">4 M", "CON ESCALERA", "CON ANDAMIOS", "EN FACHADA", "EN TECHO", "EN ALTURA CON DESCOLGADA", "ESPECIAL"
              ]} />

              <Select label="Traslado" value={form.transfer_zone} onChange={(v) => setForm({ ...form, transfer_zone: v })} options={["ZONA A", "ZONA B", "ZONA C", "ZONA D", "ZONA E"]} />

              <div className="row">
                <label>Descuento</label>
                <input type="number" step="0.01" min="0" max="0.9" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} />
              </div>

              <div className="actions">
                <button onClick={calculate} disabled={locked || loading}>Calcular cotización</button>
                <button className="secondary" onClick={() => setForm(defaultForm)}>Restaurar ejemplo</button>
              </div>
            </section>

            <section className="card">
              <h2>Resultado</h2>

              {locked ? (
                <div className="lock">
                  <h3>BLOQUEADO</h3>
                  <p>Captura una llave válida para ver precios y cotización.</p>
                </div>
              ) : !quote ? (
                <div className="status warn">Acceso autorizado. Captura datos y calcula la cotización.</div>
              ) : (
                <>
                  <QuoteResult quote={quote} />
                  <div className="actions">
                    <button onClick={exportExcel}>Exportar desglose a Excel</button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="row">
      <label>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div className="row">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function SectionTable({ title, lines, subtotal }: { title: string; lines: any[]; subtotal: number }) {
  if (!lines || lines.length === 0) return null;

  return (
    <>
      <h3>{title}</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Cant.</th>
            <th>Unidad</th>
            <th>Concepto</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line: any, i: number) => (
            <tr key={i}>
              <td>{line.quantity}</td>
              <td>{line.unit}</td>
              <td>{line.item_name}</td>
              <td>{money(line.total_cost)}</td>
            </tr>
          ))}
          <tr>
            <th colSpan={3}>SUBTOTAL {title}</th>
            <th>{money(subtotal)}</th>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function QuoteResult({ quote }: { quote: any }) {
  const totals = quote.totals;
  const grouped = quote.grouped_lines || {};
  const sectionTotals = quote.section_totals || {};

  return (
    <div className="summary">
      <div className={totals.margin_validated ? "status ok" : "status bad"}>
        {totals.margin_validated ? "VALIDADO: UTILIDAD REAL ≥ 40%" : "NO VALIDADO: UTILIDAD MENOR AL 40%"}
        {totals.discount_blocked && <div>DESCUENTO BLOQUEADO: se conservó el precio mínimo de 40%.</div>}
      </div>

      {quote.calibrated && <div className="status warn">Calibración activa: caja suajada pequeña a dos vistas de acrílico.</div>}

      <div className="total">
        <div className="label">Precio a cotizar sin IVA</div>
        <div className="value">{money(totals.subtotal_without_iva)}</div>
      </div>

      <div className="total">
        <div className="label">Total con IVA</div>
        <div className="value">{money(totals.total_with_iva)}</div>
      </div>

      <table className="table">
        <tbody>
          <tr><th>Subtotal materiales</th><td>{money(sectionTotals.materials)}</td></tr>
          <tr><th>Subtotal mano de obra</th><td>{money(sectionTotals.labor)}</td></tr>
          <tr><th>Subtotal precios venta / servicios</th><td>{money(sectionTotals.sale_services)}</td></tr>
          <tr><th>Costo directo</th><td>{money(totals.direct_cost)}</td></tr>
          <tr><th>Gastos indirectos</th><td>{money(totals.indirect_cost)}</td></tr>
          <tr><th>Costo total</th><td>{money(totals.total_cost)}</td></tr>
          <tr><th>Utilidad</th><td>{money(totals.utility)}</td></tr>
          <tr><th>IVA</th><td>{money(totals.iva)}</td></tr>
          <tr><th>Margen real</th><td>{totals.real_margin.toFixed(2)}%</td></tr>
        </tbody>
      </table>

      <h3>Concepto para cliente</h3>
      <p className="small">{quote.description}</p>

      <h3>Desglose interno</h3>
      <SectionTable title="MATERIALES" lines={grouped.materials || []} subtotal={sectionTotals.materials || 0} />
      <SectionTable title="MANO DE OBRA" lines={grouped.labor || []} subtotal={sectionTotals.labor || 0} />
      <SectionTable title="PRECIOS VENTA / SERVICIOS" lines={grouped.sale_services || []} subtotal={sectionTotals.sale_services || 0} />
    </div>
  );
}

function AdminPanel() {
  const [secret, setSecret] = useState("");
  const [label, setLabel] = useState("Llave diaria");
  const [hours, setHours] = useState(24);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function generateKey() {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/key", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ admin_secret: secret, label, hours })
      });

      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      setResult({ ok: false, message: "Error al generar llave.", details: error.message || String(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Administrador de llaves</h2>
      <p className="small">Genera una llave D3RY para vendedores. La clave de administrador se define en Vercel como ADMIN_SECRET.</p>

      <div className="row">
        <label>Clave admin</label>
        <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
      </div>

      <div className="row">
        <label>Etiqueta</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>

      <div className="row">
        <label>Vigencia horas</label>
        <input type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
      </div>

      <button onClick={generateKey} disabled={loading}>Generar llave</button>

      {result && (
        <div className={result.ok ? "status ok" : "status bad"} style={{ marginTop: 16 }}>
          <div>{result.message}</div>
          {result.details && <div className="small" style={{ marginTop: 8 }}>Detalle: {result.details}</div>}
          {result.code && <div className="small">Código: {result.code}</div>}
          {result.hint && <div className="small">Hint: {result.hint}</div>}
          {result.key && (
            <>
              <h3 style={{ marginTop: 10 }}>{result.key.key_code}</h3>
              <div className="small">Expira: {new Date(result.key.expires_at).toLocaleString("es-MX")}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
