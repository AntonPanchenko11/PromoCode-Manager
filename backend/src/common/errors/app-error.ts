import { HttpException, HttpStatus, ValidationError } from '@nestjs/common';

type ValidationFieldError = {
  field: string;
  message: string;
};

const humanizeHttpStatus = (status: number): string => {
  const raw = HttpStatus[status];
  if (typeof raw !== 'string') {
    return 'Error';
  }

  return raw
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
};

export class AppError extends HttpException {
  constructor(
    statusCode: HttpStatus,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(
      {
        statusCode,
        error: humanizeHttpStatus(statusCode),
        code,
        message,
        details,
      },
      statusCode,
    );
  }

  static validation(errors: ValidationError[]): AppError {
    const fields: ValidationFieldError[] = [];

    const flatten = (nodes: ValidationError[], parent = ''): void => {
      for (const node of nodes) {
        const fieldName = parent
          ? `${parent}.${node.property}`
          : node.property;

        if (node.constraints) {
          const constraintMessages = Object.values(node.constraints);
          if (constraintMessages[0]) {
            fields.push({
              field: fieldName,
              message: constraintMessages[0],
            });
          }
        }

        if (node.children && node.children.length > 0) {
          flatten(node.children, fieldName);
        }
      }
    };

    flatten(errors);

    return new AppError(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Validation failed', {
      fields,
    });
  }
}
