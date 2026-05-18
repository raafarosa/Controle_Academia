const SHEET_ID = '1Nw7V-gKIYb_BRVqp6CP6ZUZ6AyPO3qYfIEXSCqM71qQ'; 

// Lista de Feriados Nacionais Fixos (Formato: "DD/MM")
const FERIADOS = ["01/01", "21/04", "01/05", "07/09", "12/10", "02/11", "15/11", "20/11", "25/12"];

function doGet(e) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  if (e && e.parameter && e.parameter.action) {
    return handleAction(sheet, e.parameter);
  }
  return getStreaks(sheet);
}

function doPost(e) { return doGet(e); }

// Função auxiliar para verificar se uma data padrão "dd/MM/yyyy" é dia útil
function ehDiaUtil(dataTexto) {
  const partes = dataTexto.split("/");
  const dia = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10);
  const ano = parseInt(partes[2], 10);
  
  const dataObj = new Date(ano, mes - 1, dia);
  const diaSemana = dataObj.getDay(); // 0 = Domingo, 6 = Sábado
  
  if (diaSemana === 0 || diaSemana === 6) return false;
  
  const diaMes = Utilities.formatDate(dataObj, Session.getScriptTimeZone(), "dd/MM");
  if (FERIADOS.indexOf(diaMes) !== -1) return false;
  
  return true;
}

function getStreaks(sheet) {
  const displayValues = sheet.getDataRange().getDisplayValues();
  const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  
  if (displayValues.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({
      usuario1: { streak: 0, treinouHoje: false, util: ehDiaUtil(hoje) },
      usuario2: { streak: 0, treinouHoje: false, util: ehDiaUtil(hoje) },
      historicoBruto: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const records = displayValues.slice(1).reverse();
  
  let streakRafael = 0;
  let streakIsabelly = 0;
  let rafaelAtivo = true;
  let isabellyAtivo = true;
  
  let rafaelMarcadoHoje = false;
  let isabellyMarcadoHoje = false;
  
  // Criamos uma array otimizada para o front-end mapear as datas reais do S.O.
  let historicoBrutoParaFront = [];
  
  if (records.length > 0 && records[0][0].toString().trim() === hoje) {
    if (records[0][1].toString().trim().toLowerCase() === 'x') rafaelMarcadoHoje = true;
    if (records[0][2].toString().trim().toLowerCase() === 'x') isabellyMarcadoHoje = true;
  }
  
  for (let i = 0; i < records.length; i++) {
    const dataString = records[i][0].toString().trim();
    if (!dataString) continue;
    
    const util = ehDiaUtil(dataString);
    const marcaRafael = records[i][1].toString().trim().toLowerCase() === 'x';
    const marcaIsabelly = records[i][2].toString().trim().toLowerCase() === 'x';
    
    // Alimenta a lista que blinda o front-end
    historicoBrutoParaFront.push({
      data: dataString,
      u1: marcaRafael,
      u2: marcaIsabelly
    });
    
    if (util) {
      if (rafaelAtivo) {
        if (marcaRafael) streakRafael++;
        else if (dataString !== hoje) rafaelAtivo = false; 
      }
      if (isabellyAtivo) {
        if (marcaIsabelly) streakIsabelly++;
        else if (dataString !== hoje) isabellyAtivo = false;
      }
    }
  }
  
  const response = {
    usuario1: { streak: streakRafael, treinouHoje: rafaelMarcadoHoje, util: ehDiaUtil(hoje) },
    usuario2: { streak: streakIsabelly, treinouHoje: isabellyMarcadoHoje, util: ehDiaUtil(hoje) },
    historicoBruto: historicoBrutoParaFront // Envia o mapa de segurança das linhas
  };
  
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}
function handleAction(sheet, params) {
  const user = params.user;
  const action = params.action;
  
  const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  const targetColumn = user === "usuario1" ? 2 : 3;
  
  if (!ehDiaUtil(hoje) && action === 'checkin') {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Fim de semana ou feriado"})).setMimeType(ContentService.MimeType.JSON);
  }
  
  const displayValues = sheet.getDataRange().getDisplayValues();
  
  if (action === 'reset') {
    for (let i = 1; i < displayValues.length; i++) {
      sheet.getRange(i + 1, targetColumn).setValue("");
    }
  } else if (action === 'checkin') {
    let linhaDataHoje = -1;
    
    for (let i = 1; i < displayValues.length; i++) {
      if (displayValues[i][0].toString().trim() === hoje) {
        linhaDataHoje = i + 1;
        break;
      }
    }
    
    if (linhaDataHoje === -1) {
      sheet.appendRow([hoje, "", ""]);
      linhaDataHoje = sheet.getLastRow();
    }
    
    const valorAtual = sheet.getRange(linhaDataHoje, targetColumn).getValue().toString().trim().toLowerCase();
    
    // Mantemos a inversão inteligente: se o botão de marcar ou desmarcar for clicado, o banco executa a ação oposta à atual
    if (valorAtual === 'x') {
      sheet.getRange(linhaDataHoje, targetColumn).setValue("");
    } else {
      sheet.getRange(linhaDataHoje, targetColumn).setValue("x");
    }
  }
  
  // Força a consolidação dos dados e já retorna o painel atualizado em uma única tacada
  SpreadsheetApp.flush(); 
  return getStreaks(sheet);
}