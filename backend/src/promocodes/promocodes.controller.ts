import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { CreatePromocodeDto } from './dto/create-promocode.dto';
import { PromocodeResponseDto } from './dto/promocode-response.dto';
import { UpdatePromocodeDto } from './dto/update-promocode.dto';
import { PromocodesService } from './promocodes.service';

@ApiTags('Promocodes')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard, ActiveUserGuard)
@Controller('promocodes')
export class PromocodesController {
  constructor(private readonly promocodesService: PromocodesService) {}

  @ApiOperation({ summary: 'Create promocode' })
  @ApiOkResponse({ type: PromocodeResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Post()
  async create(@Body() dto: CreatePromocodeDto): Promise<PromocodeResponseDto> {
    return this.promocodesService.create(dto);
  }

  @ApiOperation({ summary: 'Get promocode by id' })
  @ApiOkResponse({ type: PromocodeResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Get(':id')
  async getById(@Param('id') id: string): Promise<PromocodeResponseDto> {
    return this.promocodesService.findResponseById(id);
  }

  @ApiOperation({ summary: 'Update promocode' })
  @ApiOkResponse({ type: PromocodeResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePromocodeDto): Promise<PromocodeResponseDto> {
    return this.promocodesService.update(id, dto);
  }

  @ApiOperation({ summary: 'Deactivate promocode' })
  @ApiOkResponse({ type: PromocodeResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string): Promise<PromocodeResponseDto> {
    return this.promocodesService.deactivate(id);
  }
}
