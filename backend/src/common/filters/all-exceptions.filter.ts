import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorPayload = {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
};

const isResponseBody = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const asString = (value: unknown, fallback: string): string => {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: Omit<ErrorPayload, 'timestamp' | 'path'> = {
      statusCode,
      error: 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected error occurred',
    };

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (isResponseBody(body)) {
        payload = {
          statusCode,
          error: asString(body.error, 'Error'),
          code: asString(body.code, 'HTTP_EXCEPTION'),
          message: asString(body.message, 'Request failed'),
          details:
            typeof body.details === 'object' && body.details !== null
              ? (body.details as Record<string, unknown>)
              : undefined,
        };
      } else {
        payload = {
          statusCode,
          error: 'Http Exception',
          code: 'HTTP_EXCEPTION',
          message: asString(body, 'Request failed'),
        };
      }
    }

    response.status(statusCode).json({
      ...payload,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    } satisfies ErrorPayload);
  }
}
