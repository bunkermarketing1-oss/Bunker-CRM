import { prisma } from "@/lib/prisma";
import type { AvailabilityBlock } from "@prisma/client";
import { BLOCK_KIND } from "@/lib/constants/appointments";
import { expandBlocksToIntervals } from "@/lib/availability-blocks";
import type { BookedInterval } from "@/lib/appointment-slots";
import type { AvailabilityBlockDto, CreateAvailabilityBlockInput } from "@/types/availability";

function toDto(block: AvailabilityBlock): AvailabilityBlockDto {
  const isWeekly = block.weekdays.length > 0;
  return {
    id: block.id,
    title: block.title,
    kind: isWeekly ? BLOCK_KIND.WEEKLY : BLOCK_KIND.ONCE,
    startsAt: block.startsAt?.toISOString() ?? null,
    endsAt: block.endsAt?.toISOString() ?? null,
    weekdays: block.weekdays,
    startTime: block.startTime,
    endTime: block.endTime,
    timezone: block.timezone,
  };
}

export async function listUserBlocks(organizationId: string, userId: string): Promise<AvailabilityBlockDto[]> {
  const blocks = await prisma.availabilityBlock.findMany({
    where: { organizationId, userId },
    orderBy: { createdAt: "asc" },
  });
  return blocks.map(toDto);
}

export async function createUserBlock(
  organizationId: string,
  userId: string,
  input: CreateAvailabilityBlockInput
): Promise<AvailabilityBlockDto> {
  const block = await prisma.availabilityBlock.create({
    data:
      input.kind === BLOCK_KIND.WEEKLY
        ? {
            organizationId,
            userId,
            title: input.title,
            weekdays: input.weekdays,
            startTime: input.startTime,
            endTime: input.endTime,
            timezone: input.timezone,
          }
        : {
            organizationId,
            userId,
            title: input.title,
            startsAt: new Date(input.startsAt),
            endsAt: new Date(input.endsAt),
          },
  });
  return toDto(block);
}

/** Un vendedor solo borra sus propios bloqueos. Devuelve false si no existe o no es suyo. */
export async function deleteUserBlock(organizationId: string, userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.availabilityBlock.deleteMany({ where: { id, organizationId, userId } });
  return count > 0;
}

/**
 * Bloqueos del vendedor como intervalos ocupados dentro del rango, para la agenda pública.
 * Si la tabla todavía no existe (migración pendiente) se devuelve vacío en vez de romper las reservas.
 */
export async function getAdvisorBlockIntervals(userId: string, fromMs: number, toMs: number): Promise<BookedInterval[]> {
  try {
    const blocks = await prisma.availabilityBlock.findMany({ where: { userId } });
    return expandBlocksToIntervals(
      blocks.map((block) => ({
        startsAt: block.startsAt?.toISOString() ?? null,
        endsAt: block.endsAt?.toISOString() ?? null,
        weekdays: block.weekdays,
        startTime: block.startTime,
        endTime: block.endTime,
        timezone: block.timezone,
      })),
      fromMs,
      toMs
    );
  } catch (error) {
    console.error("[AVAILABILITY] No se pudieron leer los bloqueos:", error instanceof Error ? error.message : error);
    return [];
  }
}
