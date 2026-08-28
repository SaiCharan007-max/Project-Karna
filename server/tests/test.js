import fs from "fs";
import axios from "axios";
import FormData from "form-data";

const URL = "http://localhost:3000/files/upload";

const FILE_PATH = "./temp.mkv";

const EXPECTED_SIZE = 19791872;

const EXPECTED_HASH =
  "D10E03B4283126BF45B3CC8AF05B8346D2667926189F1FBD8EF2A3A140BE2FDA";

const IDEMPOTENCY_KEY = "bc80a89d-72fa-4a3c-8f2b-3b40270f5939";

function createRequest(requestNumber) {
  const form = new FormData();

  // IMPORTANT:
  // Send metadata before the file so Busboy receives
  // expectedSize and expectedHash before the "file" event.
  form.append("expectedSize", String(EXPECTED_SIZE));

  form.append("expectedHash", EXPECTED_HASH);

  form.append("file", fs.createReadStream(FILE_PATH));

  console.log(`Request ${requestNumber} prepared`);

  return axios.post(URL, form, {
    headers: {
      ...form.getHeaders(),
      "Idempotency-Key": IDEMPOTENCY_KEY,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
}

async function main() {
  console.log("=================================");
  console.log("IDEMPOTENCY RACE TEST");
  console.log("=================================");
  console.log("Idempotency Key:", IDEMPOTENCY_KEY);
  console.log("Expected Size:", EXPECTED_SIZE);
  console.log("Expected Hash:", EXPECTED_HASH);
  console.log("=================================\n");

  const results = await Promise.allSettled([
    createRequest(1),
    createRequest(2),
  ]);

  console.log("\n=================================");
  console.log("RESULTS");
  console.log("=================================");

  results.forEach((result, index) => {
    const requestNumber = index + 1;

    if (result.status === "fulfilled") {
      console.log(`\nRequest ${requestNumber}: SUCCESS`);
      console.log("Status:", result.value.status);
      console.log("Response:", result.value.data);
    } else {
      console.log(`\nRequest ${requestNumber}: FAILED`);

      if (result.reason.response) {
        console.log("HTTP Status:", result.reason.response.status);
        console.log("Response:", result.reason.response.data);
      } else {
        console.log("Error:", result.reason.message);
      }
    }
  });

  console.log("\n=================================");
  console.log("TEST FINISHED");
  console.log("=================================");
}

main().catch((error) => {
  console.error("Test failed:", error);
});