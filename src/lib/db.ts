import { PrismaClient } from "@/generated/prisma";

// Next.js 개발 모드에서 핫 리로드 시 Prisma 클라이언트 중복 생성 방지
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
