
import React, { useState, useEffect, useRef } from 'react';
import { PermitFormData, PermitRecord, Employee } from '../types';
import { JORNADA_OPTIONS, SOLICITUD_TYPES } from '../constants';
import { PlusCircle, Save, X, FileUp, Loader2, Sparkles, User, Fingerprint, Calendar, Info, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatRut, toProperCase } from '../utils/formatters';
import { extractDataFromPdf } from '../utils/aiProcessor';

interface PermitFormProps {
  onSubmit: (data: PermitFormData) => void;
  editingRecord: PermitRecord | null;
  onCancelEdit: () => void;
  nextCorrelative: string;
  employees: Employee[];
  records: PermitRecord[];
}

const PermitForm: React.FC<PermitFormProps> = ({ onSubmit, editingRecord, onCancelEdit, nextCorrelative, employees, records }) => {
  const initialState: PermitFormData = {
    solicitudType: 'PA',
    decreto: '',
    materia: 'Decreto Exento',
    acto: nextCorrelative,
    funcionario: '',
    rut: '',
    periodo: new Date().getFullYear().toString(),
    cantidadDias: 1,
    fechaInicio: '',
    tipoJornada: '(Jornada completa)',
    diasHaber: 6,
    fechaDecreto: new Date().toISOString().split('T')[0],
    ra: 'MGA',
    emite: 'mga',
    observaciones: ''
  };

  const [formData, setFormData] = useState<PermitFormData>(initialState);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [detectedSaldo, setDetectedSaldo] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingRecord) {
      const { id, createdAt, ...rest } = editingRecord;
      setFormData(rest);
    } else {
      setFormData(prev => ({ ...prev, acto: nextCorrelative }));
    }
  }, [editingRecord, nextCorrelative]);

  useEffect(() => {
    if (!editingRecord && formData.rut) {
      const empRecords = records
        .filter(r => r.rut === formData.rut && r.solicitudType === formData.solicitudType)
        .sort((a, b) => b.createdAt - a.createdAt);

      if (empRecords.length > 0) {
        const saldo = empRecords[0].diasHaber - empRecords[0].cantidadDias;
        setFormData(prev => ({ ...prev, diasHaber: saldo }));
        setDetectedSaldo(saldo);
      } else {
        const base = formData.solicitudType === 'FL' ? 15 : 6;
        setFormData(prev => ({ ...prev, diasHaber: base }));
        setDetectedSaldo(null);
      }
    }
  }, [formData.solicitudType, formData.rut, records]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: (name === 'cantidadDias' || name === 'diasHaber') ? Number(value) : value 
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setFormError(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const base64 = (ev.target?.result as string).split(',')[1];
        const data = await extractDataFromPdf(base64);
        
        if (Object.keys(data).length === 0) throw new Error("No se pudo extraer información del PDF.");

        setFormData(prev => ({ 
          ...prev, 
          ...data, 
          funcionario: toProperCase(data.funcionario || ""), 
          rut: formatRut(data.rut || "") 
        }));
      } catch (err) {
        setFormError("Error al procesar PDF con IA. Por favor, ingresa los datos manualmente.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const selectEmployee = (emp: Employee) => {
    setFormData(prev => ({ ...prev, funcionario: toProperCase(emp.nombre), rut: formatRut(emp.rut) }));
    setShowSuggestions(false);
  };

  const filteredEmployees = employees.filter(e => 
    e.nombre.toLowerCase().includes(formData.funcionario.toLowerCase()) ||
    e.rut.includes(formData.funcionario)
  );

  const saldoFinal = (formData.diasHaber - formData.cantidadDias).toFixed(1);
  const isNegative = parseFloat(saldoFinal) < 0;

  return (
    <div className="relative group">
      {/* Decorative background elements */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-sky-500 rounded-[2.5rem] blur opacity-5 group-hover:opacity-10 transition duration-1000 group-hover:duration-200"></div>
      
      <form 
        onSubmit={(e) => { 
          e.preventDefault(); 
          if (!formData.funcionario || !formData.rut || !formData.fechaInicio) {
            setFormError("Por favor, completa los campos requeridos.");
            return;
          }
          onSubmit(formData); 
          if(!editingRecord) setFormData({...initialState, acto: nextCorrelative});
          setFormError(null);
        }}
        className={`relative bg-white rounded-[2.5rem] shadow-xl border overflow-hidden transition-all duration-500 ${editingRecord ? 'border-amber-400' : 'border-slate-200'}`}
      >
        {/* Header section */}
        <div className={`p-8 flex justify-between items-center text-white relative overflow-hidden ${editingRecord ? 'bg-amber-500' : 'bg-slate-900'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 pointer-events-none">
            {formData.solicitudType === 'PA' ? <Calendar size={120} /> : <Sparkles size={120} />}
          </div>
          
          <div className="flex items-center gap-5 z-10">
            <div className={`p-3 rounded-2xl backdrop-blur-md shadow-lg ${isProcessing ? 'bg-white/10 animate-spin' : 'bg-white/20'}`}>
              {isProcessing ? <Loader2 /> : editingRecord ? <Save /> : <PlusCircle />}
            </div>
            <div>
              <h2 className="text-xl font-extrabold uppercase tracking-tight">
                {editingRecord ? 'Editando Resolución' : 'Generar Acto Administrativo'}
              </h2>
              <p className="text-[10px] font-bold uppercase opacity-60 tracking-[0.2em] mt-1 flex items-center gap-1.5">
                {isProcessing ? (
                  <>Analizando con Gemini 3 Flash...</>
                ) : (
                  <>{formData.solicitudType === 'PA' ? 'Permiso Administrativo' : 'Feriado Legal'} • Registro Digital v2</>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 z-10">
            {!editingRecord && (
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-[10px] font-black flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                <FileUp className="w-4 h-4 text-indigo-600" /> ESCANEAR SOLICITUD
              </button>
            )}
            {editingRecord && (
              <button type="button" onClick={onCancelEdit} className="p-2.5 hover:bg-white/20 rounded-xl transition-all border border-white/20">
                <X />
              </button>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} hidden accept="application/pdf" />
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 md:p-10 space-y-10">
          {formError && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <AlertCircle className="text-red-500" />
              <p className="text-xs font-bold text-red-700 uppercase tracking-tight">{formError}</p>
            </div>
          )}

          {/* Type Selector */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
              {SOLICITUD_TYPES.map(t => (
                <button 
                  key={t.value} 
                  type="button"
                  onClick={() => setFormData(p => ({...p, solicitudType: t.value}))}
                  className={`px-8 py-2.5 rounded-xl text-[11px] font-black transition-all duration-300 ${formData.solicitudType === t.value ? 'bg-white text-indigo-700 shadow-md scale-[1.05] ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <select 
              name="materia" 
              value={formData.materia} 
              onChange={handleChange}
              className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl font-black text-slate-700 text-[11px] uppercase outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all cursor-pointer"
            >
              <option value="Decreto Exento">Decreto Exento</option>
              <option value="Resolución Exenta">Resolución Exenta</option>
              <option value="Decreto">Decreto</option>
              <option value="Resolución">Resolución</option>
            </select>
          </div>

          {/* Personal Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8 relative" ref={dropdownRef}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2 block">Nombre del Funcionario</label>
              <div className="relative group/input">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/input:text-indigo-500 transition-colors" />
                <input 
                  name="funcionario" 
                  value={formData.funcionario} 
                  onChange={(e) => { handleChange(e); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  autoComplete="off"
                  placeholder="NOMBRE O RUT PARA BUSCAR..."
                  className="w-full pl-14 pr-14 py-4.5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 uppercase focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
                />
                <button 
                  type="button"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${showSuggestions ? 'rotate-180' : ''}`} />
                </button>

                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-2">
                      {filteredEmployees.length > 0 ? (
                        filteredEmployees.map(emp => (
                          <div 
                            key={emp.rut} 
                            onClick={() => selectEmployee(emp)}
                            className="group/item flex items-center justify-between px-4 py-3.5 hover:bg-indigo-50 rounded-xl cursor-pointer transition-all"
                          >
                            <div>
                               <p className="text-xs font-black text-slate-800 group-hover/item:text-indigo-700">{emp.nombre}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">RUT: {emp.rut}</p>
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-indigo-500 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                          </div>
                        ))
                      ) : (
                        <div className="px-6 py-10 text-center space-y-2">
                          <User className="w-8 h-8 text-slate-200 mx-auto" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin coincidencias registradas</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2 block">Identificación RUT</label>
              <div className="relative">
                <Fingerprint className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input readOnly value={formData.rut || '00.000.000-0'} className="w-full pl-14 pr-6 py-4.5 bg-slate-100 border border-slate-200 rounded-2xl font-mono font-bold text-slate-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Numeric and Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-indigo-50/40 p-5 rounded-3xl border border-indigo-100/50 relative overflow-hidden group">
              <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block mb-3">N° Acto Adm.</label>
              <input name="acto" value={formData.acto} onChange={handleChange} className="w-full bg-white border border-indigo-200 px-4 py-3 rounded-xl font-black text-indigo-900 outline-none focus:border-indigo-500 transition-all text-center" />
              <Calendar className="absolute -right-4 -bottom-4 w-16 h-16 text-indigo-600 opacity-[0.03] group-hover:scale-110 transition-transform" />
            </div>
            
            <div className="bg-emerald-50/40 p-5 rounded-3xl border border-emerald-100/50 relative">
              <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block mb-3">Saldo Anterior</label>
              <input type="number" step="0.5" name="diasHaber" value={formData.diasHaber} onChange={handleChange} className="w-full bg-white border border-emerald-200 px-4 py-3 rounded-xl font-black text-emerald-900 outline-none focus:border-emerald-500 transition-all text-center" />
              {detectedSaldo !== null && <span className="absolute -top-3 right-4 bg-emerald-600 text-white text-[8px] font-black px-3 py-1 rounded-full shadow-lg animate-bounce">SINCRONIZADO</span>}
            </div>

            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Días Solicitados</label>
              <input type="number" step="0.5" name="cantidadDias" value={formData.cantidadDias} onChange={handleChange} className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl font-black text-slate-900 outline-none focus:border-indigo-500 transition-all text-center" />
            </div>

            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Fecha de Inicio</label>
              <input type="date" name="fechaInicio" value={formData.fechaInicio} onChange={handleChange} className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" />
            </div>
          </div>

          {/* Footer & Actions */}
          <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-slate-100 gap-6">
            <div className="flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200">
              <div className={`p-2 rounded-lg ${isNegative ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                <Info className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance Final Proyectado</p>
                <p className={`text-sm font-black uppercase tracking-tight ${isNegative ? 'text-red-600' : 'text-slate-900'}`}>
                  {saldoFinal} días <span className="text-[10px] opacity-60 ml-1">Restantes</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
               <button 
                type="submit" 
                className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-12 py-5 ${editingRecord ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'} text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-[11px] tracking-[0.2em]`}
              >
                {editingRecord ? <Save className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                {editingRecord ? 'Actualizar Decreto' : 'Emitir Resolución'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PermitForm;
