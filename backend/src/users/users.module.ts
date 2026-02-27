import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService, ActiveUserGuard],
  exports: [UsersService, ActiveUserGuard, MongooseModule],
})
export class UsersModule {}
