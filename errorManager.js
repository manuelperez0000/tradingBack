import responser from "./utils/responser.js";

export default function errorManager(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error.code === "23505") {
    return responser.error({
      res,
      message: "Ya existe una cuenta con ese correo.",
      status: 409,
    });
  }

  if (error.type === "entity.parse.failed") {
    return responser.error({
      res,
      message: "El cuerpo de la solicitud debe contener JSON válido.",
      status: 400,
    });
  }

  if (error.status === 400 || error.status === 413) {
    return responser.error({
      res,
      message:
        error.status === 413
          ? "La solicitud es demasiado grande."
          : "JSON inválido. " + error.status,
      status: error.status,
    });
  }

  console.error("Request failed:", error);
  return responser.error({
    res,
    message: "Error interno del servidor.",
    status: 500,
  });
}