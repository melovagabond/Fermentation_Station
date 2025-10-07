import React, { useEffect, useMemo, useState } from "react";

/**
 * Fermentation Station — Web App (React)
 * Single-file React component. TailwindCSS-friendly.
 *
 * Features
 *  - Vegetables DB (type + weight) persisted in localStorage
 *  - Lacto calculators: dry-salt %, brine %
 *  - Pickling calculator: vinegar:water ratio, salt %, sugar g/L
 *  - Brewing (mead/wine): target ABV → sugar/honey mass, est. OG
 *  - Unit toggles (g/oz, kg; mL/L/gal)
 *  - Clean, modern UI; mobile-friendly
 */

// ----------------------------- Utilities -----------------------------
const fmtG = (g) => (g >= 1000 ? `${(g / 1000).toFixed(3)} kg` : `${g.toFixed(0)} g`);
const fmtML = (ml) => (ml >= 1000 ? `${(ml / 1000).toFixed(3)} L` : `${ml.toFixed(0)} mL`);
const lbFromG = (g) => g / 453.59237;
const ozFromG = (g) => g / 28.349523125;
const gFromLb = (lb) => lb * 453.59237;
const gFromOz = (oz) => oz * 28.349523125;
const mlFromGal = (gal) => gal * 3785.411784;

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

// Weight/Volume parse helpers for free-form numeric + unit inputs
function gramsFromValueUnit(value, unit) {
  const v = Number(value) || 0;
  switch (unit) {
    case "g":
      return v;
    case "kg":
      return v * 1000;
    case "oz":
      return gFromOz(v);
    case "lb":
      return gFromLb(v);
    default:
      return v;
  }
}

function mlFromValueUnit(value, unit) {
  const v = Number(value) || 0;
  switch (unit) {
    case "ml":
      return v;
    case "l":
      return v * 1000;
    case "gal":
      return mlFromGal(v);
    default:
      return v;
  }
}

// ----------------------------- Persistence -----------------------------
const DB_KEY = "fs.veggies";
function useVeggies() {
  const [veggies, setVeggies] = useState(() => {
    try {
      const raw = localStorage.getItem(DB_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(veggies));
    } catch {}
  }, [veggies]);
  return [veggies, setVeggies];
}

// ----------------------------- Calculators -----------------------------
function calcDrySalt(vegWeightG, pct) {
  const saltG = vegWeightG * (Number(pct) / 100);
  return { saltG, vegWeightG, pct: Number(pct) };
}

function calcBrine(volumeMl, pct) {
  const waterG = volumeMl; // close enough
  const saltG = waterG * (Number(pct) / 100);
  return { saltG, waterMl: volumeMl, pct: Number(pct) };
}

function calcPickle(volumeMl, vinegarParts = 1, waterParts = 1, saltPct = 2.5, sugarPerL = 0, vinegarAcidity = 5) {
  const vp = Math.max(0, Number(vinegarParts));
  const wp = Math.max(0, Number(waterParts));
  const totalParts = vp + wp || 1;
  const vinegarMl = volumeMl * (vp / totalParts);
  const waterMl = volumeMl * (wp / totalParts);
  const saltG = volumeMl * (Number(saltPct) / 100);
  const sugarG = (volumeMl / 1000) * Number(sugarPerL);
  return { vinegarMl, waterMl, saltG, sugarG, vinegarAcidity, saltPct };
}

const PPG = { sugar: 46, honey: 35 };
function calcBrew(volumeMl, targetABV, source = "honey", fg = 1.0) {
  const volGal = volumeMl / 3785.411784;
  const og = Number(targetABV) / 131.25 + Number(fg);
  const points = (og - 1.0) * 1000; // points per gallon
  const totalPoints = points * volGal;
  const pounds = totalPoints / PPG[source];
  const grams = gFromLb(pounds);
  const honeyCups = source === "honey" ? pounds * 1.36 : 0;
  const honeyMl = source === "honey" ? pounds * 0.32 * 1000 : 0;
  return { volumeMl, targetABV, fg, og, totalPoints, source, massG: grams, massLb: pounds, honeyCups, honeyMl };
}

