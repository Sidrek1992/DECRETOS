
import React, { useState } from 'react';
import { PermitRecord, SolicitudType } from '../types';
import { Trash2, Edit2, Search, ArrowUpDown, ChevronUp, ChevronDown, FileDown, FilePen, Trash, UserCircle, LayoutGrid } from 'lucide-react';
import { formatNumericDate } from '../utils/formatters';
import { generateDecretoPDF } from '../services/pdfGenerator';

interface PermitTableProps {
  data: PermitRecord[];
  activeTab: SolicitudType | 'ALL';
  onDelete: (id: string) => void;
  onEdit: (record: PermitRecord) => void;
}

type SortField = 'acto' | 'funcionario' | 'solicitudType' | 'fechaInicio' | 'cantidadDias' | 'saldo';
type SortOrder = 'asc' | 'desc';

const PermitTable: React.FC<PermitTableProps> = ({ data, activeTab, onDelete, onEdit }) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filtered = data.filter(r => {
    const term = search.toLowerCase();
    const matchesSearch = 
      r.funcionario.toLowerCase().includes(term) || 
      r.acto.toLowerCase().includes(term) ||
      r.rut.includes(term);
    const matchesTab = activeTab === 'ALL' || r.solicitudType === activeTab;
    return matchesSearch && matchesTab;
  }).sort((a, b) => {
    if (!sortField) return b.createdAt - a.createdAt;

    let valA: any;
    let valB: any;

    switch (sortField) {
      case 'acto': valA = a.acto; valB = b.acto; break;
      case 'funcionario': valA = a.funcionario.toLowerCase(); valB = b.funcionario.toLowerCase(); break;
      case 'solicitudType': valA = a.solicitudType; valB = b.solicitudType; break;
      case 'fechaInicio': valA = new Date(a.fechaInicio).getTime(); valB = new Date(b.fechaInicio).getTime(); break;
      case 'cantidadDias': valA = a.cantidadDias; valB = b.cantidadDias; break;
      case 'saldo': valA = a.diasHaber - a.cantidadDias; valB = b.diasHaber - b.cantidadDias; break;
      default: return 0;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={10} className="opacity-20 ml-auto group-hover:opacity-100 transition-opacity" />;
    return sortOrder === 'asc' 
      ? <ChevronUp size={12} className="ml-auto text-indigo-500" /> 
      : <ChevronDown size={12} className="ml-auto text-indigo-500" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Search Bar Premium */}
      <div className="relative max-w-2xl">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <Search size={18} />
        </div>
        <input 
          placeholder="Buscar decreto, funcionario o RUT..."
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-lg outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all font-bold text-[11px] uppercase tracking-widest text-slate-700 placeholder:text-slate-300"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table Container - Ajustado para no tener scroll horizontal */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto lg:overflow-visible custom-scrollbar">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th 
                  onClick={() => handleSort('acto')}
                  className="pl-8 pr-3 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer hover:bg-white transition-colors group select-none"
                >
                  <div className="flex items-center gap-2">Decreto <SortIcon field="acto" /></div>
                </th>
                <th 
                  onClick={() => handleSort('funcionario')}
                  className="px-3 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer hover:bg-white transition-colors group select-none"
                >
                  <div className="flex items-center gap-2">Funcionario <SortIcon field="funcionario" /></div>
                </th>
                <th 
                  onClick={() => handleSort('solicitudType')}
                  className="px-3 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer hover:bg-white transition-colors group select-none hidden sm:table-cell"
                >
                  <div className="flex items-center gap-2">Tipo <SortIcon field="solicitudType" /></div>
                </th>
                <th 
                  onClick={() => handleSort('cantidadDias')}
                  className="px-3 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer hover:bg-white transition-colors group select-none"
                >
                  <div className="flex items-center gap-2">Días <SortIcon field="cantidadDias" /></div>
                </th>
                <th 
                  onClick={() => handleSort('saldo')}
                  className="px-3 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer hover:bg-white transition-colors group select-none"
                >
                  <div className="flex items-center gap-2">Saldo <SortIcon field="saldo" /></div>
                </th>
                <th 
                  onClick={() => handleSort('fechaInicio')}
                  className="px-3 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer hover:bg-white transition-colors group select-none hidden md:table-cell"
                >
                  <div className="flex items-center gap-2">Inicio <SortIcon field="fechaInicio" /></div>
                </th>
                <th className="pl-3 pr-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(record => (
                <tr key={record.id} className="hover:bg-indigo-50/20 transition-all group/row">
                  <td className="pl-8 pr-3 py-5">
                    <div className="flex flex-col">
                       <span className="font-black text-indigo-600 text-[13px] tracking-tight">{record.acto}</span>
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate max-w-[80px]">{record.materia}</span>
                    </div>
                  </td>
                  <td className="px-3 py-5">
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex w-9 h-9 rounded-xl bg-slate-100 items-center justify-center text-slate-300 group-hover/row:bg-white group-hover/row:shadow-sm transition-all">
                        <UserCircle size={22} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate max-w-[150px] lg:max-w-xs">{record.funcionario}</p>
                        <p className="text-[9px] font-bold text-slate-400 font-mono tracking-tighter">{record.rut}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-5 hidden sm:table-cell">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${record.solicitudType === 'PA' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-sky-50 text-sky-700 border-sky-100'}`}>
                      {record.solicitudType}
                    </span>
                  </td>
                  <td className="px-3 py-5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-700 text-[12px]">{record.cantidadDias}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter hidden lg:inline">DÍAS</span>
                    </div>
                  </td>
                  <td className="px-3 py-5">
                    <span className={`font-black text-[12px] ${(record.diasHaber - record.cantidadDias) < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {(record.diasHaber - record.cantidadDias).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-3 py-5 hidden md:table-cell">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight truncate whitespace-nowrap">{formatNumericDate(record.fechaInicio)}</span>
                  </td>
                  <td className="pl-3 pr-8 py-5 text-right">
                    <div className="flex gap-1.5 justify-end">
                      <button 
                        onClick={() => generateDecretoPDF(record, true)} 
                        className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90" 
                        title="Ver PDF"
                      >
                        <FileDown size={14} />
                      </button>
                      <button 
                        onClick={() => generateDecretoPDF(record, false)} 
                        className="hidden sm:flex p-2.5 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-600 hover:text-white transition-all shadow-sm active:scale-90" 
                        title="Abrir en Drive"
                      >
                        <FilePen size={14} />
                      </button>
                      <button 
                        onClick={() => onEdit(record)} 
                        className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm active:scale-90" 
                        title="Modificar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => onDelete(record.id)} 
                        className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90" 
                        title="Eliminar"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-10 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <LayoutGrid size={40} />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sin registros que mostrar</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Desliza para ver más detalles en dispositivos móviles</p>
    </div>
  );
};

export default PermitTable;
