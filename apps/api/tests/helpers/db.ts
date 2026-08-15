import { prisma } from "@authforge/db";

export async function resetDb() {
  await prisma.developer.deleteMany();
}

export async function disconnectDb() {
  await prisma.$disconnect();
}
