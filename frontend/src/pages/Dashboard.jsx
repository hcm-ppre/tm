import React from "react";
import useSWR from "swr";
import api from "@/lib/api";
import { CHART_COLORS, STATUS_LABELS } from "@/lib/constants";
import { Users, ArrowLeftRight, Building2, Clock, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

const fetcher = (url) => api.get(url).then((r) => r.data);

function StatCard({ icon: Icon, label, value, sub, testid }) {
  return (
    <div className="bg-white border border-border rounded-sm p-5" data-testid={testid}>
      <div className="flex items-start justify-between">
        <div>
          <p className="label-caps">{label}</p>
          <p className="font-heading font-black text-3xl tracking-tight text-slate-900 mt-2">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className="h-10 w-10 bg-primary/5 border border-primary/10 flex items-center justify-center rounded-sm">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <div className={`bg-white border border-border rounded-sm ${className}`}>
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-heading font-semibold text-base tracking-tight text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const axisStyle = { fontSize: 11, fontFamily: "Karla" };

export default function Dashboard() {
  const { data, isLoading } = useSWR("/dashboard/stats", fetcher, { refreshInterval: 0 });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-white border border-border rounded-sm animate-pulse" />
        ))}
      </div>
    );
  }

  const empty = data.total_employees === 0;

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Total Employees" value={data.total_employees} sub="Active headcount" testid="stat-employees" />
        <StatCard icon={ArrowLeftRight} label="Total Movements" value={data.total_movements} sub="Recorded transfers" testid="stat-movements" />
        <StatCard icon={Building2} label="Work Units" value={data.total_units} sub="Organizational units" testid="stat-units" />
        <StatCard icon={Clock} label="Avg. Tenure" value={`${data.avg_tenure_years} yr`} sub="Average length of service" testid="stat-tenure" />
      </div>

      {empty ? (
        <div className="bg-white border border-border rounded-sm p-16 text-center">
          <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-4" />
          <h3 className="font-heading font-bold text-lg text-slate-900">No data yet</h3>
          <p className="text-sm text-slate-500 mt-1">Add employees in the Talent List to populate demographics.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Panel title="Headcount by Work Unit" subtitle="Employee distribution across units" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.by_unit} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" style={axisStyle} stroke="#94A3B8" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={140} style={axisStyle} stroke="#64748B" />
                  <Tooltip cursor={{ fill: "#F1F5F9" }} />
                  <Bar dataKey="value" name="Employees" fill="#0F4C81" radius={[0, 2, 2, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Employment Status" subtitle="Contract type breakdown">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.by_status}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={2}
                  >
                    {data.by_status.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Education Level" subtitle="Workforce qualifications">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.by_education} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" style={axisStyle} stroke="#64748B" />
                  <YAxis style={axisStyle} stroke="#94A3B8" allowDecimals={false} />
                  <Tooltip cursor={{ fill: "#F1F5F9" }} />
                  <Bar dataKey="value" name="Employees" fill="#FF5A00" radius={[2, 2, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Length of Service" subtitle="Tenure distribution bands">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.tenure_bands} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" style={axisStyle} stroke="#64748B" />
                  <YAxis style={axisStyle} stroke="#94A3B8" allowDecimals={false} />
                  <Tooltip cursor={{ fill: "#F1F5F9" }} />
                  <Bar dataKey="value" name="Employees" fill="#0EA5E9" radius={[2, 2, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Panel title="Movement Trend" subtitle="Monthly promotions, mutations & demotions" className="lg:col-span-2">
              {data.movement_trend.length === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-center">
                  <TrendingUp className="h-8 w-8 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">No movements recorded yet.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.movement_trend} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" style={axisStyle} stroke="#64748B" />
                    <YAxis style={axisStyle} stroke="#94A3B8" allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Promotion" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Mutation" stroke="#0F4C81" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Demotion" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="Movement by Type" subtitle="Total distribution">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.movement_by_type} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90}>
                    {data.movement_by_type.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.name === "Promotion" ? "#10B981" : entry.name === "Mutation" ? "#0F4C81" : "#EF4444"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
