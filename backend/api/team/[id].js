const { requireAuth } = require("../../utils/auth");
const { sendJson, sendMethodNotAllowed } = require("../../utils/http");
const { readJsonFile, writeJsonFile } = require("../../utils/storage");

module.exports = async function handler(req, res) {
  if (req.method !== "DELETE") {
    sendMethodNotAllowed(res, ["DELETE"]);
    return;
  }

  if (!requireAuth(req, res, sendJson)) {
    return;
  }

  const id = Number(req.query.id);
  if (!Number.isInteger(id) || id <= 0) {
    sendJson(res, 400, { error: "Invalid team ID" });
    return;
  }

  const teams = await readJsonFile("teams.json", []);
  const safeTeams = Array.isArray(teams) ? teams : [];
  const filtered = safeTeams.filter((team) => Number(team.id) !== id);

  if (filtered.length === safeTeams.length) {
    sendJson(res, 404, { error: "Team not found" });
    return;
  }

  const renumbered = filtered.map((team, index) => ({
    ...team,
    id: index + 1
  }));

  await writeJsonFile("teams.json", renumbered);
  sendJson(res, 200, { success: true });
};
