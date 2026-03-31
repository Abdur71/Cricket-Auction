const { getPlayerById } = require("../../utils/csv");
const { sendJson, sendMethodNotAllowed } = require("../../utils/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    const player = await getPlayerById(req.query.id);
    if (!player) {
      sendJson(res, 404, { error: "Player not found" });
      return;
    }

    sendJson(res, 200, player);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Could not load player" });
  }
};
