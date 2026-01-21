
import React, { useState, useEffect, useMemo } from 'react';
import PermitForm from './components/PermitForm';
import PermitTable from './components/PermitTable';
import StatsCards from './components/StatsCards';
import EmployeeListModal from './components/EmployeeListModal';
import { PermitRecord, PermitFormData, SolicitudType, Employee } from './types';
import { exportToExcel } from './services/excelExport';
import { Cloud, FileSpreadsheet, ExternalLink, RefreshCw, LayoutDashboard, Database, CheckCircle, Users, AlertCircle } from 'lucide-react';
import { INITIAL_EMPLOYEES } from './data/initialEmployees';
import { INITIAL_RECORDS } from './data/initialRecords';

// IMPORTANTE: Asegúrate de que esta URL sea la de tu implementación "Ejecutar como: Yo" y "Acceso: Cualquier persona"
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzFnXNBOFdSn6Gn0Y_uRAikrK6wcQlTCS2Qo-pGqeb_uTLgyrJAf50Rglgml1hzWscRSw/exec'; 
const DECRETOS_SHEET_ID = '1BmMABAHk8ZgpUlXzsyI33qQGtsk5mrKnf5qzgQp4US0';

const App: React.FC = () => {
  const [records, setRecords] = useState<PermitRecord[]>([]);
  const [employees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [editingRecord, setEditingRecord] = useState<PermitRecord | null>(null);
  const [activeTab, setActiveTab] = useState<SolicitudType | 'ALL'>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isEmployeeListOpen, setIsEmployeeListOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sgp_cloud_records_v2');
    if (saved) {
      setRecords(JSON.parse(saved));
    } else {
      setRecords(INITIAL_RECORDS);
    }

    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('sgp_cloud_records_v2', JSON.stringify(records));
  }, [records]);

  const nextCorrelative = useMemo(() => {
    const year = new Date().getFullYear();
    const yearRecords = records.filter(r => r.acto && r.acto.includes(`/${year}`));
    const max = yearRecords.length ? Math.max(...yearRecords.map(r => {
      const parts = r.acto.split('/');
      return parts.length > 0 ? parseInt(parts[0]) || 0 : 0;
    })) : 0;
    return `${(max + 1).toString().padStart(3, '0')}/${year}`;
  }, [records]);

  const syncToCloud = async (dataToSync: PermitRecord[]) => {
    if (!isOnline) return;
    
    setIsSyncing(true);
    setSyncError(false);
    
    try {
      const payload = { 
        sheetId: DECRETOS_SHEET_ID, 
        data: dataToSync.map(r => [
          r.id, r.solicitudType, r.materia, r.acto, r.funcionario, r.rut, 
          r.periodo, r.cantidadDias, r.fechaInicio, r.tipoJornada, 
          r.diasHaber, r.fechaDecreto, (r.diasHaber - r.cantidadDias), r.ra, r.emite
        ]) 
      };

      // Usamos 'cors' y enviamos como text/plain para evitar el preflight OPTIONS que Google Apps Script no soporta bien
      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'cors', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      // Nota: GAS devuelve un redirect 302, fetch lo sigue automáticamente si el modo es 'cors'
      const result = await response.json();
      
      if (result.success) {
        setLastSync(new Date());
        console.log("Sincronización exitosa con Sheets");
      } else {
        throw new Error(result.error);
      }
    } catch (e) {
      console.error("Error sincronizando:", e);
      setSyncError(true);
      // Reintento silencioso en caso de fallo de red
      if (isOnline) setTimeout(() => syncToCloud(dataToSync), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = (formData: PermitFormData) => {
    let updated: PermitRecord[];
    if (editingRecord) {
      updated = records.map(r => r.id === editingRecord.id ? { ...formData, id: r.id, createdAt: r.createdAt } : r);
      setEditingRecord(null);
    } else {
      updated = [{ ...formData, id: crypto.randomUUID(), createdAt: Date.now() }, ...records];
    }
    setRecords(updated);
    
    // Llamamos a la sincronización inmediatamente después de actualizar el estado local
    syncToCloud(updated);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-[100] w-full border-b border-slate-200 bg-white/75 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-500 ${isSyncing ? 'bg-indigo-600 animate-pulse shadow-indigo-200' : 'bg-slate-900 shadow-slate-200'}`}>
              <Cloud className="text-white w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  SGP Cloud <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase tracking-widest">v2.1</span>
                </h1>
                <button 
                  onClick={() => setIsEmployeeListOpen(true)}
                  className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg shadow-sm hover:bg-indigo-600 group transition-all"
                >
                  <Users className="w-3 h-3 text-indigo-600 group-hover:text-white transition-colors" />
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider group-hover:text-white transition-colors">{employees.length} Personal</span>
                </button>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-indigo-500 animate-ping' : isOnline ? 'bg-emerald-500' : 'bg-red-500'} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {isSyncing ? 'Subiendo a la nube...' : syncError ? 'Error de conexión' : isOnline ? 'Nube Sincronizada' : 'Modo Offline'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200/50">
                <Database className={`w-3.5 h-3.5 ${syncError ? 'text-red-400' : 'text-slate-400'}`} />
                <span className="text-[9px] font-black text-slate-600 uppercase">SHEET: ...{DECRETOS_SHEET_ID.slice(-4)}</span>
              </div>
              {lastSync && (
                <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase flex items-center gap-1">
                  <CheckCircle size={8} className="text-emerald-500" /> Actualizado: {lastSync.toLocaleTimeString()}
                </span>
              )}
            </div>
            
            <button 
              onClick={() => exportToExcel(records)}
              className="group flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-emerald-200 active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden lg:inline">Excel</span>
            </button>

            <button 
              onClick={() => syncToCloud(records)}
              disabled={isSyncing}
              className={`p-2.5 rounded-xl transition-all border shadow-sm ${isSyncing ? 'bg-slate-100 text-slate-400' : syncError ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:shadow-indigo-50'}`}
            >
              {syncError ? <AlertCircle className="w-5 h-5" /> : <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />}
            </button>
            
            <button 
              onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${DECRETOS_SHEET_ID}`, '_blank')}
              className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm hover:shadow-indigo-50"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {isSyncing && (
          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-50 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-600 via-sky-400 to-indigo-600 bg-[length:200%_100%] animate-sync-progress"></div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        <StatsCards records={records} totalDatabaseEmployees={employees.length} />
        
        <div className="space-y-12">
          <section>
            <PermitForm 
              onSubmit={handleSubmit}
              editingRecord={editingRecord}
              onCancelEdit={() => setEditingRecord(null)}
              nextCorrelative={nextCorrelative}
              employees={employees}
              records={records}
            />
          </section>

          <section className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                    <LayoutDashboard className="w-5 h-5" />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Registro de Decretos</h3>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Historial Institucional</span>
                       {lastSync && !isSyncing && (
                         <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[8px] font-black uppercase tracking-tighter">
                           <CheckCircle className="w-2.5 h-2.5" /> Sincronizado
                         </span>
                       )}
                    </div>
                 </div>
              </div>
              
              <div className="flex bg-slate-100/80 backdrop-blur p-1.5 rounded-2xl gap-1 border border-slate-200/50 shadow-inner">
                {(['ALL', 'PA', 'FL'] as const).map(tab => (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)}
                    className={`px-8 py-2.5 rounded-xl text-[11px] font-black tracking-widest transition-all duration-300 uppercase ${activeTab === tab ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {tab === 'ALL' ? 'Todos' : tab === 'PA' ? 'Permisos' : 'Feriados'}
                  </button>
                ))}
              </div>
            </div>
            
            <PermitTable 
              data={records} 
              activeTab={activeTab} 
              onDelete={id => {
                if(window.confirm('¿Eliminar este decreto?')) {
                  const updated = records.filter(r => r.id !== id);
                  setRecords(updated);
                  syncToCloud(updated);
                }
              }} 
              onEdit={setEditingRecord} 
            />
          </section>
        </div>
      </main>

      <EmployeeListModal 
        isOpen={isEmployeeListOpen} 
        onClose={() => setIsEmployeeListOpen(false)} 
        employees={employees} 
      />

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-200 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
          <div className="flex items-center gap-3">
             <Cloud className="w-6 h-6 text-indigo-600" />
             <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em]">SGP Cloud Engine 2026</span>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Municipalidad de Gestión Avanzada v2.1</p>
        </div>
      </footer>

      <style>{`
        @keyframes sync-progress {
          0% { transform: translateX(-100%); width: 30%; }
          100% { transform: translateX(350%); width: 30%; }
        }
        .animate-sync-progress { animation: sync-progress 2s linear infinite; }
      `}</style>
    </div>
  );
};

export default App;
