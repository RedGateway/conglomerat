import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig } from '@app/configuration';
import { Key, KeysSchema } from '@app/mongo';
import { KeysService } from './keys.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([{ name: Key.name, schema: KeysSchema }]),
  ],
  controllers: [],
  providers: [KeysService],
})
export class KeysModule {}
