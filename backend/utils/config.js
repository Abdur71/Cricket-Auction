const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");

module.exports = {
  ROOT_DIR,
  FRONTEND_DIR,
  SHEET_URL:
    process.env.GOOGLE_SHEET_URL ||
    "https://docs.google.com/spreadsheets/d/1xPIesIE3jrRJI67knyypgyIpoBD98eRwVPxk81z5w50/edit?usp=sharing",
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || "admin",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_PLAIN || "",
  ADMIN_PASSWORD_HASH:
    process.env.ADMIN_PASSWORD_HASH ||
    "$2y$10$RNB.QVB0IThm7H0srY7CAeB2l/uzXZyYAKRTzD4.LEbemxPWdSWYq",
  AUTH_COOKIE_NAME: "auction_admin_session",
  AUTH_SECRET: process.env.AUTH_SECRET || "change-this-secret-in-production",
  SHEET_CACHE_TTL_MS: Number(process.env.SHEET_CACHE_TTL_MS) || 60000,
  DYNAMIC_DATA_API_URL: process.env.DYNAMIC_DATA_API_URL || "",
  DYNAMIC_DATA_API_TOKEN: process.env.DYNAMIC_DATA_API_TOKEN || ""
};
