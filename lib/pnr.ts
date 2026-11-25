import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
export async function createPnr() {
  for (let i = 0; i < 20; i++) {
    const pnr = `NDL${randomInt(100000, 1000000)}`;
    const exists = await prisma.booking.findUnique({ where: { pnr }, select: { id: true } });
    if (!exists) return pnr;
  }
  throw new Error("Could not generate a unique booking reference.");
}
