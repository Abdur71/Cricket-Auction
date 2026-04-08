function extractDriveId(link) {
  const value = String(link || "").trim().replace(/&amp;/g, "&");
  if (!value) {
    return "";
  }

  if (/^[a-zA-Z0-9_-]{10,}$/.test(value)) {
    return value;
  }

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
    /\/d\/([a-zA-Z0-9_-]{10,})/,
    /[?&]id=([a-zA-Z0-9_-]{10,})/,
    /\/uc\?.*?[?&]id=([a-zA-Z0-9_-]{10,})/,
    /\/thumbnail\?.*?[?&]id=([a-zA-Z0-9_-]{10,})/
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return "";
}

function convertDriveLink(link) {
  const fileId = extractDriveId(link);
  return fileId
    ? `https://drive.google.com/uc?export=view&id=${fileId}`
    : String(link || "").trim();
}

module.exports = {
  extractDriveId,
  convertDriveLink
};
