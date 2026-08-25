import fs from "fs";
import path from "path";
import busboy from "busboy";
import { pipeline } from "stream/promises";
import { Transform } from "stream";
import * as filesRepo from "../repositories/files.repository.js";

export const uploadFile = async (req) => {
  const bb = busboy({
    headers: req.headers,
  });

  return new Promise((resolve, reject) => {

    let expectedSize = null;
    bb.on("field", (fieldName, value) => {
      if (fieldName === "expectedSize") {
        expectedSize = parseInt(value, 10);
      }
    });

    req.pipe(bb);

    bb.on("file", async (fieldName, fileStream, info) => {
      try {
        const fileName = info.filename;
        const mimeType = info.mimeType;

        const upload = await filesRepo.uploadFile(fileName, mimeType, expectedSize);

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
            console.log(`Received ${size} bytes for file ${fileName}`);
            callback(null, chunk);
          },
        });

        await pipeline(
          fileStream,
          counter,
          fs.createWriteStream(destinationPath),
        );

        await filesRepo.completeUpload(upload.id, destinationPath, size);


        resolve({
          success: true,
          path: destinationPath,
          size: size
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
