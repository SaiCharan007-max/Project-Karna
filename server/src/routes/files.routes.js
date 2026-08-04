import express from "express";
import * as fileController from "../controllers/files.controller.js";

const router = express.Router();

router.post("/upload", fileController.uploadFile);

export default router;