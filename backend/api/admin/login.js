const {
  authenticateAdminCredentials,
  createSessionToken,
  getSetCookieHeader
} = require("../../utils/auth");
const { sendJson, sendMethodNotAllowed, getRequestBody } = require("../../utils/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  try {
    const payload = await getRequestBody(req);
    const username = String(payload.username || "").trim();
    const password = String(payload.password || "");

    if (!(await authenticateAdminCredentials(username, password))) {
      sendJson(res, 401, { error: "Invalid username or password" });
      return;
    }

    const token = createSessionToken(username);
    sendJson(
      res,
      200,
      { success: true },
      { "Set-Cookie": getSetCookieHeader(token) }
    );
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Invalid request" });
  }
};
