const { requireAuth } = require("../utils/auth");
const { sendJson, sendMethodNotAllowed, getRequestBody } = require("../utils/http");
const { readJsonFile, writeJsonFile } = require("../utils/storage");

const DEFAULT_SETTINGS = {
  startTime: "",
  endMessage: "Auction has started.",
  breakingNews: "",
  countdownEnabled: false
};

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const stored = await readJsonFile("auction_settings.json", DEFAULT_SETTINGS);
    const data = stored && typeof stored === "object" ? stored : DEFAULT_SETTINGS;
    sendJson(res, 200, {
      startTime: String(data.startTime || "").trim(),
      endMessage: String(data.endMessage || "").trim() || DEFAULT_SETTINGS.endMessage,
      breakingNews: String(data.breakingNews || "").trim(),
      countdownEnabled: data.countdownEnabled !== false
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
      const breakingNews = String(payload.breaking_news || "").trim();
      const countdownEnabled = payload.countdown_enabled !== false;

      if (countdownEnabled && !startTime) {
        sendJson(res, 400, { error: "Auction start time is required" });
        return;
      }

      await writeJsonFile("auction_settings.json", {
        startTime,
        endMessage,
        breakingNews,
        countdownEnabled,
        updatedAt: new Date().toISOString()
      });

      sendJson(res, 200, {
        success: true,
        startTime,
        endMessage,
        breakingNews,
        countdownEnabled
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid request" });
    }
    return;
  }

  sendMethodNotAllowed(res, ["GET", "POST"]);
};
