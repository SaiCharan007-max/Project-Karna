console.log("🔥 fileUploadRecovery.worker.js LOADED");

import { Worker } from "bullmq";
import {
  reconcileUploadsPending,
  reconcileUploadsCompleted,
} from "../service/fileUploadRecovery.service.js";

const fileUploadUnfinishedRecoveryWorker = new Worker(
  "file-upload-recovery-unfinished",
  async (job) => {
    console.log("=================================");
    console.log("RECOVERY JOB RECEIVED");
    console.log("Job ID:", job.id);
    console.log("Job Name:", job.name);
    console.log("Job Data:", job.data);

    await reconcileUploadsPending();

    console.log("RECOVERY JOB COMPLETED");

    return {
      success: true,
    };
  },
  {
    connection: {
      url: process.env.REDIS_URL,
    },
  },
);

const fileUploadCompletedRecoveryWorker = new Worker(
  "file-upload-recovery-completed",
  async (job) => {
    console.log("Running completed upload reconciliation");
    await reconcileUploadsCompleted();

    return { success: true };
  },
  {
    connection: {
      url: process.env.REDIS_URL,
    },
  },
);
