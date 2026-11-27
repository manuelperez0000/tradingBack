import responser from "../utils/responser.js";

export default function requireAdmin(req, res, next) {
  const adminUserIds = (process.env.ADMINS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (
    adminUserIds.length === 0 ||
    adminUserIds.some((id) => !/^\d+$/.test(id))
  ) {
    return next(
      new Error("ADMINS must be a comma-separated list of user IDs"),
    );
  }

  if (!adminUserIds.includes(req.user.id)) {
    return responser.error({
      res,
      message: "No tienes permiso de administrador para realizar esta acción.",
      status: 403,
    });
  }

  return next();
}
