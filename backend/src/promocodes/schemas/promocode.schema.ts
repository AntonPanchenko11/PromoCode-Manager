import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PromocodeDocument = HydratedDocument<Promocode>;

@Schema({
  timestamps: true,
  collection: 'promocodes',
})
export class Promocode {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ required: true, min: 1, max: 100 })
  discountPercent!: number;

  @Prop({ required: true, min: 1 })
  usageLimitTotal!: number;

  @Prop({ required: true, min: 1 })
  usageLimitPerUser!: number;

  @Prop({ type: Date, required: false, default: null })
  dateFrom!: Date | null;

  @Prop({ type: Date, required: false, default: null })
  dateTo!: Date | null;

  @Prop({ required: true, default: true })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PromocodeSchema = SchemaFactory.createForClass(Promocode);
