import fs from "fs";
import path from "path";
import busboy from "busboy";
import { pipeline } from "stream/promises";
import { Transform } from "stream";
import crypto from "crypto";
import * as filesRepo from "../repositories/files.repository.js";

export const uploadFile = async (req) => {
  const bb = busboy({
    headers: req.headers,
  });

  return new Promise((resolve, reject) => {
    let expectedSize = null;
    let expectedHash = null;

    bb.on("field", (fieldName, value) => {
      if (fieldName === "expectedSize") {
        expectedSize = parseInt(value, 10);
      }
      if (fieldName === "expectedHash") {
        expectedHash = value;
      }
    });

    req.pipe(bb);

    bb.on("file", async (fieldName, fileStream, info) => {
      try {
        const fileName = info.filename;
        const mimeType = info.mimeType;
        const hash = crypto.createHash("sha256");

        if (expectedSize === null || expectedHash === null) {
          throw new Error("expectedSize and expectedHash are required");
        }

        console.log(expectedSize);
        console.log(expectedHash);

        expectedHash = expectedHash.trim().toLowerCase();

        if (!Number.isSafeInteger(expectedSize) || expectedSize < 0) {
          throw new Error("Invalid expectedSize");
        }
        
        const upload = await filesRepo.uploadFile(
          fileName,
          mimeType,
          expectedSize,
          expectedHash,
        );


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
            console.log(`Received ${size} bytes for file ${fileName}`);
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

        await filesRepo.completeUpload(
          upload.id,
          destinationPath,
          size,
          actualHash,
        );

        resolve({
          success: true,
          path: destinationPath,
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
