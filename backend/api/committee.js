const { requireAuth } = require("../utils/auth");
const { sendJson, sendMethodNotAllowed, getRequestBody } = require("../utils/http");
const { readJsonFile, writeJsonFile } = require("../utils/storage");

function normalizeMember(member) {
  const safeMember = member && typeof member === "object" ? member : {};

  return {
    id: Number(safeMember.id) || 0,
    photo: String(safeMember.photo || "").trim(),
    name: String(safeMember.name || "").trim(),
    series: String(safeMember.series || "").trim(),
    phone: String(safeMember.phone || "").trim(),
    createdAt: String(safeMember.createdAt || "").trim()
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const members = await readJsonFile("committee.json", []);
      sendJson(res, 200, {
        members: (Array.isArray(members) ? members : []).map(normalizeMember)
      });
    } catch (error) {
      sendJson(res, 500, { error: error.message || "Could not load committee members" });
    }
    return;
  }

  if (req.method === "POST") {
    if (!requireAuth(req, res, sendJson)) {
      return;
    }

    try {
      const payload = await getRequestBody(req);
      const photo = String(payload.photo || "").trim();
      const name = String(payload.name || "").trim();
      const series = String(payload.series || "").trim();
      const phone = String(payload.phone || "").trim();

      if (!photo || !name || !series || !phone) {
        sendJson(res, 400, { error: "Photo, name, series, and phone number are required" });
        return;
      }

      const members = await readJsonFile("committee.json", []);
      const safeMembers = Array.isArray(members) ? members : [];
      const member = {
        id: safeMembers.length + 1,
        photo,
        name,
        series,
        phone,
        createdAt: new Date().toISOString()
      };

      safeMembers.push(member);
      await writeJsonFile("committee.json", safeMembers);
      sendJson(res, 200, { success: true, member: normalizeMember(member) });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid request" });
    }
    return;
  }

  if (req.method === "DELETE") {
    if (!requireAuth(req, res, sendJson)) {
      return;
    }

    const id = Number(req.query.id);
    if (!Number.isInteger(id) || id <= 0) {
      sendJson(res, 400, { error: "Invalid committee member ID" });
      return;
    }

    const members = await readJsonFile("committee.json", []);
    const safeMembers = Array.isArray(members) ? members : [];
    const filtered = safeMembers.filter((member) => Number(member.id) !== id);

    if (filtered.length === safeMembers.length) {
      sendJson(res, 404, { error: "Committee member not found" });
      return;
    }

    const renumbered = filtered.map((member, index) => ({
      ...member,
      id: index + 1
    }));

    await writeJsonFile("committee.json", renumbered);
    sendJson(res, 200, { success: true });
    return;
  }

  sendMethodNotAllowed(res, ["GET", "POST", "DELETE"]);
};