// ----------------------------- UI Pieces -----------------------------
function Section({ title, description, children }) {
  return (
    <div className="rounded-2xl shadow p-5 bg-white/70 backdrop-blur border border-slate-200">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && <p className="text-slate-600 text-sm mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function NumberWithUnit({ label, value, onValue, unit, onUnit, units, min = 0, step = "any" }) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <label className="text-sm text-slate-600">{label}</label>
        <input
          inputMode="decimal"
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(e) => onValue(e.target.value)}
          className="w-full mt-1 rounded-xl border px-3 py-2"
        />
      </div>
      <div>
        <label className="text-sm text-slate-600">Unit</label>
        <select value={unit} onChange={(e) => onUnit(e.target.value)} className="w-28 mt-1 rounded-xl border px-3 py-2">
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Pill({ children, active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "px-3 py-1 rounded-full text-sm border",
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 border-slate-300"
      )}
    >
      {children}
    </button>
  );
}

// ----------------------------- App -----------------------------
export default function FermentationStationApp() {
  const [tab, setTab] = useState("veg");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <div className="max-w-5xl mx-auto p-6 md:p-10">
        <header className="mb-6 md:mb-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Fermentation Station</h1>
          <p className="text-slate-600 mt-2">Veg tracking, salt & pickle math, and a no-nonsense brew calculator.</p>
        </header>

        <nav className="flex flex-wrap gap-2 mb-6">
          {[
            ["veg", "Vegetables"],
            ["lacto", "Lacto"],
            ["pickle", "Pickles"],
            ["brew", "Brew"],
          ].map(([key, label]) => (
            <Pill key={key} active={tab === key} onClick={() => setTab(key)}>
              {label}
            </Pill>
          ))}
        </nav>

        {tab === "veg" && <VegSection />}
        {tab === "lacto" && <LactoSection />}
        {tab === "pickle" && <PickleSection />}
        {tab === "brew" && <BrewSection />}

        <footer className="mt-10 text-xs text-slate-500">
          Built with questionable life choices and sound kitchen science. Don’t ignore food safety.
        </footer>
      </div>
    </div>
  );
}

