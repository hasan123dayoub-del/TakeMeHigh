import {
  BadRequestException,
  Body,
  ConflictException,
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
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
  PartialType,
} from '@nestjs/swagger';
import {
  DOCUMENT_TYPES,
  GENDERS,
  LABELS,
  type DocumentType,
  type Gender,
} from '@travelos/shared';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuditService, diff } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import {
  ilike,
  orderArgs,
  pageArgs,
  paginate,
  PaginationQueryDto,
} from '../common/dto/pagination.dto';
import { ExportService, ExportSpec } from '../common/export/export.service';
import { isAll, ownBranch, writeBranchFor } from '../common/scope';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  MAX_UPLOAD_BYTES,
  StorageService,
  UploadsModule,
  type UploadedBlob,
} from '../uploads/uploads.module';

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const normPhone = (p: string) => p.replace(/[\s()-]/g, '');

export class CustomerDto {
  @IsString() @MinLength(3) @MaxLength(160) fullName!: string;
  @IsString()
  @Matches(PHONE, { message: 'phone must be a valid phone number' })
  phone!: string;
  @IsUUID() nationalityCountryId!: string;
  @IsOptional() @IsDateString({ strict: true }) birthDate?: string;
  @IsOptional() @IsIn(GENDERS) gender?: Gender;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  /** Admin chooses; branch staff always register in their own branch */
  @IsOptional() @IsUUID() branchId?: string;
}
export class UpdateCustomerDto extends PartialType(CustomerDto) {}

export class DocumentDto {
  @IsIn(DOCUMENT_TYPES) docType!: DocumentType;
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Transform(({ value }: { value: string }) => value?.trim().toUpperCase())
  docNumber!: string;
  @IsUUID() issuingCountryId!: string;
  @IsOptional() @IsDateString({ strict: true }) issuedOn?: string;
  @IsOptional() @IsDateString({ strict: true }) expiresOn?: string;
}
export class UpdateDocumentDto extends PartialType(DocumentDto) {}

export class CustomerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() nationalityCountryId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isActive?: boolean;
}

export class DuplicateQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  docNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() excludeId?: string;
}

export class ActiveDto {
  @IsBoolean() isActive!: boolean;
}

const listInclude = {
  nationality: {
    select: { id: true, nameAr: true, nameEn: true, isoCode: true },
  },
  branch: { select: { id: true, name: true } },
  documents: {
    select: { id: true, docType: true, docNumber: true, expiresOn: true },
    orderBy: { createdAt: 'asc' },
  },
  _count: { select: { bookingsPaid: true, travels: true } },
} satisfies Prisma.CustomerInclude;
type CustomerRow = Prisma.CustomerGetPayload<{ include: typeof listInclude }>;

