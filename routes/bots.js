import { Router } from "express";
import authenticate from "../middleware/authenticate.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  createBot,
  deleteBot,
  findBotById,
  listBots,
  updateBot,
} from "../models/Bot.js";
import responser from "../utils/responser.js";
import { isDatabaseId, validateBotData, validationMessage } from "../utils/utils.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const bots = await listBots();
    return responser.success({
      res,
      message: "Herramientas listadas correctamente.",
      body: { bots },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  if (!isDatabaseId(req.params.id)) {
    return responser.error({
      res,
      message: "El ID de la herramienta no es válido.",
      status: 400,
    });
  }

  try {
    const bot = await findBotById(req.params.id);
    if (!bot) {
      return responser.error({
        res,
        message: "No se encontró la herramienta.",
        status: 404,
      });
    }

    return responser.success({
      res,
      message: "Herramienta encontrada.",
      body: { bot },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", authenticate, requireAdmin, async (req, res, next) => {
  const { errors, botData } = validateBotData(req.body);
  if (errors.length > 0) {
    return responser.error({
      res,
      message: validationMessage(errors),
      status: 400,
    });
  }

  try {
    const bot = await createBot(botData);
    return responser.success({
      res,
      message: "Herramienta creada correctamente.",
      body: { bot },
      status: 201,
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", authenticate, requireAdmin, async (req, res, next) => {
  if (!isDatabaseId(req.params.id)) {
    return responser.error({
      res,
      message: "El ID de la herramienta no es válido.",
      status: 400,
    });
  }

  const { errors, botData } = validateBotData(req.body);
  if (errors.length > 0) {
    return responser.error({
      res,
      message: validationMessage(errors),
      status: 400,
    });
  }

  try {
    const bot = await updateBot(req.params.id, botData);
    if (!bot) {
      return responser.error({
        res,
        message: "No se encontró la herramienta.",
        status: 404,
      });
    }

    return responser.success({
      res,
      message: "Herramienta actualizada correctamente.",
      body: { bot },
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", authenticate, requireAdmin, async (req, res, next) => {
  if (!isDatabaseId(req.params.id)) {
    return responser.error({
      res,
      message: "El ID de la herramienta no es válido.",
      status: 400,
    });
  }

  try {
    const bot = await deleteBot(req.params.id);
    if (!bot) {
      return responser.error({
        res,
        message: "No se encontró la herramienta.",
        status: 404,
      });
    }

    return responser.success({
      res,
      message: "Herramienta eliminada correctamente.",
      body: { bot },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
