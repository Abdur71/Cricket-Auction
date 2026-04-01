const {
  DYNAMIC_DATA_API_URL,
  DYNAMIC_DATA_API_TOKEN
} = require("./config");

const REMOTE_SHEETS = {
  "teams.json": "teams",
  "groups.json": "groups",
  "sold_states.json": "sold_states",
  "current_player.json": "current_player",
  "stage_view.json": "stage_view",
  "auction_settings.json": "auction_settings"
};

const readCache = new Map();

function getRemoteSheetName(fileName) {
  return REMOTE_SHEETS[fileName] || "";
}

function canUseRemoteStorage(fileName) {
  return Boolean(DYNAMIC_DATA_API_URL && DYNAMIC_DATA_API_TOKEN && getRemoteSheetName(fileName));
}

async function readRemoteJsonFile(fileName, fallback) {
  const cacheKey = `remote:${fileName}`;
  const cached = readCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const url = new URL(DYNAMIC_DATA_API_URL);
  url.searchParams.set("token", DYNAMIC_DATA_API_TOKEN);
  url.searchParams.set("sheet", getRemoteSheetName(fileName));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Remote state read failed with ${response.status}`);
  }

  const payload = await response.json();
  const value = payload && payload.ok ? payload.data : fallback;
  readCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + 2000
  });
  return value;
}

async function writeRemoteJsonFile(fileName, value) {
  const response = await fetch(DYNAMIC_DATA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      token: DYNAMIC_DATA_API_TOKEN,
      sheet: getRemoteSheetName(fileName),
      data: value
    })
  });

  if (!response.ok) {
    throw new Error(`Remote state write failed with ${response.status}`);
  }

  const payload = await response.json();
  if (!payload || !payload.ok) {
    throw new Error(payload && payload.error ? payload.error : "Remote state write failed");
  }

  readCache.set(`remote:${fileName}`, {
    value,
    expiresAt: Date.now() + 2000
  });
  return value;
}

async function readJsonFile(fileName, fallback) {
  if (!canUseRemoteStorage(fileName)) {
    return fallback;
  }

  try {
    return await readRemoteJsonFile(fileName, fallback);
  } catch (_error) {
    return fallback;
  }
}

async function writeJsonFile(fileName, value) {
  if (!canUseRemoteStorage(fileName)) {
    throw new Error(`Remote dynamic-data storage is not configured for ${fileName}`);
  }

  return writeRemoteJsonFile(fileName, value);
}

module.exports = {
  readJsonFile,
  writeJsonFile
};
