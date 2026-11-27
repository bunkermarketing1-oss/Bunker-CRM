import type { BlockKind } from "@/lib/constants/appointments";

export interface AvailabilityBlockDto {
  id: string;
  title: string;
  kind: BlockKind;
  /** Bloqueo único. */
  startsAt: string | null;
  endsAt: string | null;
  /** Bloqueo semanal: 0 = domingo … 6 = sábado. */
  weekdays: number[];
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
}

export type CreateAvailabilityBlockInput =
  | { kind: "weekly"; title: string; weekdays: number[]; startTime: string; endTime: string; timezone: string }
  | { kind: "once"; title: string; startsAt: string; endsAt: string };

export interface AvailabilityBlocksResponse {
  success: boolean;
  blocks: AvailabilityBlockDto[];
  error?: string;
}
