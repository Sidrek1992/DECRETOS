
import { PermitRecord } from '../types';
import { formatLongDate, formatSimpleDate, toProperCase } from '../utils/formatters';

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzFnXNBOFdSn6Gn0Y_uRAikrK6wcQlTCS2Qo-pGqeb_uTLgyrJAf50Rglgml1hzWscRSw/exec';
const TARGET_FOLDER_ID = '1sX722eJuMnnrhqPO-zJF9ccCqlktLDo8';

export const generateDecretoPDF = async (record: PermitRecord, forcePdf: boolean = true) => {
  const pdfWindow = window.open('about:blank', '_blank');
  
  const typeCode = record.solicitudType; 
  const nombreMayuscula = record.funcionario.toUpperCase().trim();
  const nombreProperCase = toProperCase(record.funcionario);
  const actoOficial = record.acto.trim(); 
  
  // Nombre exacto solicitado: SGDP-PA N° 013/2026 - NOMBRE
  const finalFileName = `SGDP-${typeCode} N° ${actoOficial} - ${nombreMayuscula}`;

  if (pdfWindow) {
    pdfWindow.document.write(`
      <html>
        <head>
          <title>SGP Cloud - Procesando</title>
          <style>
            body { 
              font-family: 'Inter', sans-serif; 
              background: #0f172a; 
              color: white; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              overflow: hidden;
            }
            .card {
              background: #1e293b;
              padding: 4rem;
              border-radius: 3rem;
              text-align: center;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
              border: 1px solid #334155;
              max-width: 550px;
              width: 90%;
            }
            .loader { 
              border: 5px solid #1e293b; 
              border-top: 5px solid #38bdf8; 
              border-radius: 50%; 
              width: 70px; 
              height: 70px; 
              animation: spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite; 
              margin: 0 auto 2.5rem; 
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h2 { font-size: 1.5rem; text-transform: uppercase; letter-spacing: 0.3em; color: white; margin: 0; font-weight: 900; }
            .filename { font-size: 0.9rem; color: #38bdf8; margin-top: 2rem; background: #0f172a; padding: 1.5rem; border-radius: 1.5rem; border: 1px solid #38bdf830; font-family: monospace; word-break: break-all; }
            p { font-size: 0.95rem; color: #94a3b8; margin-top: 1.5rem; line-height: 1.6; }
            .badge { display: inline-block; margin-top: 2rem; padding: 0.6rem 1.2rem; background: #38bdf820; border-radius: 1rem; font-size: 11px; font-weight: 800; color: #38bdf8; border: 1px solid #38bdf840; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="loader"></div>
            <h2>SGP ENGINE v9.0</h2>
            <p>Generando documento en Drive...</p>
            <div class="filename">${finalFileName}</div>
            <div class="badge">CONEXIÓN SEGURA</div>
          </div>
        </body>
      </html>
    `);
  }

  // Las llaves con guiones bajos serán buscadas con espacios por el script GAS
  // Ej: Cantidad_de_días -> «Cantidad de días»
  const payload = {
    "fileName": finalFileName,
    "Decreto": actoOficial,
    "FUNCIONARIO": nombreMayuscula, // Etiqueta «FUNCIONARIO» en MAYÚSCULAS
    "Funcionario": nombreProperCase, // Etiqueta «Funcionario» en Mayúsculas Iniciales
    "solicitudType": typeCode,
    "RUT": record.rut.trim(),
    "Fecha": formatSimpleDate(record.fechaDecreto),
    "Cantidad_de_días": record.cantidadDias.toString().replace('.', ','),
    "Fecha_de_inicio": formatLongDate(record.fechaInicio),
    "Tipo_de_Jornada": record.tipoJornada.replace(/[()]/g, '').trim(),
    "Días_a_su_haber": record.diasHaber.toFixed(1).replace('.', ','),
    "Saldo_final": (record.diasHaber - record.cantidadDias).toFixed(1).replace('.', ','),
    "RA": record.ra, 
    "Emite": record.emite 
  };

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const result = await response.json();

    if (result.success && result.url && pdfWindow) {
      let finalUrl = result.url;
      if (forcePdf && finalUrl.includes('/edit')) {
        finalUrl = finalUrl.replace(/\/edit.*$/, '/export?format=pdf');
      }
      pdfWindow.location.href = finalUrl;
    } else {
      throw new Error(result.error || "Respuesta inválida del servidor.");
    }
  } catch (error: any) {
    if (pdfWindow) {
      pdfWindow.document.body.innerHTML = `
        <div style="text-align:center; padding: 50px; color: #ef4444; font-family: 'Inter', sans-serif; background: #0f172a; height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0;">
          <div style="background: #1e293b; padding: 4rem; border-radius: 3rem; border: 1px solid #ef444455; max-width: 550px; width: 90%;">
            <h3 style="color: white; margin-bottom: 20px; font-size: 1.5rem; font-weight: 900;">FALLO EN SERVIDOR</h3>
            <p style="color: #ef4444; font-family: monospace; font-size: 13px;">${error.message}</p>
            <p style="color: #94a3b8; font-size: 11px; margin-top: 10px;">Asegúrate de haber actualizado el código en Google Apps Script.</p>
            <button onclick="window.close()" style="margin-top: 2rem; padding: 1rem 2rem; background: #ef4444; color: white; border:none; border-radius: 1rem; cursor:pointer; font-weight: 800; text-transform: uppercase;">Cerrar</button>
          </div>
        </div>
      `;
    }
  }
};
