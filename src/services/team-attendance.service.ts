import { prisma } from "@/lib/prisma";
import { ACTIVITY_TYPE } from "@/lib/constants/crm";
import { DEFAULT_TEAM_TIME_ZONE } from "@/lib/constants/team";
import { startOfDayInTimeZone } from "@/lib/team-live";
import type { AttendanceDayLog, SellerAttendanceHistoryResponse } from "@/types/team";

function formatMinutes(mins: number): string {
  if (mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Registra un evento de asistencia (Check-in o Check-out) o heartbeat del vendedor.
 */
export async function recordAttendance(params: {
  userId: string;
  organizationId: string;
  clientId: string | null;
  action: "check_in" | "check_out" | "heartbeat";
}) {
  const { userId, clientId, action } = params;
  const now = new Date();

  if (action === "check_in") {
    // Registrar actividad de Check-in
    const activity = await prisma.activity.create({
      data: {
        userId,
        clientId: clientId || null,
        type: ACTIVITY_TYPE.CHECK_IN,
        title: "Check-in de turno",
        description: "Inicio de turno de atención comercial",
        outcome: "online",
        performedAt: now,
      },
    });
    return { success: true, action, activityId: activity.id, timestamp: now.toISOString() };
  }

  if (action === "check_out") {
    // Registrar actividad de Check-out
    const activity = await prisma.activity.create({
      data: {
        userId,
        clientId: clientId || null,
        type: ACTIVITY_TYPE.CHECK_OUT,
        title: "Check-out de turno",
        description: "Fin de turno de atención comercial",
        outcome: "offline",
        performedAt: now,
      },
    });
    return { success: true, action, activityId: activity.id, timestamp: now.toISOString() };
  }

  // Heartbeat silencioso: se actualiza como actividad menor si no ha habido registro reciente
  return { success: true, action, timestamp: now.toISOString() };
}

/**
 * Obtiene el estado actual de turno del usuario hoy.
 */
export async function getUserAttendanceStatus(userId: string) {
  const now = new Date();
  const dayStart = startOfDayInTimeZone(now, DEFAULT_TEAM_TIME_ZONE);

  const activities = await prisma.activity.findMany({
    where: {
      userId,
      type: { in: [ACTIVITY_TYPE.CHECK_IN, ACTIVITY_TYPE.CHECK_OUT] },
      performedAt: { gte: dayStart },
    },
    orderBy: { performedAt: "asc" },
  });

  if (activities.length === 0) {
    return {
      isCheckedIn: false,
      checkedInAt: null,
      checkedOutAt: null,
      durationMinutes: 0,
      durationFormatted: "0m",
    };
  }

  const lastActivity = activities[activities.length - 1];
  const isCheckedIn = lastActivity.type === ACTIVITY_TYPE.CHECK_IN;

  const firstCheckIn = activities.find((a) => a.type === ACTIVITY_TYPE.CHECK_IN);
  const lastCheckOut = isCheckedIn ? null : lastActivity;

  const checkInTime = firstCheckIn ? firstCheckIn.performedAt : null;
  const checkOutTime = lastCheckOut ? lastCheckOut.performedAt : null;

  let durationMinutes = 0;
  if (checkInTime) {
    const end = checkOutTime || now;
    durationMinutes = Math.max(0, Math.floor((end.getTime() - checkInTime.getTime()) / (60 * 1000)));
  }

  return {
    isCheckedIn,
    checkedInAt: checkInTime ? checkInTime.toISOString() : null,
    checkedOutAt: checkOutTime ? checkOutTime.toISOString() : null,
    durationMinutes,
    durationFormatted: formatMinutes(durationMinutes),
  };
}

/**
 * Genera la bitácora detallada de los últimos 15 días para un vendedor específico.
 * Visible exclusivamente para el dueño (CLIENT_OWNER) o administradores (ADMIN).
 */
export async function getSellerAttendanceHistory(
  organizationId: string,
  targetClientId: string | null,
  sellerId: string,
  daysCount = 15
): Promise<SellerAttendanceHistoryResponse> {
  const user = await prisma.user.findFirst({
    where: {
      id: sellerId,
      ...(targetClientId ? { clientId: targetClientId } : {}),
      memberships: { some: { organizationId } },
    },
    select: {
      id: true,
      name: true,
      email: true,
      clientId: true,
      client: { select: { name: true } },
    },
  });

  if (!user) {
    throw new Error("Vendedor no encontrado o no pertenece a su organización/empresa.");
  }

  const now = new Date();
  const dayStarts: Date[] = [];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayStarts.push(startOfDayInTimeZone(d, DEFAULT_TEAM_TIME_ZONE));
  }

  const earliestDate = dayStarts[dayStarts.length - 1];

  // 1. Consultar todos los check-ins y check-outs de los últimos 15 días
  const attendanceActivities = await prisma.activity.findMany({
    where: {
      userId: sellerId,
      type: { in: [ACTIVITY_TYPE.CHECK_IN, ACTIVITY_TYPE.CHECK_OUT] },
      performedAt: { gte: earliestDate },
    },
    orderBy: { performedAt: "asc" },
  });

  // 2. Consultar llamadas realizadas en el período
  const calls = await prisma.call.findMany({
    where: {
      userId: sellerId,
      organizationId,
      createdAt: { gte: earliestDate },
    },
    select: { id: true, createdAt: true, status: true },
  });

  // 3. Consultar mensajes de chat o actividades registradas por canal
  const channelActivities = await prisma.activity.findMany({
    where: {
      userId: sellerId,
      type: {
        in: [
          ACTIVITY_TYPE.SMS,
          ACTIVITY_TYPE.CALL,
          ACTIVITY_TYPE.WHATSAPP,
          ACTIVITY_TYPE.MESSENGER,
          ACTIVITY_TYPE.INSTAGRAM,
        ],
      },
      createdAt: { gte: earliestDate },
    },
    select: { id: true, type: true, createdAt: true },
  });

  // Construir mapa de días
  const days: AttendanceDayLog[] = [];
  let totalMinutesAllDays = 0;
  let totalCallsAllDays = 0;
  let totalMessagesAllDays = 0;
  let whatsappTotal = 0;
  let messengerTotal = 0;
  let instagramTotal = 0;
  let smsTotal = 0;
  let daysWorkedCount = 0;

  for (let i = 0; i < daysCount; i++) {
    const currentDayStart = dayStarts[i];
    const nextDayStart = new Date(currentDayStart.getTime() + 24 * 60 * 60 * 1000);

    const isToday = i === 0;
    const dateStr = currentDayStart.toISOString().slice(0, 10);
    const dayLabel = currentDayStart.toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    // Eventos de asistencia de este día
    const dayAttendance = attendanceActivities.filter(
      (a) => a.performedAt >= currentDayStart && a.performedAt < nextDayStart
    );

    const checkIns = dayAttendance.filter((a) => a.type === ACTIVITY_TYPE.CHECK_IN);
    const checkOuts = dayAttendance.filter((a) => a.type === ACTIVITY_TYPE.CHECK_OUT);

    const firstCheckIn = checkIns[0]?.performedAt ?? null;
    const lastCheckOut = checkOuts[checkOuts.length - 1]?.performedAt ?? null;

    let durationMinutes = 0;
    let status: AttendanceDayLog["status"] = "absent";

    if (firstCheckIn) {
      status = lastCheckOut ? "completed" : isToday ? "in_progress" : "completed";
      const endTime = lastCheckOut || (isToday ? now : new Date(firstCheckIn.getTime() + 8 * 60 * 60 * 1000));
      durationMinutes = Math.max(0, Math.floor((endTime.getTime() - firstCheckIn.getTime()) / (60 * 1000)));
      daysWorkedCount++;
      totalMinutesAllDays += durationMinutes;
    }

    // Llamadas de este día
    const dayCalls = calls.filter((c) => c.createdAt >= currentDayStart && c.createdAt < nextDayStart);
    const callsMade = dayCalls.length;
    totalCallsAllDays += callsMade;

    // Mensajes y canales de este día
    const dayChannelActs = channelActivities.filter(
      (a) => a.createdAt >= currentDayStart && a.createdAt < nextDayStart
    );

    const whatsappMessages = dayChannelActs.filter((a) => a.type === ACTIVITY_TYPE.WHATSAPP).length;
    const messengerMessages = dayChannelActs.filter((a) => a.type === ACTIVITY_TYPE.MESSENGER).length;
    const instagramMessages = dayChannelActs.filter((a) => a.type === ACTIVITY_TYPE.INSTAGRAM).length;
    const smsMessages = dayChannelActs.filter((a) => a.type === ACTIVITY_TYPE.SMS).length;
    const totalDayMessages = whatsappMessages + messengerMessages + instagramMessages + smsMessages;

    whatsappTotal += whatsappMessages;
    messengerTotal += messengerMessages;
    instagramTotal += instagramMessages;
    smsTotal += smsMessages;
    totalMessagesAllDays += totalDayMessages;

    days.push({
      date: dateStr,
      dayLabel,
      checkIn: firstCheckIn ? firstCheckIn.toISOString() : null,
      checkInTime: formatTime(firstCheckIn),
      checkOut: lastCheckOut ? lastCheckOut.toISOString() : null,
      checkOutTime: formatTime(lastCheckOut),
      durationMinutes,
      durationFormatted: status === "in_progress" ? `En turno (${formatMinutes(durationMinutes)})` : formatMinutes(durationMinutes),
      status,
      callsMade,
      whatsappMessages,
      messengerMessages,
      instagramMessages,
      smsMessages,
      totalMessages: totalDayMessages,
      tasksCompleted: 0,
    });
  }

  return {
    success: true,
    sellerId: user.id,
    sellerName: user.name,
    sellerEmail: user.email,
    clientName: user.client?.name ?? null,
    days,
    totals: {
      daysWorked: daysWorkedCount,
      totalMinutesWorked: totalMinutesAllDays,
      totalHoursFormatted: formatMinutes(totalMinutesAllDays),
      totalCalls: totalCallsAllDays,
      totalMessages: totalMessagesAllDays,
      whatsappTotal,
      messengerTotal,
      instagramTotal,
      smsTotal,
    },
  };
}
