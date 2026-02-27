import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { Promocode, PromocodeSchema } from './schemas/promocode.schema';
import { PromocodesController } from './promocodes.controller';
import { PromocodesService } from './promocodes.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Promocode.name, schema: PromocodeSchema }]),
    UsersModule,
  ],
  controllers: [PromocodesController],
  providers: [PromocodesService],
  exports: [PromocodesService, MongooseModule],
})
export class PromocodesModule {}
