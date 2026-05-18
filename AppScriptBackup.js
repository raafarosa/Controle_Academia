const SHEET_ID = '1Nw7V-gKIYb_BRVqp6CP6ZUZ6AyPO3qYfIEXSCqM71qQ'; 

function doGet(e) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  
  // Se a requisição contiver parâmetros (ex: ?action=checkin), executa a gravação
  if (e && e.parameter && e.parameter.action) {
    return handleAction(sheet, e.parameter);
  }
  
  // Se for apenas uma consulta simples (sem parâmetros), retorna o streak atual
  return getStreaks(sheet);
}

// O doPost redireciona para o doGet para evitar falhas de CORS no navegador
function doPost(e) {
  return doGet(e);
}

function getStreaks(sheet) {
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({
      usuario1: { streak: 0 },
      usuario2: { streak: 0 }
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const records = data.slice(1).reverse();
  let streakRafael = 0;
  let streakIsabelly = 0;
  let rafaelAtivo = true;
  let isabellyAtivo = true;
  
  records.forEach(row => {
    // Rafael (Coluna B)
    if (rafaelAtivo && row[1].toString().trim().toLowerCase() === 'x') {
      streakRafael++;
    } else if (row[1].toString().trim() !== '') {
      rafaelAtivo = false; 
    }
    
    // Isabelly (Coluna C)
    if (isabellyAtivo && row[2].toString().trim().toLowerCase() === 'x') {
      streakIsabelly++;
    } else if (row[2].toString().trim() !== '') {
      isabellyAtivo = false; 
    }
  });
  
  const response = {
    usuario1: { streak: streakRafael },
    usuario2: { streak: streakIsabelly }
  };
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAction(sheet, params) {
  const user = params.user;     // 'usuario1' ou 'usuario2'
  const action = params.action; // 'checkin' ou 'reset'
  
  const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  const data = sheet.getDataRange().getValues();
  const targetColumn = user === "usuario1" ? 2 : 3; // Coluna B (Rafael) ou C (Isabelly)
  
  if (action === 'reset') {
    // Limpa o histórico da coluna deste usuário para zerar o streak
    for (let i = 1; i < data.length; i++) {
      sheet.getRange(i + 1, targetColumn).setValue("");
    }
  } else if (action === 'checkin') {
    let linhaDataHoje = -1;
    for (let i = 1; i < data.length; i++) {
      let dataCelula = data[i][0];
      let dataFormatadaPlanilha = "";
      
      if (dataCelula instanceof Date) {
        dataFormatadaPlanilha = Utilities.formatDate(dataCelula, Session.getScriptTimeZone(), "dd/MM/yyyy");
      } else {
        dataFormatadaPlanilha = dataCelula.toString().trim();
      }
      
      if (dataFormatadaPlanilha === hoje) {
        linhaDataHoje = i + 1;
        break;
      }
    }
    
    if (linhaDataHoje === -1) {
      sheet.appendRow([hoje, "", ""]);
      linhaDataHoje = sheet.getLastRow();
    }
    
    sheet.getRange(linhaDataHoje, targetColumn).setValue("x");
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}