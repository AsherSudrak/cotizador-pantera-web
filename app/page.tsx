```tsx
"use client";

import { useState } from "react";

type QuoteResponse = any;

const defaultForm = {
  client_name: "CLIENTE NUEVO",
  seller_name: "",
  box_type: "CAJA SUAJADA A DOS VISTAS",
  width_m: 0.70,
  height_m: 0.70,
  depth_cm: 20,
  views: 2,
  face_material: "ACRILICO BLANCO LECHOSO ROTULADO",
  lighting_type: "LEDS BLANCOS LUMINOSIDAD NORMAL (C/20 PZ)",
  installation_included: true,
  installation_condition: "A 3 M",
  transfer_zone: "ZONA A",
  design_service: "15MIN. DE DISEÑO GRAFICO",
  cut_vinyl: "VINIL DE CORTE ARCLAD 61CM NEGRO 6C VNB",
  commission: 0,
  discount: 0
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  }).format(value || 0);
}

export default function HomePage() {
  const [tab, setTab] = useState<"cotizador" | "admin">("cotizador");
  const [accessKey, setAccessKey] = useState("");
  const [accessStatus, setAccessStatus] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const locked = !accessStatus?.ok;

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
      setAccessStatus({
        ok: false,
        message: "Error al validar acceso.",
        details: error.message || String(error)
      });
    } finally {
      setLoading(false);
    }
  }

  async function calculate() {
    setLoading(true);

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, access_key: accessKey })
      });

      const data = await res.json();

      if (!data.ok) {
        setAccessStatus({
          ok: false,
          message: data.message,
          details: data.details,
          code: data.code,
          hint: data.hint
        });
        setQuote(null);
      } else {
        setQuote(data.quote);
      }
    } catch (error: any) {
      setAccessStatus({
        ok: false,
        message: "Error al calcular cotización.",
        details: error.message || String(error)
      });
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="header">
        <div className="brand">
          <span>PANTERA</span> PUBLICIDAD
        </div>
        <div className="badge">Cotizador web · utilidad mínima 40%</div>
      </header>

      <main className="container">
        <div className="tabs">
          <button
            className={`tab ${tab === "cotizador" ? "active" : ""}`}
            onClick={() => setTab("cotizador")}
          >
            Cotizador
          </button>

          <button
            className={`tab ${tab === "admin" ? "active" : ""}`}
            onClick={() => setTab("admin")}
          >
            Admin llaves
          </button>
        </div>

        {tab === "admin" ? (
          <AdminPanel />
        ) : (
          <div className="grid">
            <section className="card">
              <h2>Acceso</h2>

              <div className={accessStatus?.ok ? "status ok" : "status bad"}>
                {accessStatus?.message || "Sin acceso. Captura la llave vigente."}

                {accessStatus?.details && (
                  <div className="small" style={{ marginTop: 8 }}>
                    Detalle: {accessStatus.details}
                  </div>
                )}

                {accessStatus?.code && (
                  <div className="small">
                    Código: {accessStatus.code}
                  </div>
                )}

                {accessStatus?.hint && (
                  <div className="small">
                    Hint: {accessStatus.hint}
                  </div>
                )}

                {accessStatus?.expiresAt && (
                  <div className="small">
                    Expira: {new Date(accessStatus.expiresAt).toLocaleString("es-MX")}
                  </div>
                )}
              </div>

              <div className="row">
                <label>Llave diaria</label>
                <input
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                  placeholder="PANTERA-000000"
                />
              </div>

              <div className="actions">
                <button onClick={validateKey} disabled={loading}>
                  Validar acceso
                </button>
              </div>

              <hr style={{ borderColor: "#3b3f46", margin: "18px 0" }} />

              <h2>Captura del proyecto</h2>

              <Input
                label="Cliente"
                value={form.client_name}
                onChange={(v) => setForm({ ...form, client_name: v })}
              />

              <Input
                label="Vendedor"
                value={form.seller_name}
                onChange={(v) => setForm({ ...form, seller_name: v })}
              />

              <Select
                label="Tipo de caja"
                value={form.box_type}
                onChange={(v) => setForm({ ...form, box_type: v })}
                options={[
                  "CAJA SUAJADA A DOS VISTAS",
                  "CAJA CON LONA BACK LIGHT",
                  "CAJA CON ACRILICO",
                  "CAJA SUAJADA CON ACRILICO",
                  "CAJA TIPO BANDERA CON LONA",
                  "CAJA TIPO BANDERA CON ACRILICO"
                ]}
              />

              <div className="row">
                <label>Ancho × Alto</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input
                    type="number"
                    step="0.01"
                    value={form.width_m}
                    onChange={(e) => setForm({ ...form, width_m: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={form.height_m}
                    onChange={(e) => setForm({ ...form, height_m: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="row">
                <label>Fondo cm / vistas</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input
                    type="number"
                    value={form.depth_cm}
                    onChange={(e) => setForm({ ...form, depth_cm: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    value={form.views}
                    onChange={(e) => setForm({ ...form, views: Number(e.target.value) })}
                  />
                </div>
              </div>

              <Select
                label="Carátula"
                value={form.face_material}
                onChange={(v) => setForm({ ...form, face_material: v })}
                options={[
                  "ACRILICO BLANCO LECHOSO ROTULADO",
                  "ACRILICO IMPRESO",
                  "LONA BACK LIGHT IMPRESA",
                  "LONA BACK LIGHT ROTULADA CON VINIL"
                ]}
              />

              <Select
                label="Iluminación"
                value={form.lighting_type}
                onChange={(v) => setForm({ ...form, lighting_type: v })}
                options={[
                  "LEDS BLANCOS LUMINOSIDAD NORMAL (C/20 PZ)",
                  "LEDS ULTRABRILLANTES",
                  "LAMPARAS LED T8",
                  "SIN ILUMINACION"
                ]}
              />

              <Select
                label="Altura / condición"
                value={form.installation_condition}
                onChange={(v) => setForm({ ...form, installation_condition: v })}
                options={[
                  "A NIVEL DE PISO",
                  "A 3 M",
                  "A 4 M",
                  ">4 M",
                  "CON ESCALERA",
                  "CON ANDAMIOS",
                  "EN FACHADA",
                  "EN TECHO",
                  "EN ALTURA CON DESCOLGADA",
                  "ESPECIAL"
                ]}
              />

              <Select
                label="Traslado"
                value={form.transfer_zone}
                onChange={(v) => setForm({ ...form, transfer_zone: v })}
                options={[
                  "ZONA A",
                  "ZONA B",
                  "ZONA C",
                  "ZONA D",
                  "ZONA E"
                ]}
              />

              <Select
                label="Vinil de corte"
                value={form.cut_vinyl}
                onChange={(v) => setForm({ ...form, cut_vinyl: v })}
                options={[
                  "VINIL DE CORTE ARCLAD 61CM NEGRO 6C VNB"
                ]}
              />

              <div className="row">
                <label>Descuento</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.9"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
                />
              </div>

              <div className="actions">
                <button onClick={calculate} disabled={locked || loading}>
                  Calcular cotización
                </button>

                <button className="secondary" onClick={() => setForm(defaultForm)}>
                  Restaurar ejemplo
                </button>
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
                <div className="status warn">
                  Acceso autorizado. Captura datos y calcula la cotización.
                </div>
              ) : (
                <QuoteResult quote={quote} />
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function Input({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="row">
      <label>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="row">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function QuoteResult({ quote }: { quote: any }) {
  const totals = quote.totals;

  return (
    <div className="summary">
      <div className={totals.margin_validated ? "status ok" : "status bad"}>
        {totals.margin_validated
          ? "VALIDADO: UTILIDAD REAL ≥ 40%"
          : "NO VALIDADO: UTILIDAD MENOR AL 40%"}

        {totals.discount_blocked && (
          <div>DESCUENTO BLOQUEADO: se conservó el precio mínimo de 40%.</div>
        )}
      </div>

      {quote.calibrated && (
        <div className="status warn">
          Calibración activa: caja suajada pequeña a dos vistas de acrílico.
        </div>
      )}

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
          <tr>
            <th>Costo directo</th>
            <td>{money(totals.direct_cost)}</td>
          </tr>
          <tr>
            <th>Indirectos</th>
            <td>{money(totals.indirect_cost)}</td>
          </tr>
          <tr>
            <th>Costo total</th>
            <td>{money(totals.total_cost)}</td>
          </tr>
          <tr>
            <th>IVA</th>
            <td>{money(totals.iva)}</td>
          </tr>
          <tr>
            <th>Margen real</th>
            <td>{totals.real_margin.toFixed(2)}%</td>
          </tr>
        </tbody>
      </table>

      <h3>Concepto para cliente</h3>
      <p className="small">{quote.description}</p>

      <h3>Desglose interno</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Sección</th>
            <th>Concepto</th>
            <th>Cant.</th>
            <th>Unidad</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {quote.lines.map((line: any, i: number) => (
            <tr key={i}>
              <td>{line.section}</td>
              <td>{line.item_name}</td>
              <td>{line.quantity}</td>
              <td>{line.unit}</td>
              <td>{money(line.total_cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
        body: JSON.stringify({
          admin_secret: secret,
          label,
          hours
        })
      });

      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        ok: false,
        message: "Error al generar llave.",
        details: error.message || String(error)
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Administrador de llaves</h2>

      <p className="small">
        Genera una llave para vendedores. La clave de administrador se define en Vercel como ADMIN_SECRET.
      </p>

      <div className="row">
        <label>Clave admin</label>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
      </div>

      <div className="row">
        <label>Etiqueta</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>

      <div className="row">
        <label>Vigencia horas</label>
        <input
          type="number"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
        />
      </div>

      <button onClick={generateKey} disabled={loading}>
        Generar llave
      </button>

      {result && (
        <div className={result.ok ? "status ok" : "status bad"} style={{ marginTop: 16 }}>
          <div>{result.message}</div>

          {result.details && (
            <div className="small" style={{ marginTop: 8 }}>
              Detalle: {result.details}
            </div>
          )}

          {result.code && (
            <div className="small">
              Código: {result.code}
            </div>
          )}

          {result.hint && (
            <div className="small">
              Hint: {result.hint}
            </div>
          )}

          {result.key && (
            <>
              <h3 style={{ marginTop: 10 }}>{result.key.key_code}</h3>
              <div className="small">
                Expira: {new Date(result.key.expires_at).toLocaleString("es-MX")}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```
