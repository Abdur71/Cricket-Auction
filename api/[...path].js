const { sendJson } = require("../backend/utils/http");

const routes = {
  "admin/login": require("../backend/api/admin/login"),
  "auth/session": require("../backend/api/auth/session"),
  "auction-settings": require("../backend/api/auction-settings"),
  "committee": require("../backend/api/committee"),
  "current-player": require("../backend/api/current-player"),
  "drive-image": require("../backend/api/drive-image"),
  "groups": require("../backend/api/groups"),
  "players": require("../backend/api/players"),
  "sold-status": require("../backend/api/sold-status"),
  "stage-view": require("../backend/api/stage-view"),
  "teams": require("../backend/api/teams"),
  "teams-with-players": require("../backend/api/teams-with-players")
};

const dynamicRoutes = {
  group: require("../backend/api/group/[id]"),
  players: require("../backend/api/players/[id]"),
  team: require("../backend/api/team/[id]")
};

function getPathSegments(req) {
  const url = new URL(req.url || "/", "http://localhost");
  const apiPath = url.pathname.replace(/^\/api\/?/, "");
  return apiPath
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .filter(Boolean);
}

module.exports = async function handler(req, res) {
  const segments = getPathSegments(req);
  const staticKey = segments.join("/");

  if (routes[staticKey]) {
    await routes[staticKey](req, res);
    return;
  }

  if (segments.length === 2 && dynamicRoutes[segments[0]]) {
    req.query = {
      ...req.query,
      id: segments[1]
    };
    await dynamicRoutes[segments[0]](req, res);
    return;
  }

  sendJson(res, 404, { error: "API route not found" });
};
