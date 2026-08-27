import {
  fileUploadUnfinishedRecoveryQueue,
  fileUploadCompletedRecoveryQueue,
} from "../queues/fileUploadRecovery.queue.js";

const initialiseFileUploadSchedulers = async () => {
  console.log("Starting file upload schedulers...");

  console.log("Creating pending scheduler...");

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

  console.log(
    "Pending scheduler created:",
    pendingScheduler?.id
  );

  console.log("Creating completed scheduler...");

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

  console.log(
    "Completed scheduler created:",
    completedScheduler?.id
  );

  console.log("File upload schedulers initialized");
};

export default initialiseFileUploadSchedulers;