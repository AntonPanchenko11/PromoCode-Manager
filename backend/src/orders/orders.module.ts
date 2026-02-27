import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromocodesModule } from '../promocodes/promocodes.module';
import { UsersModule } from '../users/users.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { PromoUsage, PromoUsageSchema } from './schemas/promo-usage.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: PromoUsage.name, schema: PromoUsageSchema },
    ]),
    UsersModule,
    PromocodesModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService, MongooseModule],
})
export class OrdersModule {}
