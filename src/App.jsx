import React, { useState, useEffect, useMemo, useCallback, createContext, useContext, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import BlurText from "./components/BlurText.jsx";
import CountUp from "./components/CountUp.jsx";
import {
  Home, PiggyBank, Receipt, Layers, Trophy, User, Plus, X, Check, ChevronRight,
  ChevronLeft, TrendingUp, Wallet, Target, Menu, Pencil, Calendar, ArrowRight,
  Sparkles, ShoppingBag, Bus, Zap, Film, GraduationCap, UtensilsCrossed, MoreHorizontal,
  Loader2, Info, Trash2
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

/* ============================== TOKENS / STYLE ============================== */

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');`;

const STYLE = `
${FONT_IMPORT}
.maar-root {
  --ink: #1C2621;
  --ink-soft: #55625A;
  --paper: #F7F4EE;
  --card: #FFFFFF;
  --border: #E3DDCE;
  --forest: #1F3A32;
  --forest-soft: #2F5D50;
  --moss: #4C7A6A;
  --moss-tint: #E7EFE9;
  --brass: #B8863B;
  --brass-tint: #F6EDDB;
  --brick: #A8503A;
  --brick-tint: #F4E6E0;
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 22px;
  font-family: 'IBM Plex Sans', -apple-system, sans-serif;
  color: var(--ink);
  background: var(--paper);
  min-height: 100vh;
  width: 100%;
  position: relative;
}
.maar-root * { box-sizing: border-box; }
.maar-serif { font-family: 'Fraunces', Georgia, serif; }
.maar-root button { font-family: inherit; cursor: pointer; }
.maar-root input, .maar-root select { font-family: inherit; }
.maar-focus:focus-visible {
  outline: 2px solid var(--forest-soft);
  outline-offset: 2px;
}
.maar-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
.maar-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

@media (prefers-reduced-motion: reduce) {
  .maar-root * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}

.maar-confetti-piece {
  position: absolute;
  top: -10px;
  border-radius: 2px;
  animation: maar-fall linear forwards;
}
@keyframes maar-fall {
  to { transform: translateY(420px) rotate(540deg); opacity: 0; }
}
@keyframes maar-pop {
  0% { transform: scale(0.85); opacity: 0; }
  60% { transform: scale(1.03); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.maar-pop { animation: maar-pop 0.32s cubic-bezier(.2,.9,.3,1.2) both; }

@keyframes maar-fade-up {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.maar-fade-up { animation: maar-fade-up 0.28s ease both; }
`;

/* ============================== UTILITIES ============================== */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const formatGBP = (n, opts = {}) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: opts.decimals === false ? 0 : 2,
    minimumFractionDigits: opts.decimals === false ? 0 : 2,
  }).format(n);
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function startOfPeriod(date, frequency) {
  const d = new Date(date);
  if (frequency === "weekly") {
    const day = d.getDay(); // 0 Sun - 6 Sat
    const diff = (day === 0 ? 6 : day - 1); // Monday start
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (frequency === "yearly") {
    return new Date(d.getFullYear(), 0, 1);
  }
  return new Date(d.getFullYear(), d.getMonth(), 1); // monthly default
}

function periodKey(date, frequency) {
  const s = startOfPeriod(date, frequency);
  return `${frequency}:${s.toISOString().slice(0, 10)}`;
}

const CATEGORIES = [
  { id: "food", label: "Food", color: "#A8503A", icon: UtensilsCrossed },
  { id: "transport", label: "Transport", color: "#3E6B8A", icon: Bus },
  { id: "shopping", label: "Shopping", color: "#8A5FA8", icon: ShoppingBag },
  { id: "bills", label: "Bills", color: "#B8863B", icon: Zap },
  { id: "entertainment", label: "Entertainment", color: "#4C7A6A", icon: Film },
  { id: "education", label: "Education", color: "#5A7A3E", icon: GraduationCap },
  { id: "other", label: "Other", color: "#8A8478", icon: MoreHorizontal },
];
const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

const FREQUENCY_LABEL = { weekly: "week", monthly: "month", yearly: "year" };

const STORAGE_KEY = "maar-money-data";

const emptyData = () => ({
  profile: { onboarded: false, income: null, savingsTarget: null, frequency: null, name: "" },
  savings: [],
  expenses: [],
  bundles: [],
  achievements: [],
  celebratedPeriods: [],
});

/* ============================== CONTEXT ============================== */

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

/* ============================== PRIMITIVES ============================== */

function Card({ children, style, className = "", padded = true }) {
  return (
    <div
      className={`maar-fade-up ${className}`}
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: padded ? "22px" : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Button({ children, variant = "primary", size = "md", icon: Icon, style, ...props }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 600,
    borderRadius: 999,
    border: "1px solid transparent",
    transition: "transform 0.15s ease, background 0.15s ease, border-color 0.15s ease",
    fontSize: size === "sm" ? 13.5 : 15,
    padding: size === "sm" ? "8px 14px" : "12px 20px",
    opacity: props.disabled ? 0.5 : 1,
  };
  const variants = {
    primary: { background: "var(--forest)", color: "#fff" },
    secondary: { background: "var(--moss-tint)", color: "var(--forest)" },
    ghost: { background: "transparent", color: "var(--ink-soft)", border: "1px solid var(--border)" },
    text: { background: "transparent", color: "var(--forest-soft)", padding: "4px 2px" },
    danger: { background: "var(--brick-tint)", color: "var(--brick)" },
  };
  return (
    <button
      className="maar-focus"
      style={{ ...base, ...variants[variant], ...style }}
      onMouseDown={(e) => { if (!props.disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      {...props}
    >
      {Icon && <Icon size={size === "sm" ? 15 : 17} strokeWidth={2.25} />}
      {children}
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
        {label}
      </span>
      {children}
      {hint && <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-soft)", marginTop: 5 }}>{hint}</span>}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  background: "var(--paper)",
  fontSize: 15,
  color: "var(--ink)",
};

function AmountInput({ value, onChange, placeholder = "0.00", autoFocus }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)", fontSize: 15 }}>£</span>
      <input
        className="maar-focus"
        autoFocus={autoFocus}
        inputMode="decimal"
        type="number"
        min="0"
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, paddingLeft: 30 }}
      />
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 20px", color: "var(--ink-soft)" }}>
      <div style={{
        width: 46, height: 46, borderRadius: 14, background: "var(--moss-tint)",
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px"
      }}>
        <Icon size={22} color="var(--forest-soft)" strokeWidth={1.75} />
      </div>
      <p className="maar-serif" style={{ fontSize: 17, color: "var(--ink)", margin: "0 0 6px", fontWeight: 500 }}>{title}</p>
      <p style={{ fontSize: 13.5, margin: "0 0 16px", lineHeight: 1.5, maxWidth: 320, marginInline: "auto" }}>{body}</p>
      {action}
    </div>
  );
}

function ProgressBar({ value, max, color = "var(--moss)", track = "var(--moss-tint)", height = 10 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ width: "100%", height, borderRadius: 999, background: track, overflow: "hidden" }}>
      <div style={{
        width: `${pct}%`, height: "100%", background: color, borderRadius: 999,
        transition: "width 0.5s cubic-bezier(.2,.8,.2,1)"
      }} />
    </div>
  );
}

