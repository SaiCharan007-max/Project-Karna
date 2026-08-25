import fs from "fs/promises";
import * as filesRepo from "../repositories/files.repository.js";

export const reconcileUploadsPending = async () => {
    const uploadsToReconcile = await filesRepo.getUnfinishedFiles();

    for (const upload of uploadsToReconcile) {
        const {
            id,
            expected_size,
            storage_path
        } = upload;

        if (!storage_path) {
            await filesRepo.updateStatus(id, "failed");
            continue;
        }

        try {
            const stats = await fs.stat(storage_path);
            const actualSize = stats.size;

            if (actualSize !== expected_size) {
                await fs.unlink(storage_path);
                await filesRepo.updateStatus(id, "failed");
            } else {
                await filesRepo.updateStatus(id, "completed");
            }

        } catch (error) {
            if (error.code === "ENOENT") {
                await filesRepo.updateStatus(id, "failed");
                continue;
            }

            throw error;
        }
    }
};


export const reconcileUploadsCompleted = async () => {
    const uploadsToReconcile = await filesRepo.getCompletedFiles();

    for (const upload of uploadsToReconcile) {
        const {
            id,
            expected_size,
            storage_path
        } = upload;

        if (!storage_path) {
            await filesRepo.updateStatus(id, "storage_missing");
            continue;
        }

        try {
            const stats = await fs.stat(storage_path);
            const actualSize = stats.size;

            if (actualSize !== expected_size) {
                await filesRepo.updateStatus(id, "storage_missing");
            }

        } catch (error) {
            if (error.code === "ENOENT") {
                await filesRepo.updateStatus(id, "storage_missing");
                continue;
            }

            throw error;
        }
    }
};