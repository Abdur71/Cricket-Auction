const { requireAuth } = require("../../utils/auth");
const { sendJson, sendMethodNotAllowed, getRequestBody } = require("../../utils/http");
const { readJsonFile, writeJsonFile } = require("../../utils/storage");

module.exports = async function handler(req, res) {
  if (!["PUT", "DELETE"].includes(req.method)) {
    sendMethodNotAllowed(res, ["PUT", "DELETE"]);
    return;
  }

  if (!requireAuth(req, res, sendJson)) {
    return;
  }

  const id = Number(req.query.id);
  if (!Number.isInteger(id) || id <= 0) {
    sendJson(res, 400, { error: "Invalid group ID" });
    return;
  }

  if (req.method === "DELETE") {
    const groups = await readJsonFile("groups.json", []);
    const safeGroups = Array.isArray(groups) ? groups : [];
    const filtered = safeGroups.filter((group) => Number(group.id) !== id);

    if (filtered.length === safeGroups.length) {
      sendJson(res, 404, { error: "Group not found" });
      return;
    }

    const renumbered = filtered.map((group, index) => ({
      ...group,
      id: index + 1
    }));

    await writeJsonFile("groups.json", renumbered);
    sendJson(res, 200, { success: true });
    return;
  }

  try {
    const payload = await getRequestBody(req);
    const teamIds = Array.isArray(payload.team_ids)
      ? payload.team_ids.map((teamId) => Number(teamId)).filter((teamId) => teamId > 0)
      : [];

    const [groups, teams] = await Promise.all([
      readJsonFile("groups.json", []),
      readJsonFile("teams.json", [])
    ]);

    const safeGroups = Array.isArray(groups) ? groups : [];
    const safeTeams = Array.isArray(teams) ? teams : [];
    const groupIndex = safeGroups.findIndex((group) => Number(group.id) === id);

    if (groupIndex === -1) {
      sendJson(res, 404, { error: "Group not found" });
      return;
    }

    const invalidTeam = teamIds.find((teamId) => !safeTeams.some((team) => Number(team.id) === teamId));
    if (invalidTeam) {
      sendJson(res, 400, { error: "One or more selected teams do not exist" });
      return;
    }

    const currentGroup = safeGroups[groupIndex];
    const teamLimit = Number(currentGroup.teamLimit) || 0;
    if (teamLimit > 0 && teamIds.length > teamLimit) {
      sendJson(res, 400, { error: `This group can contain up to ${teamLimit} teams` });
      return;
    }

    const updatedGroups = safeGroups.map((group) => ({
      ...group,
      teamIds: Number(group.id) === id
        ? teamIds
        : (Array.isArray(group.teamIds) ? group.teamIds : []).filter((teamId) => !teamIds.includes(Number(teamId)))
    }));

    await writeJsonFile("groups.json", updatedGroups);
    sendJson(res, 200, {
      success: true,
      group: updatedGroups.find((group) => Number(group.id) === id)
    });
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Invalid request" });
  }
};
