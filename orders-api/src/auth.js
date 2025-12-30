const jwt = require("jsonwebtoken");
const { cfg } = require("./config");
const { unauthorized } = require("./errors");

function authJwt(req, res, next) {
  const h = req.headers.authorization || "";
  const [t, token] = h.split(" ");
  if (t !== "Bearer" || !token) return next(unauthorized("Unauthorized"));
  try {
    req.user = jwt.verify(token, cfg.jwtSecret);
    next();
  } catch {
    next(unauthorized("Unauthorized"));
  }
}

module.exports = { authJwt };
