import * as fileService from "../service/files.service.js";
import asyncHandler from "../utils/asyncHandler.js";

export const uploadFile = asyncHandler(async (req, res) => {
    const result = await fileService.uploadFile(req);
    res.status(201).json(result);
});