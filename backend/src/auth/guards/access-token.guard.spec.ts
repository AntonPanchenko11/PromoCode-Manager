import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../common/errors/app-error';
import { AccessTokenGuard } from './access-token.guard';

describe('AccessTokenGuard', () => {
  let guard: AccessTokenGuard;

  beforeEach(() => {
    guard = new AccessTokenGuard();
  });

  it('returns user when jwt auth succeeded', () => {
    const user = {
      userId: 'user-1',
      email: 'user@example.com',
    };

    const result = guard.handleRequest(
      null,
      user,
      null,
      {} as never,
    );

    expect(result).toEqual(user);
  });

  it('throws AUTH_UNAUTHORIZED when jwt auth failed', () => {
    expect(() => {
      guard.handleRequest(
        null,
        null,
        null,
        {} as never,
      );
    }).toThrow(
      new AppError(HttpStatus.UNAUTHORIZED, 'AUTH_UNAUTHORIZED', 'Unauthorized'),
    );
  });
});
