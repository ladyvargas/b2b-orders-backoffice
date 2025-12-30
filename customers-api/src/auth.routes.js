const express = require("express");
const jwt = require("jsonwebtoken");
const { cfg } = require("./config");
const { badRequest } = require("./errors");

const r = express.Router();

r.post("/auth/token", (req, res, next) => {
  const sub = req.body?.sub;

  if (!sub || typeof sub !== "string") {
    return next(
      badRequest(
        "VALIDATION_ERROR",
        "El campo sub es obligatorio"
      )
    );
  }

  const token = jwt.sign({ sub }, cfg.jwtSecret, { expiresIn: "2h" });
  res.json({ token });
});

module.exports = r;
