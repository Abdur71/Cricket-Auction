const fs = require("fs/promises");
const path = require("path");
const { FRONTEND_DIR } = require("../utils/config");

function isValidDriveId(value) {
  return /^[a-zA-Z0-9_-]+$/.test(String(value || "").trim());
}

async function sendFallback(res) {
  try {
    const filePath = path.join(FRONTEND_DIR, "image.png");
    const body = await fs.readFile(filePath);
    res.statusCode = 200;
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.end(body);
  } catch (_error) {
    res.statusCode = 404;
    res.end("Image not found");
  }
}

async function tryFetchImage(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "User-Agent": "Auction Image Proxy"
    }
  });

  if (!response.ok) {
    throw new Error(`Image request failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  if (!body.length) {
    throw new Error("Empty image response");
  }

  return { body, contentType };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end("Method not allowed");
    return;
  }

  const fileId = String(req.query.id || "").trim();
  if (!isValidDriveId(fileId)) {
    await sendFallback(res);
    return;
  }

  const driveUrls = [
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://drive.google.com/uc?export=view&id=${fileId}`
  ];

  for (const url of driveUrls) {
    try {
      const result = await tryFetchImage(url);
      res.statusCode = 200;
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.end(result.body);
      return;
    } catch (_error) {
    }
  }

  await sendFallback(res);
};
