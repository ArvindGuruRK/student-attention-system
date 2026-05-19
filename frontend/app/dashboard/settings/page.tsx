"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { api, type Classroom } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.classrooms.list()
      .then(setClassrooms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save(id: string, data: Partial<Classroom>) {
    setSaving(id);
    setSaveError((prev) => ({ ...prev, [id]: "" }));
    setSaveSuccess((prev) => ({ ...prev, [id]: false }));
    try {
      const updated = await api.classrooms.update(id, data);
      setClassrooms((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setSaveSuccess((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => setSaveSuccess((prev) => ({ ...prev, [id]: false })), 2500);
    } catch (err) {
      setSaveError((prev) => ({ ...prev, [id]: err instanceof Error ? err.message : "Save failed" }));
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6 animate-fadeIn">
        <div className="skeleton h-8 w-32 rounded-xl" />
        {[1, 2].map((i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fadeIn">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-sm text-[#737373] mt-1">Configure attention thresholds per classroom</p>
      </div>

      {classrooms.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-[#a3a3a3]">No classrooms to configure.</p>
        </div>
      ) : (
        classrooms.map((c, i) => (
          <div key={c.id} className="card animate-in" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-[#f0f0f0]">
              <div className="w-8 h-8 bg-[#0a0a0a] rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                {c.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-[#0a0a0a]">{c.name}</p>
                <p className="text-[11px] text-[#a3a3a3]">Threshold Configuration</p>
              </div>
            </div>
            <div className="p-6">
              <ThresholdForm
                classroom={c}
                saving={saving === c.id}
                error={saveError[c.id]}
                success={saveSuccess[c.id]}
                onSave={(data) => save(c.id, data)}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ThresholdForm({
  classroom,
  saving,
  error,
  success,
  onSave,
}: {
  classroom: Classroom;
  saving: boolean;
  error?: string;
  success?: boolean;
  onSave: (data: Partial<Classroom>) => void;
}) {
  const [alertT, setAlertT] = useState(classroom.alert_threshold);
  const [warnT, setWarnT] = useState(classroom.warn_threshold);
  const [yawT, setYawT] = useState(classroom.yaw_threshold);
  const [pitchT, setPitchT] = useState(classroom.pitch_threshold);

  return (
    <div className="space-y-5">
      {/* Score band preview */}
      <div>
        <p className="section-title mb-3">Score Bands</p>
        <div className="flex rounded-xl overflow-hidden h-3 w-full gap-px">
          <div className="bg-[#0a0a0a]" style={{ width: `${alertT}%` }} title={`Alert 0–${alertT}`} />
          <div className="bg-[#737373]" style={{ width: `${warnT - alertT}%` }} title={`Warn ${alertT}–${warnT}`} />
          <div className="bg-[#d4d4d4]" style={{ width: `${80 - warnT}%` }} title={`Distracted ${warnT}–80`} />
          <div className="bg-[#f0f0f0] border border-[#e5e5e5] flex-1" title="Attentive 80–100" />
        </div>
        <div className="flex justify-between text-[10px] font-semibold mt-2">
          <span className="text-[#0a0a0a]">Alert &lt;{alertT}</span>
          <span className="text-[#737373]">Warn &lt;{warnT}</span>
          <span className="text-[#a3a3a3]">Good ≥80</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SliderField
          label="Alert Threshold (%)"
          description="Red alert below this"
          value={alertT}
          min={10}
          max={warnT - 5}
          onChange={setAlertT}
        />
        <SliderField
          label="Warn Threshold (%)"
          description="Warning below this"
          value={warnT}
          min={alertT + 5}
          max={90}
          onChange={setWarnT}
        />
        <SliderField
          label="Yaw Limit (°)"
          description="Max horizontal head turn"
          value={yawT}
          min={10}
          max={70}
          onChange={setYawT}
        />
        <SliderField
          label="Pitch Limit (°)"
          description="Max vertical head tilt"
          value={pitchT}
          min={10}
          max={60}
          onChange={setPitchT}
        />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#f5f5f5]">
        <div>
          {error && <p className="text-xs text-[#525252]">{error}</p>}
          {success && (
            <p className="text-xs text-[#0a0a0a] flex items-center gap-1.5">
              <Check size={12} strokeWidth={2.5} />
              Saved
            </p>
          )}
        </div>
        <button
          onClick={() => onSave({ alert_threshold: alertT, warn_threshold: warnT, yaw_threshold: yawT, pitch_threshold: pitchT })}
          disabled={saving}
          className="btn-primary text-xs px-5 py-2.5"
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function SliderField({
  label,
  description,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="bg-[#f7f7f7] rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-[#0a0a0a]">{label}</p>
          <p className="text-[10px] text-[#a3a3a3] mt-0.5">{description}</p>
        </div>
        <span className="text-sm font-semibold text-[#0a0a0a] tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-[#c8c8c8] mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
