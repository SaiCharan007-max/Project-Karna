import app from "./app.js";
import dotenv from "dotenv";
import pool from "./config/db.js";

dotenv.config();

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