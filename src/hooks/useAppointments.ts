"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AppointmentDto,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentsResponse,
} from "@/types/appointments";

export interface UseAppointmentsFilters {
  clientId?: string | null;
  userId?: string | null;
  status?: string | null;
  search?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export function useAppointments(initialFilters: UseAppointmentsFilters = {}) {
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UseAppointmentsFilters>(initialFilters);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.clientId && filters.clientId !== "all") params.set("clientId", filters.clientId);
      if (filters.userId && filters.userId !== "all") params.set("userId", filters.userId);
      if (filters.status && filters.status !== "all") params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/appointments?${params.toString()}`);
      const data: AppointmentsResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          (data as unknown as { error?: string }).error || "Error al cargar las citas."
        );
      }

      setAppointments(data.appointments || []);
      setStats(
        data.stats || {
          total: 0,
          upcoming: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al cargar citas.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const create = async (input: CreateAppointmentInput) => {
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Error al crear la cita." };
      }
      await fetchAppointments();
      return { success: true, appointment: data.appointment };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error de conexión al crear la cita.",
      };
    }
  };

  const update = async (id: string, input: UpdateAppointmentInput) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Error al actualizar la cita." };
      }
      await fetchAppointments();
      return { success: true, appointment: data.appointment };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error de conexión.",
      };
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Error al eliminar la cita." };
      }
      await fetchAppointments();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error de conexión al eliminar.",
      };
    }
  };

  return {
    appointments,
    stats,
    loading,
    error,
    filters,
    setFilters,
    refresh: fetchAppointments,
    create,
    update,
    remove,
  };
}
