/**
 * Convierte el `field_data` de un lead de Meta en los campos del CRM.
 * Sin imports a propósito: es lógica pura y se prueba directo con Node.
 *
 * Meta usa claves fijas para las preguntas estándar del formulario (`full_name`,
 * `email`, `phone_number`, ...) y una clave derivada del texto para las preguntas
 * personalizadas. Estas últimas no se pueden mapear, así que van a las notas.
 */

export interface MetaLeadFieldInput {
  name: string;
  values: string[];
}

export interface MappedMetaLead {
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  notes: string | null;
}

const EMAIL_KEYS = ["email", "work_email"];
const PHONE_KEYS = ["phone_number", "work_phone_number"];
const COMPANY_KEYS = ["company_name"];
const NAME_KEYS = ["full_name", "first_name", "last_name"];

/** Etiquetas en español de las preguntas estándar que no tienen columna propia. */
const STANDARD_FIELD_LABEL: Record<string, string> = {
  job_title: "Cargo",
  city: "Ciudad",
  state: "Estado",
  province: "Provincia",
  country: "País",
  zip_code: "Código postal",
  post_code: "Código postal",
  street_address: "Dirección",
  date_of_birth: "Fecha de nacimiento",
  gender: "Género",
};

const FALLBACK_NAME = "Lead de Meta Ads";

function firstValue(fields: Map<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = fields.get(key);
    if (value) return value;
  }
  return null;
}

/** "cual_es_tu_presupuesto?" -> "Cual es tu presupuesto?" */
function humanizeKey(key: string) {
  const text = key.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function mapMetaLeadFields(fieldData: MetaLeadFieldInput[]): MappedMetaLead {
  const fields = new Map<string, string>();
  for (const field of fieldData) {
    const value = (field.values || []).map((v) => v.trim()).filter(Boolean).join(", ");
    if (value) fields.set(field.name.toLowerCase(), value);
  }

  const fullName =
    fields.get("full_name") ||
    [fields.get("first_name"), fields.get("last_name")].filter(Boolean).join(" ") ||
    null;

  const mappedKeys = new Set([...EMAIL_KEYS, ...PHONE_KEYS, ...COMPANY_KEYS, ...NAME_KEYS]);
  const extra = Array.from(fields.entries())
    .filter(([key]) => !mappedKeys.has(key))
    .map(([key, value]) => `${STANDARD_FIELD_LABEL[key] ?? humanizeKey(key)}: ${value}`);

  const email = firstValue(fields, EMAIL_KEYS);
  const phone = firstValue(fields, PHONE_KEYS);

  return {
    name: fullName || email || phone || FALLBACK_NAME,
    email,
    phone,
    companyName: firstValue(fields, COMPANY_KEYS),
    notes: extra.length ? extra.join("\n") : null,
  };
}
