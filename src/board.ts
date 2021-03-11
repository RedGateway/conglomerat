import { setQueues, BullMQAdapter, router } from "bull-board/dist";
import { queueRealms, queueLogs } from "./osint/osint.queue";
import { queueAuctions, queueItems, queueGolds } from "./dma/dma.queue";
import express from "express";

const app = express();

setQueues([
  new BullMQAdapter(queueRealms),
  new BullMQAdapter(queueLogs),
  new BullMQAdapter(queueAuctions),
  new BullMQAdapter(queueItems),
  new BullMQAdapter(queueGolds),
]);

app.use('/admin/queues', router)

app.listen(3000)
