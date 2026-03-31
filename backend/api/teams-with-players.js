const { getAllPlayers } = require("../utils/csv");
const { sendJson, sendMethodNotAllowed } = require("../utils/http");
const { readJsonFile } = require("../utils/storage");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    const [teams, players] = await Promise.all([
      readJsonFile("teams.json", []),
      getAllPlayers()
    ]);

    const playersByTeam = players.reduce((accumulator, player) => {
      if (player.sold && player.teamName) {
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

    const result = (Array.isArray(teams) ? teams : []).map((team) => ({
      id: Number(team.id) || 0,
      teamName: String(team.teamName || "").trim(),
      ownerName: String(team.ownerName || "").trim(),
      ownerPlayerId: Number(team.ownerPlayerId) || 0,
      players: playersByTeam[String(team.teamName || "").trim()] || []
    }));

    sendJson(res, 200, { teams: result });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Could not load teams" });
  }
};
