const fs = require("fs/promises");
const path = require("path");
const { FRONTEND_DIR } = require("../utils/config");

function isValidDriveId(value) {
  return /^[a-zA-Z0-9_-]+$/.test(String(value || "").trim());
}

async function sendFallback(res, statusCode = 200, message = "") {
  if (message) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(message);
    return;
  }

  try {
    const filePath = path.join(FRONTEND_DIR, "image.png");
    const body = await fs.readFile(filePath);
    res.statusCode = statusCode;
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

  const rawContentType = response.headers.get("content-type") || "";
  const arrayBuffer = await response.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  if (!body.length) {
    throw new Error("Empty image response");
  }

  const detectedContentType = detectImageContentType(body);
  const contentType = rawContentType.toLowerCase().startsWith("image/")
    ? rawContentType
    : detectedContentType;

  if (!contentType) {
    throw new Error(`Drive response was not an image: ${rawContentType || "unknown content type"}`);
  }

  return { body, contentType };
}

function detectImageContentType(body) {
  if (body.length >= 8 && body[0] === 0x89 && body.slice(1, 4).toString("ascii") === "PNG") {
    return "image/png";
  }

  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) {
    return "image/jpeg";
  }

  if (body.length >= 12 && body.slice(0, 4).toString("ascii") === "RIFF" && body.slice(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }

  if (body.length >= 6) {
    const header = body.slice(0, 6).toString("ascii");
    if (header === "GIF87a" || header === "GIF89a") {
      return "image/gif";
    }
  }

  return "";
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
    await sendFallback(res, 400, "Invalid Google Drive image id");
    return;
  }

  const driveUrls = [
    `https://lh3.googleusercontent.com/d/${fileId}=w1200`,
    `https://drive.usercontent.google.com/download?id=${fileId}&export=view&authuser=0`,
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

  await sendFallback(res, 404, "Could not load Google Drive image. Check that the file is shared with anyone who has the link.");
};
