import fs from "fs";

let content = fs.readFileSync("src/components/layout/Sidebar.tsx", "utf8");

const isCRLF = content.includes("\r\n");
const newline = isCRLF ? "\r\n" : "\n";

// Update imports
content = content.replace(
  'import { X, ChevronDown, Check, Inbox, Users, BarChart3, Building2 } from "lucide-react";',
  'import { X, ChevronDown, Check } from "lucide-react";'
);
content = content.replace(
  'import { ROUTES, clientDetailRoute } from "@/lib/constants/routes";',
  'import { ROUTES } from "@/lib/constants/routes";'
);

const targetBlock = [
  `            {/* Opciones directas: Solo aparecen cuando una empresa cliente está seleccionada */}`,
  `            {selectedClient && (`,
  `              <div className="mt-2 p-2 bg-[#F8F9FA] border border-[#EAECF0] rounded-xl shadow-2xs">`,
  `                <div className="flex items-center justify-between px-1 mb-1.5 text-[10px] text-[#475467] font-semibold">`,
  `                  <span className="truncate">Opciones de {selectedClient.name}:</span>`,
  `                  <button`,
  `                    type="button"`,
  `                    onClick={() => handleSelectClient("all")}`,
  `                    className="text-[9px] text-amber-700 hover:text-amber-900 underline font-medium cursor-pointer"`,
  `                  >`,
  `                    Ver Bunker`,
  `                  </button>`,
  `                </div>`,
  `                <div className="grid grid-cols-2 gap-1.5">`,
  `                  <Link`,
  `                    href={\`\${ROUTES.INBOX}?clientId=\${selectedClient.id}\`}`,
  `                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-900 bg-white border border-[#EAECF0] hover:bg-amber-50 hover:border-amber-300 transition-colors shadow-2xs group"`,
  `                  >`,
  `                    <Inbox className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-105 transition-transform" />`,
  `                    <span className="truncate">Bandeja</span>`,
  `                  </Link>`,
  `                  <Link`,
  `                    href={\`\${ROUTES.LEADS}?clientId=\${selectedClient.id}\`}`,
  `                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-900 bg-white border border-[#EAECF0] hover:bg-amber-50 hover:border-amber-300 transition-colors shadow-2xs group"`,
  `                  >`,
  `                    <Users className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-105 transition-transform" />`,
  `                    <span className="truncate">Leads</span>`,
  `                  </Link>`,
  `                  <Link`,
  `                    href={\`\${ROUTES.CAMPAIGNS}?clientId=\${selectedClient.id}\`}`,
  `                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-900 bg-white border border-[#EAECF0] hover:bg-amber-50 hover:border-amber-300 transition-colors shadow-2xs group"`,
  `                  >`,
  `                    <BarChart3 className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-105 transition-transform" />`,
  `                    <span className="truncate">Campañas</span>`,
  `                  </Link>`,
  `                  <Link`,
  `                    href={clientDetailRoute(selectedClient.id)}`,
  `                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-900 bg-white border border-[#EAECF0] hover:bg-amber-50 hover:border-amber-300 transition-colors shadow-2xs group"`,
  `                  >`,
  `                    <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-105 transition-transform" />`,
  `                    <span className="truncate">Ficha</span>`,
  `                  </Link>`,
  `                </div>`,
  `              </div>`,
  `            )}`
].join(newline);

if (!content.includes(targetBlock)) {
  console.error("targetBlock not found!");
  process.exit(1);
}

content = content.replace(targetBlock + newline, "");
fs.writeFileSync("src/components/layout/Sidebar.tsx", content, "utf8");
console.log("Successfully removed client options box and cleaned imports!");
