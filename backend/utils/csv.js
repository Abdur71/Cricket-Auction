const { SHEET_URL, SHEET_CACHE_TTL_MS } = require("./config");
const { convertDriveLink, extractDriveId } = require("./drive");
const { readJsonFile } = require("./storage");

const sheetCache = {
  rows: null,
  expiresAt: 0,
  pending: null
};

function getGoogleSheetCsvUrls(sheetUrl) {
  const match = String(sheetUrl || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    return [];
  }

  const sheetId = match[1];
  let gid = "0";

  try {
    const parsed = new URL(sheetUrl);
    const rawGid = parsed.searchParams.get("gid");
    if (rawGid) {
      gid = rawGid.replace(/\D/g, "") || "0";
    }
  } catch (_error) {
    gid = "0";
  }

  return [
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv&gid=${gid}`
  ];
}

async function fetchRemoteText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Auction Sheet Loader"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.text();
}

function parseCsvRow(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current.length > 0) {
        rows.push(parseCsvRow(current));
        current = "";
      }

      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    rows.push(parseCsvRow(current));
  }

  return rows;
}

async function fetchFreshSheetRows() {
  let csvText = "";
  let lastError = null;

  for (const url of getGoogleSheetCsvUrls(SHEET_URL)) {
    try {
      csvText = await fetchRemoteText(url);
      if (csvText.trim()) {
        break;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (!csvText.trim()) {
    throw lastError || new Error("Could not load Google Sheet CSV");
  }

  if (/^\s*<!doctype html/i.test(csvText) || /^\s*<html/i.test(csvText)) {
    throw new Error("Google Sheet is not publicly accessible as CSV");
  }

  const rows = parseCsv(csvText);
  return rows.slice(1);
}

async function loadSheetRows() {
  const now = Date.now();

  if (sheetCache.rows && sheetCache.expiresAt > now) {
    return sheetCache.rows;
  }

  if (sheetCache.pending) {
    return sheetCache.pending;
  }

  sheetCache.pending = fetchFreshSheetRows()
    .then((rows) => {
      sheetCache.rows = rows;
      sheetCache.expiresAt = Date.now() + SHEET_CACHE_TTL_MS;
      return rows;
    })
    .finally(() => {
      sheetCache.pending = null;
    });

  return sheetCache.pending;
}

async function getSoldStates() {
  const states = await readJsonFile("sold_states.json", {});
  return states && typeof states === "object" ? states : {};
}

function getSoldStateDetails(states, id) {
  const entry = states[String(id)];
  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    return {
      sold: Boolean(entry.sold),
      soldPrice: String(entry.soldPrice || "").trim(),
      teamName: String(entry.teamName || "").trim()
    };
  }

  return {
    sold: Boolean(entry),
    soldPrice: "",
    teamName: ""
  };
}

function getPlayerImageFromRow(row) {
  const preferredImage = String(row[4] || "").trim();
  if (preferredImage) {
    return preferredImage;
  }

  const imageCell = row.find((cell) => {
    const value = String(cell || "").trim();
    return (
      extractDriveId(value) ||
      /^https?:\/\/.+\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(value)
    );
  });

  return String(imageCell || "").trim();
}

function mapPlayerRow(row, id, soldStates) {
  const soldState = getSoldStateDetails(soldStates, id);
  const rawImage = getPlayerImageFromRow(row);
  const driveId = extractDriveId(rawImage);
  const normalizedImage = rawImage ? convertDriveLink(rawImage) : "";
  const image = driveId
    ? `/api/drive-image?id=${encodeURIComponent(driveId)}`
    : normalizedImage || "/image.png";

  return {
    id,
    name: String(row[1] || "").trim(),
    series: String(row[2] || "").trim(),
    role: String(row[3] || "").trim(),
    category: String(row[3] || "").trim(),
    price: "50k",
    image,
    sold: soldState.sold,
    soldPrice: soldState.soldPrice,
    teamName: soldState.teamName,
    status: soldState.sold ? "Sold" : "Unsold"
  };
}

async function getAllPlayers() {
  const [rows, soldStates] = await Promise.all([loadSheetRows(), getSoldStates()]);
  return rows.map((row, index) => mapPlayerRow(row, index + 1, soldStates));
}

async function getPlayerById(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }

  const [rows, soldStates] = await Promise.all([loadSheetRows(), getSoldStates()]);
  const row = rows[numericId - 1];
  if (!row) {
    return null;
  }

  return mapPlayerRow(row, numericId, soldStates);
}

module.exports = {
  convertDriveLink,
  getAllPlayers,
  getPlayerById,
  getSoldStates,
  getSoldStateDetails
};
