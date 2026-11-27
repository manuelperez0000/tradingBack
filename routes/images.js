import { createHash } from "node:crypto";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import express, { Router } from "express";
import responser from "../utils/responser.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();
const imagesDirectory = fileURLToPath(new URL("../images/", import.meta.url));
const maxImageSize = 5 * 1024 * 1024;
const allowedExtensions = ["png", "jpg", "gif", "webp"];

function findImagePart(body, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const headerSeparator = Buffer.from("\r\n\r\n");
  const boundaryMarker = Buffer.from(`\r\n--${boundary}`);

  if (!body.subarray(0, delimiter.length).equals(delimiter)) {
    return null;
  }

  let position = delimiter.length;
  if (body.subarray(position, position + 2).toString() === "--") {
    return null;
  }
  if (body.subarray(position, position + 2).toString() !== "\r\n") {
    return null;
  }
  position += 2;

  const headersEnd = body.indexOf(headerSeparator, position);
  if (headersEnd === -1 || headersEnd - position > 16 * 1024) {
    return null;
  }

  const headers = body.subarray(position, headersEnd).toString("latin1");
  const disposition = headers
    .split("\r\n")
    .find((header) => /^content-disposition:/i.test(header));
  if (!disposition || !/^content-disposition:\s*form-data(?:;|$)/i.test(disposition)) {
    return null;
  }

  const fieldName = /(?:^|;)\s*name="([^"]*)"/i.exec(disposition)?.[1];
  const filename = /(?:^|;)\s*filename="([^"]*)"/i.exec(disposition)?.[1];
  if (fieldName !== "image" || !filename) {
    return null;
  }

  const imageStart = headersEnd + headerSeparator.length;
  let boundaryStart = body.indexOf(boundaryMarker, imageStart);
  while (boundaryStart !== -1) {
    const suffixStart = boundaryStart + boundaryMarker.length;
    const suffix = body.subarray(suffixStart, suffixStart + 2).toString();
    if (suffix === "--" || suffix === "\r\n") {
      if (suffix === "--") {
        const trailingData = body.subarray(suffixStart + 2);
        if (trailingData.length === 0 || trailingData.toString() === "\r\n") {
          return body.subarray(imageStart, boundaryStart);
        }
        return null;
      }
      return null;
    }
    boundaryStart = body.indexOf(boundaryMarker, boundaryStart + 2);
  }

  return null;
}

function getImageExtension(image) {
  if (
    image.length >= 8 &&
    image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "png";
  }
  if (image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) {
    return "jpg";
  }
  if (
    image.length >= 6 &&
    (image.subarray(0, 6).toString() === "GIF87a" ||
      image.subarray(0, 6).toString() === "GIF89a")
  ) {
    return "gif";
  }
  if (
    image.length >= 12 &&
    image.subarray(0, 4).toString() === "RIFF" &&
    image.subarray(8, 12).toString() === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

function receiveImage(req, res, next) {
  const contentType = req.get("content-type") ?? "";
  const boundaryMatch =
    /^multipart\/form-data\s*;\s*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];
  if (!boundary || boundary.length > 70 || /[\r\n]/.test(boundary)) {
    return responser.error({
      res,
      message: 'Envía una imagen en formato multipart/form-data con el campo "image".',
      status: 400,
    });
  }

  const image = Buffer.isBuffer(req.body)
    ? findImagePart(req.body, boundary)
    : null;
  if (!image || image.length === 0) {
    return responser.error({
      res,
      message: 'No se recibió una imagen válida en el campo "image".',
      status: 400,
    });
  }
  if (image.length > maxImageSize) {
    return responser.error({
      res,
      message: "La imagen no puede superar los 5 MB.",
      status: 413,
    });
  }

  if (!getImageExtension(image)) {
    return responser.error({
      res,
      message: "El archivo debe ser una imagen PNG, JPEG, GIF o WEBP válida.",
      status: 400,
    });
  }

  req.image = image;
  return next();
}

function validateImageId(req, res, next) {
  if (!/^[a-f0-9]{64}$/.test(req.params.id)) {
    return responser.error({
      res,
      message: "El ID de la imagen no es válido.",
      status: 400,
    });
  }
  return next();
}

async function saveImage(image) {
  const extension = getImageExtension(image);
  const id = createHash("sha256").update(image).digest("hex");
  const name = `${id}.${extension}`;
  await mkdir(imagesDirectory, { recursive: true });

  try {
    await writeFile(join(imagesDirectory, name), image, { flag: "wx" });
    return { id, name };
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
    return { id, name };
  }
}

async function findStoredImage(id) {
  let names;
  try {
    names = await readdir(imagesDirectory);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  const name = names.find((candidate) =>
    allowedExtensions.some((extension) => candidate === `${id}.${extension}`),
  );
  return name ? { id, name, path: join(imagesDirectory, name) } : null;
}

const parseImageBody = express.raw({
  type: "multipart/form-data",
  limit: maxImageSize + 64 * 1024,
});

router.get("/:identifier", async (req, res, next) => {
  const { identifier } = req.params;
  const id = identifier.includes(".") ? identifier.split(".")[0] : identifier;
  if (!/^[a-f0-9]{64}$/.test(id)) {
    return responser.error({
      res,
      message: "El ID o nombre de la imagen no es válido.",
      status: 400,
    });
  }

  try {
    const image = await findStoredImage(id);
    if (!image) {
      return responser.error({
        res,
        message: "No se encontró la imagen.",
        status: 404,
      });
    }

    return res.sendFile(image.path);
  } catch (error) {
    return next(error);
  }
});

router.post("/", authenticate, parseImageBody, receiveImage, async (req, res, next) => {
  try {
    const image = await saveImage(req.image);
    return responser.success({
      res,
      message: "Imagen guardada correctamente.",
      body: { id: image.id, name: image.name },
      status: 201,
    });
  } catch (error) {
    return next(error);
  }
});

router.put(
  "/:id",
  authenticate,
  validateImageId,
  parseImageBody,
  receiveImage,
  async (req, res, next) => {
    try {
      const currentImage = await findStoredImage(req.params.id);
      if (!currentImage) {
        return responser.error({
          res,
          message: "No se encontró la imagen.",
          status: 404,
        });
      }

      const newImage = await saveImage(req.image);
      if (newImage.name !== currentImage.name) {
        await unlink(currentImage.path);
      }

      return responser.success({
        res,
        message: "Imagen reemplazada correctamente.",
        body: { id: newImage.id, name: newImage.name },
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.delete("/:id", authenticate, validateImageId, async (req, res, next) => {
  try {
    const image = await findStoredImage(req.params.id);
    if (!image) {
      return responser.error({
        res,
        message: "No se encontró la imagen.",
        status: 404,
      });
    }

    await unlink(image.path);
    return responser.success({
      res,
      message: "Imagen eliminada correctamente.",
      body: { id: image.id, name: image.name },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
