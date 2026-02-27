import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PromoUsageDocument = HydratedDocument<PromoUsage>;

@Schema({
  timestamps: true,
  collection: 'promo_usages',
})
export class PromoUsage {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Order', unique: true })
  orderId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Promocode', index: true })
  promocodeId!: Types.ObjectId;

  @Prop({ required: true })
  promocodeCode!: string;

  @Prop({ required: true, min: 0.01 })
  orderAmount!: number;

  @Prop({ required: true, min: 0 })
  discountAmount!: number;

  @Prop({ required: true, min: 0.01 })
  finalAmount!: number;

  @Prop({ required: true, default: () => new Date() })
  usedAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PromoUsageSchema = SchemaFactory.createForClass(PromoUsage);
PromoUsageSchema.index({ promocodeId: 1, userId: 1, usedAt: -1 });
PromoUsageSchema.index({ promocodeId: 1, usedAt: -1 });
