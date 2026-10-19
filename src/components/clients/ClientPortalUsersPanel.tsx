import { Crown, UserCog } from "lucide-react";
import { ROLES, isClientOwnerRole, type StoredUserRole } from "@/lib/roles";
import type { PortalUser } from "@/hooks/useClientPortalUsers";

interface ClientPortalUsersPanelProps {
  users: PortalUser[];
  error: string | null;
  savingId: string | null;
  onSetRole: (userId: string, role: StoredUserRole) => void;
}

/**
 * Usuarios del portal del cliente (solo Bunker). Marcar a alguien como dueño le da la vista en
 * vivo del equipo y la escucha de llamadas de su empresa; queda en AuditLog.
 */
export function ClientPortalUsersPanel({ users, error, savingId, onSetRole }: ClientPortalUsersPanelProps) {
  return (
    <section className="p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm space-y-3">
      <h3 className="font-semibold text-sm text-[#1F1E1D] flex items-center gap-2">
        <UserCog className="w-4 h-4 text-[#D97757]" />
        Usuarios del portal
      </h3>
      <p className="text-[11px] text-[#82807C]">
        El dueño supervisa a los asesores de esta empresa en tiempo real y puede escuchar sus llamadas.
      </p>

      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}

      {users.length === 0 ? (
        <p className="text-xs text-[#82807C]">Esta empresa todavía no tiene usuarios en el portal.</p>
      ) : (
        <ul className="divide-y divide-[#F0EEE8]">
          {users.map((portalUser) => {
            const isOwner = isClientOwnerRole(portalUser.role);
            return (
              <li key={portalUser.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#1F1E1D] flex items-center gap-1.5 truncate">
                    {portalUser.name}
                    {isOwner && <Crown className="w-3.5 h-3.5 text-amber-500" aria-label="Dueño" />}
                    {!portalUser.isActive && <span className="text-[10px] font-normal text-[#82807C]">(inactivo)</span>}
                  </p>
                  <p className="text-[11px] text-[#82807C] truncate">{portalUser.email}</p>
                </div>
                <select
                  aria-label={`Rol de ${portalUser.name}`}
                  value={isOwner ? ROLES.CLIENT_OWNER : ROLES.CLIENT}
                  disabled={savingId === portalUser.id}
                  onChange={(e) => onSetRole(portalUser.id, e.target.value as StoredUserRole)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E8E6DF] text-[11px] text-[#1F1E1D] disabled:opacity-50"
                >
                  <option value={ROLES.CLIENT}>Asesor</option>
                  <option value={ROLES.CLIENT_OWNER}>Dueño</option>
                </select>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
