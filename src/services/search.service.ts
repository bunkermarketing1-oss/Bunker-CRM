import { prisma } from "@/lib/prisma";
import { SEARCH_RESULTS_PER_KIND } from "@/lib/constants/search";
import { ROUTES, clientDetailRoute, leadSearchRoute } from "@/lib/constants/routes";
import type { SearchResult } from "@/types/search";
import type { TenantScope } from "@/types/tenant";

const insensitive = (term: string) => ({ contains: term, mode: "insensitive" as const });

function joinParts(...parts: (string | null | undefined)[]): string | null {
  const text = parts.filter(Boolean).join(" · ");
  return text || null;
}

/** Búsqueda global de la paleta ⌘K: leads, clientes y contactos dentro del scope del usuario. */
export async function searchEverything(scope: TenantScope, term: string): Promise<SearchResult[]> {
  const clientFilter = scope.clientId ? { clientId: scope.clientId } : {};

  const [leads, clients, contacts] = await Promise.all([
    prisma.lead.findMany({
      where: {
        organizationId: scope.organizationId,
        isDeleted: false,
        ...clientFilter,
        OR: [
          { name: insensitive(term) },
          { email: insensitive(term) },
          { companyName: insensitive(term) },
          { phone: insensitive(term) },
          { normalizedPhone: insensitive(term) },
        ],
      },
      select: { id: true, name: true, companyName: true, email: true },
      orderBy: { createdAt: "desc" },
      take: SEARCH_RESULTS_PER_KIND,
    }),
    prisma.client.findMany({
      where: {
        organizationId: scope.organizationId,
        isDeleted: false,
        ...(scope.clientId ? { id: scope.clientId } : {}),
        OR: [{ name: insensitive(term) }, { companyName: insensitive(term) }, { email: insensitive(term) }],
      },
      select: { id: true, name: true, companyName: true, industry: true },
      orderBy: { name: "asc" },
      take: SEARCH_RESULTS_PER_KIND,
    }),
    prisma.contact.findMany({
      where: {
        organizationId: scope.organizationId,
        isDeleted: false,
        ...clientFilter,
        OR: [
          { firstName: insensitive(term) },
          { lastName: insensitive(term) },
          { email: insensitive(term) },
          { phone: insensitive(term) },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        clientId: true,
        client: { select: { name: true } },
      },
      orderBy: { firstName: "asc" },
      take: SEARCH_RESULTS_PER_KIND,
    }),
  ]);

  return [
    ...leads.map<SearchResult>((lead) => ({
      id: lead.id,
      kind: "lead",
      title: lead.name,
      subtitle: joinParts(lead.companyName, lead.email),
      href: leadSearchRoute(lead.name),
    })),
    ...clients.map<SearchResult>((client) => ({
      id: client.id,
      kind: "client",
      title: client.name,
      subtitle: joinParts(client.companyName, client.industry),
      href: clientDetailRoute(client.id),
    })),
    ...contacts.map<SearchResult>((contact) => ({
      id: contact.id,
      kind: "contact",
      title: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
      subtitle: joinParts(contact.jobTitle, contact.client?.name),
      href: contact.clientId ? clientDetailRoute(contact.clientId) : ROUTES.CLIENTS,
    })),
  ];
}
