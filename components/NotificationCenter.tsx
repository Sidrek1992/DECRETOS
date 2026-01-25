import React, { useState, useEffect, useCallback } from 'react';
import { PermitRecord, Employee } from '../types';
import { Bell, X, AlertTriangle, Calendar, User, ChevronRight } from 'lucide-react';

interface Notification {
    id: string;
    type: 'warning' | 'info' | 'success';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    data?: {
        employeeName?: string;
        employeeRut?: string;
        saldo?: number;
    };
}

interface NotificationCenterProps {
    records: PermitRecord[];
    employees: Employee[];
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ records, employees }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [hasNewNotifications, setHasNewNotifications] = useState(false);

    // Calcular alertas de saldo bajo
    const checkLowBalanceAlerts = useCallback(() => {
        const newNotifications: Notification[] = [];
        const now = new Date();

        employees.forEach(emp => {
            const empRecords = records.filter(r =>
                r.rut === emp.rut && r.solicitudType === 'PA'
            ).sort((a, b) => b.createdAt - a.createdAt);

            if (empRecords.length > 0) {
                const lastRecord = empRecords[0];
                const saldo = lastRecord.diasHaber - lastRecord.cantidadDias;

                // Alerta si saldo < 2 días
                if (saldo < 2 && saldo >= 0) {
                    newNotifications.push({
                        id: `low-${emp.rut}`,
                        type: 'warning',
                        title: 'Saldo bajo',
                        message: `${emp.nombre} tiene solo ${saldo.toFixed(1)} días de permiso disponibles`,
                        timestamp: now,
                        read: false,
                        data: {
                            employeeName: emp.nombre,
                            employeeRut: emp.rut,
                            saldo
                        }
                    });
                }

                // Alerta si saldo negativo
                if (saldo < 0) {
                    newNotifications.push({
                        id: `negative-${emp.rut}`,
                        type: 'warning',
                        title: 'Saldo negativo',
                        message: `${emp.nombre} tiene saldo negativo (${saldo.toFixed(1)} días)`,
                        timestamp: now,
                        read: false,
                        data: {
                            employeeName: emp.nombre,
                            employeeRut: emp.rut,
                            saldo
                        }
                    });
                }
            }
        });

        // Solo actualizar si hay nuevas notificaciones
        if (newNotifications.length > 0) {
            setNotifications(prev => {
                // Evitar duplicados
                const existingIds = prev.map(n => n.id);
                const uniqueNew = newNotifications.filter(n => !existingIds.includes(n.id));
                if (uniqueNew.length > 0) {
                    setHasNewNotifications(true);
                    return [...uniqueNew, ...prev].slice(0, 20); // Máximo 20 notificaciones
                }
                return prev;
            });
        }
    }, [records, employees]);

    // Verificar alertas al cargar y cuando cambian los datos
    useEffect(() => {
        checkLowBalanceAlerts();
    }, [checkLowBalanceAlerts]);

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setHasNewNotifications(false);
    };

    const clearAll = () => {
        setNotifications([]);
        setHasNewNotifications(false);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <>
            {/* Bell Button */}
            <button
                onClick={() => { setIsOpen(true); setHasNewNotifications(false); }}
                className="relative p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-xl transition-all shadow-sm"
                title="Notificaciones"
            >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />

                {/* Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}

                {/* Ping animation */}
                {hasNewNotifications && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-400 rounded-full animate-ping" />
                )}
            </button>

            {/* Notification Panel */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-start justify-end p-4 sm:p-6"
                    onClick={() => setIsOpen(false)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

                    {/* Panel */}
                    <div
                        className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden mt-16 sm:mt-20 animate-in slide-in-from-right duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-slate-900 dark:bg-slate-950 p-5 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-wider">Notificaciones</h3>
                                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
                                        {unreadCount} sin leer
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {notifications.length > 0 && (
                                    <>
                                        <button
                                            onClick={markAllAsRead}
                                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white transition-colors"
                                        >
                                            Marcar leídas
                                        </button>
                                        <button
                                            onClick={clearAll}
                                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            Limpiar
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? (
                                <div className="p-3 space-y-2">
                                    {notifications.map(notification => (
                                        <div
                                            key={notification.id}
                                            onClick={() => markAsRead(notification.id)}
                                            className={`group p-4 rounded-2xl cursor-pointer transition-all ${notification.read
                                                    ? 'bg-slate-50 dark:bg-slate-700/30'
                                                    : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-xl ${notification.type === 'warning'
                                                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                                                        : notification.type === 'info'
                                                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                                                            : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                                                    }`}>
                                                    <AlertTriangle className="w-4 h-4" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className={`text-xs font-black uppercase tracking-wider ${notification.read
                                                                ? 'text-slate-500 dark:text-slate-400'
                                                                : 'text-amber-700 dark:text-amber-300'
                                                            }`}>
                                                            {notification.title}
                                                        </p>
                                                        {!notification.read && (
                                                            <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-2">
                                                        {notification.timestamp.toLocaleTimeString()}
                                                    </p>
                                                </div>

                                                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-16 text-center">
                                    <Bell className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                                    <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                        Sin notificaciones
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">
                                        Te avisaremos cuando haya alertas importantes
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                                Alertas automáticas de saldo bajo
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default NotificationCenter;
