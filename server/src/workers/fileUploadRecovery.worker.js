import fs from "fs/promises";
import fsSync from "fs";
import crypto from "crypto";

import * as filesRecoveryRepo from "../repositories/fileUploadRecovery.repository.js";
import * as filesRepo from "../repositories/files.repository.js";


// ============================================================
// Pending / Unfinished Upload Recovery
// ============================================================

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

    // --------------------------------------------------------
    // No storage path
    // --------------------------------------------------------

    if (!storage_path) {
      await filesRepo.updateStatus(id, "failed");
      continue;
    }

    try {
      // ------------------------------------------------------
      // Check whether the physical file exists
      // ------------------------------------------------------

      const stats = await fs.stat(storage_path);

      // ------------------------------------------------------
      // Calculate hash of the file currently on disk
      // ------------------------------------------------------

      const hash = crypto.createHash("sha256");

      const readStream = fsSync.createReadStream(storage_path);

      for await (const chunk of readStream) {
        hash.update(chunk);
      }

      const calculatedHash = hash.digest("hex");

      // ------------------------------------------------------
      // Verify file integrity
      // ------------------------------------------------------

      const sizeMatches =
        stats.size === expected_size;

      const hashMatches =
        calculatedHash === expected_hash;

      if (!sizeMatches || !hashMatches) {
        await fs.unlink(storage_path);
        await filesRepo.updateStatus(id, "failed");

        continue;
      }

      // ------------------------------------------------------
      // File is valid.
      // Recover the incomplete database record.
      // ------------------------------------------------------

      await filesRepo.completeUpload(
        id,
        storage_path,
        stats.size,
        calculatedHash
      );
    } catch (error) {
      // ------------------------------------------------------
      // File referenced by DB does not exist
      // ------------------------------------------------------

      if (error.code === "ENOENT") {
        await filesRepo.updateStatus(id, "failed");
        continue;
      }

      // Unexpected error
      throw error;
    }
  }
};


// ============================================================
// Completed Upload Audit
// ============================================================

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

    // --------------------------------------------------------
    // No storage path
    // --------------------------------------------------------

    if (!storage_path) {
      await filesRepo.updateStatus(id, "storage_missing");
      continue;
    }

    try {
      // ------------------------------------------------------
      // Check whether the physical file exists
      // ------------------------------------------------------

      const stats = await fs.stat(storage_path);

      // ------------------------------------------------------
      // Recalculate hash from physical file
      // ------------------------------------------------------

      const hash = crypto.createHash("sha256");

      const readStream = fsSync.createReadStream(storage_path);

      for await (const chunk of readStream) {
        hash.update(chunk);
      }

      const calculatedHash = hash.digest("hex");

      // ------------------------------------------------------
      // Verify file integrity
      // ------------------------------------------------------

      const sizeMatches =
        stats.size === expected_size;

      const hashMatches =
        calculatedHash === expected_hash;

      if (!sizeMatches || !hashMatches) {
        await filesRepo.updateStatus(
          id,
          "storage_missing"
        );

        continue;
      }

      // File is still valid.
      // Nothing needs to be changed.
    } catch (error) {
      // ------------------------------------------------------
      // File no longer exists
      // ------------------------------------------------------

      if (error.code === "ENOENT") {
        await filesRepo.updateStatus(
          id,
          "storage_missing"
        );

        continue;
      }

      // Unexpected error
      throw error;
    }
  }
};