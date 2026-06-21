import React, { useState } from "react";
import { Target, Repeat, Lock, Pause, ArrowRight, Check, BookOpen, Sparkles } from "lucide-react";

const colors = {
  bg: "#15131B",
  surface: "#1E1B26",
  surfaceAlt: "#272232",
  text: "#F4EFE6",
  muted: "#9A93A8",
  border: "rgba(244,239,230,0.08)",
  ember: "#FF7A33",
  emberSoft: "rgba(255,122,51,0.14)",
  sage: "#36D399",
};

function FocusDial({ completed, total }) {
  const size = 196;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(completed / total, 1);
  const offset = c * (1 - pct);
  const ticks = Array.from({ length: 24 });

  return (
    <div style={{ width: size, height: size, position: "relative" }} className="flex items-center justify-center">
      <svg width={size} height={size} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
        {ticks.map((_, i) => {
          const angle = (i * 360) / ticks.length;
          const rad = (angle * Math.PI) / 180;
          const major = i % 6 === 0;
          const inner = r + stroke / 2 + 5;
          const outer = inner + (major ? 7 : 3);
          const cx = size / 2;
          const cy = size / 2;
          return (
            <line
              key={i}
              x1={cx + inner * Math.cos(rad)}
              y1={cy + inner * Math.sin(rad)}
              x2={cx + outer * Math.cos(rad)}
              y2={cy + outer * Math.sin(rad)}
              stroke={major ? colors.muted : colors.border}
              strokeWidth={major ? 2 : 1.5}
            />
          );
        })}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.surfaceAlt} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors.ember}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="flex flex-col items-center">
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: colors.text }} className="text-3xl">
          {completed}/{total}
        </span>
        <span
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: colors.muted, letterSpacing: "0.12em" }}
          className="text-xs uppercase mt-1"
        >
          rituais hoje
        </span>
      </div>
    </div>
  );
}

function Checkbox({ checked, onClick, tone = "ember" }) {
  const active = tone === "ember" ? colors.ember : colors.sage;
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-full border transition"
      style={{
        width: 28,
        height: 28,
        borderColor: checked ? active : colors.border,
        backgroundColor: checked ? active : "transparent",
      }}
    >
      {checked && <Check size={16} color={colors.bg} strokeWidth={3} />}
    </button>
  );
}

