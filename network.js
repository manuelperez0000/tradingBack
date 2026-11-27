import "dotenv/config";
import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { fileURLToPath } from "node:url";
import errorManager from "./errorManager.js";
import openApiDocument from "./openapi.js";
import rootRouter from "./routes/index.js";

const app = express();
const frontendDirectory = fileURLToPath(new URL("../frontend/dist", import.meta.url));

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.get("/api-docs.json", (req, res) => res.json(openApiDocument));
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: "Trading Life Academy API",
    swaggerOptions: { persistAuthorization: true },
  }),
);
app.use(express.static(frontendDirectory));
app.use("/api/v1", rootRouter);
app.use(errorManager);

export default app;