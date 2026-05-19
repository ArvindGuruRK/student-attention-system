"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, X, School, Trash2, ChevronRight, Check, AlertCircle, Loader2 } from "lucide-react";
import { api, type Classroom } from "@/lib/api";
import { cn } from "@/lib/utils";
import CreateClassroomModal from "@/components/dashboard/CreateClassroomModal";

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Classroom | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    api.classrooms.list()
      .then(setClassrooms)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load classrooms"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function handleCreated(classroom: Classroom) {
    setClassrooms((prev) => [classroom, ...prev]);
    setShowModal(false);
    setToast({ message: `"${classroom.name}" created`, type: "success" });
  }

  async function handleDelete(classroom: Classroom) {
    setDeletingId(classroom.id);
    setDeleteConfirm(null);
    try {
      await api.classrooms.delete(classroom.id);
      setClassrooms((prev) => prev.filter((c) => c.id !== classroom.id));
      setToast({ message: `"${classroom.name}" deleted`, type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to delete", type: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(
    () => classrooms.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [classrooms, search],
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between">
          <div className="skeleton h-8 w-36 rounded-xl" />
          <div className="skeleton h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Classrooms</h1>
          <p className="text-sm text-[#737373] mt-1">
            {classrooms.length === 0 ? "No classrooms yet — create your first one" : `${classrooms.length} classroom${classrooms.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">
          <Plus size={14} strokeWidth={2.5} /> New Classroom
        </button>
      </div>

      {loadError && (
        <div className="card p-5 flex items-center gap-2">
          <AlertCircle size={14} strokeWidth={2} className="text-[#525252] shrink-0" />
          <p className="text-sm text-[#525252]">{loadError}</p>
        </div>
      )}

      {/* Search */}
      {classrooms.length > 3 && (
        <div className="relative">
          <Search size={15} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search classrooms…" className="input pl-11 pr-10" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a3a3a3] hover:text-[#0a0a0a]">
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {classrooms.length === 0 && !loadError && (
        <div className="card p-16 text-center">
          <div className="w-14 h-14 bg-[#f5f5f5] rounded-3xl flex items-center justify-center mx-auto mb-5">
            <School size={28} strokeWidth={1.5} className="text-[#a3a3a3]" />
          </div>
          <p className="text-base font-semibold text-[#0a0a0a] mb-2">Create your first classroom</p>
          <p className="text-sm text-[#a3a3a3] max-w-xs mx-auto mb-6 leading-relaxed">
            A classroom is your monitoring space. Start a live session to watch student attention in real time.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={14} strokeWidth={2.5} /> Create Classroom
          </button>
        </div>
      )}

      {/* No search results */}
      {classrooms.length > 0 && filtered.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-sm font-medium text-[#0a0a0a]">No match for &ldquo;{search}&rdquo;</p>
          <button onClick={() => setSearch("")} className="text-xs text-[#737373] hover:text-[#0a0a0a] mt-2 underline underline-offset-2">Clear search</button>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, idx) => (
            <ClassroomCard key={c.id} classroom={c} deleting={deletingId === c.id} onDelete={() => setDeleteConfirm(c)} delay={idx * 40} />
          ))}
        </div>
      )}

      {showModal && <CreateClassroomModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}

      {deleteConfirm && (
        <DeleteDialog classroom={deleteConfirm} onConfirm={() => handleDelete(deleteConfirm)} onCancel={() => setDeleteConfirm(null)} />
      )}

      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-modal text-sm font-medium animate-slideUp",
          toast.type === "success" ? "bg-[#0a0a0a] text-white" : "bg-white border border-[#e5e5e5] text-[#0a0a0a]",
        )}>
          {toast.type === "success"
            ? <Check size={14} strokeWidth={2.5} />
            : <AlertCircle size={14} strokeWidth={2} />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-1 opacity-50 hover:opacity-100">
            <X size={12} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}

function ClassroomCard({ classroom, deleting, onDelete, delay }: { classroom: Classroom; deleting: boolean; onDelete: () => void; delay: number }) {
  const initials = classroom.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const created = new Date(classroom.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className={cn("card group flex flex-col animate-in overflow-hidden", deleting && "opacity-40 pointer-events-none")} style={{ animationDelay: `${delay}ms` }}>
      <div className="h-[4px] bg-gradient-to-r from-[#3a3a3a] via-[#0a0a0a] to-[#3a3a3a]" />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-[#0a0a0a] rounded-xl flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {initials || "?"}
            </div>
            <div className="min-w-0">
              <Link href={`/dashboard/classrooms/${classroom.id}`} className="text-sm font-semibold text-[#0a0a0a] hover:underline underline-offset-2 block truncate leading-tight">
                {classroom.name}
              </Link>
              <p className="text-[11px] text-[#a3a3a3] mt-0.5">{created}</p>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} disabled={deleting} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#d4d4d4] hover:text-status-red hover:bg-status-red-bg transition-all shrink-0">
            {deleting ? <Loader2 size={15} strokeWidth={2} className="animate-spin" /> : <Trash2 size={16} strokeWidth={2.25} />}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          <span className="badge badge-dark text-[10px] px-2 py-0.5">Alert &lt;{classroom.alert_threshold}</span>
          <span className="badge badge-light text-[10px] px-2 py-0.5">Warn &lt;{classroom.warn_threshold}</span>
          <span className="badge badge-light text-[10px] px-2 py-0.5">Yaw {classroom.yaw_threshold}°</span>
          <span className="badge badge-light text-[10px] px-2 py-0.5">Pitch {classroom.pitch_threshold}°</span>
        </div>

        <div className="mt-auto">
          <Link href={`/dashboard/classrooms/${classroom.id}`} className="flex items-center justify-between w-full px-4 py-2.5 border border-[#e8e8e8] rounded-xl text-xs font-semibold text-[#737373] hover:border-[#0a0a0a] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-all group/btn">
            Open Classroom
            <ChevronRight size={12} strokeWidth={2} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function DeleteDialog({ classroom, onConfirm, onCancel }: { classroom: Classroom; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={onCancel} />
      <div className="relative card w-full max-w-sm p-7 shadow-modal animate-slideUp">
        <div className="w-11 h-11 bg-status-red-bg border border-status-red-border rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Trash2 size={18} strokeWidth={1.75} className="text-status-red" />
        </div>
        <h3 className="text-base font-semibold text-[#0a0a0a] text-center mb-1">Delete Classroom</h3>
        <p className="text-sm text-[#737373] text-center mb-1.5">Delete <span className="font-semibold text-[#0a0a0a]">&ldquo;{classroom.name}&rdquo;</span>?</p>
        <p className="text-xs text-[#a3a3a3] text-center mb-7">All students, sessions, and signal data will be permanently deleted.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} className="btn-danger flex-1">Delete</button>
        </div>
      </div>
    </div>
  );
}
