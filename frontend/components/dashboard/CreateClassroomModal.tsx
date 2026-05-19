"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, ChevronRight, Plus, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type Classroom } from "@/lib/api";

interface Props { onClose: () => void; onCreated: (classroom: Classroom) => void; }
type Step = 1 | 2;

const DEFAULTS = { yaw_threshold: 30, pitch_threshold: 25, alert_threshold: 40, warn_threshold: 60 };

export default function CreateClassroomModal({ onClose, onCreated }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [thresholds, setThresholds] = useState({ ...DEFAULTS });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function validateName(): boolean {
    const trimmed = name.trim();
    if (!trimmed) { setNameError("Name is required"); nameRef.current?.focus(); return false; }
    if (trimmed.length < 2) { setNameError("At least 2 characters"); nameRef.current?.focus(); return false; }
    setNameError(""); return true;
  }

  async function handleCreate() {
    if (!validateName()) { setStep(1); return; }
    setCreating(true); setCreateError("");
    try {
      const classroom = await api.classrooms.create({ name: name.trim(), ...thresholds });
      onCreated(classroom); onClose();
      router.push(`/dashboard/classrooms/${classroom.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create classroom");
    } finally { setCreating(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-modal w-full max-w-lg overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-[#0a0a0a] px-7 pt-7 pb-8">
          <div className="flex items-start justify-between mb-7">
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">New Classroom</h2>
              <p className="text-white/40 text-xs mt-1">Configure your monitoring space</p>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 mt-0.5">
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {([1, 2] as Step[]).map((n) => (
              <div key={n} className="flex items-center gap-2">
                <button
                  onClick={() => { if (n < step) setStep(n); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                    step === n ? "bg-white text-[#0a0a0a]" : n < step ? "bg-white/20 text-white cursor-pointer" : "bg-white/8 text-white/30 cursor-default",
                  )}
                >
                  <span className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                    step === n ? "bg-[#0a0a0a] text-white" : n < step ? "bg-white text-[#0a0a0a]" : "bg-white/20 text-white/40",
                  )}>
                    {n < step ? <Check size={8} strokeWidth={3} /> : <span className="text-[10px] font-semibold">{n}</span>}
                  </span>
                  {n === 1 ? "Basics" : "Thresholds"}
                </button>
                {n < 2 && <div className={cn("w-6 h-px", step > n ? "bg-white/40" : "bg-white/15")} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-6 overflow-y-auto max-h-[48vh]">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="classroom-name" className="label">Classroom Name</label>
                <div className="relative">
                  <input
                    id="classroom-name" ref={nameRef} value={name}
                    onChange={(e) => { setName(e.target.value); if (nameError) setNameError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && validateName()) setStep(2); }}
                    placeholder="e.g. CS101 — Morning Batch" maxLength={100}
                    className={cn("input", nameError && "border-[#0a0a0a] ring-2 ring-[#0a0a0a]/10")}
                  />
                  {name.trim().length >= 2 && !nameError && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#0a0a0a] flex items-center justify-center">
                      <Check size={10} strokeWidth={3} className="text-white" />
                    </div>
                  )}
                </div>
                {nameError
                  ? <p className="text-[11px] text-[#525252] mt-1.5 flex items-center gap-1"><AlertCircle size={11} strokeWidth={2} />{nameError}</p>
                  : <p className="text-[11px] text-[#c8c8c8] mt-1.5">{name.trim().length}/100</p>}
              </div>
              <div className="bg-[#f7f7f7] rounded-2xl p-4 text-xs text-[#737373] leading-relaxed">
                Next you&apos;ll set attention score thresholds — the boundaries that trigger warnings and alerts during live monitoring.
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-[#737373] leading-relaxed">These defaults work for most classrooms. You can adjust them anytime in settings.</p>

              <div className="bg-[#f7f7f7] rounded-2xl p-4">
                <p className="section-title mb-3">Score Bands Preview</p>
                <div className="flex rounded-xl overflow-hidden h-3 w-full gap-px">
                  <div className="bg-[#0a0a0a] transition-all" style={{ width: `${thresholds.alert_threshold}%` }} />
                  <div className="bg-[#737373] transition-all" style={{ width: `${thresholds.warn_threshold - thresholds.alert_threshold}%` }} />
                  <div className="bg-[#d4d4d4] transition-all" style={{ width: `${80 - thresholds.warn_threshold}%` }} />
                  <div className="bg-[#f0f0f0] border border-[#e5e5e5] flex-1" />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] font-semibold text-[#0a0a0a]">Alert &lt;{thresholds.alert_threshold}</span>
                  <span className="text-[10px] font-semibold text-[#737373]">Warn &lt;{thresholds.warn_threshold}</span>
                  <span className="text-[10px] font-semibold text-[#a3a3a3]">Good ≥80</span>
                </div>
              </div>

              <div className="space-y-3">
                <ThresholdSlider label="Alert Threshold" description="Score below → red alert" value={thresholds.alert_threshold} min={10} max={thresholds.warn_threshold - 5} onChange={(v) => setThresholds((t) => ({ ...t, alert_threshold: v }))} />
                <ThresholdSlider label="Warning Threshold" description="Score below → warning" value={thresholds.warn_threshold} min={thresholds.alert_threshold + 5} max={90} onChange={(v) => setThresholds((t) => ({ ...t, warn_threshold: v }))} />
                <ThresholdSlider label="Head Yaw Limit (°)" description="Max horizontal turn" value={thresholds.yaw_threshold} min={10} max={70} onChange={(v) => setThresholds((t) => ({ ...t, yaw_threshold: v }))} />
                <ThresholdSlider label="Head Pitch Limit (°)" description="Max vertical tilt" value={thresholds.pitch_threshold} min={10} max={60} onChange={(v) => setThresholds((t) => ({ ...t, pitch_threshold: v }))} />
              </div>

              {createError && (
                <div className="bg-[#f5f5f5] border border-[#e5e5e5] rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-[#525252]">
                  <AlertCircle size={13} strokeWidth={2} className="shrink-0" />{createError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 pb-7 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep((s) => (s - 1) as Step)} disabled={creating} className="btn-secondary">Back</button>
          )}
          <button onClick={step === 1 ? () => { if (validateName()) setStep(2); } : handleCreate} disabled={creating} className="btn-primary flex-1">
            {creating
              ? <><Loader2 size={14} className="animate-spin" /> Creating…</>
              : step === 1
              ? <>Next <ChevronRight size={14} strokeWidth={2} /></>
              : <><Plus size={14} strokeWidth={2.5} /> Create Classroom</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ThresholdSlider({ label, description, value, min, max, onChange }: { label: string; description: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="bg-[#f7f7f7] rounded-xl p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <p className="text-xs font-semibold text-[#0a0a0a]">{label}</p>
          <p className="text-[10px] text-[#a3a3a3]">{description}</p>
        </div>
        <span className="text-sm font-semibold text-[#0a0a0a] tabular-nums">{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      <div className="flex justify-between text-[10px] text-[#c8c8c8] mt-1"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}
