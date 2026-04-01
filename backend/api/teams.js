const { requireAuth } = require("../utils/auth");
const { sendJson, sendMethodNotAllowed, getRequestBody } = require("../utils/http");
const { readJsonFile, writeJsonFile } = require("../utils/storage");
const { getAllPlayers } = require("../utils/csv");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const [teams, players] = await Promise.all([
        readJsonFile("teams.json", []),
        getAllPlayers()
      ]);

      const playersByTeam = (Array.isArray(players) ? players : []).reduce((accumulator, player) => {
        if (player && player.sold && player.teamName) {
          if (!accumulator[player.teamName]) {
            accumulator[player.teamName] = [];
          }

          accumulator[player.teamName].push({
            id: player.id,
            name: player.name,
            soldPrice: player.soldPrice
          });
        }

        return accumulator;
      }, {});

      sendJson(res, 200, {
        teams: (Array.isArray(teams) ? teams : [])
          .filter((team) => team && typeof team === "object")
          .map((team) => ({
            id: Number(team.id) || 0,
            teamName: String(team.teamName || "").trim(),
            ownerName: String(team.ownerName || "").trim(),
            ownerPlayerId: Number(team.ownerPlayerId) || 0,
            players: playersByTeam[String(team.teamName || "").trim()] || []
          }))
      });
    } catch (error) {
      sendJson(res, 500, { error: error.message || "Could not load teams" });
    }
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

  if (req.method === "DELETE") {
    if (!requireAuth(req, res, sendJson)) {
      return;
    }

    const id = Number(req.query.id);
    if (!Number.isInteger(id) || id <= 0) {
      sendJson(res, 400, { error: "Invalid team ID" });
      return;
    }

    const [teams, groups] = await Promise.all([
      readJsonFile("teams.json", []),
      readJsonFile("groups.json", [])
    ]);
    const safeTeams = Array.isArray(teams) ? teams : [];
    const safeGroups = Array.isArray(groups) ? groups : [];
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

    await Promise.all([
      writeJsonFile("teams.json", renumbered),
      writeJsonFile("groups.json", updatedGroups)
    ]);
    sendJson(res, 200, { success: true });
    return;
  }

  sendMethodNotAllowed(res, ["GET", "POST", "DELETE"]);
};
