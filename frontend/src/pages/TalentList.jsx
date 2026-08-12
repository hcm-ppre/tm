import React, { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  STATUS_OPTIONS,
  STATUS_LABELS,
  STATUS_BADGE,
  EDUCATION_LEVELS,
  GENDER_OPTIONS,
  MOVEMENT_BADGE,
} from "@/lib/constants";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Loader2, User, Briefcase, GraduationCap, History } from "lucide-react";

const fetcher = (url) => api.get(url).then((r) => r.data);

const EMPTY = {
  nrp: "", name: "", position: "", work_unit: "", pg: "", jg: "",
  gender: "", join_date: "", status: "KKWTT", education_level: "", major: "", institution: "",
};

function Field({ label, children, required }) {
  return (
    <div>
      <label className="label-caps block mb-1.5">
        {label} {required && <span className="text-accent">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 text-sm border border-border rounded-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none focus:border-primary transition-colors";

export default function TalentList() {
  const { isAdmin } = useAuth();
  const { data: employees = [], isLoading } = useSWR("/employees", fetcher);
  const { data: units = [] } = useSWR("/work-units", fetcher);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const [profileId, setProfileId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const q = search.toLowerCase();
      const matchQ =
        !q ||
        e.name?.toLowerCase().includes(q) ||
        e.nrp?.toLowerCase().includes(q) ||
        e.position?.toLowerCase().includes(q) ||
        e.work_unit?.toLowerCase().includes(q);
      const matchS = statusFilter === "all" || e.status === statusFilter;
      return matchQ && matchS;
    });
  }, [employees, search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (emp) => {
    setEditing(emp);
    setForm({ ...EMPTY, ...emp, join_date: (emp.join_date || "").slice(0, 10) });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.nrp || !form.name || !form.position || !form.work_unit || !form.join_date) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/employees/${editing.id}`, form);
        toast.success("Employee updated");
      } else {
        await api.post("/employees", form);
        toast.success("Employee added");
      }
      setFormOpen(false);
      mutate("/employees");
      mutate("/work-units");
      mutate("/dashboard/stats");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/employees/${deleteTarget.id}`);
      toast.success("Employee removed");
      setDeleteTarget(null);
      mutate("/employees");
      mutate("/work-units");
      mutate("/dashboard/stats");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  return (
    <div className="space-y-5" data-testid="talent-page">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, NRP, position..."
              data-testid="talent-search"
              className={`${inputCls} pl-9`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="talent-status-filter"
            className={`${inputCls} max-w-[160px]`}
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            data-testid="add-employee-btn"
            className="flex items-center gap-2 bg-primary hover:bg-[#0C3C66] text-white font-semibold text-sm px-4 py-2.5 rounded-sm transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-sm overflow-hidden">
        <div className="overflow-x-auto thin-scroll">
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-left">
                {["NRP", "Name", "Position", "Work Unit", "PG", "JG", "Join Date", "Tenure", "Status", "Edu", ""].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 label-caps font-bold text-slate-500 whitespace-nowrap">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-400">Loading employees...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-400">No employees found.</td></tr>
              ) : (
                filtered.map((e) => (
                  <tr
                    key={e.id}
                    data-testid={`talent-row-${e.id}`}
                    onClick={() => setProfileId(e.id)}
                    className="border-b border-border last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{e.nrp}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{e.name}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{e.position}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{e.work_unit}</td>
                    <td className="px-4 py-3 text-slate-600">{e.pg || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{e.jg || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{(e.join_date || "").slice(0, 10)}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{e.tenure?.text}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-sm border ${STATUS_BADGE[e.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{e.education_level || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(e)} data-testid={`edit-employee-${e.id}`} className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-sm transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(e)} data-testid={`delete-employee-${e.id}`} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
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
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {employees.length} employees
        </div>
      </div>

      {/* Form Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto thin-scroll">
          <SheetHeader>
            <SheetTitle className="font-heading">{editing ? "Edit Employee" : "Add Employee"}</SheetTitle>
            <SheetDescription>{editing ? "Update the employee profile details." : "Create a new talent record."}</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Field label="NRP" required><input value={form.nrp} onChange={(e) => setForm({ ...form, nrp: e.target.value })} data-testid="form-nrp" className={inputCls} /></Field>
            <Field label="Gender">
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} data-testid="form-gender" className={inputCls}>
                <option value="">—</option>
                {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Full Name" required><div className="col-span-2"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="form-name" className={inputCls} /></div></Field>
            <Field label="Position" required><input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} data-testid="form-position" className={inputCls} /></Field>
            <Field label="Work Unit" required>
              <input value={form.work_unit} onChange={(e) => setForm({ ...form, work_unit: e.target.value })} list="units-list" data-testid="form-work-unit" className={inputCls} />
              <datalist id="units-list">{units.map((u) => <option key={u.id} value={u.name} />)}</datalist>
            </Field>
            <Field label="PG"><input value={form.pg} onChange={(e) => setForm({ ...form, pg: e.target.value })} data-testid="form-pg" className={inputCls} /></Field>
            <Field label="JG"><input value={form.jg} onChange={(e) => setForm({ ...form, jg: e.target.value })} data-testid="form-jg" className={inputCls} /></Field>
            <Field label="Join Date" required><input type="date" value={form.join_date} onChange={(e) => setForm({ ...form, join_date: e.target.value })} data-testid="form-join-date" className={inputCls} /></Field>
            <Field label="Status" required>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} data-testid="form-status" className={inputCls}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Education Level">
              <select value={form.education_level} onChange={(e) => setForm({ ...form, education_level: e.target.value })} data-testid="form-education" className={inputCls}>
                <option value="">—</option>
                {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Major"><input value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} data-testid="form-major" className={inputCls} /></Field>
            <div className="col-span-2">
              <Field label="Education Institution"><input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} data-testid="form-institution" className={inputCls} /></Field>
            </div>
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={() => setFormOpen(false)} className="flex-1 border border-border text-slate-700 font-semibold text-sm py-2.5 rounded-sm hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={save} disabled={saving} data-testid="save-employee-btn" className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-[#0C3C66] text-white font-semibold text-sm py-2.5 rounded-sm transition-colors disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? "Update" : "Save"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Profile Sheet */}
      <ProfileSheet profileId={profileId} onClose={() => setProfileId(null)} />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong> and all associated movement records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} data-testid="confirm-delete-employee" className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right">{value || "-"}</span>
    </div>
  );
}

function ProfileSheet({ profileId, onClose }) {
  const { data: emp } = useSWR(profileId ? `/employees/${profileId}` : null, fetcher);
  return (
    <Sheet open={!!profileId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto thin-scroll" data-testid="profile-sheet">
        {!emp ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-primary text-white flex items-center justify-center rounded-sm font-heading font-black text-xl">
                  {emp.name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <SheetTitle className="font-heading text-xl">{emp.name}</SheetTitle>
                  <SheetDescription className="font-mono text-xs">{emp.nrp} · {emp.position}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <div>
                <p className="label-caps flex items-center gap-2 mb-2"><Briefcase className="h-3.5 w-3.5" /> Employment</p>
                <div className="bg-slate-50 border border-border rounded-sm px-4">
                  <ProfileRow label="Position" value={emp.position} />
                  <ProfileRow label="Work Unit" value={emp.work_unit} />
                  <ProfileRow label="PG / JG" value={`${emp.pg || "-"} / ${emp.jg || "-"}`} />
                  <ProfileRow label="Status" value={STATUS_LABELS[emp.status] || emp.status} />
                  <ProfileRow label="Join Date" value={(emp.join_date || "").slice(0, 10)} />
                  <ProfileRow label="Length of Service" value={emp.tenure?.text} />
                </div>
              </div>

              <div>
                <p className="label-caps flex items-center gap-2 mb-2"><User className="h-3.5 w-3.5" /> Personal</p>
                <div className="bg-slate-50 border border-border rounded-sm px-4">
                  <ProfileRow label="Gender" value={emp.gender} />
                </div>
              </div>

              <div>
                <p className="label-caps flex items-center gap-2 mb-2"><GraduationCap className="h-3.5 w-3.5" /> Education</p>
                <div className="bg-slate-50 border border-border rounded-sm px-4">
                  <ProfileRow label="Level" value={emp.education_level} />
                  <ProfileRow label="Major" value={emp.major} />
                  <ProfileRow label="Institution" value={emp.institution} />
                </div>
              </div>

              <div>
                <p className="label-caps flex items-center gap-2 mb-2"><History className="h-3.5 w-3.5" /> Movement History ({emp.movements?.length || 0})</p>
                {emp.movements?.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center bg-slate-50 border border-border rounded-sm">No movements recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {emp.movements.map((m) => (
                      <div key={m.id} className="border border-border rounded-sm p-4" data-testid={`profile-movement-${m.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-sm border ${MOVEMENT_BADGE[m.type]}`}>{m.type}</span>
                          <span className="text-xs text-slate-500 font-mono">{(m.effective_date || "").slice(0, 10)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">SPT: <span className="font-mono text-slate-700">{m.spt_number}</span></p>
                        <div className="text-sm">
                          <p className="text-slate-500">{m.old_position} · {m.old_work_unit}</p>
                          <p className="text-slate-900 font-medium">→ {m.new_position} · {m.new_work_unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
