const { requireAuth } = require("../../utils/auth");
const { sendJson, sendMethodNotAllowed, getRequestBody } = require("../../utils/http");
const { readJsonFile, writeJsonFile } = require("../../utils/storage");

module.exports = async function handler(req, res) {
  const resource = String(req.query.resource || "").trim().toLowerCase();

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
    if (resource === "fixtures") {
      const fixtures = await readJsonFile("fixtures.json", []);
      const results = await readJsonFile("results.json", []);
      const safeFixtures = Array.isArray(fixtures) ? fixtures : [];
      const filtered = safeFixtures.filter((fixture) => Number(fixture.id) !== id);

      if (filtered.length === safeFixtures.length) {
        sendJson(res, 404, { error: "Fixture not found" });
        return;
      }

      const renumbered = filtered.map((fixture, index) => ({
        ...fixture,
        id: index + 1
      }));

      const safeResults = Array.isArray(results) ? results : [];
      const renumberedResults = safeResults
        .filter((result) => Number(result.fixtureId || result.id) !== id)
        .map((result) => {
          const previousId = Number(result.fixtureId || result.id);
          const nextId = previousId > id ? previousId - 1 : previousId;
          return {
            ...result,
            id: nextId,
            fixtureId: nextId
          };
        });

      await writeJsonFile("fixtures.json", renumbered);
      await writeJsonFile("results.json", renumberedResults);
      sendJson(res, 200, { success: true });
      return;
    }

    if (resource === "results") {
      const results = await readJsonFile("results.json", []);
      const safeResults = Array.isArray(results) ? results : [];
      await writeJsonFile(
        "results.json",
        safeResults.filter((result) => Number(result.fixtureId || result.id) !== id)
      );
      sendJson(res, 200, { success: true });
      return;
    }

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
      const fixtureIndex = safeFixtures.findIndex((fixture) => Number(fixture.id) === id);

      if (fixtureIndex === -1) {
        sendJson(res, 404, { error: "Fixture not found" });
        return;
      }

      const teamA = safeTeams.find((team) => Number(team.id) === teamAId);
      const teamB = safeTeams.find((team) => Number(team.id) === teamBId);
      if (!teamA || !teamB) {
        sendJson(res, 400, { error: "Selected teams were not found" });
        return;
      }

      const updatedFixtures = safeFixtures.map((fixture) => Number(fixture.id) === id ? {
        ...fixture,
        matchTitle: `${String(teamA.teamName || "").trim()} vs ${String(teamB.teamName || "").trim()}`,
        teamAId,
        teamBId,
        teamAName: String(teamA.teamName || "").trim(),
        teamBName: String(teamB.teamName || "").trim(),
        venue,
        matchDate,
        matchTime
      } : fixture);

      await writeJsonFile("fixtures.json", updatedFixtures);
      sendJson(res, 200, {
        success: true,
        fixture: updatedFixtures.find((fixture) => Number(fixture.id) === id)
      });
      return;
    }

    if (resource === "results") {
      const teamARuns = Number(payload.team_a_runs);
      const teamAWickets = Number(payload.team_a_wickets);
      const teamAOvers = String(payload.team_a_overs || "").trim();
      const teamBRuns = Number(payload.team_b_runs);
      const teamBWickets = Number(payload.team_b_wickets);
      const teamBOvers = String(payload.team_b_overs || "").trim();

      if ([teamARuns, teamAWickets, teamBRuns, teamBWickets].some((value) => Number.isNaN(value) || value < 0)) {
        sendJson(res, 400, { error: "Runs and wickets must be valid non-negative numbers" });
        return;
      }

      const [fixtures, results] = await Promise.all([
        readJsonFile("fixtures.json", []),
        readJsonFile("results.json", [])
      ]);
      const safeFixtures = Array.isArray(fixtures) ? fixtures : [];
      const safeResults = Array.isArray(results) ? results : [];

      if (!safeFixtures.some((fixture) => Number(fixture.id) === id)) {
        sendJson(res, 404, { error: "Fixture not found" });
        return;
      }

      const nextResult = {
        id,
        fixtureId: id,
        teamARuns,
        teamAWickets,
        teamAOvers,
        teamBRuns,
        teamBWickets,
        teamBOvers,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const existingIndex = safeResults.findIndex((result) => Number(result.fixtureId || result.id) === id);
      const updatedResults = existingIndex >= 0
        ? safeResults.map((result, index) => index === existingIndex ? {
          ...result,
          ...nextResult,
          createdAt: String(result.createdAt || "").trim() || nextResult.createdAt
        } : result)
        : [...safeResults, nextResult];

      await writeJsonFile("results.json", updatedResults);
      sendJson(res, 200, { success: true, result: nextResult });
      return;
    }

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
