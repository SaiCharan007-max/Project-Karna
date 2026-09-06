import fs from "fs";
import * as fileRetrievalService from "../service/fileRetrieval.service.js";

export const getFileById = async (req, res) => {
    const  fileId = req.params.id ;

    const fileData = await fileRetrievalService.getFileById(fileId);

    res.setHeader("Content-Type", fileData.mime_type);
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileData.original_name}"`,
    );
    res.setHeader("Content-Length", fileData.total_size);

    const fileStream = fs.createReadStream(fileData.storage_path);

    fileStream.on("error", (err) => {
        console.error("Error reading file:", err);
        res.status(500).send("Error reading file");
    });

    fileStream.pipe(res);
};