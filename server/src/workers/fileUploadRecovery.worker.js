import { Worker } from "bullmq";

import {
  reconcileUploadsPending,
  reconcileUploadsCompleted,
} from "../service/fileUploadRecovery.service.js";

const connection = {
  url: process.env.REDIS_URL,
};

// ============================================================
// Pending / Unfinished Upload Recovery Worker
// ============================================================

const pendingRecoveryWorker = new Worker(
  "file-upload-recovery-unfinished",
  async (job) => {
    console.log("🔥 PENDING RECOVERY JOB RECEIVED");
    console.log("Job name:", job.name);
    console.log("Job ID:", job.id);

    await reconcileUploadsPending();
  },
  {
    connection,
  },
);

// ============================================================
// Completed Upload Audit Worker
// ============================================================

const completedRecoveryWorker = new Worker(
  "file-upload-recovery-completed",
  async (job) => {
    console.log("🔥 COMPLETED AUDIT JOB RECEIVED");
    console.log("Job name:", job.name);
    console.log("Job ID:", job.id);

    await reconcileUploadsCompleted();
  },
  {
    connection,
  },
);

// ============================================================
// Worker Events
// ============================================================

pendingRecoveryWorker.on("ready", () => {
  console.log("Pending recovery worker connected to Redis");
});

pendingRecoveryWorker.on("completed", (job) => {
  console.log("Pending recovery job completed:", job.id);
});

pendingRecoveryWorker.on("failed", (job, error) => {
  console.error(
    "Pending recovery job failed:",
    job?.id,
    error,
  );
});

completedRecoveryWorker.on("ready", () => {
  console.log("Completed audit worker connected to Redis");
});

completedRecoveryWorker.on("completed", (job) => {
  console.log("Completed audit job completed:", job.id);
});

completedRecoveryWorker.on("failed", (job, error) => {
  console.error(
    "Completed audit job failed:",
    job?.id,
    error,
  );
});

console.log("File upload recovery workers initialized");