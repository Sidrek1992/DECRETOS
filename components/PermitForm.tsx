
import React, { useState, useEffect, useRef } from 'react';
import { PermitFormData, PermitRecord, Employee } from '../types';
import { JORNADA_OPTIONS, SOLICITUD_TYPES } from '../constants';
import { validateRut, validateDate, CONFIG } from '../config';
import {
  PlusCircle, Save, X, FileUp, Loader2, Sparkles, User, Fingerprint,
  Calendar, Info, ChevronDown, CheckCircle2, AlertCircle, AlertTriangle
} from 'lucide-react';
import { formatRut, toProperCase } from '../utils/formatters';
import { extractDataFromPdf } from '../utils/aiProcessor';

// Función para verificar si una fecha es fin de semana
const isWeekend = (dateString: string): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString + 'T12:00:00');
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
};

// Obtener nombre del día
const getDayName = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T12:00:00');
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[date.getDay()];
};

interface PermitFormProps {
  onSubmit: (data: PermitFormData) => void;
  editingRecord: PermitRecord | null;
  onCancelEdit: () => void;
  nextCorrelative: string;
  employees: Employee[];
  records: PermitRecord[];
}

interface FormErrors {
  funcionario?: string;
  rut?: string;
  fechaInicio?: string;
  cantidadDias?: string;
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
    diasHaber: CONFIG.BASE_DAYS.PA,
    fechaDecreto: new Date().toISOString().split('T')[0],
    ra: 'MGA',
    emite: 'mga',
    observaciones: ''
  };

  const [formData, setFormData] = useState<PermitFormData>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
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
      setErrors({});
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
        const base = CONFIG.BASE_DAYS[formData.solicitudType];
        setFormData(prev => ({ ...prev, diasHaber: base }));
        setDetectedSaldo(null);
      }
    }
  }, [formData.solicitudType, formData.rut, records, editingRecord]);

  // Validación en tiempo real
  const validateField = (name: string, value: string | number): string | undefined => {
    switch (name) {
      case 'rut':
        if (value && !validateRut(String(value))) {
          return 'RUT inválido';
        }
        break;
      case 'fechaInicio':
        if (value && !validateDate(String(value))) {
          return 'Fecha fuera de rango válido';
        }
        break;
      case 'cantidadDias':
        if (Number(value) <= 0) {
          return 'Debe ser mayor a 0';
        }
        if (Number(value) > 30) {
          return 'Máximo 30 días';
        }
        break;
    }
    return undefined;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newValue = (name === 'cantidadDias' || name === 'diasHaber') ? Number(value) : value;

    setFormData(prev => ({ ...prev, [name]: newValue }));

    // Validar campo
    const error = validateField(name, newValue);
    setErrors(prev => ({ ...prev, [name]: error }));
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
      } catch {
        setFormError("Error al procesar PDF con IA. Por favor, ingresa los datos manualmente.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const selectEmployee = (emp: Employee) => {
    const formattedRut = formatRut(emp.rut);
    setFormData(prev => ({ ...prev, funcionario: toProperCase(emp.nombre), rut: formattedRut }));
    setShowSuggestions(false);

    // Validar RUT del empleado seleccionado
    const rutError = validateField('rut', formattedRut);
    setErrors(prev => ({ ...prev, rut: rutError }));
  };

  const filteredEmployees = employees.filter(e =>
    e.nombre.toLowerCase().includes(formData.funcionario.toLowerCase()) ||
    e.rut.includes(formData.funcionario)
  );

  const saldoFinal = (formData.diasHaber - formData.cantidadDias).toFixed(1);
  const isNegative = parseFloat(saldoFinal) < 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar todos los campos requeridos
    const newErrors: FormErrors = {};
    if (!formData.funcionario) newErrors.funcionario = 'Requerido';
    if (!formData.rut) newErrors.rut = 'Requerido';
    else if (!validateRut(formData.rut)) newErrors.rut = 'RUT inválido';
    if (!formData.fechaInicio) newErrors.fechaInicio = 'Requerido';
    else if (!validateDate(formData.fechaInicio)) newErrors.fechaInicio = 'Fecha inválida';
    else if (isWeekend(formData.fechaInicio)) newErrors.fechaInicio = 'Fin de semana';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const weekendError = newErrors.fechaInicio === 'Fin de semana';
      setFormError(weekendError
        ? `El ${getDayName(formData.fechaInicio)} es fin de semana. Selecciona un día hábil.`
        : 'Por favor, corrige los campos marcados en rojo.');
      return;
    }

    onSubmit(formData);
    if (!editingRecord) {
      setFormData({ ...initialState, acto: nextCorrelative });
      setErrors({});
    }
    setFormError(null);
  };

  return (
    <div className="relative group">
      {/* Decorative background elements */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-sky-500 rounded-[2.5rem] blur opacity-5 group-hover:opacity-10 transition duration-1000 group-hover:duration-200" />

      <form
        onSubmit={handleSubmit}
        className={`relative bg-white dark:bg-slate-800 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border overflow-hidden transition-all duration-500 ${editingRecord
          ? 'border-amber-400 dark:border-amber-500'
          : 'border-slate-200 dark:border-slate-700'
          }`}
      >
        {/* Header section */}
        <div className={`p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white relative overflow-hidden ${editingRecord ? 'bg-amber-500' : 'bg-slate-900 dark:bg-slate-950'
          }`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 pointer-events-none">
            {formData.solicitudType === 'PA' ? <Calendar size={120} /> : <Sparkles size={120} />}
          </div>

          <div className="flex items-center gap-4 sm:gap-5 z-10">
            <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl backdrop-blur-md shadow-lg ${isProcessing ? 'bg-white/10 animate-spin' : 'bg-white/20'
              }`}>
              {isProcessing ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6" /> : editingRecord ? <Save className="w-5 h-5 sm:w-6 sm:h-6" /> : <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight">
                {editingRecord ? 'Editando Resolución' : 'Generar Acto Administrativo'}
              </h2>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase opacity-60 tracking-[0.15em] sm:tracking-[0.2em] mt-1 flex items-center gap-1.5">
                {isProcessing ? (
                  <>Analizando con Gemini 3 Flash...</>
                ) : (
                  <>{formData.solicitudType === 'PA' ? 'Permiso Administrativo' : 'Feriado Legal'} • Registro Digital v2</>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2 z-10 w-full sm:w-auto">
            {!editingRecord && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                <FileUp className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">ESCANEAR SOLICITUD</span>
                <span className="sm:hidden">ESCANEAR</span>
              </button>
            )}
            {editingRecord && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all border border-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} hidden accept="application/pdf" />
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 md:p-10 space-y-8 sm:space-y-10">
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 p-4 rounded-2xl flex items-center gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-bold text-red-700 dark:text-red-300">{formError}</p>
            </div>
          )}

          {/* Balance negativo warning */}
          {isNegative && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center gap-3">
              <AlertTriangle className="text-amber-500 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300">
                Atención: El saldo quedará en negativo ({saldoFinal} días)
              </p>
            </div>
          )}

          {/* Type Selector */}
          <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
            <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-inner">
              {SOLICITUD_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, solicitudType: t.value }))}
                  className={`px-6 sm:px-8 py-2.5 rounded-xl text-[11px] sm:text-xs font-black transition-all duration-300 ${formData.solicitudType === t.value
                    ? 'bg-white dark:bg-slate-600 text-indigo-700 dark:text-indigo-300 shadow-md scale-[1.05] ring-1 ring-slate-200 dark:ring-slate-500'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <select
              name="materia"
              value={formData.materia}
              onChange={handleChange}
              className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 sm:px-5 py-3 rounded-2xl font-black text-slate-700 dark:text-slate-200 text-[11px] sm:text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-400 transition-all cursor-pointer"
            >
              <option value="Decreto Exento">Decreto Exento</option>
              <option value="Resolución Exenta">Resolución Exenta</option>
              <option value="Decreto">Decreto</option>
              <option value="Resolución">Resolución</option>
            </select>
          </div>

          {/* Personal Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
            <div className="md:col-span-8 relative" ref={dropdownRef}>
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] ml-2 mb-2 block">
                Nombre del Funcionario {errors.funcionario && <span className="text-red-500 ml-2">• {errors.funcionario}</span>}
              </label>
              <div className="relative group/input">
                <User className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600 group-focus-within/input:text-indigo-500 transition-colors" />
                <input
                  name="funcionario"
                  value={formData.funcionario}
                  onChange={(e) => { handleChange(e); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  autoComplete="off"
                  placeholder="NOMBRE O RUT PARA BUSCAR..."
                  className={`w-full pl-12 sm:pl-14 pr-12 sm:pr-14 py-4 bg-slate-50 dark:bg-slate-700 border rounded-2xl font-black text-slate-800 dark:text-white uppercase focus:bg-white dark:focus:bg-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/50 outline-none transition-all shadow-sm text-sm ${errors.funcionario ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <ChevronDown className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${showSuggestions ? 'rotate-180' : ''}`} />
                </button>

                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] shadow-2xl z-[100] overflow-hidden">
                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-2">
                      {filteredEmployees.length > 0 ? (
                        filteredEmployees.map(emp => (
                          <div
                            key={emp.rut}
                            onClick={() => selectEmployee(emp)}
                            className="group/item flex items-center justify-between px-4 py-3.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl cursor-pointer transition-all"
                          >
                            <div>
                              <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-white group-hover/item:text-indigo-700 dark:group-hover/item:text-indigo-300">
                                {emp.nombre}
                              </p>
                              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5 tracking-tighter">
                                RUT: {emp.rut}
                              </p>
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-indigo-500 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                          </div>
                        ))
                      ) : (
                        <div className="px-6 py-10 text-center space-y-2">
                          <User className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto" />
                          <p className="text-[10px] sm:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            Sin coincidencias registradas
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-4">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] ml-2 mb-2 block">
                Identificación RUT {errors.rut && <span className="text-red-500 ml-2">• {errors.rut}</span>}
              </label>
              <div className="relative">
                <Fingerprint className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600" />
                <input
                  readOnly
                  value={formData.rut || '00.000.000-0'}
                  className={`w-full pl-12 sm:pl-14 pr-6 py-4 bg-slate-100 dark:bg-slate-700/50 border rounded-2xl font-mono font-bold text-slate-500 dark:text-slate-400 outline-none text-sm ${errors.rut ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'
                    }`}
                />
                {formData.rut && validateRut(formData.rut) && (
                  <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                )}
              </div>
            </div>
          </div>

          {/* Numeric and Date Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-indigo-50/40 dark:bg-indigo-900/20 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-indigo-100/50 dark:border-indigo-800/30 relative overflow-hidden group">
              <label className="text-[10px] sm:text-[11px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider sm:tracking-widest block mb-2 sm:mb-3">
                N° Acto Adm.
              </label>
              <input
                name="acto"
                value={formData.acto}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-700 border border-indigo-200 dark:border-indigo-700 px-3 sm:px-4 py-3 rounded-xl font-black text-indigo-900 dark:text-indigo-100 outline-none focus:border-indigo-500 transition-all text-center text-sm"
              />
              <Calendar className="absolute -right-4 -bottom-4 w-14 h-14 sm:w-16 sm:h-16 text-indigo-600 opacity-[0.03] group-hover:scale-110 transition-transform" />
            </div>

            <div className="bg-emerald-50/40 dark:bg-emerald-900/20 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-100/50 dark:border-emerald-800/30 relative">
              <label className="text-[10px] sm:text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider sm:tracking-widest block mb-2 sm:mb-3">
                Saldo Anterior
              </label>
              <input
                type="number"
                step="0.5"
                name="diasHaber"
                value={formData.diasHaber}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-700 border border-emerald-200 dark:border-emerald-700 px-3 sm:px-4 py-3 rounded-xl font-black text-emerald-900 dark:text-emerald-100 outline-none focus:border-emerald-500 transition-all text-center text-sm"
              />
              {detectedSaldo !== null && (
                <span className="absolute -top-2.5 sm:-top-3 right-3 sm:right-4 bg-emerald-600 text-white text-[8px] sm:text-[9px] font-black px-2 sm:px-3 py-1 rounded-full shadow-lg animate-bounce">
                  SINCRONIZADO
                </span>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/30 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-600/50">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider sm:tracking-widest block mb-2 sm:mb-3">
                Días Solicitados {errors.cantidadDias && <span className="text-red-500">•</span>}
              </label>
              <input
                type="number"
                step="0.5"
                name="cantidadDias"
                value={formData.cantidadDias}
                onChange={handleChange}
                min="0.5"
                max="30"
                className={`w-full bg-white dark:bg-slate-600 border px-3 sm:px-4 py-3 rounded-xl font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all text-center text-sm ${errors.cantidadDias ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-500'
                  }`}
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/30 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-600/50">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider sm:tracking-widest block mb-2 sm:mb-3">
                Fecha de Inicio {errors.fechaInicio && <span className="text-red-500">•</span>}
              </label>
              <input
                type="date"
                name="fechaInicio"
                value={formData.fechaInicio}
                onChange={handleChange}
                className={`w-full bg-white dark:bg-slate-600 border px-3 sm:px-4 py-3 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all text-sm ${errors.fechaInicio ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-500'
                  }`}
              />
              {formData.fechaInicio && (
                <div className={`mt-2 flex items-center gap-2 text-xs font-bold ${isWeekend(formData.fechaInicio)
                    ? 'text-red-500'
                    : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                  <Calendar className="w-3.5 h-3.5" />
                  {getDayName(formData.fechaInicio)}
                  {isWeekend(formData.fechaInicio) && (
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded text-[10px]">
                      Fin de semana
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer & Actions */}
          <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-700 gap-4 sm:gap-6">
            <div className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border w-full md:w-auto ${isNegative
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
              }`}>
              <div className={`p-2 rounded-lg ${isNegative ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}>
                <Info className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider sm:tracking-widest">
                  Balance Final Proyectado
                </p>
                <p className={`text-sm sm:text-base font-black uppercase tracking-tight ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                  {saldoFinal} días <span className="text-[10px] sm:text-[11px] opacity-60 ml-1">Restantes</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
              <button
                type="submit"
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 sm:gap-3 px-8 sm:px-12 py-4 sm:py-5 ${editingRecord
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100 dark:shadow-amber-900/50'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 dark:shadow-indigo-900/50'
                  } text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-[11px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em]`}
              >
                {editingRecord ? <Save className="w-4 h-4 sm:w-5 sm:h-5" /> : <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
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
