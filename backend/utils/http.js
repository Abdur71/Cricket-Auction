function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.statusCode = statusCode;
  Object.entries({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  }).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.end(JSON.stringify(payload));
}

function sendMethodNotAllowed(res, allowed) {
  sendJson(
    res,
    405,
    { error: "Method not allowed" },
    { Allow: Array.isArray(allowed) ? allowed.join(", ") : allowed }
  );
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

module.exports = {
  sendJson,
  sendMethodNotAllowed,
  getRequestBody
};
