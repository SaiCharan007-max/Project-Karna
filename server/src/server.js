import "dotenv/config";

import app from "./app.js";
import pool from "./config/db.js";
import initialiseFileUploadSchedulers from "./schedulers/fileUpload.schedulers.js";
import "./workers/fileUploadRecovery.worker.js";

await initialiseFileUploadSchedulers();


const PORT = process.env.PORT || 3000;

pool.connect().then(() => {
  console.log("Connected to the database");
}).catch((error) => {
  console.error("Error connecting to the database:", error);
  process.exit(1);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});