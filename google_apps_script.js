
// SGP CLOUD - SISTEMA DE GENERACIÓN DE DECRETOS 2026
// VERSIÓN REFORZADA PARA SINCRONIZACIÓN EN TIEMPO REAL

const TEMPLATE_DOC_ID = '1BvJanZb0936sPvV0oEZw-E0sro_02ibm_BFQuXa6F24';
const FOLDER_DESTINATION_ID = '1sX722eJuMnnrhqPO-zJF9ccCqlktLDo8';

/**
 * Función principal que recibe las peticiones POST.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: "Petición sin datos en el cuerpo" });
    }

    var payload = JSON.parse(e.postData.contents);
    
    // Si la petición trae un sheetId, es para sincronizar la base de datos de decretos
    if (payload.sheetId) {
      return handleSpreadsheetSync(payload);
    }
    
    // De lo contrario, es para generar un documento individual
    return handleDocumentCreation(payload);
    
  } catch (err) {
    return createJsonResponse({ 
      success: false, 
      error: "Error crítico en motor GAS: " + err.toString() 
    });
  }
}

/**
 * Maneja las peticiones OPTIONS para CORS (opcional, pero ayuda en navegadores modernos)
 */
function doOptions(e) {
  return createJsonResponse({ success: true });
}

/**
 * Procesa la creación del documento y el reemplazo de etiquetas.
 */
function handleDocumentCreation(data) {
  try {
    var template = DriveApp.getFileById(TEMPLATE_DOC_ID);
    var folder = DriveApp.getFolderById(FOLDER_DESTINATION_ID);
    
    var name = data.fileName || "DOC_SGP_AUTO_" + new Date().getTime();
    
    var copy = template.makeCopy(name, folder);
    var doc = DocumentApp.openById(copy.getId());
    var body = doc.getBody();
    
    for (var key in data) {
      var val = (data[key] !== undefined && data[key] !== null) ? data[key].toString() : "";
      
      // Reemplazo múltiple para mayor compatibilidad de etiquetas
      body.replaceText('«' + key + '»', val);
      body.replaceText('{{' + key + '}}', val);
      
      var keyWithSpaces = key.replace(/_/g, ' ');
      if (key !== keyWithSpaces) {
        body.replaceText('«' + keyWithSpaces + '»', val);
        body.replaceText('{{' + keyWithSpaces + '}}', val);
      }
    }
    
    doc.saveAndClose();
    copy.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return createJsonResponse({ 
      success: true, 
      url: copy.getUrl(),
      id: copy.getId()
    });

  } catch (e) {
    return createJsonResponse({ success: false, error: "Error en Docs/Drive: " + e.toString() });
  }
}

/**
 * Sincroniza los datos con la planilla de Google Sheets de manera segura.
 */
function handleSpreadsheetSync(payload) {
  try {
    var ss = SpreadsheetApp.openById(payload.sheetId);
    var sheet = ss.getSheets()[0];
    
    // Bloqueamos el script para evitar colisiones si varios usuarios guardan a la vez
    var lock = LockService.getScriptLock();
    lock.waitLock(10000); // espera hasta 10 segundos
    
    sheet.clearContents();
    var headers = ["ID", "Tipo", "Materia", "Acto", "Funcionario", "RUT", "Periodo", "Días", "Inicio", "Jornada", "Haber", "Fecha", "Saldo", "RA", "Emite"];
    
    sheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight("bold")
      .setBackground("#f1f5f9");

    if (payload.data && payload.data.length > 0) {
      sheet.getRange(2, 1, payload.data.length, payload.data[0].length)
        .setValues(payload.data);
    }
    
    sheet.autoResizeColumns(1, headers.length);
    
    SpreadsheetApp.flush();
    lock.releaseLock();
    
    return createJsonResponse({ success: true, message: "Sincronización completa" });
    
  } catch (e) {
    return createJsonResponse({ success: false, error: "Error en Motor Sheets: " + e.toString() });
  }
}

/**
 * Genera la respuesta en formato JSON con cabeceras CORS básicas.
 */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
