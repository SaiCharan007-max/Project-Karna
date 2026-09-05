import fs from "fs";
import fsp from "fs/promises";

import path from "path";
import crypto from "crypto";

import * as filesRecoveryRepo from "../repositories/fileUploadRecovery.repository.js";
import * as filesRepo from "../repositories/files.repository.js";

const getTempFilePath = (id) => {
  return path.join(process.cwd(), "storage", "temp", `${id}.tmp`);
};

const getFinalFilePath = (id, extension) => {
  return path.join(process.cwd(), "storage", "finished", `${id}${extension}`);
};

const calculateFileHash = async (filePath) => {
  const hash = crypto.createHash("sha256");

  for await (const chunk of fs.createReadStream(filePath)) {
    hash.update(chunk);
  }

  return hash.digest("hex");
};

const verifyFile = async (filePath, expectedSize, expectedHash) => {
  const stats = await fsp.stat(filePath);
  const calculatedHash = await calculateFileHash(filePath);

  const expectedSizeNumber = Number(expectedSize);

  const isValid =
    calculatedHash === expectedHash && stats.size === expectedSizeNumber;

  return {
    isValid,
    size: stats.size,
    hash: calculatedHash,
  };
};

export const reconcileUploadsPending = async () => {
  const uploadsToReconcile = await filesRecoveryRepo.getUnfinishedFiles();

  for (const upload of uploadsToReconcile) {
    const { id, expected_size, expected_hash, storage_path, extension } =
      upload;

    const tempPath = getTempFilePath(id);
    const finalPath = getFinalFilePath(id, extension);

    let filePath = null;
    let isTempFile = false;

    /*
     * If the database already contains a storage path,
     * try that path first.
     *
     * This represents the normal recovery case where
     * the path was written to the database before the
     * process was interrupted.
     */

    if (storage_path) {
      try {
        await fsp.stat(storage_path);
        filePath = storage_path;
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
    }

    /*
     * If the database path was unavailable, check the
     * deterministic final path.
     *
     * This handles the crash window:
     *
     * rename(temp, final)
     *        ↓
     * process crashes
     *        ↓
     * completeUpload() never executes
     */
    if (!filePath) {
      try {
        await fsp.stat(finalPath);
        filePath = finalPath;
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
    }

    /*
     * If the final file doesn't exist, check the temp file.
     */
    if (!filePath) {
      try {
        await fsp.stat(tempPath);
        filePath = tempPath;
        isTempFile = true;
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
    }

    /*
     * Neither the final file nor the temp file exists.
     * There is nothing that can be recovered.
     */
    if (!filePath) {
      await filesRepo.updateStatus(id, "failed");
      continue;
    }

    /*
     * Verify the physical file against the metadata
     * stored in PostgreSQL.
     */
    const { isValid, size, hash } = await verifyFile(
      filePath,
      expected_size,
      expected_hash,
    );

    /*
     * The physical file exists but is incomplete or
     * corrupted.
     */
    console.log("========== RECOVERY VERIFICATION ==========");
    console.log("ID:", id);
    console.log("File:", filePath);

    console.log("Expected size:", expected_size);
    console.log("Actual size:", size);
    console.log("Size match:", size === expected_size);

    console.log("Expected hash:", expected_hash);
    console.log("Actual hash:", hash);
    console.log("Hash match:", hash === expected_hash);

    console.log("Valid:", isValid);
    console.log("============================================");
    if (!isValid) {
      await fsp.unlink(filePath);
      await filesRepo.updateStatus(id, "failed");
      continue;
    }

    /*
     * If the valid file is still in temp storage,
     * finalize the filesystem state first.
     */
    if (isTempFile) {
      await fsp.rename(tempPath, finalPath);
      filePath = finalPath;
    }

    /*
     * The physical file is now in its final location,
     * so repair the database state.
     */
    await filesRepo.completeUpload(id, filePath, size, hash);
  }
};

export const reconcileUploadsCompleted = async () => {
  const uploadsToReconcile = await filesRecoveryRepo.getCompletedFiles();

  for (const upload of uploadsToReconcile) {
    const { id, expected_size, expected_hash, storage_path } = upload;

    if (!storage_path) {
      await filesRepo.updateStatus(id, "storage_missing");
      continue;
    }

    try {
      const { isValid } = await verifyFile(
        storage_path,
        expected_size,
        expected_hash,
      );

      if (!isValid) {
        await fsp.unlink(storage_path);

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
