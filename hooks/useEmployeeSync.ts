import React, { useState, useEffect, useCallback } from 'react';
import { Employee } from '../types';
import { CONFIG } from '../config';
import { INITIAL_EMPLOYEES } from '../data/initialEmployees';

interface UseEmployeeSyncReturn {
    employees: Employee[];
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
    isSyncing: boolean;
    syncError: boolean;
    lastSync: Date | null;
    fetchEmployeesFromCloud: () => Promise<void>;
    syncEmployeesToCloud: (data: Employee[]) => Promise<boolean>;
    addEmployee: (employee: Employee) => void;
    deleteEmployee: (rut: string) => void;
}

export const useEmployeeSync = (
    onSyncSuccess?: () => void,
    onSyncError?: (error: string) => void
): UseEmployeeSyncReturn => {
    const [employees, setEmployees] = useState<Employee[]>(() => {
        // Intentar cargar desde localStorage primero
        const saved = localStorage.getItem('sgp_employees_v2');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return INITIAL_EMPLOYEES;
            }
        }
        return INITIAL_EMPLOYEES;
    });

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // Guardar en localStorage cuando cambian los employees
    useEffect(() => {
        if (employees.length > 0) {
            localStorage.setItem('sgp_employees_v2', JSON.stringify(employees));
        }
    }, [employees]);

    // Cargar empleados desde el Sheet al iniciar
    useEffect(() => {
        fetchEmployeesFromCloud();
    }, []);

    const fetchEmployeesFromCloud = useCallback(async () => {
        if (!navigator.onLine) return;

        setIsSyncing(true);
        setSyncError(false);

        try {
            // Usar el mismo Web App URL pero con el sheet de empleados
            const response = await fetch(
                `${CONFIG.WEB_APP_URL}?sheetId=${CONFIG.EMPLOYEES_SHEET_ID}&type=employees`
            );
            const result = await response.json();

            if (result.success && result.data) {
                // Mapeo según estructura del Sheet:
                // Col 0: N° (índice), Col 1: Nombres, Col 2: Primer Apellido, Col 3: Segundo Apellido, Col 4: RUT
                const cloudEmployees: Employee[] = result.data
                    .filter((row: unknown[]) => row && row[1]) // Filtrar filas sin nombre
                    .map((row: unknown[]) => {
                        const nombres = String(row[1] || '').trim();
                        const primerApellido = String(row[2] || '').trim();
                        const segundoApellido = String(row[3] || '').trim();
                        const rut = String(row[4] || '').trim();

                        // Concatenar nombre completo
                        const nombreCompleto = [nombres, primerApellido, segundoApellido]
                            .filter(Boolean)
                            .join(' ')
                            .toUpperCase();

                        return {
                            nombre: nombreCompleto,
                            rut: rut
                        };
                    })
                    .filter((emp: Employee) => emp.nombre && emp.rut); // Filtrar registros incompletos

                if (cloudEmployees.length > 0) {
                    // Ordenar alfabéticamente
                    cloudEmployees.sort((a, b) => a.nombre.localeCompare(b.nombre));
                    setEmployees(cloudEmployees);
                    localStorage.setItem('sgp_employees_v2', JSON.stringify(cloudEmployees));
                }
                setLastSync(new Date());
                onSyncSuccess?.();
            }
        } catch (e) {
            console.error("Error al recuperar empleados de la nube:", e);
            setSyncError(true);
            onSyncError?.("Error al conectar con la nube de empleados");
        } finally {
            setIsSyncing(false);
        }
    }, [onSyncSuccess, onSyncError]);

    const syncEmployeesToCloud = useCallback(async (dataToSync: Employee[]): Promise<boolean> => {
        if (!navigator.onLine) {
            onSyncError?.("Sin conexión a internet");
            return false;
        }

        setIsSyncing(true);
        setSyncError(false);

        try {
            // Preparar datos para el Sheet
            // Estructura: N°, Nombres, Primer Apellido, Segundo Apellido, RUT
            const sheetData = dataToSync.map((emp, index) => {
                // Intentar separar el nombre en partes
                const parts = emp.nombre.split(' ');
                let nombres = '';
                let primerApellido = '';
                let segundoApellido = '';

                if (parts.length >= 4) {
                    // Asumimos: 2 nombres + 2 apellidos
                    nombres = parts.slice(0, 2).join(' ');
                    primerApellido = parts[2] || '';
                    segundoApellido = parts.slice(3).join(' ');
                } else if (parts.length === 3) {
                    // 1 nombre + 2 apellidos
                    nombres = parts[0];
                    primerApellido = parts[1];
                    segundoApellido = parts[2];
                } else if (parts.length === 2) {
                    // 1 nombre + 1 apellido
                    nombres = parts[0];
                    primerApellido = parts[1];
                } else {
                    nombres = emp.nombre;
                }

                return [
                    index + 1,      // N°
                    nombres,        // Nombres
                    primerApellido, // Primer Apellido
                    segundoApellido,// Segundo Apellido
                    emp.rut         // RUT
                ];
            });

            const payload = {
                sheetId: CONFIG.EMPLOYEES_SHEET_ID,
                type: 'employees',
                data: sheetData
            };

            const response = await fetch(CONFIG.WEB_APP_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                setLastSync(new Date());
                onSyncSuccess?.();
                return true;
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            console.error("Error sincronizando empleados:", e);
            setSyncError(true);
            onSyncError?.("Error al sincronizar empleados con la nube");
            return false;
        } finally {
            setIsSyncing(false);
        }
    }, [onSyncSuccess, onSyncError]);

    const addEmployee = useCallback((employee: Employee) => {
        setEmployees(prev => {
            const updated = [...prev, employee].sort((a, b) => a.nombre.localeCompare(b.nombre));
            // Sincronizar en segundo plano
            syncEmployeesToCloud(updated);
            return updated;
        });
    }, [syncEmployeesToCloud]);

    const deleteEmployee = useCallback((rut: string) => {
        setEmployees(prev => {
            const updated = prev.filter(e => e.rut !== rut);
            // Sincronizar en segundo plano
            syncEmployeesToCloud(updated);
            return updated;
        });
    }, [syncEmployeesToCloud]);

    return {
        employees,
        setEmployees,
        isSyncing,
        syncError,
        lastSync,
        fetchEmployeesFromCloud,
        syncEmployeesToCloud,
        addEmployee,
        deleteEmployee
    };
};
