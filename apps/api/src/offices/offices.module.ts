import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Patch,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { officeUser } from '../common/scope';
import { PrismaService } from '../prisma/prisma.service';

const PHONE = /^[+\d][\d\s()-]{5,39}$/;

export class UpdateOfficeDto {
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @Matches(PHONE) phone?: string;
  /** Used for the "Book via WhatsApp" button on the public pages */
  @IsOptional() @Matches(PHONE) whatsappNumber?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  /** Office location for the map on the public page */
  @IsOptional() @Type(() => Number) @IsLatitude() latitude?: number;
  @IsOptional() @Type(() => Number) @IsLongitude() longitude?: number;
  @IsOptional() @IsUrl({ require_tld: false }) logoUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false }) coverImageUrl?: string;
  @IsOptional() @Matches(/^#[0-9A-Fa-f]{6}$/) brandColor?: string;
  @IsOptional() @Length(3, 3) defaultCurrencyCode?: string;
  @IsOptional() @IsIn(['AR', 'EN']) defaultLocale?: 'AR' | 'EN';
  @IsOptional() @IsBoolean() publicPageEnabled?: boolean;
  @IsOptional() @IsString() @MaxLength(5000) bookingTerms?: string;
  @IsOptional() @IsString() @MaxLength(5000) cancellationTerms?: string;
}

export class SetCurrenciesDto {
  @IsArray() @ArrayMinSize(1) @Length(3, 3, { each: true }) codes!: string[];
}

@Injectable()
export class OfficesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(user: AuthUser) {
    const { officeId } = officeUser(user);
    return this.prisma.office.findUniqueOrThrow({
      where: { id: officeId },
      include: {
        currencies: { include: { currency: true } },
        branches: { orderBy: [{ isMain: 'desc' }, { name: 'asc' }] },
      },
    });
  }

  async update(user: AuthUser, dto: UpdateOfficeDto) {
    const { officeId } = officeUser(user);
    if (dto.defaultCurrencyCode) {
      const enabled = await this.prisma.officeCurrency.findUnique({
        where: {
          officeId_currencyCode: {
            officeId,
            currencyCode: dto.defaultCurrencyCode.toUpperCase(),
          },
        },
      });
      if (!enabled)
        throw new BadRequestException(
          'Enable the currency for the office before making it the default',
        );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.office.update({
        where: { id: officeId },
        data: {
          ...dto,
          defaultCurrencyCode: dto.defaultCurrencyCode?.toUpperCase(),
        },
      });
      await this.audit.log(
        user,
        {
          action: 'office.updated',
          entityType: 'office',
          entityId: officeId,
          summary: 'Updated office settings',
        },
        tx,
      );
    });
    return this.get(user);
  }

  async listCurrencies() {
    return this.prisma.currency.findMany({ orderBy: { code: 'asc' } });
  }

  /** Replace the office's enabled currencies. The default currency must stay enabled. */
  async setCurrencies(user: AuthUser, dto: SetCurrenciesDto) {
    const { officeId } = officeUser(user);
    const codes = [...new Set(dto.codes.map((c) => c.toUpperCase()))];
    const office = await this.prisma.office.findUniqueOrThrow({
      where: { id: officeId },
    });
    if (!codes.includes(office.defaultCurrencyCode)) {
      throw new BadRequestException(
        `The default currency ${office.defaultCurrencyCode} must stay enabled`,
      );
    }
    const known = await this.prisma.currency.count({
      where: { code: { in: codes } },
    });
    if (known !== codes.length)
      throw new BadRequestException('Unknown currency code');
    const inUse = await this.prisma.trip.findFirst({
      where: {
        officeId,
        currencyCode: { notIn: codes },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      select: { code: true, currencyCode: true },
    });
    if (inUse)
      throw new BadRequestException(
        `${inUse.currencyCode} is used by trip ${inUse.code}`,
      );

    await this.prisma.$transaction([
      this.prisma.officeCurrency.deleteMany({
        where: { officeId, currencyCode: { notIn: codes } },
      }),
      this.prisma.officeCurrency.createMany({
        data: codes.map((currencyCode) => ({ officeId, currencyCode })),
        skipDuplicates: true,
      }),
    ]);
    return this.get(user);
  }
}

@ApiTags('Office')
@ApiBearerAuth()
@Controller()
export class OfficesController {
  constructor(private readonly offices: OfficesService) {}

  @Get('office')
  @RequirePermissions()
  @ApiOperation({
    summary: 'Current office profile, branches and enabled currencies',
  })
  get(@CurrentUser() user: AuthUser) {
    return this.offices.get(user);
  }

  @Patch('office')
  @RequirePermissions('office.manage')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateOfficeDto) {
    return this.offices.update(user, dto);
  }

  @Get('currencies')
  @ApiOperation({
    summary: 'Currencies supported by the platform (SYP, USD...)',
  })
  currencies() {
    return this.offices.listCurrencies();
  }

  @Put('office/currencies')
  @RequirePermissions('office.manage')
  @ApiOperation({ summary: 'Set the currencies this office works with' })
  setCurrencies(@CurrentUser() user: AuthUser, @Body() dto: SetCurrenciesDto) {
    return this.offices.setCurrencies(user, dto);
  }
}

@Module({ controllers: [OfficesController], providers: [OfficesService] })
export class OfficesModule {}
