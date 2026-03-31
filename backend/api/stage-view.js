const { requireAuth } = require("../utils/auth");
const { sendJson, sendMethodNotAllowed, getRequestBody } = require("../utils/http");
const { readJsonFile, writeJsonFile } = require("../utils/storage");

const DEFAULT_STAGE_VIEW = {
  mode: "none",
  playerId: 0,
  teamId: 0,
  search: "",
  status: "all"
};

const VALID_MODES = ["none", "player", "database", "teams", "team", "countdown"];
const VALID_STATUS = ["all", "sold", "unsold"];

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const data = await readJsonFile("stage_view.json", DEFAULT_STAGE_VIEW);
    sendJson(res, 200, {
      mode: VALID_MODES.includes(data.mode) ? data.mode : DEFAULT_STAGE_VIEW.mode,
      playerId: Number(data.playerId) || 0,
      teamId: Number(data.teamId) || 0,
      search: String(data.search || "").trim(),
      status: VALID_STATUS.includes(data.status) ? data.status : DEFAULT_STAGE_VIEW.status,
      updatedAt: String(data.updatedAt || "").trim()
    });
    return;
  }

  if (req.method === "POST") {
    if (!requireAuth(req, res, sendJson)) {
      return;
    }

    try {
      const payload = await getRequestBody(req);
      const mode = String(payload.mode || "player").trim();
      const status = VALID_STATUS.includes(payload.status) ? payload.status : "all";

      if (!VALID_MODES.includes(mode)) {
        sendJson(res, 400, { error: "Invalid mode" });
        return;
      }

      const data = {
        mode,
        playerId: Number(payload.playerId) > 0 ? Number(payload.playerId) : 0,
        teamId: Number(payload.teamId) > 0 ? Number(payload.teamId) : 0,
        search: String(payload.search || "").trim(),
        status,
        updatedAt: new Date().toISOString()
      };

      await writeJsonFile("stage_view.json", data);
      sendJson(res, 200, { success: true, ...data });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid request" });
    }
    return;
  }

  sendMethodNotAllowed(res, ["GET", "POST"]);
};
