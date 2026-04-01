const { requireAuth } = require("../utils/auth");
const { sendJson, sendMethodNotAllowed, getRequestBody } = require("../utils/http");
const { readJsonFile, writeJsonFile } = require("../utils/storage");

function normalizeGroup(group, teams) {
  const safeGroup = group && typeof group === "object" ? group : {};
  const teamIds = Array.isArray(safeGroup.teamIds) ? safeGroup.teamIds.map((teamId) => Number(teamId)).filter((teamId) => teamId > 0) : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  const assignedTeams = teamIds
    .map((teamId) => safeTeams.find((team) => Number(team.id) === teamId))
    .filter(Boolean)
    .map((team) => ({
      id: Number(team.id) || 0,
      teamName: String(team.teamName || "").trim(),
      ownerName: String(team.ownerName || "").trim()
    }));

  return {
    id: Number(safeGroup.id) || 0,
    groupName: String(safeGroup.groupName || "").trim(),
    teamLimit: Number(safeGroup.teamLimit) > 0 ? Number(safeGroup.teamLimit) : 0,
    teamIds,
    teams: assignedTeams,
    createdAt: String(safeGroup.createdAt || "").trim()
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const [groups, teams] = await Promise.all([
        readJsonFile("groups.json", []),
        readJsonFile("teams.json", [])
      ]);

      sendJson(res, 200, {
        groups: (Array.isArray(groups) ? groups : []).map((group) => normalizeGroup(group, teams))
      });
    } catch (error) {
      sendJson(res, 500, { error: error.message || "Could not load groups" });
    }
    return;
  }

  if (req.method === "POST") {
    if (!requireAuth(req, res, sendJson)) {
      return;
    }

    try {
      const payload = await getRequestBody(req);
      const groupName = String(payload.group_name || "").trim();
      const teamLimit = Number(payload.team_limit) || 0;

      if (!groupName || teamLimit <= 0) {
        sendJson(res, 400, { error: "Group name and valid team limit are required" });
        return;
      }

      const groups = await readJsonFile("groups.json", []);
      const safeGroups = Array.isArray(groups) ? groups : [];
      const group = {
        id: safeGroups.length + 1,
        groupName,
        teamLimit,
        teamIds: [],
        createdAt: new Date().toISOString()
      };

      safeGroups.push(group);
      await writeJsonFile("groups.json", safeGroups);
      sendJson(res, 200, { success: true, group });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid request" });
    }
    return;
  }

  sendMethodNotAllowed(res, ["GET", "POST"]);
};
