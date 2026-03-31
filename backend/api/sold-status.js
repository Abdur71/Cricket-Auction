const { requireAuth } = require("../utils/auth");
const { sendJson, sendMethodNotAllowed, getRequestBody } = require("../utils/http");
const { readJsonFile, writeJsonFile } = require("../utils/storage");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  if (!requireAuth(req, res, sendJson)) {
    return;
  }

  try {
    const payload = await getRequestBody(req);
    const id = Number(payload.id);
    const sold = Boolean(payload.sold);
    const soldPrice = String(payload.sold_price || "").trim();
    const teamName = String(payload.team_name || "").trim();

    if (!Number.isInteger(id) || id <= 0) {
      sendJson(res, 400, { error: "Invalid player ID" });
      return;
    }

    const states = await readJsonFile("sold_states.json", {});
    const safeStates = states && typeof states === "object" ? states : {};

    if (sold) {
      safeStates[String(id)] = {
        sold: true,
        soldPrice,
        teamName
      };
    } else {
      delete safeStates[String(id)];
    }

    await writeJsonFile("sold_states.json", safeStates);
    sendJson(res, 200, {
      success: true,
      id,
      sold,
      soldPrice: sold ? soldPrice : "",
      teamName: sold ? teamName : ""
    });
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Invalid request" });
  }
};
