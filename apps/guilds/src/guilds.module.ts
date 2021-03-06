import { Module } from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import {
  Character,
  CharactersSchema,
  Guild,
  GuildsSchema,
  Key,
  KeysSchema, Log,
  LogsSchema,
  Realm,
  RealmsSchema,
} from '@app/mongo';
import { BullModule } from '@anchan828/nest-bullmq';
import { guildsQueue } from '@app/core/queues/guilds.queue';
import { GuildsWorker } from './guilds.worker';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Log.name, schema: LogsSchema },
      { name: Key.name, schema: KeysSchema },
      { name: Guild.name, schema: GuildsSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: Character.name, schema: CharactersSchema },
    ]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue({ queueName: guildsQueue.name, options: guildsQueue.options }),
  ],
  controllers: [],
  providers: [GuildsService, GuildsWorker],
})
export class GuildsModule {}
