import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import * as filesRecoveryRepo from "../repositories/fileUploadRecovery.repository.js";
import * as filesRepo from "../repositories/files.repository.js";

const getTempFilePath = (id) => {
  return path.join(
    process.cwd(),
    "storage",
    "temp",
    `${id}.tmp`,
  );
};

const calculateFileHash = async (filePath) => {
  const hash = crypto.createHash("sha256");

  for await (const chunk of fs.createReadStream(filePath)) {
    hash.update(chunk);
  }

  return hash.digest("hex");
};

export const reconcileUploadsPending = async () => {
  const uploadsToReconcile =
    await filesRecoveryRepo.getUnfinishedFiles();

  for (const upload of uploadsToReconcile) {
    const {
      id,
      expected_size,
      expected_hash,
      storage_path,
    } = upload;

    // If storage_path was never written to the DB,
    // the upload may have crashed before completeUpload().
    // Since temp files are named using the upload ID,
    // we can deterministically find the file.
    const filePath = storage_path || getTempFilePath(id);

    try {
      const stats = await fs.stat(filePath);

      const calculatedHash = await calculateFileHash(filePath);

      const isValid =
        calculatedHash === expected_hash &&
        stats.size === expected_size;

      if (!isValid) {
        await fs.unlink(filePath);
        await filesRepo.updateStatus(id, "failed");
        continue;
      }

      // The file is valid, so recover the interrupted upload.
      await filesRepo.completeUpload(
        id,
        filePath,
        stats.size,
        calculatedHash,
      );
    } catch (error) {
      if (error.code === "ENOENT") {
        // Neither the DB path nor the expected temp file exists.
        await filesRepo.updateStatus(id, "failed");
        continue;
      }

      throw error;
    }
  }
};

export const reconcileUploadsCompleted = async () => {
  const uploadsToReconcile =
    await filesRecoveryRepo.getCompletedFiles();

  for (const upload of uploadsToReconcile) {
    const {
      id,
      expected_size,
      expected_hash,
      storage_path,
    } = upload;

    if (!storage_path) {
      await filesRepo.updateStatus(id, "storage_missing");
      continue;
    }

    try {
      const stats = await fs.stat(storage_path);

      const calculatedHash =
        await calculateFileHash(storage_path);

      const isValid =
        calculatedHash === expected_hash &&
        stats.size === expected_size;

      if (!isValid) {
        // The file exists, but it is no longer the file
        // that was originally uploaded.
        await fs.unlink(storage_path);
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