import { ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppError } from '../../common/errors/app-error';

@Injectable()
export class AccessTokenGuard extends AuthGuard('jwt') {
  handleRequest<TUser extends Record<string, unknown>>(
    err: unknown,
    user: TUser | false | null,
    _info: unknown,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser {
    if (err || !user) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'AUTH_UNAUTHORIZED', 'Unauthorized');
    }

    return user;
  }
}
