const { getAllPlayers } = require("../utils/csv");
const { sendJson, sendMethodNotAllowed } = require("../utils/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    const players = await getAllPlayers();
    sendJson(res, 200, {
      players,
      total: players.length,
      sold: players.filter((player) => player.status === "Sold").length
    });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Could not load players" });
  }
};
