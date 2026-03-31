const { requireAuth } = require("../utils/auth");
const { sendJson, sendMethodNotAllowed, getRequestBody } = require("../utils/http");
const { readJsonFile, writeJsonFile } = require("../utils/storage");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const teams = await readJsonFile("teams.json", []);
    sendJson(res, 200, {
      teams: Array.isArray(teams) ? teams.filter((team) => team && typeof team === "object") : []
    });
    return;
  }

  if (req.method === "POST") {
    if (!requireAuth(req, res, sendJson)) {
      return;
    }

    try {
      const payload = await getRequestBody(req);
      const teamName = String(payload.team_name || "").trim();
      const ownerName = String(payload.owner_name || "").trim();
      const ownerPlayerId = Number(payload.owner_player_id) || 0;

      if (!teamName || !ownerName) {
        sendJson(res, 400, { error: "Team name and owner name are required" });
        return;
      }

      const teams = await readJsonFile("teams.json", []);
      const safeTeams = Array.isArray(teams) ? teams : [];
      const team = {
        id: safeTeams.length + 1,
        teamName,
        ownerName,
        ownerPlayerId: ownerPlayerId > 0 ? ownerPlayerId : null,
        createdAt: new Date().toISOString()
      };

      safeTeams.push(team);
      await writeJsonFile("teams.json", safeTeams);
      sendJson(res, 200, { success: true, team });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid request" });
    }
    return;
  }

  sendMethodNotAllowed(res, ["GET", "POST"]);
};
