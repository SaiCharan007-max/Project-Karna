import { Queue } from "bullmq";

export const fileUploadUnfinishedRecoveryQueue = new Queue("file-upload-recovery-unfinished", {
  connection: {
    url: process.env.REDIS_URL,
  },
});

export const fileUploadCompletedRecoveryQueue = new Queue("file-upload-recovery-completed", {
    connection: {
        url: process.env.REDIS_URL,
    },
});
