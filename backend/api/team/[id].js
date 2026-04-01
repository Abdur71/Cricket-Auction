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

  const [teams, groups, fixtures] = await Promise.all([
    readJsonFile("teams.json", []),
    readJsonFile("groups.json", []),
    readJsonFile("fixtures.json", [])
  ]);
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeGroups = Array.isArray(groups) ? groups : [];
  const safeFixtures = Array.isArray(fixtures) ? fixtures : [];
  const filtered = safeTeams.filter((team) => Number(team.id) !== id);

  if (filtered.length === safeTeams.length) {
    sendJson(res, 404, { error: "Team not found" });
    return;
  }

  const previousToNextTeamId = new Map();
  const renumbered = filtered.map((team, index) => ({
    ...team,
    id: index + 1
  }));
  renumbered.forEach((team, index) => {
    previousToNextTeamId.set(Number(filtered[index].id), team.id);
  });

  const updatedGroups = safeGroups.map((group) => ({
    ...group,
    teamIds: (Array.isArray(group.teamIds) ? group.teamIds : [])
      .filter((teamId) => teamId !== id && previousToNextTeamId.has(Number(teamId)))
      .map((teamId) => previousToNextTeamId.get(Number(teamId)))
  }));

  const updatedFixtures = safeFixtures
    .filter((fixture) => Number(fixture.teamAId) !== id && Number(fixture.teamBId) !== id)
    .map((fixture, index) => ({
      ...fixture,
      id: index + 1,
      teamAId: previousToNextTeamId.get(Number(fixture.teamAId)) || 0,
      teamBId: previousToNextTeamId.get(Number(fixture.teamBId)) || 0
    }));

  await Promise.all([
    writeJsonFile("teams.json", renumbered),
    writeJsonFile("groups.json", updatedGroups),
    writeJsonFile("fixtures.json", updatedFixtures)
  ]);
  sendJson(res, 200, { success: true });
};
