
export const formatRut = (rut: string): string => {
  const value = rut.replace(/\./g, '').replace('-', '');
  if (value.length <= 1) return value;
  const dv = value.slice(-1);
  const cuerpo = value.slice(0, -1);
  return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + '-' + dv;
};

export const toProperCase = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const formatLongDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr + 'T12:00:00');
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  }).format(date);
};

export const formatNumericDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr + 'T12:00:00');
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatSimpleDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr + 'T12:00:00');
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${day} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
};

export const formatExcelDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr + 'T12:00:00');
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric'
  }).format(date);
};
