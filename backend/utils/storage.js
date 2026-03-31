const fs = require("fs/promises");
const path = require("path");
const { DATA_DIR } = require("./config");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonFile(fileName, fallback) {
  const filePath = path.join(DATA_DIR, fileName);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    if (!raw.trim()) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return fallback;
    }

    return fallback;
  }
}

async function writeJsonFile(fileName, value) {
  const filePath = path.join(DATA_DIR, fileName);
  await ensureDir(DATA_DIR);
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
  return value;
}

module.exports = {
  readJsonFile,
  writeJsonFile
};
