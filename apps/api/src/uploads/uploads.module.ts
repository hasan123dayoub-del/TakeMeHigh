import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import sharp from 'sharp';
import { Public, RequireAnyPermission } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

/** What multer hands over for one uploaded file (memory storage). */
export interface UploadedBlob {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
}

/** Files live outside the source tree; public images are served statically, documents never are. */
export const UPLOAD_ROOT = resolve(
  process.env.UPLOAD_DIR || join(__dirname, '../../../../uploads'),
);
export const PUBLIC_DIR = join(UPLOAD_ROOT, 'public');
const PRIVATE_DIR = join(UPLOAD_ROOT, 'private');

/**
 * Where files are kept: on disk (default) or in the stored_files table (FILE_STORAGE=database).
 * Serverless hosting such as Vercel has no lasting disk, so the live demo uses the database.
 */
export const filesInDatabase = () => process.env.FILE_STORAGE === 'database';

/** Rejects keys that try to leave their folder (e.g. "../"). */
export function safeKey(key: string) {
  const parts = key.split('/');
  if (
    !key ||
    parts.some((p) => !p || p === '.' || p === '..' || p.includes('\\'))
  )
    throw new NotFoundException();
  return key;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // CMS-05, CUS-05

/** Real file type from the first bytes (never trust the browser's mimetype). */
export function sniff(
  buf: Buffer,
): 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return 'image/jpeg';
  if (
    buf
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return 'image/png';
  if (
    buf.subarray(0, 4).toString() === 'RIFF' &&
    buf.subarray(8, 12).toString() === 'WEBP'
  )
    return 'image/webp';
  if (buf.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  return null;
}

const apiBase = () =>
  (
    process.env.API_PUBLIC_URL ||
    `http://localhost:${process.env.API_PORT || 3001}`
  ).replace(/\/+$/, '');
const signingKey = () => `takemehigh:files:${process.env.JWT_SECRET}`;

@Injectable()
export class StorageService {
  constructor(private readonly prisma: PrismaService) {}

  /** Saves a file under a key such as "public/images/2026-11/<uuid>.webp". */
  private async put(key: string, mime: string, data: Buffer) {
    if (filesInDatabase()) {
      await this.prisma.storedFile.upsert({
        where: { key },
        create: { key, mime, data: new Uint8Array(data) },
        update: { mime, data: new Uint8Array(data) },
      });
      return;
    }
    const full = join(UPLOAD_ROOT, ...key.split('/'));
    mkdirSync(join(full, '..'), { recursive: true });
    await writeFile(full, data);
  }

  /** A stored file from the database (FILE_STORAGE=database), or null. */
  async readFromDatabase(key: string) {
    const row = await this.prisma.storedFile.findUnique({
      where: { key: safeKey(key) },
    });
    return row ? { mime: row.mime, data: Buffer.from(row.data) } : null;
  }

  /** CMS-05: JPEG/PNG/WebP ≤ 5 MB, resized to ≤ 1920 px and stored as WebP. Returns the public URL. */
  async saveImage(
    file: UploadedBlob | undefined,
    folder = 'images',
  ): Promise<{ url: string; width: number; height: number }> {
    if (!file) throw new BadRequestException('Choose an image file');
    if (file.size > MAX_UPLOAD_BYTES)
      throw new BadRequestException('Images are limited to 5 MB');
    const type = sniff(file.buffer);
    if (!type || type === 'application/pdf')
      throw new BadRequestException(
        'Only JPEG, PNG or WebP images are accepted',
      );
    const month = new Date().toISOString().slice(0, 7);
    const name = `${randomUUID()}.webp`;
    const out = await sharp(file.buffer)
      .rotate()
      .resize({
        width: 1920,
        height: 1920,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    await this.put(`public/${folder}/${month}/${name}`, 'image/webp', out.data);
    return {
      url: `${apiBase()}/uploads/${folder}/${month}/${name}`,
      width: out.info.width,
      height: out.info.height,
    };
  }

  /** CUS-05: identity documents (JPEG/PNG/WebP/PDF ≤ 5 MB) in a private folder. Returns the stored relative path. */
  async savePrivate(
    file: UploadedBlob | undefined,
  ): Promise<{ path: string; mime: string }> {
    if (!file) throw new BadRequestException('Choose a file');
    if (file.size > MAX_UPLOAD_BYTES)
      throw new BadRequestException('Files are limited to 5 MB');
    const mime = sniff(file.buffer);
    if (!mime)
      throw new BadRequestException(
        'Only JPEG, PNG, WebP or PDF files are accepted',
      );
    const ext = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    }[mime];
    const rel = `documents/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
    await this.put(`private/${rel}`, mime, file.buffer);
    return { path: rel, mime };
  }

  /** A link valid for 5 minutes (CUS-05: signed short-lived link). */
  signedLink(path: string, mime: string, ttlSeconds = 300) {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload = Buffer.from(
      JSON.stringify({ p: path, m: mime, e: exp }),
    ).toString('base64url');
    const sig = createHmac('sha256', signingKey())
      .update(payload)
      .digest('base64url');
    return {
      url: `${apiBase()}/api/files/${payload}.${sig}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }

  async openSigned(token: string) {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) throw new NotFoundException();
    const expected = createHmac('sha256', signingKey())
      .update(payload)
      .digest();
    const given = Buffer.from(sig, 'base64url');
    if (given.length !== expected.length || !timingSafeEqual(given, expected))
      throw new ForbiddenException('Invalid link');
    const { p, m, e } = JSON.parse(
      Buffer.from(payload, 'base64url').toString(),
    ) as { p: string; m: string; e: number };
    if (e < Date.now() / 1000)
      throw new ForbiddenException('This link has expired');
    if (filesInDatabase()) {
      const stored = await this.readFromDatabase(`private/${p}`);
      if (!stored) throw new NotFoundException();
      return new StreamableFile(stored.data, {
        type: m,
        disposition: 'inline',
      });
    }
    const full = resolve(PRIVATE_DIR, p);
    if (!full.startsWith(PRIVATE_DIR) || !existsSync(full))
      throw new NotFoundException();
    return new StreamableFile(createReadStream(full), {
      type: m,
      disposition: 'inline',
    });
  }
}

@ApiTags('Uploads')
@Controller()
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('uploads/images')
  @ApiBearerAuth()
  @RequireAnyPermission(
    'site.manage',
    'trips.manage',
    'programs.manage',
    'offers.manage',
  )
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
      'Upload a public image (JPEG/PNG/WebP ≤ 5 MB, stored as WebP ≤ 1920 px, CMS-05)',
  })
  upload(@UploadedFile() file?: UploadedBlob) {
    return this.storage.saveImage(file);
  }

  @Public()
  @Get('files/:token')
  @ApiOperation({
    summary: 'Download a private file through a signed, short-lived link',
  })
  file(@Param('token') token: string) {
    return this.storage.openSigned(token);
  }
}

@Module({
  controllers: [UploadsController],
  providers: [StorageService],
  exports: [StorageService],
})
export class UploadsModule {}
