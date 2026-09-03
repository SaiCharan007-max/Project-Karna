import fs from "fs";
import path from "path";
import busboy from "busboy";
import { pipeline } from "stream/promises";
import { Transform } from "stream";
import crypto from "crypto";
import { setTimeout } from "timers/promises";
import * as filesRepo from "../repositories/files.repository.js";

export const uploadFile = async (req) => {
  const bb = busboy({
    headers: req.headers,
  });

  const idempotencyKey = req.headers["idempotency-key"];
  const expectedSize = req.headers["expected-size"]
    ? parseInt(req.headers["expected-size"], 10)
    : null;
  const expectedHash = req.headers["expected-hash"]
    ? req.headers["expected-hash"].trim().toLowerCase()
    : null;

  return new Promise((resolve, reject) => {
    req.pipe(bb);

    bb.on("file", async (fieldName, fileStream, info) => {
      try {
        const fileName = info.filename;
        const mimeType = info.mimeType;
        const hash = crypto.createHash("sha256");
        const extension = path.extname(fileName).toLowerCase(); // Get the file extension without the dot

        if (!idempotencyKey) {
          throw new Error("Idempotency key is required");
        }

        if (expectedSize === null || expectedHash === null) {
          throw new Error("expectedSize and expectedHash are required");
        }

        if (!Number.isSafeInteger(expectedSize) || expectedSize < 0) {
          throw new Error("Invalid expectedSize");
        }

        const upload = await filesRepo.uploadFile(
          fileName,
          mimeType,
          expectedSize,
          expectedHash,
          idempotencyKey,
          extension,
        );

        if (!upload) {
          const existingUpload = await filesRepo.checkExistence(idempotencyKey);

          if (!existingUpload) {
            throw new Error(
              "Upload conflict occurred but existing upload was not found",
            );
          }

          resolve({
            id: existingUpload.id,
            status: existingUpload.status,
          });

          return;
        }

        const destinationPath = path.join(
          process.cwd(),
          "storage",
          "temp",
          `${upload.id}.tmp`,
        );

        let size = 0;

        const counter = new Transform({
          transform(chunk, encoding, callback) {
            size += chunk.length;
            hash.update(chunk);
            callback(null, chunk);
          },
        });

        await pipeline(
          fileStream,
          counter,
          fs.createWriteStream(destinationPath),
        );

        const actualHash = hash.digest("hex");

        if (actualHash !== expectedHash || size !== expectedSize) {
          await fs.promises.unlink(destinationPath);

          await filesRepo.updateStatus(upload.id, "failed");

          throw new Error("File verification failed");
        }
        

        await fs.promises.rename(
          `storage/temp/${upload.id}.tmp`,
          `storage/finished/${upload.id}.${extension}`,
        );

        const finalPath = path.join(
          process.cwd(),
          "storage",
          "finished",
          `${upload.id}.${extension}`,
        );


        await filesRepo.completeUpload(
          upload.id,
          finalPath,
          size,
          actualHash,
        );

        resolve({
          success: true,
          path: finalPath,
          size: size,
        });
      } catch (error) {
        reject(error);
      }
    });

    bb.on("error", (error) => {
      reject(error);
    });
  });
};
