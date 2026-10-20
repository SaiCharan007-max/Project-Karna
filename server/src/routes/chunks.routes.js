import express from "express";
import * as chunksController from "../controllers/chunks.controller.js";


const router = express.Router();
router.post("/uploads", chunksController.initializeUpload);
router.put("/uploads/:fileId/chunks/:chunkId", chunksController.uploadChunk);

export default router;
