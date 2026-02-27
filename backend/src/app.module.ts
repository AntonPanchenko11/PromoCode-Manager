import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsModule } from './analytics/analytics.module';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { PromocodesModule } from './promocodes/promocodes.module';
import { SyncModule } from './sync/sync.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().port().default(3000),
        API_PREFIX: Joi.string().default('api'),
        MONGODB_URI: Joi.string().pattern(/^mongodb(\+srv)?:\/\//).required(),
        CLICKHOUSE_URL: Joi.string().uri().required(),
        CLICKHOUSE_DB: Joi.string().required(),
        CLICKHOUSE_USER: Joi.string().required(),
        CLICKHOUSE_PASSWORD: Joi.string().allow('').required(),
        REDIS_URL: Joi.string().uri().required(),
        REDIS_LOCK_TTL_MS: Joi.number().integer().min(500).default(5000),
        REDIS_LOCK_WAIT_TIMEOUT_MS: Joi.number().integer().min(100).default(2000),
        ANALYTICS_CACHE_TTL_SECONDS: Joi.number().integer().min(1).default(60),
        JWT_ACCESS_SECRET: Joi.string().min(16).required(),
        JWT_ACCESS_TTL: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().min(16).required(),
        JWT_REFRESH_TTL: Joi.string().required(),
        FRONTEND_ORIGIN: Joi.string().uri().required(),
        CH_SYNC_MAX_RETRIES: Joi.number().integer().min(1).default(4),
        CH_SYNC_RETRY_BASE_MS: Joi.number().integer().min(100).default(500),
        OUTBOX_POLL_INTERVAL_MS: Joi.number().integer().min(100).default(1000),
        OUTBOX_BATCH_SIZE: Joi.number().integer().min(1).max(500).default(50),
        OUTBOX_PROCESSING_TIMEOUT_MS: Joi.number().integer().min(1000).default(30000),
      }),
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/promocode_manager'),
      }),
    }),
    SyncModule,
    AnalyticsModule,
    AuthModule,
    UsersModule,
    PromocodesModule,
    OrdersModule,
  ],
})
export class AppModule {}
