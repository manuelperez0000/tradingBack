import authenticate from "./authenticate.js";

export default function optionalAuthenticate(req, res, next) {
  if (!req.get("authorization")) {
    return next();
  }
  return authenticate(req, res, next);
}
