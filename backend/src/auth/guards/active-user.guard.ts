import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { AppError } from '../../common/errors/app-error';
import { AuthUser } from '../../common/types/auth-user.type';
import { UsersService } from '../../users/users.service';

type AuthenticatedRequest = {
  user?: AuthUser;
};

@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authUser = request.user;

    if (!authUser?.userId) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'AUTH_UNAUTHORIZED', 'Unauthorized');
    }

    const user = await this.usersService.findByIdOrFail(authUser.userId);
    if (!user.isActive) {
      throw new AppError(HttpStatus.FORBIDDEN, 'USER_INACTIVE', 'User is inactive');
    }

    return true;
  }
}
