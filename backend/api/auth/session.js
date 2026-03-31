const { isAuthenticated } = require("../../utils/auth");
const { sendJson, sendMethodNotAllowed } = require("../../utils/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  sendJson(res, 200, { authenticated: isAuthenticated(req) });
};
