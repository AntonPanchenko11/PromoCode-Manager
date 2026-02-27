import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreatePromocodeDto } from './dto/create-promocode.dto';
import { PromocodeResponseDto } from './dto/promocode-response.dto';
import { UpdatePromocodeDto } from './dto/update-promocode.dto';
import { PromocodesService } from './promocodes.service';

@UseGuards(AccessTokenGuard, ActiveUserGuard)
@Controller('promocodes')
export class PromocodesController {
  constructor(private readonly promocodesService: PromocodesService) {}

  @Post()
  async create(@Body() dto: CreatePromocodeDto): Promise<PromocodeResponseDto> {
    return this.promocodesService.create(dto);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<PromocodeResponseDto> {
    return this.promocodesService.findResponseById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePromocodeDto): Promise<PromocodeResponseDto> {
    return this.promocodesService.update(id, dto);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string): Promise<PromocodeResponseDto> {
    return this.promocodesService.deactivate(id);
  }
}
