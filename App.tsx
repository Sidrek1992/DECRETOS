
import React, { useState, useMemo, useRef } from 'react';
import PermitForm from './components/PermitForm';
import PermitTable from './components/PermitTable';
import StatsCards from './components/StatsCards';
import EmployeeListModal from './components/EmployeeListModal';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './components/Dashboard';
import LowBalanceModal from './components/LowBalanceModal';
import DecreeBookModal from './components/DecreeBookModal';
import CalendarView from './components/CalendarView';
import ThemeSelector from './components/ThemeSelector';
import NotificationCenter from './components/NotificationCenter';
import { ToastContainer, useToast } from './components/Toast';
import { useKeyboardShortcuts, ShortcutsHelpModal } from './hooks/useKeyboardShortcuts';
import { ThemeProvider } from './hooks/useTheme';
import { PermitRecord, PermitFormData, SolicitudType, Employee } from './types';
import { exportToExcel } from './services/excelExport';
import { useCloudSync } from './hooks/useCloudSync';
import { useEmployeeSync } from './hooks/useEmployeeSync';
import { useDarkMode } from './hooks/useDarkMode';
import { CONFIG } from './config';
import {
  Cloud, FileSpreadsheet, ExternalLink, RefreshCw, LayoutDashboard, BookOpen, BarChart3,
  Database, CheckCircle, Users, AlertCircle, Moon, Sun, Undo2, Keyboard, CalendarDays, Palette, Printer
} from 'lucide-react';

