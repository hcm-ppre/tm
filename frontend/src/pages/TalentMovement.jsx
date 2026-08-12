import React, { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MOVEMENT_TYPES, MOVEMENT_BADGE } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Trash2, Pencil, Loader2, ArrowLeftRight, ArrowRight } from "lucide-react";

const fetcher = (url) => api.get(url).then((r) => r.data);

const EMPTY = {
  employee_id: "", type: "Promotion", spt_number: "", effective_date: "",
  new_position: "", new_work_unit: "", notes: "", apply_to_employee: true,
};

const inputCls =
  "w-full px-3 py-2 text-sm border border-border rounded-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none focus:border-primary transition-colors";

function Field({ label, children, required }) {
  return (
    <div>
      <label className="label-caps block mb-1.5">{label} {required && <span className="text-accent">*</span>}</label>
      {children}
    </div>
  );
}

export default function TalentMovement() {
  const { isAdmin } = useAuth();
  const { data: movements = [], isLoading } = useSWR("/movements", fetcher);
  const { data: employees = [] } = useSWR("/employees", fetcher);
  const { data: units = [] } = useSWR("/work-units", fetcher);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const selectedEmp = employees.find((e) => e.id === form.employee_id);

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      const q = search.toLowerCase();
      const matchQ = !q || m.employee_name?.toLowerCase().includes(q) || m.employee_nrp?.toLowerCase().includes(q) || m.spt_number?.toLowerCase().includes(q);
      const matchT = typeFilter === "all" || m.type === typeFilter;
      return matchQ && matchT;
    });
  }, [movements, search, typeFilter]);

  const counts = useMemo(() => {
    const c = { Promotion: 0, Mutation: 0, Demotion: 0 };
    movements.forEach((m) => { if (c[m.type] !== undefined) c[m.type]++; });
    return c;
  }, [movements]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (m) => {
    setEditing(m);
    setForm({ ...EMPTY, ...m, effective_date: (m.effective_date || "").slice(0, 10), apply_to_employee: false });
    setOpen(true);
  };

  const save = async () => {
    if (!form.employee_id || !form.spt_number || !form.effective_date || !form.new_position || !form.new_work_unit) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/movements/${editing.id}`, form);
        toast.success("Movement updated");
      } else {
        await api.post("/movements", form);
        toast.success("Movement recorded");
      }
      setOpen(false);
      mutate("/movements"); mutate("/employees"); mutate("/work-units"); mutate("/dashboard/stats");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/movements/${deleteTarget.id}`);
      toast.success("Movement deleted");
      setDeleteTarget(null);
      mutate("/movements"); mutate("/dashboard/stats");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-5" data-testid="movement-page">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-6">
        {MOVEMENT_TYPES.map((t) => (
          <div key={t} className="bg-white border border-border rounded-sm p-5" data-testid={`movement-count-${t}`}>
            <p className="label-caps">{t}s</p>
            <p className="font-heading font-black text-3xl tracking-tight text-slate-900 mt-2">{counts[t]}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, SPT..." data-testid="movement-search" className={`${inputCls} pl-9`} />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} data-testid="movement-type-filter" className={`${inputCls} max-w-[160px]`}>
            <option value="all">All Types</option>
            {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {isAdmin && (
          <button onClick={openCreate} data-testid="add-movement-btn" className="flex items-center gap-2 bg-primary hover:bg-[#0C3C66] text-white font-semibold text-sm px-4 py-2.5 rounded-sm transition-colors whitespace-nowrap">
            <Plus className="h-4 w-4" /> Record Movement
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-sm overflow-hidden">
        <div className="overflow-x-auto thin-scroll">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-left">
                {["Employee", "Type", "SPT Number", "Effective Date", "From", "To", ""].map((h) => (
                  <th key={h} className="px-4 py-3 label-caps font-bold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <ArrowLeftRight className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No movements recorded yet.</p>
                </td></tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} data-testid={`movement-row-${m.id}`} className="border-b border-border last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-semibold text-slate-900">{m.employee_name}</p>
                      <p className="font-mono text-xs text-slate-500">{m.employee_nrp}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-sm border ${MOVEMENT_BADGE[m.type]}`}>{m.type}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{m.spt_number}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{(m.effective_date || "").slice(0, 10)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{m.old_position}<br />{m.old_work_unit}</td>
                    <td className="px-4 py-3 text-slate-900 text-xs font-medium whitespace-nowrap">{m.new_position}<br />{m.new_work_unit}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(m)} data-testid={`edit-movement-${m.id}`} className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-sm transition-colors"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteTarget(m)} data-testid={`delete-movement-${m.id}`} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {movements.length} movements
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Edit Movement" : "Record Movement"}</DialogTitle>
            <DialogDescription>{editing ? "Update movement details." : "Log a promotion, mutation or demotion."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Field label="Employee" required>
              <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} disabled={!!editing} data-testid="movement-employee" className={`${inputCls} disabled:bg-slate-100`}>
                <option value="">Select employee...</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.nrp}</option>)}
              </select>
            </Field>

            {selectedEmp && !editing && (
              <div className="bg-slate-50 border border-border rounded-sm p-3 text-xs">
                <p className="text-slate-500">Current position</p>
                <p className="font-medium text-slate-900 flex items-center gap-2 flex-wrap">
                  {selectedEmp.position} · {selectedEmp.work_unit}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Movement Type" required>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} data-testid="movement-type" className={inputCls}>
                  {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="SPT Number" required>
                <input value={form.spt_number} onChange={(e) => setForm({ ...form, spt_number: e.target.value })} data-testid="movement-spt" placeholder="SPT/000/2026" className={inputCls} />
              </Field>
            </div>

            <Field label="Effective Date" required>
              <input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} data-testid="movement-date" className={inputCls} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="New Position" required>
                <input value={form.new_position} onChange={(e) => setForm({ ...form, new_position: e.target.value })} data-testid="movement-new-position" className={inputCls} />
              </Field>
              <Field label="New Work Unit" required>
                <input value={form.new_work_unit} onChange={(e) => setForm({ ...form, new_work_unit: e.target.value })} list="mv-units-list" data-testid="movement-new-unit" className={inputCls} />
                <datalist id="mv-units-list">{units.map((u) => <option key={u.id} value={u.name} />)}</datalist>
              </Field>
            </div>

            <Field label="Notes">
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="movement-notes" rows={2} className={inputCls} />
            </Field>

            {!editing && (
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={form.apply_to_employee} onChange={(e) => setForm({ ...form, apply_to_employee: e.target.checked })} data-testid="movement-apply" className="rounded-sm accent-[#0F4C81]" />
                Update employee's current position &amp; work unit
              </label>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setOpen(false)} className="flex-1 border border-border text-slate-700 font-semibold text-sm py-2.5 rounded-sm hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={save} disabled={saving} data-testid="save-movement-btn" className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-[#0C3C66] text-white font-semibold text-sm py-2.5 rounded-sm transition-colors disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? "Update" : "Record"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete movement?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the {deleteTarget?.type} record for {deleteTarget?.employee_name}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} data-testid="confirm-delete-movement" className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
