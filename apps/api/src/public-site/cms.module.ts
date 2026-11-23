import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  PartialType,
} from '@nestjs/swagger';
import { SLIDE_LINKS, type SlideLink } from '@travelos/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AuditService, diff } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

const url = () => IsUrl({ require_tld: false, require_protocol: false });

export class SlideDto {
  @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(255) subtitle?: string;
  @IsString() @url() @MaxLength(500) imageUrl!: string;
  @IsIn(SLIDE_LINKS) linkType!: SlideLink;
  @IsOptional() @IsUUID() linkId?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateSlideDto extends PartialType(SlideDto) {}

export class AchievementImageDto {
  @IsString() @url() @MaxLength(500) url!: string;
  @IsOptional() @IsString() @MaxLength(160) caption?: string;
}
export class AchievementDto {
  @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsDateString({ strict: true }) achievedOn?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AchievementImageDto)
  images?: AchievementImageDto[];
}
export class UpdateAchievementDto extends PartialType(AchievementDto) {}

export class PolicyDto {
  @IsString()
  @Matches(/^[a-z0-9-]{2,80}$/, {
    message: 'slug: lowercase letters, digits and dashes',
  })
  slug!: string;
  @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @IsString() @MinLength(10) @MaxLength(50000) body!: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdatePolicyDto extends PartialType(PolicyDto) {}

export class SettingsDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150) officeName?: string;
  @IsOptional() @IsString() @MaxLength(150) officeNameEn?: string;
  @IsOptional() @IsString() @MaxLength(255) tagline?: string;
  @IsOptional() @IsString() @MaxLength(5000) about?: string;
  @IsOptional() @IsString() @url() @MaxLength(500) logoUrl?: string;
  @IsOptional() @IsString() @url() @MaxLength(500) heroImageUrl?: string;
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, {
    message: 'whatsappNumber: international format, digits only',
  })
  whatsappNumber?: string;
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  whatsappTemplate?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(190) email?: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsString() @Length(3, 3) defaultCurrencyCode?: string;
  @IsOptional() @IsObject() socialLinks?: Record<string, string>;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  visaWarningDays?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(24)
  passportValidityMonths?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  deadlineWarningDays?: number;
  @IsOptional() @IsBoolean() confirmRequiresPayment?: boolean;
}

