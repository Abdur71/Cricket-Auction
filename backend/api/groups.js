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

function normalizeFixture(fixture, teams) {
  const safeFixture = fixture && typeof fixture === "object" ? fixture : {};
  const safeTeams = Array.isArray(teams) ? teams : [];
  const teamAId = Number(safeFixture.teamAId) || 0;
  const teamBId = Number(safeFixture.teamBId) || 0;
  const teamA = safeTeams.find((team) => Number(team.id) === teamAId) || null;
  const teamB = safeTeams.find((team) => Number(team.id) === teamBId) || null;

  return {
    id: Number(safeFixture.id) || 0,
    matchTitle: String(safeFixture.matchTitle || "").trim(),
    teamAId,
    teamBId,
    teamAName: teamA ? String(teamA.teamName || "").trim() : String(safeFixture.teamAName || "").trim(),
    teamBName: teamB ? String(teamB.teamName || "").trim() : String(safeFixture.teamBName || "").trim(),
    venue: String(safeFixture.venue || "").trim(),
    matchDate: String(safeFixture.matchDate || "").trim(),
    matchTime: String(safeFixture.matchTime || "").trim(),
    createdAt: String(safeFixture.createdAt || "").trim()
  };
}

module.exports = async function handler(req, res) {
  const resource = String(req.query.resource || "").trim().toLowerCase();

  if (req.method === "GET") {
    try {
      const [groups, teams, fixtures] = await Promise.all([
        readJsonFile("groups.json", []),
        readJsonFile("teams.json", []),
        readJsonFile("fixtures.json", [])
      ]);

      if (resource === "fixtures") {
        sendJson(res, 200, {
          fixtures: (Array.isArray(fixtures) ? fixtures : []).map((fixture) => normalizeFixture(fixture, teams))
        });
        return;
      }

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

      if (resource === "fixtures") {
        const teamAId = Number(payload.team_a_id) || 0;
        const teamBId = Number(payload.team_b_id) || 0;
        const venue = String(payload.venue || "").trim();
        const matchDate = String(payload.match_date || "").trim();
        const matchTime = String(payload.match_time || "").trim();

        if (!teamAId || !teamBId || teamAId === teamBId) {
          sendJson(res, 400, { error: "Select two different teams for the fixture" });
          return;
        }

        const [fixtures, teams] = await Promise.all([
          readJsonFile("fixtures.json", []),
          readJsonFile("teams.json", [])
        ]);
        const safeFixtures = Array.isArray(fixtures) ? fixtures : [];
        const safeTeams = Array.isArray(teams) ? teams : [];
        const teamA = safeTeams.find((team) => Number(team.id) === teamAId);
        const teamB = safeTeams.find((team) => Number(team.id) === teamBId);

        if (!teamA || !teamB) {
          sendJson(res, 400, { error: "Selected teams were not found" });
          return;
        }

        const fixture = {
          id: safeFixtures.length + 1,
          matchTitle: `${String(teamA.teamName || "").trim()} vs ${String(teamB.teamName || "").trim()}`,
          teamAId,
          teamBId,
          teamAName: String(teamA.teamName || "").trim(),
          teamBName: String(teamB.teamName || "").trim(),
          venue,
          matchDate,
          matchTime,
          createdAt: new Date().toISOString()
        };

        safeFixtures.push(fixture);
        await writeJsonFile("fixtures.json", safeFixtures);
        sendJson(res, 200, { success: true, fixture: normalizeFixture(fixture, safeTeams) });
        return;
      }

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