// Distinct "pot" visual for Bundles: a vertically-filling jar rather than a generic bar.
function BundlePot({ value, max, size = 56 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{
      width: size, height: size, borderRadius: 14, position: "relative", overflow: "hidden",
      border: "1.5px solid var(--border)", background: "var(--paper)", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: `${pct}%`,
        background: pct >= 100 ? "var(--brass)" : "var(--moss)",
        transition: "height 0.6s cubic-bezier(.2,.8,.2,1)",
      }} />
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: pct > 45 ? "#fff" : "var(--ink)",
      }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}

function Modal({ title, onClose, children, width = 440 }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector("input,select,button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      role="dialog" aria-modal="true" aria-label={title}
      style={{
        position: "absolute", inset: 0, background: "rgba(28,38,33,0.42)", zIndex: 60,
        display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0,
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={ref}
        className="maar-pop maar-scroll"
        style={{
          width: "100%", maxWidth: width, background: "var(--card)",
          borderRadius: "20px 20px 0 0", padding: 24, maxHeight: "88%", overflowY: "auto",
          margin: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 className="maar-serif" style={{ fontSize: 20, margin: 0, fontWeight: 600 }}>{title}</h2>
          <button className="maar-focus" aria-label="Close" onClick={onClose}
            style={{ background: "var(--moss-tint)", border: "none", borderRadius: 999, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="maar-pop" style={{
      position: "absolute", bottom: 90, left: "50%", transform: "translateX(-50%)",
      background: "var(--forest)", color: "#fff", padding: "11px 18px", borderRadius: 999,
      fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, zIndex: 70,
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    }}>
      <Check size={15} /> {message}
    </div>
  );
}

/* ============================== CONFETTI ============================== */

function Confetti() {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const pieces = useMemo(() => {
    if (reduce) return [];
    const colors = ["#B8863B", "#4C7A6A", "#1F3A32", "#D9C08A", "#A8503A"];
    return Array.from({ length: 46 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[i % colors.length],
      size: 5 + Math.random() * 5,
      delay: Math.random() * 0.4,
      duration: 1.6 + Math.random() * 1.1,
      rotate: Math.random() > 0.5,
    }));
  }, [reduce]);
  if (reduce) return null;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {pieces.map((p) => (
        <span key={p.id} className="maar-confetti-piece" style={{
          left: `${p.left}%`, width: p.size, height: p.size * 1.6, background: p.color,
          animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`,
        }} />
      ))}
    </div>
  );
}

function CelebrationModal({ title, subtitle, amount, onClose }) {
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(28,38,33,0.5)", zIndex: 80,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <Confetti />
      <div className="maar-pop" style={{
        background: "var(--card)", borderRadius: 24, padding: "38px 28px", textAlign: "center",
        maxWidth: 340, width: "100%", position: "relative", boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: "var(--brass-tint)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
        }}>
          <Sparkles size={28} color="var(--brass)" strokeWidth={2} />
        </div>
        <p className="maar-serif" style={{ fontSize: 15, color: "var(--brass)", fontWeight: 600, margin: "0 0 6px", letterSpacing: 0.2 }}>
          Goal achieved!
        </p>
        <h2 className="maar-serif" style={{ fontSize: 24, margin: "0 0 8px", fontWeight: 600 }}>{title}</h2>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "0 0 4px" }}>{subtitle}</p>
        {amount !== undefined && (
          <p className="maar-serif" style={{ fontSize: 28, fontWeight: 600, color: "var(--forest)", margin: "10px 0 22px" }}>
            {formatGBP(amount)}
          </p>
        )}
        <Button style={{ width: "100%", marginTop: amount === undefined ? 22 : 0 }} onClick={onClose}>
          Nice, thank you
        </Button>
      </div>
    </div>
  );
}

/* ============================== ONBOARDING ============================== */

function OnboardingFlow({ onComplete }) {
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState("");
  const [skipIncome, setSkipIncome] = useState(false);
  const [target, setTarget] = useState("");
  const [skipTarget, setSkipTarget] = useState(false);
  const [frequency, setFrequency] = useState("monthly");

  const hasTarget = target && !skipTarget;
  const totalSteps = hasTarget ? 3 : 2;

  const finish = (finalTarget, finalFreq) => {
    onComplete({
      onboarded: true,
      income: skipIncome || !income ? null : parseFloat(income),
      savingsTarget: finalTarget,
      frequency: finalTarget ? finalFreq : null,
      name: "",
    });
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, background: "var(--paper)",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 34, justifyContent: "center" }}>
          <MaarMark size={30} />
          <span className="maar-serif" style={{ fontSize: 19, fontWeight: 600 }}>MAAR <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>Money</span></span>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 30 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 999,
              background: i <= step ? "var(--forest)" : "var(--border)",
              transition: "background 0.3s ease",
            }} />
          ))}
        </div>

        {step === 0 && (
          <Card className="maar-fade-up">
            <BlurText text="How much do you earn?" as="h1" className="maar-serif" style={{ fontSize: 23, margin: "0 0 8px", fontWeight: 600 }} />
            <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5, margin: "0 0 22px" }}>
              This helps MAAR show your savings and spending against your income, so your progress makes sense at a glance.
              It's completely optional — nothing here is shared or required.
            </p>
            <Field label="Monthly income" hint="You can change this any time in Profile.">
              <AmountInput value={income} onChange={(v) => { setIncome(v); setSkipIncome(false); }} autoFocus />
            </Field>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => { setSkipIncome(true); setIncome(""); setStep(1); }}>
                Prefer not to say
              </Button>
              <Button style={{ flex: 1 }} icon={ArrowRight} onClick={() => setStep(1)}>
                Continue
              </Button>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card className="maar-fade-up">
            <BlurText text="How much would you like to save?" as="h1" className="maar-serif" style={{ fontSize: 23, margin: "0 0 8px", fontWeight: 600 }} />
            <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5, margin: "0 0 22px" }}>
              Set a target to work towards. MAAR will track your progress and let you know when you get there — you can always adjust it later.
            </p>
            <Field label="Savings target">
              <AmountInput value={target} onChange={(v) => { setTarget(v); setSkipTarget(false); }} autoFocus />
            </Field>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Button variant="ghost" style={{ flex: 1 }} icon={ChevronLeft} onClick={() => setStep(0)}>Back</Button>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => { setSkipTarget(true); setTarget(""); finish(null, null); }}>
                Prefer not to say
              </Button>
              <Button style={{ flex: 1 }} icon={ArrowRight} onClick={() => {
                if (target && parseFloat(target) > 0) setStep(2);
                else finish(null, null);
              }}>
                Continue
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="maar-fade-up">
            <BlurText text="How often?" as="h1" className="maar-serif" style={{ fontSize: 23, margin: "0 0 8px", fontWeight: 600 }} />
            <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5, margin: "0 0 22px" }}>
              Choose how frequently your {formatGBP(parseFloat(target || 0))} target resets.
            </p>
            <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
              {["weekly", "monthly", "yearly"].map((f) => (
                <button key={f} className="maar-focus" onClick={() => setFrequency(f)} style={{
                  textAlign: "left", padding: "14px 16px", borderRadius: "var(--radius-sm)",
                  border: `1.5px solid ${frequency === f ? "var(--forest)" : "var(--border)"}`,
                  background: frequency === f ? "var(--moss-tint)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  fontWeight: 600, fontSize: 14.5, textTransform: "capitalize",
                }}>
                  {f}
                  {frequency === f && <Check size={16} color="var(--forest)" />}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="ghost" style={{ flex: 1 }} icon={ChevronLeft} onClick={() => setStep(1)}>Back</Button>
              <Button style={{ flex: 1 }} icon={ArrowRight} onClick={() => finish(parseFloat(target), frequency)}>
                Finish setup
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ============================== BRAND MARK ============================== */

function MaarMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#1F3A32" />
      <path d="M14 46V21.5C14 20.1193 15.1193 19 16.5 19C17.3969 19 18.2277 19.4756 18.6822 20.2493L28.5 37L32 31L35.5 37L45.3178 20.2493C45.7723 19.4756 46.6031 19 47.5 19C48.8807 19 50 20.1193 50 21.5V46"
        stroke="#F7F4EE" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="47" cy="47" r="4.5" fill="#B8863B" />
    </svg>
  );
}

/* ============================== NAVIGATION ============================== */

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "savings", label: "Savings", icon: PiggyBank },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "bundles", label: "Bundles", icon: Layers },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "profile", label: "Profile", icon: User },
];

function Sidebar({ page, setPage }) {
  return (
    <aside style={{
      width: 232, flexShrink: 0, borderRight: "1px solid var(--border)",
      padding: "22px 14px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 10px 22px" }}>
        <MaarMark size={26} />
        <span className="maar-serif" style={{ fontSize: 16.5, fontWeight: 600 }}>MAAR <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>Money</span></span>
      </div>
      {NAV_ITEMS.map((item) => {
        const active = page === item.id;
        return (
          <button key={item.id} className="maar-focus" onClick={() => setPage(item.id)} aria-current={active ? "page" : undefined}
            style={{
              display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 12,
              border: "none", background: active ? "var(--moss-tint)" : "transparent",
              color: active ? "var(--forest)" : "var(--ink-soft)", fontWeight: active ? 600 : 500,
              fontSize: 14.5, textAlign: "left", transition: "background 0.15s ease",
            }}>
            <item.icon size={18} strokeWidth={active ? 2.3 : 2} />
            {item.label}
          </button>
        );
      })}
    </aside>
  );
}

function MobileNav({ page, setPage }) {
  return (
    <nav aria-label="Primary" style={{
      position: "sticky", bottom: 0, left: 0, right: 0, background: "var(--card)",
      borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-around",
      padding: "8px 4px calc(8px + env(safe-area-inset-bottom))", zIndex: 40,
    }}>
      {NAV_ITEMS.map((item) => {
        const active = page === item.id;
        return (
          <button key={item.id} className="maar-focus" onClick={() => setPage(item.id)} aria-current={active ? "page" : undefined}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              background: "none", border: "none", color: active ? "var(--forest)" : "var(--ink-soft)",
              fontSize: 10.5, fontWeight: 600, padding: "4px 8px", borderRadius: 10,
            }}>
            <item.icon size={19} strokeWidth={active ? 2.4 : 2} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function TopBar({ title, action, onMenu, isMobile }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: isMobile ? "16px 18px 6px" : "26px 30px 6px",
    }}>
      <h1 className="maar-serif" style={{ fontSize: isMobile ? 22 : 26, fontWeight: 600, margin: 0 }}>{title}</h1>
      {action}
    </div>
  );
}

/* ============================== SUMMARY CARD ============================== */

function SummaryCard({ label, value, amount, icon: Icon, tint = "var(--moss-tint)", iconColor = "var(--forest-soft)", sub }) {
  return (
    <Card padded={false} style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={15} color={iconColor} strokeWidth={2.2} />
        </div>
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 600 }}>{label}</span>
      </div>
      <p className="maar-serif" style={{ fontSize: 25, fontWeight: 600, margin: 0 }}>
        {typeof amount === "number" && !Number.isNaN(amount) ? <CountUp value={amount} format={(v) => formatGBP(v)} /> : value}
      </p>
      {sub && <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "4px 0 0" }}>{sub}</p>}
    </Card>
  );
}

/* ============================== HOME ============================== */

function HomePage({ isMobile }) {
  const { data, addToast, celebrate } = useApp();
  const { profile, savings, expenses, bundles } = data;

  const totalSaved = savings.reduce((s, e) => s + e.amount, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = profile.income !== null ? profile.income - totalSpent : null;

  const currentPeriodTotal = useMemo(() => {
    if (!profile.frequency) return 0;
    const key = periodKey(todayISO(), profile.frequency);
    return savings.filter((s) => periodKey(s.date, profile.frequency) === key).reduce((sum, s) => sum + s.amount, 0);
  }, [savings, profile.frequency]);

  // Detect period target reached, celebrate once per period.
  useEffect(() => {
    if (!profile.savingsTarget || !profile.frequency) return;
    const key = periodKey(todayISO(), profile.frequency);
    if (currentPeriodTotal >= profile.savingsTarget && !data.celebratedPeriods.includes(key)) {
      celebrate({
        title: "Target reached",
        subtitle: `You hit your ${profile.frequency} savings goal.`,
        amount: currentPeriodTotal,
        periodKey: key,
      });
    }
  }, [currentPeriodTotal, profile.savingsTarget, profile.frequency]); // eslint-disable-line

  const savingsSeries = useMemo(() => {
    const sorted = [...savings].sort((a, b) => new Date(a.date) - new Date(b.date));
    let running = 0;
    const points = sorted.map((s) => {
      running += s.amount;
      return { date: formatDate(s.date).slice(0, 6), total: Math.round(running * 100) / 100 };
    });
    // Prepend a zero point so even a single saving draws a rising line
    // instead of a single dot with nothing to compare it against.
    if (points.length > 0) {
      return [{ date: "Start", total: 0 }, ...points];
    }
    return points;
  }, [savings]);

  const spendingByCategory = useMemo(() => {
    const map = {};
    expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([id, value]) => ({ id, value, ...categoryById(id) }));
  }, [expenses]);

  const incomeData = profile.income !== null ? [
    { label: "Monthly", value: profile.income },
    { label: "Annual", value: profile.income * 12 },
  ] : [];

  return (
    <div style={{ padding: isMobile ? "8px 18px 24px" : "8px 30px 30px" }}>
      <BlurText
        text="Here's where things stand today."
        style={{ fontSize: 14.5, color: "var(--ink-soft)", margin: "0 0 22px", fontWeight: 400 }}
      />

      <div style={{
        display: "grid", gap: 14, marginBottom: 24,
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
      }}>
        {profile.income !== null && (
          <SummaryCard label="Monthly income" amount={profile.income} icon={Wallet} />
        )}
        {profile.savingsTarget !== null && (
          <SummaryCard
            label={`${profile.frequency} target`} value={formatGBP(profile.savingsTarget)} icon={Target}
            tint="var(--brass-tint)" iconColor="var(--brass)"
            sub={`${formatGBP(currentPeriodTotal)} so far`}
          />
        )}
        <SummaryCard label="Total saved" amount={totalSaved} icon={PiggyBank} />
        <SummaryCard label="Total spent" amount={totalSpent} icon={Receipt} tint="var(--brick-tint)" iconColor="var(--brick)" />
        {remaining !== null && (
          <SummaryCard label="Remaining" amount={remaining} icon={TrendingUp} />
        )}
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: isMobile ? "1fr" : "1.3fr 1fr" }}>
        <Card>
          <CardHeading title="Savings progress" sub="Running total over time" />
          {savingsSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={savingsSeries} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4C7A6A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4C7A6A" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#EFE9DA" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8A8478" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8A8478" }} axisLine={false} tickLine={false} width={44}
                  tickFormatter={(v) => `£${v}`} />
                <Tooltip formatter={(v) => formatGBP(v)} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="total" stroke="#4C7A6A" strokeWidth={2.4} fill="url(#savingsFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={PiggyBank} title="No savings yet" body="Log your first saving to see your progress build up here." />
          )}
        </Card>

        <Card>
          <CardHeading title="Spending by category" />
          {spendingByCategory.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={spendingByCategory} dataKey="value" nameKey="label" innerRadius={34} outerRadius={54} paddingAngle={2}>
                    {spendingByCategory.map((c) => <Cell key={c.id} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatGBP(v)} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gap: 7, flex: 1 }}>
                {spendingByCategory.sort((a, b) => b.value - a.value).slice(0, 5).map((c) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 3, background: c.color }} />
                      {c.label}
                    </span>
                    <span style={{ fontWeight: 600 }}>{formatGBP(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={Receipt} title="No spending yet" body="Record an expense to see your spending broken down by category." />
          )}
        </Card>

        {profile.income !== null && (
          <Card style={isMobile ? {} : { gridColumn: "1 / -1" }}>
            <CardHeading title="Income" />
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={incomeData} layout="vertical" margin={{ left: -10 }}>
                <CartesianGrid horizontal={false} stroke="#EFE9DA" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#8A8478" }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12.5, fill: "#1C2621", fontWeight: 600 }} axisLine={false} tickLine={false} width={64} />
                <Tooltip formatter={(v) => formatGBP(v)} contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#1F3A32" radius={[0, 8, 8, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {bundles.filter(b => !b.completed).length > 0 && (
          <Card style={isMobile ? {} : { gridColumn: "1 / -1" }}>
            <CardHeading title="Bundles in progress" />
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {bundles.filter(b => !b.completed).slice(0, 4).map((b) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid var(--border)", borderRadius: 14 }}>
                  <BundlePot value={b.saved} max={b.target} size={44} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>{formatGBP(b.saved)} of {formatGBP(b.target)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function CardHeading({ title, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 className="maar-serif" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</h3>
      {sub && <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "3px 0 0" }}>{sub}</p>}
    </div>
  );
}

const tooltipStyle = {
  background: "#1C2621", border: "none", borderRadius: 10, fontSize: 12.5,
  color: "#fff", padding: "8px 12px",
};

/* ============================== SAVINGS ============================== */

function SavingsPage({ isMobile }) {
  const { data, addSaving, deleteSaving } = useApp();
  const [showModal, setShowModal] = useState(false);
  const { savings, profile } = data;
  const total = savings.reduce((s, e) => s + e.amount, 0);

  const currentPeriodTotal = useMemo(() => {
    if (!profile.frequency) return 0;
    const key = periodKey(todayISO(), profile.frequency);
    return savings.filter((s) => periodKey(s.date, profile.frequency) === key).reduce((sum, s) => sum + s.amount, 0);
  }, [savings, profile.frequency]);

  const sorted = [...savings].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div style={{ padding: isMobile ? "8px 18px 24px" : "8px 30px 30px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Log saving</Button>
      </div>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", margin: "18px 0 24px" }}>
        <SummaryCard label="Total saved" amount={total} icon={PiggyBank} />
        {profile.savingsTarget !== null ? (
          <>
            <SummaryCard label={`This ${FREQUENCY_LABEL[profile.frequency]}`} amount={currentPeriodTotal} icon={TrendingUp} />
            <SummaryCard label="Target" amount={profile.savingsTarget} icon={Target} tint="var(--brass-tint)" iconColor="var(--brass)" />
          </>
        ) : (
          <Card style={{ gridColumn: "span 2" }}>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>You haven't set a savings target yet. Add one in Profile to track progress towards a goal.</p>
          </Card>
        )}
      </div>

      {profile.savingsTarget !== null && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeading title={`Progress towards this ${FREQUENCY_LABEL[profile.frequency]}'s target`} />
          <ProgressBar value={currentPeriodTotal} max={profile.savingsTarget} height={12} />
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "8px 0 0" }}>
            {currentPeriodTotal >= profile.savingsTarget
              ? "You've reached your target — keep going if you'd like."
              : `${formatGBP(profile.savingsTarget - currentPeriodTotal)} to go. You're making progress.`}
          </p>
        </Card>
      )}

      <Card>
        <CardHeading title="Savings history" />
        {sorted.length === 0 ? (
          <EmptyState icon={PiggyBank} title="Nothing logged yet" body="Every saving you record — big or small — will show up here."
            action={<Button size="sm" icon={Plus} onClick={() => setShowModal(true)}>Log your first saving</Button>} />
        ) : (
          <div style={{ display: "grid", gap: 2 }}>
            {sorted.map((s) => (
              <RowItem key={s.id} left={
                <>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--moss-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <PiggyBank size={14} color="var(--forest-soft)" />
                  </div>
                  <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{formatDate(s.date)}</span>
                </>
              } right={
                <>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>+{formatGBP(s.amount)}</span>
                  <button className="maar-focus" aria-label="Delete entry" onClick={() => deleteSaving(s.id)} style={{ background: "none", border: "none", color: "var(--ink-soft)", padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </>
              } />
            ))}
          </div>
        )}
      </Card>

      {showModal && (
        <Modal title="Log a saving" onClose={() => setShowModal(false)}>
          <SavingForm onSubmit={(entry) => { addSaving(entry); setShowModal(false); }} />
        </Modal>
      )}
    </div>
  );
}

function RowItem({ left, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 4px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{left}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{right}</div>
    </div>
  );
}

function SavingForm({ onSubmit }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState("");
  const submit = () => {
    const n = parseFloat(amount);
    if (!amount || Number.isNaN(n) || n <= 0) { setError("Enter an amount greater than £0."); return; }
    onSubmit({ id: uid(), amount: n, date });
  };
  return (
    <div>
      <Field label="Amount">
        <AmountInput value={amount} onChange={setAmount} autoFocus />
      </Field>
      {error && <p style={{ color: "var(--brick)", fontSize: 12.5, marginTop: -10, marginBottom: 14 }}>{error}</p>}
      <Field label="Date">
        <input className="maar-focus" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
      </Field>
      <Button style={{ width: "100%", marginTop: 6 }} onClick={submit}>Save entry</Button>
    </div>
  );
}

/* ============================== EXPENSES ============================== */

function ExpensesPage({ isMobile }) {
  const { data, addExpense, deleteExpense } = useApp();
  const [showModal, setShowModal] = useState(false);
  const { expenses } = data;
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  const byCategory = useMemo(() => {
    const map = {};
    expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return CATEGORIES.map((c) => ({ ...c, value: map[c.id] || 0 })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
  }, [expenses]);

  return (
    <div style={{ padding: isMobile ? "8px 18px 24px" : "8px 30px 30px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Add expense</Button>
      </div>

      <div style={{ margin: "18px 0 24px" }}>
        <SummaryCard label="Total spent" amount={total} icon={Receipt} tint="var(--brick-tint)" iconColor="var(--brick)" />
      </div>

      {byCategory.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <CardHeading title="By category" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byCategory} margin={{ left: -18 }}>
              <CartesianGrid vertical={false} stroke="#EFE9DA" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A8478" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8A8478" }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
              <Tooltip formatter={(v) => formatGBP(v)} contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {byCategory.map((c) => <Cell key={c.id} fill={c.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card>
        <CardHeading title="Recent expenses" />
        {sorted.length === 0 ? (
          <EmptyState icon={Receipt} title="No expenses recorded" body="Add your spending to see totals and category breakdowns build up."
            action={<Button size="sm" icon={Plus} onClick={() => setShowModal(true)}>Add your first expense</Button>} />
        ) : (
          <div style={{ display: "grid", gap: 2 }}>
            {sorted.map((e) => {
              const cat = categoryById(e.category);
              return (
                <RowItem key={e.id} left={
                  <>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: `${cat.color}1A`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <cat.icon size={14} color={cat.color} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{cat.label}{e.note ? ` · ${e.note}` : ""}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>{formatDate(e.date)}</p>
                    </div>
                  </>
                } right={
                  <>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "var(--brick)" }}>-{formatGBP(e.amount)}</span>
                    <button className="maar-focus" aria-label="Delete expense" onClick={() => deleteExpense(e.id)} style={{ background: "none", border: "none", color: "var(--ink-soft)", padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </>
                } />
              );
            })}
          </div>
        )}
      </Card>

      {showModal && (
        <Modal title="Add an expense" onClose={() => setShowModal(false)}>
          <ExpenseForm onSubmit={(entry) => { addExpense(entry); setShowModal(false); }} />
        </Modal>
      )}
    </div>
  );
}

function ExpenseForm({ onSubmit }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState("food");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    const n = parseFloat(amount);
    if (!amount || Number.isNaN(n) || n <= 0) { setError("Enter an amount greater than £0."); return; }
    onSubmit({ id: uid(), amount: n, date, category, note: note.trim() });
  };
  return (
    <div>
      <Field label="Amount">
        <AmountInput value={amount} onChange={setAmount} autoFocus />
      </Field>
      {error && <p style={{ color: "var(--brick)", fontSize: 12.5, marginTop: -10, marginBottom: 14 }}>{error}</p>}
      <Field label="Category">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((c) => (
            <button key={c.id} className="maar-focus" onClick={() => setCategory(c.id)} type="button" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999,
              border: `1.5px solid ${category === c.id ? c.color : "var(--border)"}`,
              background: category === c.id ? `${c.color}1A` : "transparent", fontSize: 12.5, fontWeight: 600,
              color: category === c.id ? c.color : "var(--ink-soft)",
            }}>
              <c.icon size={13} /> {c.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Date">
        <input className="maar-focus" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Note (optional)">
        <input className="maar-focus" type="text" placeholder="e.g. Weekly shop" value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} maxLength={60} />
      </Field>
      <Button style={{ width: "100%", marginTop: 6 }} onClick={submit}>Add expense</Button>
    </div>
  );
}

/* ============================== BUNDLES ============================== */

function BundlesPage({ isMobile }) {
  const { data, addBundle, addToBundle, editBundle } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [addTo, setAddTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const active = data.bundles.filter((b) => !b.completed);
  const completed = data.bundles.filter((b) => b.completed);

  return (
    <div style={{ padding: isMobile ? "8px 18px 24px" : "8px 30px 30px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>New bundle</Button>
      </div>

      <div style={{ margin: "18px 0 8px" }}>
        {active.length === 0 && completed.length === 0 ? (
          <Card>
            <EmptyState icon={Layers} title="Create your first bundle"
              body="A bundle is its own savings pot for one goal — a holiday, an emergency fund, a new phone. Keep as many as you need, each tracked separately."
              action={<Button size="sm" icon={Plus} onClick={() => setShowCreate(true)}>Create a bundle</Button>} />
          </Card>
        ) : (
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {active.map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(i, 6) * 0.05, ease: [0.2, 0.8, 0.2, 1] }}>
                <BundleCard bundle={b} onAddMoney={() => setAddTo(b)} onEdit={() => setEditing(b)} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {completed.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.4, margin: "0 0 12px" }}>Completed</p>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {completed.map((b) => <BundleCard key={b.id} bundle={b} completed />)}
          </div>
        </div>
      )}

      {showCreate && (
        <Modal title="Create a bundle" onClose={() => setShowCreate(false)}>
          <BundleForm onSubmit={(b) => { addBundle(b); setShowCreate(false); }} />
        </Modal>
      )}
      {addTo && (
        <Modal title={`Add to “${addTo.name}”`} onClose={() => setAddTo(null)}>
          <AddToBundleForm bundle={addTo} onSubmit={(amount) => { addToBundle(addTo.id, amount); setAddTo(null); }} />
        </Modal>
      )}
      {editing && (
        <Modal title={`Edit “${editing.name}”`} onClose={() => setEditing(null)}>
          <BundleForm initial={editing} onSubmit={(b) => { editBundle(editing.id, b); setEditing(null); }} />
        </Modal>
      )}
    </div>
  );
}

function BundleCard({ bundle, onAddMoney, onEdit, completed }) {
  return (
    <Card style={{ opacity: completed ? 0.85 : 1 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
        <BundlePot value={bundle.saved} max={bundle.target} size={54} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bundle.name}</p>
            {completed && <Trophy size={13} color="var(--brass)" />}
          </div>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>{formatGBP(bundle.saved)} of {formatGBP(bundle.target)}</p>
        </div>
        {!completed && (
          <button className="maar-focus" aria-label={`Edit ${bundle.name}`} onClick={onEdit} style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 9, padding: 7 }}>
            <Pencil size={13} />
          </button>
        )}
      </div>
      <ProgressBar value={bundle.saved} max={bundle.target} color={completed ? "var(--brass)" : "var(--moss)"} />
      {!completed && (
        <Button size="sm" variant="secondary" style={{ width: "100%", marginTop: 14 }} icon={Plus} onClick={onAddMoney}>
          Add money
        </Button>
      )}
      {completed && bundle.completedAt && (
        <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: "10px 0 0" }}>Completed {formatDate(bundle.completedAt)}</p>
      )}
    </Card>
  );
}

function BundleForm({ onSubmit, initial }) {
  const [name, setName] = useState(initial?.name || "");
  const [target, setTarget] = useState(initial ? String(initial.target) : "");
  const [error, setError] = useState("");
  const submit = () => {
    const n = parseFloat(target);
    if (!name.trim()) { setError("Give your bundle a name."); return; }
    if (!target || Number.isNaN(n) || n <= 0) { setError("Enter a target amount greater than £0."); return; }
    onSubmit({ name: name.trim(), target: n });
  };
  return (
    <div>
      <Field label="Name" hint="e.g. Holiday, Emergency Fund, New Phone">
        <input className="maar-focus" type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} maxLength={40} autoFocus />
      </Field>
      <Field label="Target amount">
        <AmountInput value={target} onChange={setTarget} />
      </Field>
      {error && <p style={{ color: "var(--brick)", fontSize: 12.5, marginTop: -10, marginBottom: 14 }}>{error}</p>}
      <Button style={{ width: "100%", marginTop: 6 }} onClick={submit}>{initial ? "Save changes" : "Create bundle"}</Button>
    </div>
  );
}

function AddToBundleForm({ bundle, onSubmit }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    const n = parseFloat(amount);
    if (!amount || Number.isNaN(n) || n <= 0) { setError("Enter an amount greater than £0."); return; }
    onSubmit(n);
  };
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 16px" }}>
        Currently {formatGBP(bundle.saved)} of {formatGBP(bundle.target)}.
      </p>
      <Field label="Amount to add">
        <AmountInput value={amount} onChange={setAmount} autoFocus />
      </Field>
      {error && <p style={{ color: "var(--brick)", fontSize: 12.5, marginTop: -10, marginBottom: 14 }}>{error}</p>}
      <Button style={{ width: "100%", marginTop: 6 }} onClick={submit}>Add to bundle</Button>
    </div>
  );
}

/* ============================== ACHIEVEMENTS ============================== */

function AchievementsPage({ isMobile }) {
  const { data } = useApp();
  const items = [...data.achievements].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div style={{ padding: isMobile ? "8px 18px 24px" : "8px 30px 30px" }}>
      {items.length === 0 ? (
        <Card>
          <EmptyState icon={Trophy} title="No achievements yet"
            body="Complete a bundle or reach your savings target to earn your first achievement. They'll be kept here for good." />
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {items.map((a) => (
            <Card key={a.id}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--brass-tint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Trophy size={17} color="var(--brass)" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14.5 }}>{a.title}</p>
                  <p style={{ margin: "2px 0 6px", fontSize: 12.5, color: "var(--ink-soft)" }}>{a.subtitle}</p>
                  {a.amount !== undefined && <p className="maar-serif" style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--forest)" }}>{formatGBP(a.amount)}</p>}
                  <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--ink-soft)" }}>{formatDate(a.date)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================== PROFILE ============================== */

function ProfilePage({ isMobile }) {
  const { data, updateProfile, addToast } = useApp();
  const { profile } = data;
  const [editing, setEditing] = useState(false);
  const [income, setIncome] = useState(profile.income !== null ? String(profile.income) : "");
  const [target, setTarget] = useState(profile.savingsTarget !== null ? String(profile.savingsTarget) : "");
  const [frequency, setFrequency] = useState(profile.frequency || "monthly");

  useEffect(() => {
    setIncome(profile.income !== null ? String(profile.income) : "");
    setTarget(profile.savingsTarget !== null ? String(profile.savingsTarget) : "");
    setFrequency(profile.frequency || "monthly");
  }, [editing]); // eslint-disable-line

  const save = () => {
    updateProfile({
      income: income === "" ? null : parseFloat(income),
      savingsTarget: target === "" ? null : parseFloat(target),
      frequency: target === "" ? null : frequency,
    });
    setEditing(false);
    addToast("Profile updated");
  };

  return (
    <div style={{ padding: isMobile ? "8px 18px 24px" : "8px 30px 30px", maxWidth: 520 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <CardHeading title="Your details" sub="Used to personalise your dashboard" />
          {!editing && <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>}
        </div>

        {!editing ? (
          <div style={{ display: "grid", gap: 16 }}>
            <ProfileRow label="Monthly income" value={profile.income !== null ? formatGBP(profile.income) : "Not provided"} />
            <ProfileRow label="Savings target" value={profile.savingsTarget !== null ? formatGBP(profile.savingsTarget) : "Not set"} />
            <ProfileRow label="Frequency" value={profile.frequency ? profile.frequency[0].toUpperCase() + profile.frequency.slice(1) : "—"} />
          </div>
        ) : (
          <div>
            <Field label="Monthly income" hint="Leave blank if you'd rather not say.">
              <AmountInput value={income} onChange={setIncome} />
            </Field>
            <Field label="Savings target" hint="Leave blank to remove your target.">
              <AmountInput value={target} onChange={setTarget} />
            </Field>
            {target !== "" && (
              <Field label="Frequency">
                <div style={{ display: "flex", gap: 8 }}>
                  {["weekly", "monthly", "yearly"].map((f) => (
                    <button key={f} className="maar-focus" onClick={() => setFrequency(f)} type="button" style={{
                      flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, textTransform: "capitalize",
                      border: `1.5px solid ${frequency === f ? "var(--forest)" : "var(--border)"}`,
                      background: frequency === f ? "var(--moss-tint)" : "transparent",
                    }}>{f}</button>
                  ))}
                </div>
              </Field>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</Button>
              <Button style={{ flex: 1 }} icon={Check} onClick={save}>Save changes</Button>
            </div>
          </div>
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Info size={16} color="var(--ink-soft)" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
            MAAR Money helps you organise and track your money — it isn't financial advice and MAAR isn't a bank or regulated financial service.
            Your data stays on this device.
          </p>
        </div>
      </Card>
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{label}</span>
      <span style={{ fontSize: 14.5, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

/* ============================== FOOTER ============================== */

function Footer({ isMobile }) {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: isMobile ? "20px 18px" : "22px 30px", marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <MaarMark size={18} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>MAAR Money</span>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>· United Kingdom</span>
      </div>
    </footer>
  );
}

/* ============================== APP SHELL ============================== */

function AppShell() {
  const { data, celebration, dismissCelebration, toast, dismissToast } = useApp();
  const [page, setPage] = useState("home");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 780 : false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 780);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const pageMeta = NAV_ITEMS.find((n) => n.id === page);

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      {!isMobile && <Sidebar page={page} setPage={setPage} />}
      <div className="maar-scroll" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, maxHeight: "100vh", overflowY: "auto" }}>
        <div style={{ flex: 1 }}>
          <TopBar title={pageMeta.label} isMobile={isMobile} />
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {page === "home" && <HomePage isMobile={isMobile} />}
              {page === "savings" && <SavingsPage isMobile={isMobile} />}
              {page === "expenses" && <ExpensesPage isMobile={isMobile} />}
              {page === "bundles" && <BundlesPage isMobile={isMobile} />}
              {page === "achievements" && <AchievementsPage isMobile={isMobile} />}
              {page === "profile" && <ProfilePage isMobile={isMobile} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <Footer isMobile={isMobile} />
        {isMobile && <MobileNav page={page} setPage={setPage} />}
      </div>

      {celebration && (
        <CelebrationModal
          title={celebration.title}
          subtitle={celebration.subtitle}
          amount={celebration.amount}
          onClose={dismissCelebration}
        />
      )}
      {toast && <Toast message={toast} onDone={dismissToast} />}
    </div>
  );
}

/* ============================== ROOT APP + PERSISTENCE ============================== */

export default function App() {
  const [data, setData] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const [toast, setToast] = useState(null);
  const saveTimer = useRef(null);

  // Load persisted data on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData({ ...emptyData(), ...parsed });
      } else {
        setData(emptyData());
      }
    } catch {
      setData(emptyData());
    }
  }, []);

  // Persist on change (debounced).
  useEffect(() => {
    if (!data) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        setLoadError(true);
      }
    }, 300);
    return () => clearTimeout(saveTimer.current);
  }, [data]);

  const addToast = useCallback((msg) => setToast(msg), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const celebrate = useCallback((c) => {
    setCelebration(c);
  }, []);

  const dismissCelebration = useCallback(() => {
    setData((d) => {
      if (!d) return d;
      let next = { ...d };
      if (celebration?.periodKey) {
        next.celebratedPeriods = [...d.celebratedPeriods, celebration.periodKey];
        next.achievements = [...d.achievements, {
          id: uid(), type: "target", title: celebration.title, subtitle: celebration.subtitle,
          amount: celebration.amount, date: todayISO(),
        }];
      }
      return next;
    });
    setCelebration(null);
  }, [celebration]);

  const completeOnboarding = useCallback((profile) => {
    setData((d) => ({ ...d, profile }));
  }, []);

  const updateProfile = useCallback((patch) => {
    setData((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
  }, []);

  const addSaving = useCallback((entry) => {
    setData((d) => ({ ...d, savings: [...d.savings, entry] }));
    addToast("Saving logged");
  }, [addToast]);

  const deleteSaving = useCallback((id) => {
    setData((d) => ({ ...d, savings: d.savings.filter((s) => s.id !== id) }));
  }, []);

  const addExpense = useCallback((entry) => {
    setData((d) => ({ ...d, expenses: [...d.expenses, entry] }));
    addToast("Expense added");
  }, [addToast]);

  const deleteExpense = useCallback((id) => {
    setData((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) }));
  }, []);

  const addBundle = useCallback((bundle) => {
    setData((d) => ({
      ...d,
      bundles: [...d.bundles, { id: uid(), saved: 0, completed: false, completedAt: null, createdAt: todayISO(), ...bundle }],
    }));
    addToast("Bundle created");
  }, [addToast]);

  const editBundle = useCallback((id, patch) => {
    setData((d) => ({ ...d, bundles: d.bundles.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
    addToast("Bundle updated");
  }, [addToast]);

  const addToBundle = useCallback((id, amount) => {
    setData((d) => {
      const bundle = d.bundles.find((b) => b.id === id);
      if (!bundle) return d;
      const newSaved = bundle.saved + amount;
      const justCompleted = !bundle.completed && newSaved >= bundle.target;
      const updatedBundles = d.bundles.map((b) => b.id === id ? {
        ...b, saved: newSaved,
        completed: justCompleted ? true : b.completed,
        completedAt: justCompleted ? todayISO() : b.completedAt,
      } : b);

      if (justCompleted) {
        setTimeout(() => celebrate({ title: bundle.name, subtitle: "Bundle goal complete.", amount: newSaved }), 50);
        return {
          ...d, bundles: updatedBundles,
          achievements: [...d.achievements, {
            id: uid(), type: "bundle", title: bundle.name, subtitle: "Bundle completed",
            amount: newSaved, date: todayISO(),
          }],
        };
      }
      return { ...d, bundles: updatedBundles };
    });
  }, [celebrate]);

  if (!data) {
    return (
      <div className="maar-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 480 }}>
        <style>{STYLE}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--ink-soft)" }}>
          <Loader2 className="maar-focus" size={22} style={{ animation: "spin 0.9s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: 13 }}>Loading your MAAR Money…</span>
        </div>
      </div>
    );
  }

  const ctx = {
    data, celebration, toast, addToast, dismissToast, celebrate, dismissCelebration,
    updateProfile, addSaving, deleteSaving, addExpense, deleteExpense,
    addBundle, editBundle, addToBundle,
  };

  return (
    <AppCtx.Provider value={ctx}>
      <div className="maar-root">
        <style>{STYLE}</style>
        {!data.profile.onboarded ? (
          <OnboardingFlow onComplete={completeOnboarding} />
        ) : (
          <AppShell />
        )}
      </div>
    </AppCtx.Provider>
  );
}
