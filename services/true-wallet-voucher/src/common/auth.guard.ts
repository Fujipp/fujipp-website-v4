// src/common/auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<any>();
    const rawKey = String(req.header('x-api-key') || req.header('X-Api-Key') || '').trim();

    if (!rawKey) {
      throw new UnauthorizedException('missing x-api-key');
    }

    const [keyId, secret] = rawKey.split('.', 2);
    if (!keyId || !secret) {
      throw new UnauthorizedException('invalid key format');
    }

    const key = await this.prisma.apiKey.findUnique({ where: { id: keyId } });

    if (!key) {
      throw new ForbiddenException('invalid key');
    }
    if (key.status !== 'ACTIVE') {
      throw new ForbiddenException('key not active');
    }
    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new ForbiddenException('key expired');
    }
    const ok = await argon2.verify(key.secretHash, secret);
    if (!ok) {
      throw new ForbiddenException('invalid key');
    }

    // แนบข้อมูลคีย์ให้ handler ใช้ต่อ
    req.apiKey = key;

    // อัปเดต lastUsedAt แบบ async ไม่บล็อกคำขอ
    this.prisma.apiKey
      .update({ where: { id: keyId }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    return true;
  }
}
