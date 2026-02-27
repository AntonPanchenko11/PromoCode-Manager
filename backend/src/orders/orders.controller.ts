import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { AuthUser } from '../common/types/auth-user.type';
import { ApplyPromocodeDto } from './dto/apply-promocode.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListMyOrdersQueryDto } from './dto/list-my-orders-query.dto';
import { OrderResponseDto, PaginatedOrdersResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard, ActiveUserGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'Create order for current user' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.create(user, dto);
  }

  @ApiOperation({ summary: 'List current user orders with pagination' })
  @ApiOkResponse({ type: PaginatedOrdersResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Get('my')
  async listMy(
    @CurrentUser() user: AuthUser,
    @Query() query: ListMyOrdersQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    return this.ordersService.listMyOrders(user, query);
  }

  @ApiOperation({ summary: 'Apply promocode to existing order' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Post(':id/apply-promocode')
  async applyPromocode(
    @CurrentUser() user: AuthUser,
    @Param('id') orderId: string,
    @Body() dto: ApplyPromocodeDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.applyPromocode(user, orderId, dto);
  }
}