/** CMS-01..06: everything the public landing page shows. Admin only (site.manage). */
@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // slides
  slides() {
    return this.prisma.landingSlide.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        trip: { select: { id: true, code: true, title: true } },
        program: { select: { id: true, code: true, title: true } },
        offer: { select: { id: true, title: true } },
      },
    });
  }

  async createSlide(user: AuthUser, dto: SlideDto) {
    const slide = await this.prisma.landingSlide.create({
      data: {
        ...this.slideLink(dto),
        title: dto.title,
        subtitle: dto.subtitle,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.log(user, {
      action: 'slide.created',
      entityType: 'slide',
      entityId: slide.id,
      summary: `Slide "${slide.title}" added`,
    });
    return slide;
  }

  async updateSlide(user: AuthUser, id: string, dto: UpdateSlideDto) {
    const before = await this.prisma.landingSlide.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Slide not found');
    const link =
      dto.linkType !== undefined
        ? this.slideLink({ linkType: dto.linkType, linkId: dto.linkId })
        : {};
    const slide = await this.prisma.landingSlide.update({
      where: { id },
      data: {
        ...link,
        title: dto.title,
        subtitle: dto.subtitle,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
    await this.audit.log(user, {
      action: 'slide.updated',
      entityType: 'slide',
      entityId: id,
      summary: `Slide "${slide.title}" updated`,
    });
    return slide;
  }

  async deleteSlide(user: AuthUser, id: string) {
    await this.prisma.landingSlide.delete({ where: { id } });
    await this.audit.log(user, {
      action: 'slide.deleted',
      entityType: 'slide',
      entityId: id,
      summary: 'Slide deleted',
    });
    return { deleted: true };
  }

  private slideLink(dto: { linkType: SlideLink; linkId?: string }) {
    if (dto.linkType !== 'NONE' && !dto.linkId)
      throw new BadRequestException('Choose what the slide links to');
    return {
      linkType: dto.linkType,
      tripId: dto.linkType === 'TRIP' ? dto.linkId : null,
      programId: dto.linkType === 'PROGRAM' ? dto.linkId : null,
      offerId: dto.linkType === 'OFFER' ? dto.linkId : null,
    };
  }

  // achievements
  achievements() {
    return this.prisma.achievement.findMany({
      orderBy: [{ sortOrder: 'asc' }, { achievedOn: 'desc' }],
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async createAchievement(user: AuthUser, dto: AchievementDto) {
    const a = await this.prisma.achievement.create({
      data: {
        title: dto.title,
        description: dto.description,
        achievedOn: dto.achievedOn ? new Date(dto.achievedOn) : null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        images: {
          create: (dto.images ?? []).map((img, i) => ({
            ...img,
            sortOrder: i,
          })),
        },
      },
      include: { images: true },
    });
    await this.audit.log(user, {
      action: 'achievement.created',
      entityType: 'achievement',
      entityId: a.id,
      summary: `Achievement "${a.title}" added`,
    });
    return a;
  }

  async updateAchievement(
    user: AuthUser,
    id: string,
    dto: UpdateAchievementDto,
  ) {
    if (!(await this.prisma.achievement.findUnique({ where: { id } })))
      throw new NotFoundException('Achievement not found');
    const a = await this.prisma.$transaction(async (tx) => {
      if (dto.images) {
        await tx.achievementImage.deleteMany({ where: { achievementId: id } });
        await tx.achievementImage.createMany({
          data: dto.images.map((img, i) => ({
            ...img,
            achievementId: id,
            sortOrder: i,
          })),
        });
      }
      return tx.achievement.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          achievedOn: dto.achievedOn ? new Date(dto.achievedOn) : undefined,
          sortOrder: dto.sortOrder,
          isActive: dto.isActive,
        },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    await this.audit.log(user, {
      action: 'achievement.updated',
      entityType: 'achievement',
      entityId: id,
      summary: `Achievement "${a.title}" updated`,
    });
    return a;
  }

  async deleteAchievement(user: AuthUser, id: string) {
    await this.prisma.achievement.delete({ where: { id } });
    await this.audit.log(user, {
      action: 'achievement.deleted',
      entityType: 'achievement',
      entityId: id,
      summary: 'Achievement deleted',
    });
    return { deleted: true };
  }

  // policies
  policies() {
    return this.prisma.policy.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createPolicy(user: AuthUser, dto: PolicyDto) {
    const p = await this.prisma.policy.create({ data: dto });
    await this.audit.log(user, {
      action: 'policy.created',
      entityType: 'policy',
      entityId: p.id,
      summary: `Page "${p.title}" added`,
    });
    return p;
  }

  async updatePolicy(user: AuthUser, id: string, dto: UpdatePolicyDto) {
    const p = await this.prisma.policy.update({ where: { id }, data: dto });
    await this.audit.log(user, {
      action: 'policy.updated',
      entityType: 'policy',
      entityId: id,
      summary: `Page "${p.title}" updated`,
    });
    return p;
  }

  async deletePolicy(user: AuthUser, id: string) {
    await this.prisma.policy.delete({ where: { id } });
    await this.audit.log(user, {
      action: 'policy.deleted',
      entityType: 'policy',
      entityId: id,
      summary: 'Page deleted',
    });
    return { deleted: true };
  }

  // settings (CMS-04)
  async settings() {
    const s = await this.prisma.siteSetting.findUnique({ where: { id: 1 } });
    if (!s)
      throw new NotFoundException(
        'Settings missing; run the installation seed',
      );
    return s;
  }

  async updateSettings(user: AuthUser, dto: SettingsDto) {
    const before = await this.settings();
    if (
      dto.defaultCurrencyCode &&
      !(await this.prisma.currency.findUnique({
        where: { code: dto.defaultCurrencyCode },
      }))
    )
      throw new NotFoundException('Unknown currency');
    const s = await this.prisma.siteSetting.update({
      where: { id: 1 },
      data: { ...dto, whatsappNumber: dto.whatsappNumber?.replace(/^\+/, '') },
    });
    await this.audit.log(user, {
      action: 'settings.updated',
      entityType: 'settings',
      summary: 'Office settings updated',
      changes: diff(before as never, dto as never),
    });
    return s;
  }
}

@ApiTags('Public site content (CMS)')
@ApiBearerAuth()
@Controller('cms')
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Get('settings')
  @ApiOperation({
    summary:
      'Office settings (readable by every signed-in user; receipts and exports use them)',
  })
  settings() {
    return this.cms.settings();
  }

  @Patch('settings')
  @RequirePermissions('site.manage')
  updateSettings(@CurrentUser() user: AuthUser, @Body() dto: SettingsDto) {
    return this.cms.updateSettings(user, dto);
  }

  @Get('slides')
  @RequirePermissions('site.manage')
  slides() {
    return this.cms.slides();
  }

  @Post('slides')
  @RequirePermissions('site.manage')
  createSlide(@CurrentUser() user: AuthUser, @Body() dto: SlideDto) {
    return this.cms.createSlide(user, dto);
  }

  @Patch('slides/:id')
  @RequirePermissions('site.manage')
  updateSlide(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSlideDto,
  ) {
    return this.cms.updateSlide(user, id, dto);
  }

  @Delete('slides/:id')
  @RequirePermissions('site.manage')
  deleteSlide(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cms.deleteSlide(user, id);
  }

  @Get('achievements')
  @RequirePermissions('site.manage')
  achievements() {
    return this.cms.achievements();
  }

  @Post('achievements')
  @RequirePermissions('site.manage')
  createAchievement(
    @CurrentUser() user: AuthUser,
    @Body() dto: AchievementDto,
  ) {
    return this.cms.createAchievement(user, dto);
  }

  @Patch('achievements/:id')
  @RequirePermissions('site.manage')
  updateAchievement(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAchievementDto,
  ) {
    return this.cms.updateAchievement(user, id, dto);
  }

  @Delete('achievements/:id')
  @RequirePermissions('site.manage')
  deleteAchievement(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cms.deleteAchievement(user, id);
  }

  @Get('policies')
  @RequirePermissions('site.manage')
  policies() {
    return this.cms.policies();
  }

  @Post('policies')
  @RequirePermissions('site.manage')
  createPolicy(@CurrentUser() user: AuthUser, @Body() dto: PolicyDto) {
    return this.cms.createPolicy(user, dto);
  }

  @Put('policies/:id')
  @RequirePermissions('site.manage')
  updatePolicy(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePolicyDto,
  ) {
    return this.cms.updatePolicy(user, id, dto);
  }

  @Delete('policies/:id')
  @RequirePermissions('site.manage')
  deletePolicy(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cms.deletePolicy(user, id);
  }
}

@Module({ controllers: [CmsController], providers: [CmsService] })
export class CmsModule {}
