const SHEET_NAMES = [
  'teams',
  'groups',
  'fixtures',
  'results',
  'sold_states',
  'current_player',
  'stage_view',
  'auction_settings'
];

function getToken_() {
  return PropertiesService.getScriptProperties().getProperty('DYNAMIC_DATA_API_TOKEN') || '';
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureSheet_(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 2).setValues([['updatedAt', 'json']]);
  }

  return sheet;
}

function getStoredJson_(sheet) {
  const raw = String(sheet.getRange(2, 2).getValue() || '').trim();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function saveStoredJson_(sheet, data) {
  sheet.getRange(2, 1, 1, 2).setValues([[
    new Date().toISOString(),
    JSON.stringify(data)
  ]]);
}

function validateRequest_(token, sheetName) {
  if (!token || token !== getToken_()) {
    return { ok: false, error: 'Unauthorized' };
  }

  if (SHEET_NAMES.indexOf(sheetName) === -1) {
    return { ok: false, error: 'Invalid sheet' };
  }

  return { ok: true };
}

function doGet(e) {
  const token = e.parameter.token || '';
  const sheetName = e.parameter.sheet || '';
  const validation = validateRequest_(token, sheetName);

  if (!validation.ok) {
    return jsonResponse_(validation);
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureSheet_(spreadsheet, sheetName);
  const data = getStoredJson_(sheet);

  return jsonResponse_({
    ok: true,
    sheet: sheetName,
    data: data
  });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const token = payload.token || '';
    const sheetName = payload.sheet || '';
    const validation = validateRequest_(token, sheetName);

    if (!validation.ok) {
      return jsonResponse_(validation);
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ensureSheet_(spreadsheet, sheetName);
    saveStoredJson_(sheet, payload.data);

    return jsonResponse_({
      ok: true,
      sheet: sheetName
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error && error.message ? error.message : 'Request failed'
    });
  }
}
