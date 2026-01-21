
export type SolicitudType = 'PA' | 'FL';

export interface Employee {
  nombre: string;
  rut: string;
}

export interface PermitRecord {
  id: string;
  solicitudType: SolicitudType;
  decreto: string; 
  materia: string;
  acto: string;
  funcionario: string;
  rut: string;
  periodo: string;
  cantidadDias: number;
  fechaInicio: string;
  tipoJornada: string;
  diasHaber: number;
  fechaDecreto: string;
  ra: string;
  emite: string;
  observaciones: string;
  createdAt: number;
}

export type PermitFormData = Omit<PermitRecord, 'id' | 'createdAt'>;
