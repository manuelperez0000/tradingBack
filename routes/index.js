import express from "express";
import botsRouter from "./bots.js";
import imagesRouter from "./images.js";
import responser from "../utils/responser.js";
import postsRouter from "./posts.js";
import usersRouter from "./users.js";

const router = express.Router();

router.get("/", (req, res) => {
  return responser.success({
    res,
    message: "Welcome to the API!",
  });
});

router.use("/users", usersRouter);
router.use("/posts", postsRouter);
router.use("/bots", botsRouter);
router.use("/images", imagesRouter);

export default router;