export default function FlavosLockedIn() {
  const [ritual, setRitual] = useState({ goal: true, water: false, train: false, journal: false });

  const toggle = (key) => setRitual((r) => ({ ...r, [key]: !r[key] }));
  const completed = Object.values(ritual).filter(Boolean).length;
  const total = 4;

  const display = "'Bricolage Grotesque', sans-serif";
  const mono = "'IBM Plex Mono', monospace";
  const body = "'Manrope', sans-serif";

  return (
    <div
      style={{ backgroundColor: colors.bg, fontFamily: body, color: colors.text, minHeight: "100vh" }}
      className="flex justify-center px-4 py-8"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');
      `}</style>

      <div className="w-full" style={{ maxWidth: 380 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p style={{ fontFamily: mono, color: colors.muted, letterSpacing: "0.18em" }} className="text-xs uppercase mb-1">
              flavos
            </p>
            <h1 style={{ fontFamily: display }} className="text-3xl font-bold leading-none">
              Locked-In
            </h1>
          </div>
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: 38, height: 38, backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.border}` }}
          >
            <span style={{ fontFamily: mono, fontSize: 13 }}>K</span>
          </div>
        </div>

        {/* Focus Dial */}
        <div
          className="rounded-3xl flex flex-col items-center py-8 mb-5"
          style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
        >
          <FocusDial completed={completed} total={total} />
          <p style={{ color: colors.muted }} className="text-sm mt-4 text-center px-6">
            {completed === total ? "Tudo trancado por hoje." : "Você está trancado no foco de hoje."}
          </p>
        </div>

        {/* Metas */}
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} color={colors.ember} />
          <h2 style={{ fontFamily: display }} className="text-sm uppercase tracking-wide font-semibold">
            Metas em foco
          </h2>
        </div>

        <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold mb-1">Ler 10 páginas</p>
              <div
                className="flex items-center gap-1 rounded-full px-2 py-1 mt-2"
                style={{ backgroundColor: colors.emberSoft, color: colors.ember, width: "fit-content" }}
              >
                <ArrowRight size={12} />
                <span style={{ fontFamily: mono }} className="text-xs">
                  se eu acordar, então leio antes do celular
                </span>
              </div>
            </div>
            <Checkbox checked={ritual.goal} onClick={() => toggle("goal")} tone="ember" />
          </div>
        </div>

        <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
          <p className="font-semibold mb-2">Lançar MVP do projeto X</p>
          <div className="w-full rounded-full h-2 mb-2" style={{ backgroundColor: colors.surfaceAlt }}>
            <div className="h-2 rounded-full" style={{ width: "62%", backgroundColor: colors.ember }} />
          </div>
          <p style={{ color: colors.muted, fontFamily: mono }} className="text-xs">
            62% · prazo em 12 dias
          </p>
        </div>

        {/* Hábitos */}
        <div className="flex items-center gap-2 mb-3">
          <Repeat size={16} color={colors.sage} />
          <h2 style={{ fontFamily: display }} className="text-sm uppercase tracking-wide font-semibold">
            Hábitos de hoje
          </h2>
        </div>

        <div className="rounded-2xl mb-5" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
          {[
            { key: "water", label: "Beber 2L de água", consistency: 86 },
            { key: "train", label: "Treinar 20 min", consistency: 64 },
          ].map((h, i) => (
            <div
              key={h.key}
              className="flex items-center justify-between p-4"
              style={{ borderTop: i > 0 ? `1px solid ${colors.border}` : "none" }}
            >
              <div className="flex items-center gap-3">
                <Checkbox checked={ritual[h.key]} onClick={() => toggle(h.key)} tone="sage" />
                <div>
                  <p className="text-sm">{h.label}</p>
                  <p style={{ color: colors.muted, fontFamily: mono }} className="text-xs">
                    {h.consistency}% nos últimos 30 dias
                  </p>
                </div>
              </div>
              <button
                className="flex items-center justify-center rounded-full"
                style={{ width: 30, height: 30, backgroundColor: colors.surfaceAlt }}
                title="Pausar hoje sem penalidade"
              >
                <Pause size={14} color={colors.muted} />
              </button>
            </div>
          ))}
        </div>

        {/* Diário */}
        <div
          className="rounded-2xl p-4 mb-3 flex items-center justify-between"
          style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
        >
          <div className="flex items-start gap-3">
            <BookOpen size={18} color={colors.text} className="mt-1" />
            <div>
              <p className="font-semibold mb-1">Diário</p>
              <p style={{ color: colors.muted }} className="text-sm">
                O que travou seu foco hoje — e o que destravou?
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Lock size={11} color={colors.muted} />
                <span style={{ color: colors.muted }} className="text-xs">
                  privado e criptografado
                </span>
              </div>
            </div>
          </div>
          <Checkbox checked={ritual.journal} onClick={() => toggle("journal")} tone="ember" />
        </div>

        {/* Coach IA - teaser Pro */}
        <div
          className="rounded-2xl p-4 mb-3 flex items-center justify-between"
          style={{ backgroundColor: colors.surfaceAlt, border: `1px dashed ${colors.border}` }}
        >
          <div className="flex items-center gap-3">
            <Sparkles size={16} color={colors.muted} />
            <p className="text-sm" style={{ color: colors.muted }}>
              Coach IA — resumo semanal personalizado
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full px-2 py-1" style={{ backgroundColor: colors.bg, color: colors.muted }}>
            <Lock size={11} />
            <span style={{ fontFamily: mono }} className="text-xs">
              pro
            </span>
          </div>
        </div>

        {/* Revisão semanal */}
        <button
          className="w-full rounded-2xl p-4 mb-4 flex items-center justify-between"
          style={{ backgroundColor: colors.emberSoft, border: `1px solid ${colors.ember}` }}
        >
          <span style={{ color: colors.ember }} className="text-sm font-semibold">
            Domingo é dia de revisão semanal
          </span>
          <ArrowRight size={16} color={colors.ember} />
        </button>

        <p style={{ color: colors.muted }} className="text-xs text-center pb-2">
          Seus dados são seus. Sem ranking público, sem comparação.
        </p>
      </div>
    </div>
  );
}
