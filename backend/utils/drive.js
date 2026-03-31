function extractDriveId(link) {
  const value = String(link || "").trim();
  if (!value) {
    return "";
  }

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/uc\?.*?[?&]id=([a-zA-Z0-9_-]+)/
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
