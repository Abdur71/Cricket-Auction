const { getClearCookieHeader } = require("../../utils/auth");
const { sendJson, sendMethodNotAllowed } = require("../../utils/http");

module.exports = async function handler(req, res) {
  if (!["POST", "GET"].includes(req.method)) {
    sendMethodNotAllowed(res, ["GET", "POST"]);
    return;
  }

  sendJson(
    res,
    200,
    { success: true },
    { "Set-Cookie": getClearCookieHeader() }
  );
};
