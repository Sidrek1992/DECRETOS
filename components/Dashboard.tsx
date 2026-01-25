
import React, { useMemo } from 'react';
import { PermitRecord } from '../types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { TrendingUp, Users, Calendar, AlertTriangle, ChevronRight } from 'lucide-react';

interface DashboardProps {
    records: PermitRecord[];
    employees: { nombre: string; rut: string }[];
    onViewLowBalance: () => void;
}

const COLORS = {
    PA: '#6366f1',
    FL: '#f59e0b',
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#64748b'
};

const Dashboard: React.FC<DashboardProps> = ({ records, employees, onViewLowBalance }) => {
    // Datos por mes
    const monthlyData = useMemo(() => {
        const months: Record<string, { PA: number; FL: number; total: number }> = {};
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        // Inicializar últimos 6 meses
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
            months[key] = { PA: 0, FL: 0, total: 0 };
        }

        records.forEach(r => {
            if (!r.fechaInicio) return;
            const date = new Date(r.fechaInicio);
            const key = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
            if (months[key]) {
                months[key][r.solicitudType] += r.cantidadDias;
                months[key].total += r.cantidadDias;
            }
        });

        return Object.entries(months).map(([name, data]) => ({ name, ...data }));
    }, [records]);

    // Distribución por tipo
    const typeDistribution = useMemo(() => {
        const pa = records.filter(r => r.solicitudType === 'PA').length;
        const fl = records.filter(r => r.solicitudType === 'FL').length;
        return [
            { name: 'Permisos Admin.', value: pa, color: COLORS.PA },
            { name: 'Feriados Legales', value: fl, color: COLORS.FL }
        ];
    }, [records]);

    // Top 5 funcionarios con más días solicitados
    const topFuncionarios = useMemo(() => {
        const byEmployee: Record<string, { nombre: string; dias: number }> = {};

        records.forEach(r => {
            if (!byEmployee[r.rut]) {
                byEmployee[r.rut] = { nombre: r.funcionario, dias: 0 };
            }
            byEmployee[r.rut].dias += r.cantidadDias;
        });

        return Object.values(byEmployee)
            .sort((a, b) => b.dias - a.dias)
            .slice(0, 5);
    }, [records]);

    // Funcionarios con saldo bajo (menos de 2 días)
    const lowBalanceEmployees = useMemo(() => {
        const balanceByEmployee: Record<string, { nombre: string; rut: string; saldo: number; tipo: string }> = {};

        // Procesar cada tipo por separado
        ['PA', 'FL'].forEach(tipo => {
            const tipoRecords = records
                .filter(r => r.solicitudType === tipo)
                .sort((a, b) => b.createdAt - a.createdAt);

            const seen = new Set<string>();
            tipoRecords.forEach(r => {
                if (!seen.has(r.rut)) {
                    const saldo = r.diasHaber - r.cantidadDias;
                    const key = `${r.rut}-${tipo}`;
                    if (saldo < 2) {
                        balanceByEmployee[key] = {
                            nombre: r.funcionario,
                            rut: r.rut,
                            saldo,
                            tipo
                        };
                    }
                    seen.add(r.rut);
                }
            });
        });

        return Object.values(balanceByEmployee).sort((a, b) => a.saldo - b.saldo);
    }, [records]);

    // Promedios
    const averageDaysPerRequest = useMemo(() => {
        if (records.length === 0) return 0;
        return (records.reduce((acc, r) => acc + r.cantidadDias, 0) / records.length).toFixed(1);
    }, [records]);

    const activeEmployees = useMemo(() => {
        return new Set(records.map(r => r.rut)).size;
    }, [records]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">Panel de Analytics</h2>
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Estadísticas y tendencias
                        </p>
                    </div>
                </div>
            </div>

            {/* KPIs Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Promedio días/solicitud
                    </p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{averageDaysPerRequest}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Funcionarios activos
                    </p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{activeEmployees}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Total días otorgados
                    </p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {records.reduce((acc, r) => acc + r.cantidadDias, 0)}
                    </p>
                </div>
                <button
                    onClick={onViewLowBalance}
                    className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border text-left transition-all hover:shadow-md group ${lowBalanceEmployees.length > 0
                            ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <p className={`text-[10px] font-black uppercase tracking-wider ${lowBalanceEmployees.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
                            }`}>
                            Saldo bajo (&lt;2 días)
                        </p>
                        {lowBalanceEmployees.length > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <p className={`text-2xl font-black ${lowBalanceEmployees.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                            }`}>
                            {lowBalanceEmployees.length}
                        </p>
                        {lowBalanceEmployees.length > 0 && (
                            <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                        )}
                    </div>
                </button>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico de barras - Tendencia mensual */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-4 uppercase tracking-wider">
                        Días otorgados por mes
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '12px'
                                    }}
                                    labelStyle={{ color: '#94a3b8' }}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="PA" name="Permisos" fill={COLORS.PA} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="FL" name="Feriados" fill={COLORS.FL} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico circular - Distribución */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-4 uppercase tracking-wider">
                        Distribución por tipo
                    </h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={typeDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {typeDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '12px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-2">
                        {typeDistribution.map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                    {item.name}: {item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Funcionarios */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                    <Users className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                        Top 5 - Mayor uso de días
                    </h3>
                </div>
                <div className="space-y-3">
                    {topFuncionarios.map((emp, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-300'
                                }`}>
                                {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{emp.nombre}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{emp.dias}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">días</p>
                            </div>
                        </div>
                    ))}
                    {topFuncionarios.length === 0 && (
                        <p className="text-center text-sm text-slate-400 py-4">Sin datos disponibles</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
