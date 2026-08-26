import fs from "fs/promises";
import crypto from "crypto";

import * as filesRecoveryRepo from "../repositories/fileUploadRecovery.repository.js";
import * as filesRepo from "../repositories/files.repository.js";

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

    if (!storage_path) {
      await filesRepo.updateStatus(id, "failed");
      continue;
    }

    try {
      const stats = await fs.stat(storage_path);

      const hash = crypto.createHash("sha256");

      for await (const chunk of fs.createReadStream(storage_path)) {
        hash.update(chunk);
      }

      const calculatedHash = hash.digest("hex");

      const isValid =
        calculatedHash === expected_hash &&
        stats.size === expected_size;

      if (!isValid) {
        await fs.unlink(storage_path);
        await filesRepo.updateStatus(id, "failed");
        continue;
      }

      await filesRepo.completeUpload(
        id,
        storage_path,
        stats.size,
        calculatedHash,
      );

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

      const hash = crypto.createHash("sha256");

      for await (const chunk of fs.createReadStream(storage_path)) {
        hash.update(chunk);
      }

      const calculatedHash = hash.digest("hex");

      const isValid =
        calculatedHash === expected_hash &&
        stats.size === expected_size;

      if (!isValid) {
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