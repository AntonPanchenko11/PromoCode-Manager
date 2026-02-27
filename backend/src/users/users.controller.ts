import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@UseGuards(AccessTokenGuard, ActiveUserGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findPublicById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.deactivate(id);
  }
}
