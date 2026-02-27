import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppError } from './common/errors/app-error';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });
  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => AppError.validation(errors),
      errorHttpStatusCode: HttpStatus.BAD_REQUEST,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PromoCode Manager API')
    .setDescription('CQRS API: commands -> MongoDB, analytics queries -> ClickHouse')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  const apiPrefix = process.env.API_PREFIX ?? 'api';
  SwaggerModule.setup(`${apiPrefix}/docs`, app, swaggerDocument);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
