
import React from 'react';
import { PermitRecord } from '../types';
import { FileText, Users, Landmark, Sun, Activity } from 'lucide-react';

interface StatsCardsProps {
  records: PermitRecord[];
  totalDatabaseEmployees: number;
}

const StatsCards: React.FC<StatsCardsProps> = ({ records, totalDatabaseEmployees }) => {
  const paRecords = records.filter(r => r.solicitudType === 'PA');
  const flRecords = records.filter(r => r.solicitudType === 'FL');
  
  const totalPADays = paRecords.reduce((acc, curr) => acc + curr.cantidadDias, 0);
  const totalFLDays = flRecords.reduce((acc, curr) => acc + curr.cantidadDias, 0);
  const employeesWithRecords = new Set(records.map(r => r.rut)).size;

  const stats = [
    { label: 'Decretos PA', value: paRecords.length, icon: Landmark, color: 'text-blue-700', bg: 'bg-blue-50', sub: `${totalPADays} días` },
    { label: 'Feriados FL', value: flRecords.length, icon: Sun, color: 'text-teal-700', bg: 'bg-teal-50', sub: `${totalFLDays} días` },
    { label: 'Base Personal', value: totalDatabaseEmployees, icon: Users, color: 'text-slate-700', bg: 'bg-slate-100', sub: `${employeesWithRecords} con movimientos` },
    { label: 'Total Actos', value: records.length, icon: Activity, color: 'text-[#1e40af]', bg: 'bg-blue-50', sub: 'PA + FL' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md group">
          <div className={`${stat.bg} ${stat.color} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
            <stat.icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
            <p className="text-2xl font-black text-slate-800 leading-tight">{stat.value}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">{stat.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
