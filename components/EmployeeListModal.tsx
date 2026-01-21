
import React, { useState } from 'react';
import { Employee } from '../types';
import { X, Search, UserCircle, Users, Fingerprint, Info } from 'lucide-react';

interface EmployeeListModalProps {
  employees: Employee[];
  isOpen: boolean;
  onClose: () => void;
}

const EmployeeListModal: React.FC<EmployeeListModalProps> = ({ employees, isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = employees.filter(e => 
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.rut.includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-8 bg-slate-900 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={24} />
          </button>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Base de Personal</h2>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em]">Total Registrado: {employees.length} Funcionarios</p>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              autoFocus
              placeholder="BUSCAR POR NOMBRE O RUT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 pl-12 pr-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50">
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((emp, idx) => (
              <div 
                key={emp.rut} 
                className="group bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                    <UserCircle size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{emp.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Fingerprint size={12} className="text-slate-400" />
                      <p className="text-[10px] font-bold text-slate-400 font-mono">{emp.rut}</p>
                    </div>
                  </div>
                </div>
                <div className="px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                  #{idx + 1}
                </div>
              </div>
            ))}
            
            {filtered.length === 0 && (
              <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                <Info size={48} />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">No se encontraron resultados</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 text-center">
           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Base de Datos Institucional SGP v2.0</p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeListModal;
