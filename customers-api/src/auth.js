const jwt = require("jsonwebtoken");
const { cfg } = require("./config");
const { unauthorized } = require("./errors");

function authJwt(req, res, next) {
  const h = req.headers.authorization || "";
  const [type, token] = h.split(" ");
  if (type !== "Bearer" || !token) return next(unauthorized());

  try {
    req.user = jwt.verify(token, cfg.jwtSecret);
    next();
  } catch {
    next(unauthorized());
  }
}

function authServiceToken(req, res, next) {
  const h = req.headers.authorization || "";
  const [type, token] = h.split(" ");
  if (type !== "Bearer" || token !== cfg.serviceToken) {
    return next(unauthorized());
  }
  next();
}


module.exports = { authJwt, authServiceToken };
