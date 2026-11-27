import jwt from "jsonwebtoken";
import responser from "../utils/responser.js";

export default function authenticate(req, res, next) {
  const authorization = req.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return responser.error({
      res,
      message: "Se requiere un token Bearer.",
      status: 401,
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    return next(new Error("JWT_SECRET must contain at least 32 characters"));
  }

  try {
    const claims = jwt.verify(match[1], secret);
    if (typeof claims === "string" || typeof claims.sub !== "string") {
      return responser.error({
        res,
        message: "El token no es válido.",
        status: 401,
      });
    }

    req.user = { id: claims.sub };
    return next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return responser.error({
        res,
        message: "El token no es válido o ha expirado.",
        status: 401,
      });
    }

    return next(error);
  }
}
