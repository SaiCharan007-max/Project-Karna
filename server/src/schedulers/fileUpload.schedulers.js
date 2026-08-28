import {
  fileUploadUnfinishedRecoveryQueue,
  fileUploadCompletedRecoveryQueue,
} from "../queues/fileUploadRecovery.queue.js";

const initialiseFileUploadSchedulers = async () => {
  const pendingScheduler =
    await fileUploadUnfinishedRecoveryQueue.upsertJobScheduler(
      "pending-upload-recovery",
      {
        every: 15 * 60 * 1000,
      },
      {
        name: "reconcile-pending",
      },
    );

  const completedScheduler =
    await fileUploadCompletedRecoveryQueue.upsertJobScheduler(
      "completed-upload-audit",
      {
        every: 60 * 60 * 1000,
      },
      {
        name: "reconcile-completed",
      },
    );

  console.log("File upload schedulers initialized");
};

export default initialiseFileUploadSchedulers;