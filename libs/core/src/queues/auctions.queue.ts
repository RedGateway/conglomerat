import { JobsOptions } from 'bullmq';
import { QueueInterface } from '@app/core/interfaces';

const queueOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
};

export const auctionsQueue: QueueInterface = {
  name: 'OSINT:Auctions',
  options: {
    defaultJobOptions: queueOptions,
  },
};