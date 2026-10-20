import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Transform } from "node:stream";

import * as chunkRepository from "../repositories/chunks.repository.js";
import * as fileRepository from "../repositories/files.repository.js";
import AppError from "../utils/AppError.js";
import CHUNK_SIZE from "../constants/chunkSize.js";

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const initializeUpload = async (idempotencyKey, metadata) => {
    const {
        fileName,
        mimeType = null,
        expectedSize,
        expectedHash,
    } = metadata ?? {};

    if (typeof idempotencyKey !== "string" || !UUID_PATTERN.test(idempotencyKey)) {
        throw new AppError("A valid UUID Idempotency-Key header is required", 400);
    }

    if (typeof fileName !== "string" || !fileName.trim()) {
        throw new AppError("fileName is required", 400);
    }

    if (mimeType !== null && typeof mimeType !== "string") {
        throw new AppError("mimeType must be a string", 400);
    }

    if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0) {
        throw new AppError("expectedSize must be a positive integer", 400);
    }

    if (typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/i.test(expectedHash)) {
        throw new AppError("expectedHash must be a SHA-256 hex string", 400);
    }

    const normalizedHash = expectedHash.toLowerCase();
    const extension = path.extname(fileName).toLowerCase();
    const totalChunks = Math.ceil(expectedSize / CHUNK_SIZE);

    const upload = await chunkRepository.createResumableUpload(
        fileName,
        mimeType,
        expectedSize,
        normalizedHash,
        idempotencyKey,
        extension,
        CHUNK_SIZE,
        totalChunks,
    );

    if (upload) {
        return {
            created: true,
            session: {
                uploadId: upload.id,
                status: upload.status,
                chunkSize: Number(upload.chunk_size),
                totalChunks: upload.total_chunks,
            },
        };
    }

    const existingUpload =
        await chunkRepository.getResumableUploadByIdempotencyKey(idempotencyKey);

    if (!existingUpload) {
        throw new Error("Upload conflict occurred but existing upload was not found");
    }

    const isSameUpload =
        existingUpload.total_chunks !== null &&
        existingUpload.original_name === fileName &&
        existingUpload.mime_type === mimeType &&
        Number(existingUpload.expected_size) === expectedSize &&
        existingUpload.expected_hash === normalizedHash;

    if (!isSameUpload) {
        throw new AppError("Idempotency-Key was already used for a different upload", 409);
    }

    return {
        created: false,
        session: {
            uploadId: existingUpload.id,
            status: existingUpload.status,
            chunkSize: Number(existingUpload.chunk_size),
            totalChunks: existingUpload.total_chunks,
        },
    };
};

export const uploadChunk = async (req, fileId, chunkId) => {
    const fileInfo = await chunkRepository.getFileInfo(fileId);

    if (!fileInfo) {
        throw new AppError("File not found", 404);
    }

    if (fileInfo.status === "completed") {
        throw new AppError("File upload already completed", 409);
    }

    if (fileInfo.status === "failed") {
        throw new AppError("File upload has failed", 410);
    }

    const chunkNumber = Number(chunkId);
    const totalChunks = Number(fileInfo.total_chunks);
    const chunkSize = Number(fileInfo.chunk_size);
    const expectedSize = Number(fileInfo.expected_size);

    if (
        !Number.isInteger(chunkNumber) ||
        chunkNumber < 0 ||
        chunkNumber >= totalChunks
    ) {
        throw new AppError("Invalid chunk number", 400);
    }

    if (
        !Number.isSafeInteger(chunkSize) ||
        chunkSize <= 0 ||
        !Number.isSafeInteger(expectedSize) ||
        expectedSize < 0
    ) {
        throw new AppError("Invalid upload metadata", 500);
    }

    const expectedChunkSize = Math.min(
        chunkSize,
        expectedSize - chunkNumber * chunkSize,
    );

    const expectedChunkHash = req.headers["x-chunk-hash"];

    if (
        typeof expectedChunkHash !== "string" ||
        !/^[a-f0-9]{64}$/i.test(expectedChunkHash)
    ) {
        throw new AppError("A valid SHA-256 chunk hash is required", 400);
    }

    const uploadDirectory = path.join(
        process.cwd(),
        "storage",
        "chunks",
        fileId,
    );

    const tempPath = path.join(
        uploadDirectory,
        `${chunkNumber}.uploading`,
    );

    const chunkPath = path.join(
        uploadDirectory,
        `${chunkNumber}.part`,
    );

    await fs.promises.mkdir(uploadDirectory, {
        recursive: true,
    });

    let totalChunkSize = 0;
    const hash = crypto.createHash("sha256");

    const transformer = new Transform({
        transform(chunk, encoding, callback) {
            totalChunkSize += chunk.length;

            // Reject oversized requests before writing more bytes.
            if (totalChunkSize > expectedChunkSize) {
                callback(new Error("CHUNK_SIZE_EXCEEDED"));
                return;
            }

            hash.update(chunk);
            callback(null, chunk);
        },
    });

    try {
        // Update the upload state only after initial validation.
        if (fileInfo.status === "initiated") {
            await fileRepository.updateStatus(fileId, "in_progress");
        }

        await pipeline(
            req,
            transformer,
            fs.createWriteStream(tempPath, { flags: "wx" }),
        );

        if (totalChunkSize !== expectedChunkSize) {
            throw new AppError(
                `Chunk size mismatch: expected ${expectedChunkSize}, got ${totalChunkSize}`,
                400,
            );
        }

        const actualChunkHash = hash.digest("hex");

        if (actualChunkHash !== expectedChunkHash.toLowerCase()) {
            throw new AppError("Chunk hash mismatch", 400);
        }

        await fs.promises.rename(tempPath, chunkPath);

        await chunkRepository.recordUploadedChunk({
            uploadId: fileId,
            chunkNumber,
            size: totalChunkSize,
            hash: actualChunkHash,
            storagePath: chunkPath,
        });

        return {
            uploadId: fileId,
            chunkNumber,
            size: totalChunkSize,
            hash: actualChunkHash,
            status: "uploaded",
        };
    } catch (error) {
        // Remove partial data if it still exists.
        await fs.promises.unlink(tempPath).catch(() => {});

        if (error.message === "CHUNK_SIZE_EXCEEDED") {
            throw new AppError("Chunk exceeds its expected size", 400);
        }

        throw error;
    }
};



