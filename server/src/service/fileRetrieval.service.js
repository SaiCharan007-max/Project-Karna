import * as fileRetrievalRepo from "../repositories/fileRetrieval.repository.js";
import AppError from "../utils/AppError.js";
import fs from "fs";

export const getFileById = async (fileId) => {
    const fileData = await fileRetrievalRepo.getFileById(fileId);

    if (!fileData) {
        throw new AppError("File not found", 404);
    }

    if (fileData.status === "in_progress") {
        throw new AppError("File upload is still in progress", 409);
    }

    if (fileData.status === "failed") {
        throw new AppError("File upload failed", 410);
    }

    if (fileData.status !== "completed") {
        throw new AppError("File is not available", 409);
    }

    try {
        await fs.promises.stat(fileData.storage_path);
    } catch (error) {
        if (error.code === "ENOENT") {
            throw new AppError("File is no longer available", 404);
        }

        throw error;
    }

    return fileData;
};