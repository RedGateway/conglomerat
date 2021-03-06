import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

export const realmsQueue: QueueInterface = {
  name: 'OSINT:Realms',
  workerOptions: { concurrency: 1 },
  options: {
    defaultJobOptions: queueOptions,
  },
};
