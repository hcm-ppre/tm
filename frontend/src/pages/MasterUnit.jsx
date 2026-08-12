import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Building2, Users } from "lucide-react";

const fetcher = (url) => api.get(url).then((r) => r.data);
const EMPTY = { name: "", code: "", description: "" };
const inputCls =
  "w-full px-3 py-2 text-sm border border-border rounded-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none focus:border-primary transition-colors";

export default function MasterUnit() {
  const { isAdmin } = useAuth();
  const { data: units = [], isLoading } = useSWR("/work-units", fetcher);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const totalEmployees = units.reduce((s, u) => s + (u.employee_count || 0), 0);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (u) => { setEditing(u); setForm({ name: u.name, code: u.code || "", description: u.description || "" }); setOpen(true); };

  const save = async () => {
    if (!form.name) { toast.error("Unit name is required"); return; }
    setSaving(true);
    try {
      if (editing) { await api.put(`/work-units/${editing.id}`, form); toast.success("Work unit updated"); }
      else { await api.post("/work-units", form); toast.success("Work unit created"); }
      setOpen(false);
      mutate("/work-units"); mutate("/employees"); mutate("/dashboard/stats");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/work-units/${deleteTarget.id}`);
      toast.success("Work unit deleted");
      setDeleteTarget(null);
      mutate("/work-units"); mutate("/dashboard/stats");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-5" data-testid="units-page">
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-sm p-5" data-testid="stat-total-units">
          <p className="label-caps">Total Work Units</p>
          <p className="font-heading font-black text-3xl tracking-tight text-slate-900 mt-2">{units.length}</p>
        </div>
        <div className="bg-white border border-border rounded-sm p-5" data-testid="stat-total-headcount">
          <p className="label-caps">Total Assigned</p>
          <p className="font-heading font-black text-3xl tracking-tight text-slate-900 mt-2">{totalEmployees}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">Recap of employee headcount per organizational unit.</p>
        {isAdmin && (
          <button onClick={openCreate} data-testid="add-unit-btn" className="flex items-center gap-2 bg-primary hover:bg-[#0C3C66] text-white font-semibold text-sm px-4 py-2.5 rounded-sm transition-colors">
            <Plus className="h-4 w-4" /> Add Work Unit
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading units...</div>
      ) : units.length === 0 ? (
        <div className="bg-white border border-border rounded-sm p-16 text-center">
          <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">No work units yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {units.map((u) => (
            <div key={u.id} data-testid={`unit-card-${u.id}`} className="bg-white border border-border rounded-sm p-5 hover:border-primary/40 transition-colors group">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 bg-primary/5 border border-primary/10 flex items-center justify-center rounded-sm">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                {isAdmin && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(u)} data-testid={`edit-unit-${u.id}`} className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-sm transition-colors"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteTarget(u)} data-testid={`delete-unit-${u.id}`} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
              <h3 className="font-heading font-bold text-base tracking-tight text-slate-900 mt-4">{u.name}</h3>
              {u.code && <p className="font-mono text-xs text-slate-500 mt-0.5">{u.code}</p>}
              {u.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{u.description}</p>}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <Users className="h-4 w-4 text-accent" />
                <span className="font-heading font-black text-xl text-slate-900">{u.employee_count}</span>
                <span className="text-xs text-slate-500">employees</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Edit Work Unit" : "Add Work Unit"}</DialogTitle>
            <DialogDescription>{editing ? "Renaming will update all assigned employees." : "Create a new organizational unit."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="label-caps block mb-1.5">Unit Name <span className="text-accent">*</span></label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="unit-name" className={inputCls} />
            </div>
            <div>
              <label className="label-caps block mb-1.5">Unit Code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} data-testid="unit-code" className={inputCls} />
            </div>
            <div>
              <label className="label-caps block mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="unit-description" rows={3} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setOpen(false)} className="flex-1 border border-border text-slate-700 font-semibold text-sm py-2.5 rounded-sm hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={save} disabled={saving} data-testid="save-unit-btn" className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-[#0C3C66] text-white font-semibold text-sm py-2.5 rounded-sm transition-colors disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? "Update" : "Create"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete work unit?</AlertDialogTitle>
            <AlertDialogDescription>This will remove <strong>{deleteTarget?.name}</strong>. Units with assigned employees cannot be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} data-testid="confirm-delete-unit" className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
