import {
  fileUploadUnfinishedRecoveryQueue,
  fileUploadCompletedRecoveryQueue,
} from "../queues/fileUploadRecovery.queue.js";

const initialiseFileUploadSchedulers = async () => {

  console.log("🔥 Initialising file upload schedulers...");

  const pendingScheduler =
    await fileUploadUnfinishedRecoveryQueue.upsertJobScheduler(
      "pending-upload-recovery",
      {
        every: 15 * 1000,
      },
      {
        name: "reconcile-pending",
      },
    );

  console.log(
    "🔥 Pending scheduler created:",
    pendingScheduler
  );

  const completedScheduler =
    await fileUploadCompletedRecoveryQueue.upsertJobScheduler(
      "completed-upload-audit",
      {
        every: 15 * 1000,
      },
      {
        name: "reconcile-completed",
      },
    );

  console.log(
    "🔥 Completed scheduler created:",
    completedScheduler
  );

  console.log("🔥 File upload schedulers initialized");
};

export default initialiseFileUploadSchedulers;