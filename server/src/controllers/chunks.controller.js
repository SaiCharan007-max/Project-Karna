import * as chunksService from "../service/chunks.service.js";
import asyncHandler from "../utils/asyncHandler.js";

export const uploadChunk = asyncHandler(async (req, res) => {
    const { fileId, chunkId } = req.params;
    const result = await chunksService.uploadChunk(req, fileId, chunkId);
    res.status(201).json(result);
});

export const initializeUpload = asyncHandler(async (req, res) => {
    const { created, session } = await chunksService.initializeUpload(
        req.headers["idempotency-key"],
        req.body,
    );
    res.status(created ? 201 : 200).json(session);
});