const AppContent: React.FC = () => {
  // Employees sincronizados con Google Sheets
  const {
    employees,
    isSyncing: isEmployeeSyncing,
    addEmployee: handleAddEmployee,
    deleteEmployee: handleDeleteEmployee,
    fetchEmployeesFromCloud
  } = useEmployeeSync(
    () => { }, // onSuccess silencioso para empleados
    (error) => console.warn('Error empleados:', error)
  );

  const [editingRecord, setEditingRecord] = useState<PermitRecord | null>(null);
  const [activeTab, setActiveTab] = useState<SolicitudType | 'ALL'>('ALL');
  const [isEmployeeListOpen, setIsEmployeeListOpen] = useState(false);
  const [isLowBalanceOpen, setIsLowBalanceOpen] = useState(false);
  const [isDecreeBookOpen, setIsDecreeBookOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

  const formRef = useRef<HTMLElement>(null);

  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const { toasts, toast, removeToast } = useToast();

  const {
    records,
    setRecords,
    isSyncing,
    syncError,
    lastSync,
    isOnline,
    fetchFromCloud,
    syncToCloud,
    undo,
    canUndo
  } = useCloudSync(
    () => toast.success('Sincronizado', 'Datos actualizados correctamente'),
    (error) => toast.error('Error de sincronización', error)
  );

  const nextCorrelative = useMemo(() => {
    const year = new Date().getFullYear();
    const yearRecords = records.filter(r => r.acto && r.acto.includes(`/${year}`));
    const max = yearRecords.length ? Math.max(...yearRecords.map(r => {
      const parts = r.acto.split('/');
      return parts.length > 0 ? parseInt(parts[0]) || 0 : 0;
    })) : 0;
    return `${(max + 1).toString().padStart(3, '0')}/${year}`;
  }, [records]);

  const handleSubmit = (formData: PermitFormData) => {
    let updated: PermitRecord[];
    if (editingRecord) {
      updated = records.map(r =>
        r.id === editingRecord.id ? { ...formData, id: r.id, createdAt: r.createdAt } : r
      );
      setEditingRecord(null);
      toast.success('Decreto actualizado', `${formData.acto} modificado correctamente`);
    } else {
      updated = [{ ...formData, id: crypto.randomUUID(), createdAt: Date.now() }, ...records];
      toast.success('Decreto emitido', `Resolución ${formData.acto} creada exitosamente`);
    }
    setRecords(updated);
    syncToCloud(updated);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este decreto? Esta acción se puede deshacer.')) {
      const updated = records.filter(r => r.id !== id);
      setRecords(updated);
      syncToCloud(updated);
      toast.warning('Decreto eliminado', 'Puedes deshacer esta acción');
    }
  };

  const handleUndo = () => {
    undo();
    toast.info('Acción deshecha', 'Se restauró el estado anterior');
  };

  const handleFilterByEmployee = (funcionario: string) => {
    setSearchFilter(funcionario);
    // Scroll to table
    setTimeout(() => {
      document.querySelector('section.space-y-6')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleQuickDecree = (employee: Employee) => {
    // Preparar el formulario con el empleado seleccionado
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
    toast.info('Nuevo decreto', `Preparando decreto para ${employee.nombre}`);
  };

  // Atajos de teclado
  const shortcuts = [
    { key: 'n', ctrlKey: true, action: () => formRef.current?.scrollIntoView({ behavior: 'smooth' }), description: 'Nuevo decreto' },
    { key: 's', ctrlKey: true, action: () => fetchFromCloud(), description: 'Sincronizar' },
    { key: 'e', ctrlKey: true, action: () => { exportToExcel(records); toast.success('Exportado', 'Excel generado'); }, description: 'Exportar Excel' },
    { key: 'd', ctrlKey: true, action: toggleDarkMode, description: 'Cambiar tema' },
    { key: 'b', ctrlKey: true, action: () => setIsDecreeBookOpen(true), description: 'Libro de decretos' },
    { key: 'g', ctrlKey: true, action: () => setShowDashboard(p => !p), description: 'Ver gráficos' },
    { key: 'c', ctrlKey: true, action: () => setIsCalendarOpen(true), description: 'Calendario' },
    { key: 'z', ctrlKey: true, action: handleUndo, description: 'Deshacer' },
    { key: '?', action: () => setIsShortcutsOpen(true), description: 'Mostrar atajos' },
  ];

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-[100] w-full border-b border-slate-200 dark:border-slate-700 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-500 ${isSyncing ? 'bg-indigo-600 animate-pulse shadow-indigo-200 dark:shadow-indigo-900' : 'bg-slate-900 dark:bg-indigo-600 shadow-slate-200 dark:shadow-indigo-900'}`}>
              <Cloud className="text-white w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  SGP Cloud
                  <span className="text-[9px] sm:text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                    v{CONFIG.APP_VERSION}
                  </span>
                </h1>
                <button
                  onClick={() => setIsEmployeeListOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/50 border border-indigo-100 dark:border-indigo-800 rounded-lg shadow-sm hover:bg-indigo-600 group transition-all"
                >
                  <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors" />
                  <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider group-hover:text-white transition-colors">
                    {employees.length} Personal
                  </span>
                </button>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-indigo-500 animate-ping' : isOnline ? 'bg-emerald-500' : 'bg-red-500'} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {isSyncing ? 'Subiendo...' : syncError ? 'Error conexión' : isOnline ? 'Sincronizado' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Info de Sheet - Solo desktop */}
            <div className="hidden lg:flex flex-col items-end mr-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/50 dark:border-slate-700">
                <Database className={`w-3.5 h-3.5 ${syncError ? 'text-red-400' : 'text-slate-400'}`} />
                <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase">
                  SHEET: ...{CONFIG.DECRETOS_SHEET_ID.slice(-4)}
                </span>
              </div>
              {lastSync && (
                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase flex items-center gap-1">
                  <CheckCircle size={9} className="text-emerald-500" />
                  {lastSync.toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Botón Dashboard */}
            <button
              onClick={() => setShowDashboard(p => !p)}
              className={`p-2.5 rounded-xl transition-all border shadow-sm ${showDashboard
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              title="Ver gráficos (Ctrl+G)"
            >
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Botón Libro de Decretos */}
            <button
              onClick={() => setIsDecreeBookOpen(true)}
              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all shadow-sm"
              title="Libro de decretos (Ctrl+B)"
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Botón Calendario */}
            <button
              onClick={() => setIsCalendarOpen(true)}
              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all shadow-sm"
              title="Vista calendario (Ctrl+C)"
            >
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Botón Undo */}
            {canUndo && (
              <button
                onClick={handleUndo}
                className="p-2.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 rounded-xl transition-all hover:bg-amber-100 dark:hover:bg-amber-900/50 active:scale-95"
                title="Deshacer última acción (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            {/* Botón Excel */}
            <button
              onClick={() => {
                exportToExcel(records);
                toast.success('Exportado', 'Archivo Excel generado correctamente');
              }}
              className="group flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-emerald-200 dark:hover:shadow-emerald-900 active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            {/* Botón Sync */}
            <button
              onClick={() => fetchFromCloud()}
              disabled={isSyncing}
              className={`p-2.5 rounded-xl transition-all border shadow-sm ${isSyncing
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                : syncError
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                }`}
            >
              {syncError ? <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isSyncing ? 'animate-spin' : ''}`} />}
            </button>

            {/* Botón Dark Mode */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all shadow-sm"
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Botón Sheets */}
            <button
              onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${CONFIG.DECRETOS_SHEET_ID}`, '_blank')}
              className="hidden sm:block p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all shadow-sm"
              title="Ver hoja de cálculo"
            >
              <ExternalLink className="w-5 h-5" />
            </button>

            {/* Botón Temas */}
            <button
              onClick={() => setIsThemeSelectorOpen(true)}
              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 rounded-xl transition-all shadow-sm"
              title="Personalizar tema"
            >
              <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Centro de Notificaciones */}
            <NotificationCenter records={records} employees={employees} />

            {/* Botón Imprimir */}
            <button
              onClick={() => window.print()}
              className="hidden md:block p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl transition-all shadow-sm"
              title="Imprimir página"
            >
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {isSyncing && (
          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-50 dark:bg-indigo-900/50 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-600 via-sky-400 to-indigo-600 bg-[length:200%_100%] animate-sync-progress" />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10 sm:space-y-12">
        <StatsCards records={records} totalDatabaseEmployees={employees.length} />

        {/* Dashboard condicional */}
        {showDashboard && (
          <Dashboard
            records={records}
            employees={employees}
            onViewLowBalance={() => setIsLowBalanceOpen(true)}
          />
        )}

        <div className="space-y-10 sm:space-y-12">
          {/* Formulario */}
          <section ref={formRef}>
            <PermitForm
              onSubmit={handleSubmit}
              editingRecord={editingRecord}
              onCancelEdit={() => setEditingRecord(null)}
              nextCorrelative={nextCorrelative}
              employees={employees}
              records={records}
            />
          </section>

          {/* Tabla */}
          <section className="space-y-6 sm:space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-indigo-900/50">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Registro de Decretos
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Historial Institucional
                    </span>
                    {lastSync && !isSyncing && (
                      <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-full text-[8px] font-black uppercase tracking-tighter">
                        <CheckCircle className="w-2.5 h-2.5" /> Sincronizado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs de filtro */}
              <div className="flex bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur p-1.5 rounded-2xl gap-1 border border-slate-200/50 dark:border-slate-700 shadow-inner w-full sm:w-auto">
                {(['ALL', 'PA', 'FL'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 sm:flex-none px-6 sm:px-8 py-2.5 rounded-xl text-[11px] font-black tracking-widest transition-all duration-300 uppercase ${activeTab === tab
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md ring-1 ring-slate-200 dark:ring-slate-600'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                  >
                    {tab === 'ALL' ? 'Todos' : tab === 'PA' ? 'Permisos' : 'Feriados'}
                  </button>
                ))}
              </div>
            </div>

            <PermitTable
              data={records}
              activeTab={activeTab}
              onDelete={handleDelete}
              onEdit={setEditingRecord}
            />
          </section>
        </div>
      </main>

      {/* Modal de empleados */}
      <EmployeeListModal
        isOpen={isEmployeeListOpen}
        onClose={() => setIsEmployeeListOpen(false)}
        employees={employees}
        records={records}
        onAddEmployee={handleAddEmployee}
        onDeleteEmployee={handleDeleteEmployee}
        onFilterByEmployee={handleFilterByEmployee}
        onQuickDecree={handleQuickDecree}
      />

      {/* Modal saldo bajo */}
      <LowBalanceModal
        isOpen={isLowBalanceOpen}
        onClose={() => setIsLowBalanceOpen(false)}
        records={records}
      />

      {/* Modal libro de decretos */}
      <DecreeBookModal
        isOpen={isDecreeBookOpen}
        onClose={() => setIsDecreeBookOpen(false)}
        records={records}
      />

      {/* Modal atajos de teclado */}
      <ShortcutsHelpModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        shortcuts={shortcuts}
      />

      {/* Vista de Calendario */}
      <CalendarView
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        records={records}
      />

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 border-t border-slate-200 dark:border-slate-700 mt-16 sm:mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
          <div className="flex items-center gap-3">
            <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            <span className="text-[10px] sm:text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em]">
              SGP Cloud Engine 2026
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsShortcutsOpen(true)}
              className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-wider"
            >
              <Keyboard className="w-3 h-3" /> Atajos
            </button>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] text-center">
              Municipalidad de Gestión Avanzada v{CONFIG.APP_VERSION}
            </p>
          </div>
        </div>
      </footer>

      {/* Selector de Tema */}
      <ThemeSelector
        isOpen={isThemeSelectorOpen}
        onClose={() => setIsThemeSelectorOpen(false)}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

// Wrapper con ErrorBoundary y ThemeProvider
const App: React.FC = () => (
  <ThemeProvider>
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  </ThemeProvider>
);

export default App;
