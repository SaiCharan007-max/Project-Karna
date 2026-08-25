import {
  fileUploadUnfinishedRecoveryQueue,
  fileUploadCompletedRecoveryQueue,
} from "../queues/fileUploadRecovery.queue.js";

const initialiseFileUploadSchedulers = async () => {
  await fileUploadUnfinishedRecoveryQueue.upsertJobScheduler(
    "pending-upload-recovery",
    {
      every: 5 * 1000,
    },
    {
      name: "reconcile-pending",
    },
  );

  await fileUploadCompletedRecoveryQueue.upsertJobScheduler(
    "completed-upload-audit",
    {
      every: 6 * 60 * 60 * 1000,
    },
    {
      name: "reconcile-completed",
    },
  );

  console.log("File upload schedulers initialized");
};

export default initialiseFileUploadSchedulers;