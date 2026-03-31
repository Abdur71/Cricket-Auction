const { requireAuth } = require("../utils/auth");
const { sendJson, sendMethodNotAllowed, getRequestBody } = require("../utils/http");
const { readJsonFile, writeJsonFile } = require("../utils/storage");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const stored = await readJsonFile("current_player.json", { id: 0 });
    const data = stored && typeof stored === "object" ? stored : { id: 0 };
    sendJson(res, 200, {
      id: Number(data.id) || 0
    });
    return;
  }

  if (req.method === "POST") {
    if (!requireAuth(req, res, sendJson)) {
      return;
    }

    try {
      const payload = await getRequestBody(req);
      const id = Number(payload.id);

      if (!Number.isInteger(id) || id <= 0) {
        sendJson(res, 400, { error: "Invalid player ID" });
        return;
      }

      await writeJsonFile("current_player.json", {
        id,
        updatedAt: new Date().toISOString()
      });

      sendJson(res, 200, { success: true, id });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid request" });
    }
    return;
  }

  sendMethodNotAllowed(res, ["GET", "POST"]);
};
