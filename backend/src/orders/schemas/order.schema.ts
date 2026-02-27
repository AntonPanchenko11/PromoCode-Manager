import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({
  timestamps: true,
  collection: 'orders',
})
export class Order {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, min: 0.01 })
  amount!: number;

  @Prop({ type: Types.ObjectId, ref: 'Promocode', default: null })
  promocodeId!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  promocodeCode!: string | null;

  @Prop({ required: true, min: 0, default: 0 })
  discountAmount!: number;

  @Prop({ required: true, min: 0.01 })
  finalAmount!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ userId: 1, createdAt: -1 });
