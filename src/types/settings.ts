import type { EnvGroup } from "@/lib/constants/environment";

export interface EnvVarStatus {
  name: string;
  description: string;
  group: EnvGroup;
  required: boolean;
  isSet: boolean;
}

export interface OrganizationSummary {
  name: string;
  slug: string;
  plan: string;
  adminUsers: number;
  clientPortalUsers: number;
  clients: number;
}

export interface SettingsData {
  organization: OrganizationSummary;
  appUrl: string | null;
  environment: EnvVarStatus[];
}

export interface SettingsResponse extends SettingsData {
  success: true;
}
