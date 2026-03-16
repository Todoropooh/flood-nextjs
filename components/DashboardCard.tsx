'use client';

interface Props {
  title: string;
  value: string | number;
  unit?: string;
  trend?: string; // เช่น "+12%" หรือ "-5%"
  icon?: React.ReactNode;
  color?: string; // สีของตัวเลข
}

export default function DashboardCard({ title, value, unit, trend, icon, color = "text-slate-800" }: Props) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wide">{title}</h3>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-bold ${color}`}>{value}</span>
        {unit && <span className="text-slate-400 text-sm font-medium">{unit}</span>}
      </div>
      {trend && (
        <div className={`mt-2 text-xs font-medium ${trend.includes('+') ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend} vs last hour
        </div>
      )}
    </div>
  );
}