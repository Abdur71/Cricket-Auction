const { requireAuth } = require("../utils/auth");
const { sendJson, sendMethodNotAllowed, getRequestBody } = require("../utils/http");
const { readJsonFile, writeJsonFile } = require("../utils/storage");

const DEFAULT_SETTINGS = {
  startTime: "",
  endMessage: "Auction has started."
};

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const data = await readJsonFile("auction_settings.json", DEFAULT_SETTINGS);
    sendJson(res, 200, {
      startTime: String(data.startTime || "").trim(),
      endMessage: String(data.endMessage || "").trim() || DEFAULT_SETTINGS.endMessage
    });
    return;
  }

  if (req.method === "POST") {
    if (!requireAuth(req, res, sendJson)) {
      return;
    }

    try {
      const payload = await getRequestBody(req);
      const startTime = String(payload.start_time || "").trim();
      const endMessage =
        String(payload.end_message || "").trim() || DEFAULT_SETTINGS.endMessage;

      if (!startTime) {
        sendJson(res, 400, { error: "Auction start time is required" });
        return;
      }

      await writeJsonFile("auction_settings.json", {
        startTime,
        endMessage,
        updatedAt: new Date().toISOString()
      });

      sendJson(res, 200, { success: true, startTime, endMessage });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid request" });
    }
    return;
  }

  sendMethodNotAllowed(res, ["GET", "POST"]);
};
