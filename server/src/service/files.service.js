import fs from "fs";
import path from "path";
import busboy from "busboy";
import { pipeline } from "stream/promises";

export const uploadFile = async (req) => {

    const destinationPath = path.join(
        process.cwd(),
        "storage",
        "temp",
        "upload.tmp"
    );

    const bb = busboy({
        headers: req.headers
    });

    return new Promise((resolve, reject) => {

        req.pipe(bb);

        bb.on("file", async (fieldName, fileStream, info) => {

            try {
                const writeStream =
                    fs.createWriteStream(destinationPath);

                await pipeline(fileStream, writeStream);

                resolve({
                    success: true,
                    path: destinationPath
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