const EXPORT: ExportSpec<CustomerRow> = {
  filename: 'customers',
  title: 'العملاء',
  columns: [
    { header: 'الاسم', value: (c) => c.fullName, width: 28 },
    { header: 'الهاتف', value: (c) => c.phone, width: 16 },
    { header: 'الجنسية', value: (c) => c.nationality.nameAr },
    { header: 'تاريخ الميلاد', value: (c) => c.birthDate },
    {
      header: 'الجنس',
      value: (c) => (c.gender ? LABELS.gender[c.gender].ar : ''),
    },
    {
      header: 'الوثائق',
      value: (c) =>
        c.documents
          .map((d) => `${LABELS.documentType[d.docType].ar} ${d.docNumber}`)
          .join('، '),
      width: 36,
    },
    { header: 'فرع التسجيل', value: (c) => c.branch.name },
    { header: 'عدد الرحلات', value: (c) => c._count.travels },
    { header: 'الحالة', value: (c) => (c.isActive ? 'فعّال' : 'معطّل') },
  ],
};

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  /** CUS-08: branch staff see customers registered in their branch or with a booking in it. */
  scope(user: AuthUser): Prisma.CustomerWhereInput {
    if (isAll(user)) return {};
    const b = ownBranch(user);
    return {
      OR: [
        { branchId: b },
        { bookingsPaid: { some: { branchId: b } } },
        { travels: { some: { booking: { branchId: b } } } },
      ],
    };
  }

  async list(user: AuthUser, q: CustomerQueryDto) {
    const where: Prisma.CustomerWhereInput = {
      AND: [
        this.scope(user),
        q.branchId && isAll(user) ? { branchId: q.branchId } : {},
        q.nationalityCountryId
          ? { nationalityCountryId: q.nationalityCountryId }
          : {},
        q.isActive !== undefined ? { isActive: q.isActive } : {},
        q.search
          ? {
              OR: [
                { fullName: ilike(q.search) },
                { phone: { contains: normPhone(q.search) } },
                { documents: { some: { docNumber: ilike(q.search) } } },
              ],
            }
          : {},
      ],
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: listInclude,
        orderBy: orderArgs(q, ['fullName', 'createdAt'] as const, 'createdAt'),
        ...pageArgs(q),
      }),
      this.prisma.customer.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  /** CUS-06: profile, documents, bookings (as payer and as passenger), payments and visas. */
  async get(user: AuthUser, id: string) {
    const c = await this.prisma.customer.findFirst({
      where: { AND: [{ id }, this.scope(user)] },
      include: {
        ...listInclude,
        documents: {
          include: {
            issuingCountry: { select: { nameAr: true, isoCode: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        createdBy: { select: { fullName: true } },
      },
    });
    if (!c) throw new NotFoundException('Customer not found');
    const bookingSelect = {
      id: true,
      bookingNo: true,
      status: true,
      passengerCount: true,
      totalAmount: true,
      paidAmount: true,
      refundedAmount: true,
      currencyCode: true,
      createdAt: true,
      branch: { select: { name: true } },
      trip: { select: { id: true, code: true, title: true, startsAt: true } },
      program: { select: { id: true, code: true, title: true } },
      offer: { select: { id: true, title: true } },
    } satisfies Prisma.BookingSelect;
    const branchFilter = isAll(user) ? {} : { branchId: ownBranch(user) };
    const [asPayer, asPassenger, payments, visas] = await Promise.all([
      this.prisma.booking.findMany({
        where: { payerCustomerId: id, ...branchFilter },
        select: bookingSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bookingPassenger.findMany({
        where: { customerId: id, booking: branchFilter },
        select: { booking: { select: bookingSelect }, attendance: true },
        orderBy: { booking: { createdAt: 'desc' } },
      }),
      this.prisma.payment.findMany({
        where: { booking: { payerCustomerId: id, ...branchFilter } },
        orderBy: { paidAt: 'desc' },
        select: {
          id: true,
          receiptNo: true,
          kind: true,
          amount: true,
          currencyCode: true,
          paidAt: true,
          booking: { select: { bookingNo: true } },
        },
      }),
      this.prisma.visaApplication.findMany({
        where: { passenger: { customerId: id, booking: branchFilter } },
        include: {
          country: { select: { nameAr: true } },
          passenger: { select: { booking: { select: { bookingNo: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      ...c,
      bookingsAsPayer: asPayer,
      trips: asPassenger,
      payments,
      visas,
    };
  }

  /** CUS-01: warn (not block) when a phone or document number is already known. */
  async duplicates(q: DuplicateQueryDto) {
    const or: Prisma.CustomerWhereInput[] = [];
    if (q.phone && normPhone(q.phone).length >= 7)
      or.push({ phone: normPhone(q.phone) });
    if (q.docNumber)
      or.push({
        documents: { some: { docNumber: q.docNumber.trim().toUpperCase() } },
      });
    if (!or.length) return [];
    return this.prisma.customer.findMany({
      where: { OR: or, ...(q.excludeId ? { id: { not: q.excludeId } } : {}) },
      select: {
        id: true,
        fullName: true,
        phone: true,
        branch: { select: { name: true } },
      },
      take: 5,
    });
  }

  async create(user: AuthUser, dto: CustomerDto) {
    const branchId = writeBranchFor(user, dto.branchId);
    await this.assertCountry(dto.nationalityCountryId);
    const data = {
      ...dto,
      branchId,
      phone: normPhone(dto.phone),
      fullName: dto.fullName.trim(),
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      createdById: user.userId,
    };
    const possibleDuplicates = await this.duplicates({ phone: dto.phone });
    return this.prisma.$transaction(async (tx) => {
      const c = await tx.customer.create({ data, include: listInclude });
      await this.audit.log(
        user,
        {
          action: 'customer.created',
          entityType: 'customer',
          entityId: c.id,
          summary: `Customer ${c.fullName} added`,
        },
        tx,
      );
      return { ...c, possibleDuplicates };
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateCustomerDto) {
    const before = await this.findInScope(user, id);
    if (dto.branchId && !isAll(user))
      throw new BadRequestException(
        'Only the Admin moves a customer to another branch',
      );
    if (dto.nationalityCountryId)
      await this.assertCountry(dto.nationalityCountryId);
    const c = await this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        phone: dto.phone ? normPhone(dto.phone) : undefined,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
      include: listInclude,
    });
    await this.audit.log(user, {
      action: 'customer.updated',
      entityType: 'customer',
      entityId: id,
      summary: `Customer ${c.fullName} updated`,
      changes: diff(before as never, dto as never),
    });
    return c;
  }

  async setActive(user: AuthUser, id: string, isActive: boolean) {
    await this.findInScope(user, id);
    const c = await this.prisma.customer.update({
      where: { id },
      data: { isActive },
      include: listInclude,
    });
    await this.audit.log(user, {
      action: isActive ? 'customer.activated' : 'customer.deactivated',
      entityType: 'customer',
      entityId: id,
      summary: `Customer ${c.fullName} ${isActive ? 'activated' : 'deactivated'}`,
    });
    return c;
  }

  /** CUS-07: a customer with bookings is never deleted. */
  async remove(user: AuthUser, id: string) {
    const c = await this.findInScope(user, id);
    const used = await this.prisma.customer.findUniqueOrThrow({
      where: { id },
      select: { _count: { select: { bookingsPaid: true, travels: true } } },
    });
    if (used._count.bookingsPaid || used._count.travels)
      throw new ConflictException(
        'This customer has bookings; deactivate instead (CUS-07)',
      );
    await this.prisma.customer.delete({ where: { id } });
    await this.audit.log(user, {
      action: 'customer.deleted',
      entityType: 'customer',
      entityId: id,
      summary: `Customer ${c.fullName} deleted`,
    });
    return { deleted: true };
  }

  // ---------------- documents (CUS-02, CUS-05)

  async addDocument(user: AuthUser, customerId: string, dto: DocumentDto) {
    const c = await this.findInScope(user, customerId);
    await this.assertCountry(dto.issuingCountryId);
    this.checkDates(dto);
    if (dto.docType === 'SYRIAN_ID') {
      const sy = await this.prisma.country.findUnique({
        where: { isoCode: 'SY' },
      });
      if (dto.issuingCountryId !== sy?.id)
        throw new BadRequestException('A Syrian ID is issued by Syria');
    }
    const doc = await this.prisma.customerDocument.create({
      data: {
        customerId,
        docType: dto.docType,
        docNumber: dto.docNumber,
        issuingCountryId: dto.issuingCountryId,
        issuedOn: dto.issuedOn ? new Date(dto.issuedOn) : null,
        expiresOn: dto.expiresOn ? new Date(dto.expiresOn) : null,
      },
    });
    await this.audit.log(user, {
      action: 'customer.document_added',
      entityType: 'customer',
      entityId: customerId,
      summary: `${c.fullName}: ${dto.docType} added`,
    });
    return doc;
  }

  async updateDocument(
    user: AuthUser,
    customerId: string,
    docId: string,
    dto: UpdateDocumentDto,
  ) {
    await this.findInScope(user, customerId);
    await this.findDoc(customerId, docId);
    this.checkDates(dto);
    const doc = await this.prisma.customerDocument.update({
      where: { id: docId },
      data: {
        ...dto,
        issuedOn: dto.issuedOn ? new Date(dto.issuedOn) : undefined,
        expiresOn: dto.expiresOn ? new Date(dto.expiresOn) : undefined,
      },
    });
    await this.audit.log(user, {
      action: 'customer.document_updated',
      entityType: 'customer',
      entityId: customerId,
      summary: `Document ${doc.docType} updated`,
    });
    return doc;
  }

  async removeDocument(user: AuthUser, customerId: string, docId: string) {
    await this.findInScope(user, customerId);
    const doc = await this.findDoc(customerId, docId);
    const used = await this.prisma.bookingPassenger.count({
      where: { documentId: docId, booking: { status: { not: 'CANCELLED' } } },
    });
    if (used)
      throw new ConflictException('This document is used by an active booking');
    await this.prisma.customerDocument.delete({ where: { id: docId } });
    await this.audit.log(user, {
      action: 'customer.document_removed',
      entityType: 'customer',
      entityId: customerId,
      summary: `Document ${doc.docType} removed`,
    });
    return { deleted: true };
  }

  async uploadDocumentFile(
    user: AuthUser,
    customerId: string,
    docId: string,
    file?: UploadedBlob,
  ) {
    await this.findInScope(user, customerId);
    await this.findDoc(customerId, docId);
    const saved = await this.storage.savePrivate(file);
    const doc = await this.prisma.customerDocument.update({
      where: { id: docId },
      data: { filePath: saved.path, fileMime: saved.mime },
    });
    await this.audit.log(user, {
      action: 'customer.document_file',
      entityType: 'customer',
      entityId: customerId,
      summary: `Scan uploaded for ${doc.docType}`,
    });
    return { id: doc.id, hasFile: true };
  }

  /** CUS-05: scans are only reachable through a signed link valid for 5 minutes. */
  async documentLink(user: AuthUser, customerId: string, docId: string) {
    await this.findInScope(user, customerId);
    const doc = await this.findDoc(customerId, docId);
    if (!doc.filePath || !doc.fileMime)
      throw new NotFoundException('No scan was uploaded for this document');
    await this.audit.log(user, {
      action: 'customer.document_viewed',
      entityType: 'customer',
      entityId: customerId,
      summary: `Scan of ${doc.docType} opened`,
    });
    return this.storage.signedLink(doc.filePath, doc.fileMime);
  }

  // ---------------- helpers

  async findInScope(user: AuthUser, id: string) {
    const c = await this.prisma.customer.findFirst({
      where: { AND: [{ id }, this.scope(user)] },
    });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  private async findDoc(customerId: string, docId: string) {
    const doc = await this.prisma.customerDocument.findFirst({
      where: { id: docId, customerId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  private checkDates(dto: { issuedOn?: string; expiresOn?: string }) {
    if (dto.issuedOn && dto.expiresOn && dto.expiresOn <= dto.issuedOn)
      throw new BadRequestException(
        'The document expires before it was issued',
      );
  }

  private async assertCountry(id: string) {
    if (
      !(await this.prisma.country.findFirst({ where: { id, isActive: true } }))
    )
      throw new NotFoundException('Country not found or disabled');
  }
}

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly exporter: ExportService,
  ) {}

  @Get()
  @RequirePermissions('customers.view')
  @ApiOperation({
    summary:
      'Customers in scope (CUS-08). Search by name, phone or document number. Supports export=xlsx|all.',
  })
  async list(@CurrentUser() user: AuthUser, @Query() q: CustomerQueryDto) {
    return this.exporter.respond(
      q,
      await this.customers.list(user, q),
      EXPORT,
      user,
    );
  }

  @Get('duplicates')
  @RequirePermissions('customers.view')
  @ApiOperation({
    summary:
      'Customers with the same phone or document number (CUS-01 warning)',
  })
  duplicates(@Query() q: DuplicateQueryDto) {
    return this.customers.duplicates(q);
  }

  @Get(':id')
  @RequirePermissions('customers.view')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.customers.get(user, id);
  }

  @Post()
  @RequirePermissions('customers.manage')
  create(@CurrentUser() user: AuthUser, @Body() dto: CustomerDto) {
    return this.customers.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('customers.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(user, id, dto);
  }

  @Patch(':id/active')
  @RequirePermissions('customers.manage')
  setActive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActiveDto,
  ) {
    return this.customers.setActive(user, id, dto.isActive);
  }

  @Delete(':id')
  @RequirePermissions('customers.manage')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customers.remove(user, id);
  }

  @Post(':id/documents')
  @RequirePermissions('customers.manage')
  addDocument(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DocumentDto,
  ) {
    return this.customers.addDocument(user, id, dto);
  }

  @Patch(':id/documents/:docId')
  @RequirePermissions('customers.manage')
  updateDocument(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.customers.updateDocument(user, id, docId, dto);
  }

  @Delete(':id/documents/:docId')
  @RequirePermissions('customers.manage')
  removeDocument(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
  ) {
    return this.customers.removeDocument(user, id, docId);
  }

  @Post(':id/documents/:docId/file')
  @RequirePermissions('customers.manage')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary:
      'Upload the scan (JPEG/PNG/WebP/PDF ≤ 5 MB), stored privately (CUS-05)',
  })
  upload(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @UploadedFile() file?: UploadedBlob,
  ) {
    return this.customers.uploadDocumentFile(user, id, docId, file);
  }

  @Get(':id/documents/:docId/link')
  @RequirePermissions('customers.view')
  @ApiOperation({
    summary: 'A signed link to the scan, valid 5 minutes (CUS-05)',
  })
  link(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
  ) {
    return this.customers.documentLink(user, id, docId);
  }
}

@Module({
  imports: [UploadsModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
