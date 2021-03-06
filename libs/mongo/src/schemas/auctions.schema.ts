import { Document, Mixed } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Auction extends Document {
  @Prop({ type: Number, required: true })
  id: number;

  @Prop({ type: Number, required: true })
  item_id: number;

  @Prop()
  item: Mixed;

  @Prop({ type: Number, required: true })
  connected_realm_id: number;

  @Prop({ type: Number, required: true })
  last_modified: number;

  @Prop({ type: Number })
  quantity: number;

  @Prop({ type: Number })
  bid: number;

  @Prop({ type: Number })
  buyout: number;

  @Prop({ type: Number })
  price: number;

  // TODO enum?
  @Prop({ type: String })
  time_left: string;

  @Prop()
  updatedAt: Date;

  @Prop()
  createdAt: Date;
}

export const AuctionsShema = SchemaFactory.createForClass(Auction);
AuctionsShema.index({ 'createdAt': -1 }, { name: 'TTL', expireAfterSeconds: 86400 })
AuctionsShema.index({ 'connected_realm_id': 1, 'last_modified': -1 }, { name: 'TS' })
AuctionsShema.index({ 'item_id': -1, 'connected_realm_id': 1 }, { name: 'Q' })
AuctionsShema.index({ 'last_modified': -1, 'item_id': -1, 'connected_realm_id': 1 }, { name: 'PL' })