// ----------------------------- Sections -----------------------------
function VegSection() {
  const [veggies, setVeggies] = useVeggies();

  const [type, setType] = useState("");
  const [wVal, setWVal] = useState("");
  const [wUnit, setWUnit] = useState("g");

  const totalG = useMemo(() => veggies.reduce((a, v) => a + (Number(v.weight_g) || 0), 0), [veggies]);

  function addVeg() {
    if (!type.trim()) return;
    const weight_g = gramsFromValueUnit(wVal, wUnit);
    if (!weight_g || weight_g <= 0) return;
    setVeggies((xs) => [...xs, { type: type.trim(), weight_g }]);
    setType("");
    setWVal("");
  }

  function clearVeg() {
    if (confirm("Clear all vegetables?")) setVeggies([]);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Section title="Add Vegetable" description="Type + weight. Stored locally in your browser.">
        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-600">Type</label>
            <input value={type} onChange={(e) => setType(e.target.value)} placeholder="cabbage, cucumber…" className="w-full mt-1 rounded-xl border px-3 py-2" />
          </div>
          <NumberWithUnit label="Weight" value={wVal} onValue={setWVal} unit={wUnit} onUnit={setWUnit} units={["g", "kg", "oz", "lb"]} />
          <div className="flex gap-2">
            <button onClick={addVeg} className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:opacity-90">Add</button>
            <button onClick={clearVeg} className="px-4 py-2 rounded-xl border hover:bg-slate-50">Clear All</button>
          </div>
        </div>
      </Section>

      <Section title="Vegetables" description="Your current pile. Use total for dry-salt math.">
        {veggies.length === 0 ? (
          <p className="text-slate-600">No vegetables yet. Add some.</p>
        ) : (
          <div className="space-y-2">
            <ul className="divide-y">
              {veggies.map((v, i) => (
                <li key={i} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{v.type}</div>
                    <div className="text-sm text-slate-500">{fmtG(v.weight_g)}</div>
                  </div>
                  <button
                    className="text-xs px-2 py-1 rounded-lg border hover:bg-slate-50"
                    onClick={() => setVeggies((xs) => xs.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="pt-2 text-sm text-slate-700">Total: <b>{fmtG(totalG)}</b></div>
          </div>
        )}
      </Section>
    </div>
  );
}

function LactoSection() {
  // Dry
  const [dryPct, setDryPct] = useState(2.5);
  const [dryVal, setDryVal] = useState("");
  const [dryUnit, setDryUnit] = useState("g");

  const dryOut = useMemo(() => {
    const g = gramsFromValueUnit(dryVal, dryUnit);
    if (!g) return null;
    return calcDrySalt(g, dryPct);
  }, [dryVal, dryUnit, dryPct]);

  // Brine
  const [brVal, setBrVal] = useState("");
  const [brUnit, setBrUnit] = useState("ml");
  const [brPct, setBrPct] = useState(3);

  const brOut = useMemo(() => {
    const ml = mlFromValueUnit(brVal, brUnit);
    if (!ml) return null;
    return calcBrine(ml, brPct);
  }, [brVal, brUnit, brPct]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Section title="Dry-Salt" description="Common range 2–3% of vegetable weight.">
        <div className="space-y-3">
          <NumberWithUnit label="Vegetable Weight" value={dryVal} onValue={setDryVal} unit={dryUnit} onUnit={setDryUnit} units={["g", "kg", "oz", "lb"]} />
          <div>
            <label className="text-sm text-slate-600">Salt %</label>
            <input type="number" value={dryPct} step="0.1" min={0} onChange={(e) => setDryPct(e.target.value)} className="w-full mt-1 rounded-xl border px-3 py-2" />
          </div>
          {dryOut && (
            <div className="rounded-xl bg-slate-50 border p-3">
              <div className="text-sm">Use <b>{fmtG(dryOut.saltG)}</b> salt for {fmtG(dryOut.vegWeightG)} at {dryOut.pct}%.</div>
            </div>
          )}
          <div className="flex gap-2">
            {[2, 2.5, 3].map((p) => (
              <button key={p} onClick={() => setDryPct(p)} className="px-3 py-1 rounded-full border text-sm hover:bg-slate-50">
                {p}%
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Brine" description="Salt % of water by weight. Enter total brine volume to make.">
        <div className="space-y-3">
          <NumberWithUnit label="Brine Volume" value={brVal} onValue={setBrVal} unit={brUnit} onUnit={setBrUnit} units={["ml", "l", "gal"]} />
          <div>
            <label className="text-sm text-slate-600">Salt %</label>
            <input type="number" value={brPct} step="0.1" min={0} onChange={(e) => setBrPct(e.target.value)} className="w-full mt-1 rounded-xl border px-3 py-2" />
          </div>
          {brOut && (
            <div className="rounded-xl bg-slate-50 border p-3">
              <div className="text-sm">Use <b>{fmtG(brOut.saltG)}</b> salt in {fmtML(brOut.waterMl)} water at {brOut.pct}%.</div>
            </div>
          )}
          <div className="flex gap-2">
            {[2, 2.5, 3, 3.5, 4, 5].map((p) => (
              <button key={p} onClick={() => setBrPct(p)} className="px-3 py-1 rounded-full border text-sm hover:bg-slate-50">
                {p}%
              </button>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}

function PickleSection() {
  const [vVal, setVVal] = useState(1);
  const [vUnit, setVUnit] = useState("l");
  const [vinegarParts, setVinegarParts] = useState(1);
  const [waterParts, setWaterParts] = useState(1);
  const [saltPct, setSaltPct] = useState(2.5);
  const [sugarPerL, setSugarPerL] = useState(0);
  const [acid, setAcid] = useState(5);

  const out = useMemo(() => {
    const ml = mlFromValueUnit(vVal, vUnit);
    if (!ml) return null;
    return calcPickle(ml, vinegarParts, waterParts, saltPct, sugarPerL, acid);
  }, [vVal, vUnit, vinegarParts, waterParts, saltPct, sugarPerL, acid]);

  return (
    <Section
      title="Vinegar Pickling Brine"
      description="Typical safe baseline: 1:1 with 5% vinegar. Don’t dilute below that without tested recipes."
    >
      <div className="grid md:grid-cols-2 gap-4">
        <NumberWithUnit label="Total Brine Volume" value={vVal} onValue={setVVal} unit={vUnit} onUnit={setVUnit} units={["ml", "l", "gal"]} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">Vinegar parts</label>
            <input type="number" min={0} value={vinegarParts} onChange={(e) => setVinegarParts(Number(e.target.value))} className="w-full mt-1 rounded-xl border px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-slate-600">Water parts</label>
            <input type="number" min={0} value={waterParts} onChange={(e) => setWaterParts(Number(e.target.value))} className="w-full mt-1 rounded-xl border px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-slate-600">Salt % (of total)</label>
            <input type="number" min={0} step="0.1" value={saltPct} onChange={(e) => setSaltPct(Number(e.target.value))} className="w-full mt-1 rounded-xl border px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-slate-600">Sugar g/L</label>
            <input type="number" min={0} step="1" value={sugarPerL} onChange={(e) => setSugarPerL(Number(e.target.value))} className="w-full mt-1 rounded-xl border px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-slate-600">Vinegar acidity %</label>
            <input type="number" min={0} step="0.1" value={acid} onChange={(e) => setAcid(Number(e.target.value))} className="w-full mt-1 rounded-xl border px-3 py-2" />
          </div>
        </div>
      </div>

      {out && (
        <div className="mt-4 rounded-xl bg-slate-50 border p-4 space-y-1 text-sm">
          {acid < 5 && vinegarParts > 0 && (
            <div className="text-red-600 font-medium">Warning: Vinegar below 5% acidity is not recommended for shelf-stable pickles.</div>
          )}
          <div>
            Vinegar: <b>{fmtML(out.vinegarMl)}</b> ({out.vinegarAcidity.toFixed(1)}%)
          </div>
          <div>Water: <b>{fmtML(out.waterMl)}</b></div>
          <div>Salt: <b>{fmtG(out.saltG)}</b></div>
          <div>Sugar: <b>{out.sugarG.toFixed(0)} g</b></div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {[
          { label: "1:1 dill", v: 1, w: 1, s: 2.5, su: 0 },
          { label: "2:1 sweet", v: 2, w: 1, s: 2, su: 50 },
          { label: "1:0 hardcore", v: 1, w: 0, s: 1.5, su: 0 },
        ].map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setVinegarParts(p.v);
              setWaterParts(p.w);
              setSaltPct(p.s);
              setSugarPerL(p.su);
            }}
            className="px-3 py-1 rounded-full border text-sm hover:bg-slate-50"
          >
            {p.label}
          </button>
        ))}
      </div>
    </Section>
  );
}

function BrewSection() {
  const [mode, setMode] = useState("mead");
  const defaultSource = mode === "mead" ? "honey" : "sugar";

  const [volVal, setVolVal] = useState(1);
  const [volUnit, setVolUnit] = useState("gal");
  const [abv, setAbv] = useState(12);
  const [fg, setFg] = useState(1.0);
  const [source, setSource] = useState(defaultSource);

  useEffect(() => setSource(defaultSource), [mode]);

  const out = useMemo(() => {
    const ml = mlFromValueUnit(volVal, volUnit);
    if (!ml) return null;
    return calcBrew(ml, abv, source, fg);
  }, [volVal, volUnit, abv, source, fg]);

  return (
    <Section title="Brew Calculator" description="Target ABV → sugar or honey to add. PPG: sugar 46, honey 35.">
      <div className="flex flex-wrap gap-2 mb-4">
        <Pill active={mode === "mead"} onClick={() => setMode("mead")}>Mead</Pill>
        <Pill active={mode === "wine"} onClick={() => setMode("wine")}>Wine</Pill>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <NumberWithUnit label="Batch Volume" value={volVal} onValue={setVolVal} unit={volUnit} onUnit={setVolUnit} units={["ml", "l", "gal"]} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">Target ABV %</label>
            <input type="number" min={0} step="0.1" value={abv} onChange={(e) => setAbv(Number(e.target.value))} className="w-full mt-1 rounded-xl border px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-slate-600">Finish Gravity (FG)</label>
            <input type="number" min={0.9} step="0.001" value={fg} onChange={(e) => setFg(Number(e.target.value))} className="w-full mt-1 rounded-xl border px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-slate-600">Fermentable</label>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full mt-1 rounded-xl border px-3 py-2">
              <option value="honey">Honey (35 PPG)</option>
              <option value="sugar">Sugar (46 PPG)</option>
            </select>
          </div>
        </div>
      </div>

      {out && (
        <div className="mt-4 rounded-xl bg-slate-50 border p-4 text-sm space-y-1">
          <div>
            {mode === "mead" ? "Mead" : "Wine"} target <b>{out.targetABV}%</b> in <b>{fmtML(out.volumeMl)}</b>
          </div>
          <div>
            Add ~<b>{out.massLb.toFixed(2)} lb</b> ({fmtG(out.massG)}) {out.source}.
          </div>
          <div>Estimated OG: <b>{out.og.toFixed(3)}</b></div>
          {out.source === "honey" && (
            <div>
              Honey volume ≈ <b>{out.honeyCups.toFixed(1)} cups</b> ({fmtML(out.honeyMl)})
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {[
          { label: "12% session", abv: 12 },
          { label: "14% semi-sweet", abv: 14 },
          { label: "11.5% table wine", abv: 11.5 },
        ].map((p) => (
          <button key={p.label} onClick={() => setAbv(p.abv)} className="px-3 py-1 rounded-full border text-sm hover:bg-slate-50">
            {p.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500 mt-4">
        Rule of thumb math for planning. For real brewing, measure gravity with a hydrometer or refractometer.
      </p>
    </Section>
  );
}

