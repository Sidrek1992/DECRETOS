import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PermitRecord, SolicitudType } from '../types';
import { CONFIG } from '../config';

// Función para parsear fechas del Sheet (formato: "martes, 06 de enero de 2026" o "06 de enero de 2026")
const parseDateFromSheet = (dateStr: string): string => {
    if (!dateStr) return '';

    // Si ya está en formato ISO (YYYY-MM-DD), devolverlo
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.split('T')[0];
    }

    const meses: Record<string, string> = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };

    // Extraer día, mes, año del formato "martes, 06 de enero de 2026" o "06 de enero de 2026"
    const match = dateStr.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
    if (match) {
        const dia = match[1].padStart(2, '0');
        const mes = meses[match[2].toLowerCase()] || '01';
        const año = match[3];
        return `${año}-${mes}-${dia}`;
    }

    return '';
};

interface UseCloudSyncReturn {
    records: PermitRecord[];
    setRecords: React.Dispatch<React.SetStateAction<PermitRecord[]>>;
    isSyncing: boolean;
    syncError: boolean;
    lastSync: Date | null;
    isOnline: boolean;
    fetchFromCloud: () => Promise<void>;
    syncToCloud: (data: PermitRecord[]) => Promise<boolean>;
    undoStack: PermitRecord[][];
    undo: () => void;
    canUndo: boolean;
}

export const useCloudSync = (
    onSyncSuccess?: () => void,
    onSyncError?: (error: string) => void
): UseCloudSyncReturn => {
    const [records, setRecords] = useState<PermitRecord[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [undoStack, setUndoStack] = useState<PermitRecord[][]>([]);

    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Manejar estado de conexión
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, []);

    // Cargar datos iniciales desde la nube
    useEffect(() => {
        fetchFromCloud();
    }, []);



    const fetchFromCloud = useCallback(async () => {
        if (!navigator.onLine) return;

        setIsSyncing(true);
        setSyncError(false);

        try {
            const response = await fetch(`${CONFIG.WEB_APP_URL}?sheetId=${CONFIG.DECRETOS_SHEET_ID}`);
            const result = await response.json();

            if (result.success && result.data) {
                // Mapeo según estructura real del Sheet:
                // Col 0: # (id), Col 1: Decreto (acto), Col 2: Materia (PA/FL), Col 3: Acto (tipo doc),
                // Col 4: Funcionario, Col 5: RUT, Col 6: Periodo, Col 7: Cantidad días,
                // Col 8: Fecha inicio, Col 9: Tipo jornada, Col 10: Días haber, 
                // Col 11: Fecha decreto, Col 12: Saldo, Col 13: RA, Col 14: Emite
                const cloudRecords: PermitRecord[] = result.data
                    .filter((row: unknown[]) => row && row[4]) // Filtrar filas sin funcionario
                    .map((row: unknown[], index: number) => ({
                        id: String(row[0]) || `cloud-${index}-${Date.now()}`,
                        acto: String(row[1] || ''),                           // Decreto (ej: 001/2026)
                        solicitudType: (String(row[2]).toUpperCase() === 'FL' ? 'FL' : 'PA') as SolicitudType,  // PA o FL
                        materia: String(row[3] || 'Decreto Exento'),          // Tipo de documento
                        funcionario: String(row[4] || '').trim(),
                        rut: String(row[5] || '').trim(),
                        periodo: String(row[6] || new Date().getFullYear()),
                        cantidadDias: parseFloat(String(row[7] || '0').replace(',', '.')) || 0,
                        fechaInicio: parseDateFromSheet(String(row[8] || '')),
                        tipoJornada: String(row[9] || '(Jornada completa)'),
                        diasHaber: parseFloat(String(row[10] || '6').replace(',', '.')) || 6,
                        fechaDecreto: parseDateFromSheet(String(row[11] || '')),
                        ra: String(row[13] || 'MGA'),
                        emite: String(row[14] || 'mga'),
                        observaciones: '',
                        createdAt: Date.now() - (index * 1000),
                        decreto: ''
                    }));

                setRecords(cloudRecords);
                setLastSync(new Date());
                onSyncSuccess?.();
            }
        } catch (e) {
            console.error("Error al recuperar datos de la nube:", e);
            setSyncError(true);
            onSyncError?.("Error al conectar con la nube");
        } finally {
            setIsSyncing(false);
        }
    }, [onSyncSuccess, onSyncError]);

    const syncToCloud = useCallback(async (dataToSync: PermitRecord[]): Promise<boolean> => {
        if (!isOnline) {
            onSyncError?.("Sin conexión a internet");
            return false;
        }

        setIsSyncing(true);
        setSyncError(false);

        try {
            const payload = {
                sheetId: CONFIG.DECRETOS_SHEET_ID,
                data: dataToSync.map(r => [
                    r.id, r.solicitudType, r.materia, r.acto, r.funcionario, r.rut,
                    r.periodo, r.cantidadDias, r.fechaInicio, r.tipoJornada,
                    r.diasHaber, r.fechaDecreto, (r.diasHaber - r.cantidadDias), r.ra, r.emite
                ])
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
            console.error("Error sincronizando:", e);
            setSyncError(true);
            onSyncError?.("Error al sincronizar con la nube");

            // Reintento automático
            if (isOnline) {
                retryTimeoutRef.current = setTimeout(() => syncToCloud(dataToSync), 5000);
            }
            return false;
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, onSyncSuccess, onSyncError]);

    // Función para agregar al stack de undo antes de modificar
    const pushToUndoStack = useCallback((currentRecords: PermitRecord[]) => {
        setUndoStack(prev => [...prev.slice(-9), currentRecords]); // Mantener máximo 10 estados
    }, []);

    // Función undo
    const undo = useCallback(() => {
        if (undoStack.length === 0) return;

        const previousState = undoStack[undoStack.length - 1];
        setUndoStack(prev => prev.slice(0, -1));
        setRecords(previousState);
        syncToCloud(previousState);
    }, [undoStack, syncToCloud]);

    // Wrapper de setRecords que guarda en undo stack
    const setRecordsWithUndo: React.Dispatch<React.SetStateAction<PermitRecord[]>> = useCallback(
        (action) => {
            setRecords(prev => {
                pushToUndoStack(prev);
                return typeof action === 'function' ? action(prev) : action;
            });
        },
        [pushToUndoStack]
    );

    return {
        records,
        setRecords: setRecordsWithUndo,
        isSyncing,
        syncError,
        lastSync,
        isOnline,
        fetchFromCloud,
        syncToCloud,
        undoStack,
        undo,
        canUndo: undoStack.length > 0
    };
};
