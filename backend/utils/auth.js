const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const {
  ADMIN_PASSWORD,
  ADMIN_PASSWORD_HASH,
  ADMIN_USERNAME,
  AUTH_COOKIE_NAME,
  AUTH_SECRET
} = require("./config");

function createSignature(payload) {
  return crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
}

function createSessionToken(username) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24;
  const payload = `${username}:${expiresAt}`;
  const signature = createSignature(payload);
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

function verifySessionToken(token) {
  if (!token) {
    return false;
  }

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [username, expiresAt, signature] = decoded.split(":");
    if (!username || !expiresAt || !signature) {
      return false;
    }

    const payload = `${username}:${expiresAt}`;
    const expected = createSignature(payload);
    if (signature !== expected) {
      return false;
    }

    if (Number(expiresAt) < Date.now()) {
      return false;
    }

    return username === ADMIN_USERNAME;
  } catch (_error) {
    return false;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return header.split(";").reduce((accumulator, pair) => {
    const [rawKey, ...rest] = pair.split("=");
    const key = String(rawKey || "").trim();
    if (!key) {
      return accumulator;
    }
    accumulator[key] = decodeURIComponent(rest.join("=").trim());
    return accumulator;
  }, {});
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[AUTH_COOKIE_NAME]);
}

function requireAuth(req, res, sendJson) {
  if (isAuthenticated(req)) {
    return true;
  }

  sendJson(res, 401, { error: "Unauthorized" });
  return false;
}

function getSetCookieHeader(token) {
  return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
}

function getClearCookieHeader() {
  return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

async function authenticateAdminCredentials(username, password) {
  if (String(username || "").trim() !== ADMIN_USERNAME) {
    return false;
  }

  const rawPassword = String(password || "");
  if (ADMIN_PASSWORD) {
    return rawPassword === ADMIN_PASSWORD;
  }

  if (!ADMIN_PASSWORD_HASH) {
    return false;
  }

  const normalizedHash = ADMIN_PASSWORD_HASH.replace(/^\$2y\$/, "$2a$");
  return bcrypt.compare(rawPassword, normalizedHash);
}

module.exports = {
  authenticateAdminCredentials,
  createSessionToken,
  getClearCookieHeader,
  getSetCookieHeader,
  isAuthenticated,
  requireAuth
};
