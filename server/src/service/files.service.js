import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";

export const uploadFile = async (req) => {

    console.log(process.cwd());

    const destinationPath = path.join(
        process.cwd(),
        "storage",
        "temp",
        "upload.tmp"
    );

    const writeStream = fs.createWriteStream(destinationPath);
    

    await pipeline(req, writeStream);

    return {
        success: true,
        path: destinationPath
    };
};