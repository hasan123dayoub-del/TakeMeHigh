import { Global, Injectable, Module, StreamableFile } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { Paginated } from '@travelos/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth.types';
import type { PaginationQueryDto } from '../dto/pagination.dto';

export type Cell = string | number | Date | boolean | null | undefined;

export interface ExportColumn<T> {
  /** Arabic header (the office works in Arabic, RTL) */
  header: string;
  value: (row: T) => Cell;
  width?: number;
  /** Excel number format, e.g. '#,##0.00' */
  numFmt?: string;
}

export interface ExportSpec<T> {
  /** File name without extension, e.g. "trips" */
  filename: string;
  /** Sheet title, e.g. "الرحلات" */
  title: string;
  columns: ExportColumn<T>[];
}

/**
 * Excel export for every list (RPT-01, RPT-02): every row matching the current filters (not only
 * the visible page), RTL sheet, header with the office name, the date and the user.
 * PDF uses the same rows (`export=all`) in the web app's print view, which shapes Arabic correctly.
 */
@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async respond<T>(
    q: PaginationQueryDto,
    page: Paginated<T>,
    spec: ExportSpec<T>,
    user: AuthUser,
  ): Promise<Paginated<T> | StreamableFile> {
    if (q.export !== 'xlsx') return page;
    const buffer = await this.workbook(page.data, spec, user);
    const date = new Date().toISOString().slice(0, 10);
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${spec.filename}-${date}.xlsx"`,
    });
  }

  async workbook<T>(
    rows: T[],
    spec: ExportSpec<T>,
    user: AuthUser,
  ): Promise<Buffer> {
    const settings = await this.prisma.siteSetting.findUnique({
      where: { id: 1 },
    });
    const wb = new ExcelJS.Workbook();
    wb.creator = settings?.officeName ?? 'TakeMeHigh';
    wb.created = new Date();
    const ws = wb.addWorksheet(spec.title.slice(0, 31), {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 4 }],
    });

    const span = Math.max(1, spec.columns.length);
    ws.mergeCells(1, 1, 1, span);
    ws.getCell(1, 1).value =
      `${settings?.officeName ?? 'TakeMeHigh'} — ${spec.title}`;
    ws.getCell(1, 1).font = { bold: true, size: 14 };
    ws.mergeCells(2, 1, 2, span);
    ws.getCell(2, 1).value =
      `تاريخ التصدير: ${new Date().toLocaleString('ar-SY')}   |   المستخدم: ${user.fullName}   |   عدد السجلات: ${rows.length}`;
    ws.getCell(2, 1).font = { size: 10, color: { argb: 'FF595959' } };

    const header = ws.getRow(4);
    spec.columns.forEach((c, i) => {
      const cell = header.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F3864' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      ws.getColumn(i + 1).width = c.width ?? 18;
    });
    header.height = 22;

    rows.forEach((row, r) => {
      const excelRow = ws.getRow(5 + r);
      spec.columns.forEach((c, i) => {
        const cell = excelRow.getCell(i + 1);
        const v = c.value(row);
        cell.value = v === undefined || v === null ? '' : v;
        if (c.numFmt) cell.numFmt = c.numFmt;
        if (v instanceof Date) cell.numFmt = 'yyyy-mm-dd';
        cell.alignment = { vertical: 'top', wrapText: true };
      });
    });
    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: span },
    };
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}

@Global()
@Module({ providers: [ExportService], exports: [ExportService] })
export class ExportModule {}

export const MONEY_FMT = '#,##0.00';
/** Prisma Decimal / string money → number for Excel cells */
export const num = (v: { toString(): string } | null | undefined) =>
  v == null ? null : Number(v.toString());
