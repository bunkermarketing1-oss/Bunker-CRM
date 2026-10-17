import { prisma } from "@/lib/prisma";
import {
  TRIGGER_EVENT,
  ACTION_TYPE,
  DEFAULT_BUSINESS_HOURS,
  DEFAULT_STALE_DAYS_THRESHOLD,
} from "@/lib/constants/automations";
import { sendTwilioSms } from "@/lib/integrations/twilio";
import type {
  AutomationRuleDto,
  StaleLeadsCheckResult,
  AutomationExecutionResult,
} from "@/types/automations";

/**
 * Determina si el momento actual está fuera del horario comercial.
 * Por defecto: Lunes a Viernes de 8:00 a 19:00 (hora local de referencia o servidor).
 */
export function isOutOfBusinessHours(conditionJson?: string | null): boolean {
  let startHour = DEFAULT_BUSINESS_HOURS.startHour;
  let endHour = DEFAULT_BUSINESS_HOURS.endHour;
  let workDays = DEFAULT_BUSINESS_HOURS.workDays;

  if (conditionJson) {
    try {
      const parsed = JSON.parse(conditionJson);
      if (typeof parsed.startHour === "number") startHour = parsed.startHour;
      if (typeof parsed.endHour === "number") endHour = parsed.endHour;
      if (Array.isArray(parsed.workDays)) workDays = parsed.workDays;
    } catch {
      // Ignorar fallo de parseo y usar defaults
    }
  }

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
  const currentHour = now.getHours();

  // Si no es un día hábil configurado
  if (!workDays.includes(dayOfWeek)) {
    return true;
  }

  // Si está antes de la hora de apertura o después de la de cierre
  return currentHour < startHour || currentHour >= endHour;
}

/**
 * Reglas base que se aprovisionan para cualquier organización comercial de Bunker.
 */
function getDefaultRuleTemplates(organizationId: string) {
  return [
    {
      organizationId,
      name: "Calificación y SMS Inmediato al Captar Lead",
      triggerEvent: TRIGGER_EVENT.LEAD_CREATED,
      actionType: ACTION_TYPE.IMMEDIATE_QUALIFICATION_SMS,
      conditionJson: JSON.stringify({ source: "all" }),
      actionPayload: JSON.stringify({
        messageTemplate:
          "¡Hola {{name}}! Recibimos tu solicitud en {{company}}. Un asesor comercial te contactará en breve. ¿Cuál es tu objetivo de ventas este mes?",
      }),
      isActive: true,
      executionCount: 0,
    },
    {
      organizationId,
      name: "IA de Respuesta Inmediata en Horas de Ausencia",
      triggerEvent: TRIGGER_EVENT.LEAD_CREATED,
      actionType: ACTION_TYPE.AI_OUT_OF_HOURS_SMS,
      conditionJson: JSON.stringify({
        startHour: DEFAULT_BUSINESS_HOURS.startHour,
        endHour: DEFAULT_BUSINESS_HOURS.endHour,
        workDays: DEFAULT_BUSINESS_HOURS.workDays,
      }),
      actionPayload: JSON.stringify({
        messageTemplate:
          "Hola {{name}}, recibimos tu consulta en Bunker CRM fuera de nuestro horario de oficina. Tu requerimiento ya fue priorizado para atenderte a primera hora hábil. ¿Te gustaría agendar una llamada breve para mañana?",
      }),
      isActive: true,
      executionCount: 0,
    },
    {
      organizationId,
      name: "Creación de Tarea al Pasar a Propuesta Enviada",
      triggerEvent: TRIGGER_EVENT.STAGE_CHANGED,
      actionType: ACTION_TYPE.CREATE_FOLLOWUP_TASK,
      conditionJson: JSON.stringify({ stageNameMatch: "propuesta" }),
      actionPayload: JSON.stringify({
        title: "Llamada de seguimiento a las 48 horas",
        hoursDue: 48,
      }),
      isActive: true,
      executionCount: 0,
    },
    {
      organizationId,
      name: "Onboarding Automático al Cerrar Negocio",
      triggerEvent: TRIGGER_EVENT.DEAL_WON,
      actionType: ACTION_TYPE.ONBOARDING_DEAL_WON,
      conditionJson: JSON.stringify({ status: "won" }),
      actionPayload: JSON.stringify({
        tasks: [
          "Reunión de kickoff estratégico con el cliente",
          "Configuración de portafolio y accesos Meta Ads",
          "Aprobación de pauta y metas comerciales",
        ],
      }),
      isActive: true,
      executionCount: 0,
    },
    {
      organizationId,
      name: "Reactivación de Prospectos Estancados",
      triggerEvent: TRIGGER_EVENT.STALE_LEADS_CHECK,
      actionType: ACTION_TYPE.REACTIVATE_STALE_LEAD,
      conditionJson: JSON.stringify({
        inactiveDays: DEFAULT_STALE_DAYS_THRESHOLD,
      }),
      actionPayload: JSON.stringify({
        taskPriority: "high",
        suggestedTemplate:
          "Hola {{name}}, te escribo para dar seguimiento a nuestra propuesta. ¿Continúan interesados en impulsar sus ventas este trimestre?",
      }),
      isActive: true,
      executionCount: 0,
    },
  ];
}

/**
 * Consulta las reglas de automatización de la organización.
 * Si no existen, inicializa automáticamente las 5 reglas preconfiguradas.
 */
export async function getAutomationRules(organizationId: string): Promise<AutomationRuleDto[]> {
  const existing = await prisma.automationRule.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });

  if (existing.length === 0) {
    const defaultTemplates = getDefaultRuleTemplates(organizationId);
    await prisma.automationRule.createMany({
      data: defaultTemplates,
    });

    const seeded = await prisma.automationRule.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });

    return seeded.map(mapRuleToDto);
  }

  return existing.map(mapRuleToDto);
}

function mapRuleToDto(r: {
  id: string;
  organizationId: string;
  name: string;
  triggerEvent: string;
  conditionJson: string | null;
  actionType: string;
  actionPayload: string | null;
  isActive: boolean;
  executionCount: number;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AutomationRuleDto {
  return {
    id: r.id,
    organizationId: r.organizationId,
    name: r.name,
    triggerEvent: r.triggerEvent,
    conditionJson: r.conditionJson,
    actionType: r.actionType,
    actionPayload: r.actionPayload,
    isActive: r.isActive,
    executionCount: r.executionCount,
    lastRunAt: r.lastRunAt?.toISOString() || null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/**
 * Activa o pausa una regla de automatización.
 */
export async function toggleRuleStatus(
  organizationId: string,
  ruleId: string,
  isActive: boolean,
  userId?: string
): Promise<AutomationRuleDto | null> {
  const rule = await prisma.automationRule.findFirst({
    where: { id: ruleId, organizationId },
  });

  if (!rule) return null;

  const updated = await prisma.automationRule.update({
    where: { id: rule.id },
    data: { isActive },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: userId || null,
      action: isActive ? "automation_rule_enabled" : "automation_rule_disabled",
      entityType: "AutomationRule",
      entityId: rule.id,
      detailsJson: JSON.stringify({ name: rule.name, isActive }),
    },
  });

  return mapRuleToDto(updated);
}

/**
 * Modifica detalles de una regla de automatización.
 */
export async function updateAutomationRule(
  organizationId: string,
  ruleId: string,
  data: {
    name?: string;
    conditionJson?: string | null;
    actionPayload?: string | null;
    isActive?: boolean;
  },
  userId?: string
): Promise<AutomationRuleDto | null> {
  const rule = await prisma.automationRule.findFirst({
    where: { id: ruleId, organizationId },
  });

  if (!rule) return null;

  const updated = await prisma.automationRule.update({
    where: { id: rule.id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.conditionJson !== undefined ? { conditionJson: data.conditionJson } : {}),
      ...(data.actionPayload !== undefined ? { actionPayload: data.actionPayload } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: userId || null,
      action: "automation_rule_updated",
      entityType: "AutomationRule",
      entityId: rule.id,
      detailsJson: JSON.stringify(data),
    },
  });

  return mapRuleToDto(updated);
}

/**
 * Procesa las automatizaciones vinculadas al evento de Lead Creado:
 * 1. IA de respuesta inmediata en Horas de Ausencia (fuera de horario).
 * 2. Calificación y SMS inmediato al captar el lead (durante horario hábil).
 */
export async function processLeadCreatedAutomations(params: {
  lead: {
    id: string;
    name: string;
    phone: string | null;
    normalizedPhone: string | null;
    companyName: string | null;
    clientId: string | null;
    organizationId: string;
    ownerId: string | null;
  };
  organizationId: string;
}): Promise<AutomationExecutionResult[]> {
  const { lead, organizationId } = params;
  const results: AutomationExecutionResult[] = [];

  const targetPhone = lead.normalizedPhone || lead.phone;
  if (!targetPhone) {
    return [
      {
        ruleId: "none",
        ruleName: "Lead SMS Automations",
        executed: false,
        reason: "Lead no tiene número de teléfono registrado",
      },
    ];
  }

  const activeRules = await prisma.automationRule.findMany({
    where: {
      organizationId,
      triggerEvent: TRIGGER_EVENT.LEAD_CREATED,
      isActive: true,
    },
  });

  if (activeRules.length === 0) return results;

  // Evaluar si estamos en horas de ausencia
  const outOfHoursRule = activeRules.find(
    (r) => r.actionType === ACTION_TYPE.AI_OUT_OF_HOURS_SMS
  );
  const immediateRule = activeRules.find(
    (r) => r.actionType === ACTION_TYPE.IMMEDIATE_QUALIFICATION_SMS
  );

  const isAbsenceTime = isOutOfBusinessHours(outOfHoursRule?.conditionJson);

  let ruleToExecute = isAbsenceTime ? outOfHoursRule : immediateRule;
  // Si no está activa la regla de ausencia pero sí la inmediata (o viceversa)
  if (!ruleToExecute) {
    ruleToExecute = immediateRule || outOfHoursRule;
  }

  if (!ruleToExecute) return results;

  // Extraer plantilla
  let template = isAbsenceTime
    ? "Hola {{name}}, recibimos tu consulta en Bunker CRM fuera de nuestro horario comercial. Tu mensaje ya fue priorizado para atenderte a primera hora hábil. ¿Te gustaría agendar una llamada breve para mañana?"
    : "¡Hola {{name}}! Recibimos tu solicitud en {{company}}. Un asesor comercial te contactará en breve. ¿Cuál es tu objetivo de ventas este mes?";

  if (ruleToExecute.actionPayload) {
    try {
      const parsed = JSON.parse(ruleToExecute.actionPayload);
      if (typeof parsed.messageTemplate === "string" && parsed.messageTemplate.trim()) {
        template = parsed.messageTemplate;
      }
    } catch {
      // Usar template por defecto
    }
  }

  const messageBody = template
    .replace(/\{\{name\}\}/gi, lead.name)
    .replace(/\{\{company\}\}/gi, lead.companyName || "Bunker CRM");

  // Despachar SMS con el cliente Twilio
  const sendResult = await sendTwilioSms(targetPhone, messageBody);

  // Guardar registro en Message
  await prisma.message.create({
    data: {
      organizationId,
      clientId: lead.clientId || null,
      leadId: lead.id,
      channel: "sms",
      direction: "outbound",
      recipient: targetPhone,
      body: messageBody,
      status: sendResult.status,
      providerMsgId: sendResult.providerMsgId,
      errorMessage: sendResult.errorMessage,
    },
  });

  // Incrementar conteo de ejecuciones de la regla
  await prisma.automationRule.update({
    where: { id: ruleToExecute.id },
    data: {
      executionCount: { increment: 1 },
      lastRunAt: new Date(),
    },
  });

  // Dejar traza en AuditLog
  await prisma.auditLog.create({
    data: {
      organizationId,
      action: isAbsenceTime ? "automation_ai_absence_sms_sent" : "automation_lead_welcome_sms_sent",
      entityType: "Lead",
      entityId: lead.id,
      detailsJson: JSON.stringify({
        ruleId: ruleToExecute.id,
        ruleName: ruleToExecute.name,
        recipient: targetPhone,
        status: sendResult.status,
        providerMsgId: sendResult.providerMsgId,
        isAbsenceTime,
      }),
    },
  });

  results.push({
    ruleId: ruleToExecute.id,
    ruleName: ruleToExecute.name,
    executed: true,
    actionTaken: ruleToExecute.actionType,
    details: {
      recipient: targetPhone,
      status: sendResult.status,
      isAbsenceTime,
    },
  });

  return results;
}

/**
 * Procesa automatizaciones de Oportunidades:
 * - Onboarding automático al ganar oportunidad (deal_won)
 * - Creación de tarea de llamada al pasar a propuesta (stage_changed)
 */
export async function processOpportunityAutomations(params: {
  opportunity: {
    id: string;
    title: string;
    status: string;
    stageId: string;
    stageName?: string;
    clientId: string | null;
    leadId: string | null;
    ownerId?: string | null;
  };
  event: "deal_won" | "stage_changed";
  organizationId: string;
  userId?: string;
}): Promise<AutomationExecutionResult[]> {
  const { opportunity, event, organizationId, userId } = params;
  const results: AutomationExecutionResult[] = [];

  if (event === "deal_won") {
    const rule = await prisma.automationRule.findFirst({
      where: {
        organizationId,
        triggerEvent: TRIGGER_EVENT.DEAL_WON,
        isActive: true,
      },
    });

    if (rule) {
      let tasks = [
        "Reunión de kickoff estratégico con el cliente",
        "Configuración de accesos y portafolio Meta Ads",
        "Checklist de pauta inicial y metas de conversión",
      ];

      if (rule.actionPayload) {
        try {
          const parsed = JSON.parse(rule.actionPayload);
          if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
            tasks = parsed.tasks;
          }
        } catch {
          // Usar tareas por defecto
        }
      }

      // Crear tareas de onboarding
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (const taskTitle of tasks) {
        await prisma.task.create({
          data: {
            title: `[Onboarding] ${taskTitle} (${opportunity.title})`,
            description: `Generado automáticamente por regla de cierre ganado '${rule.name}'.`,
            dueDate: tomorrow,
            priority: "high",
            status: "pending",
            clientId: opportunity.clientId,
            leadId: opportunity.leadId,
            opportunityId: opportunity.id,
            userId: opportunity.ownerId || userId || null,
          },
        });
      }

      await prisma.automationRule.update({
        where: { id: rule.id },
        data: {
          executionCount: { increment: 1 },
          lastRunAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId: userId || null,
          action: "automation_onboarding_tasks_created",
          entityType: "Opportunity",
          entityId: opportunity.id,
          detailsJson: JSON.stringify({
            ruleId: rule.id,
            tasksCount: tasks.length,
          }),
        },
      });

      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        executed: true,
        actionTaken: rule.actionType,
        details: { tasksCreated: tasks.length },
      });
    }
  }

  if (event === "stage_changed") {
    const rule = await prisma.automationRule.findFirst({
      where: {
        organizationId,
        triggerEvent: TRIGGER_EVENT.STAGE_CHANGED,
        isActive: true,
      },
    });

    if (rule) {
      const stageName = (opportunity.stageName || "").toLowerCase();
      let shouldTrigger = true;

      if (rule.conditionJson) {
        try {
          const parsed = JSON.parse(rule.conditionJson);
          if (parsed.stageNameMatch) {
            shouldTrigger = stageName.includes(String(parsed.stageNameMatch).toLowerCase());
          }
        } catch {
          shouldTrigger = true;
        }
      }

      if (shouldTrigger) {
        const due = new Date();
        due.setHours(due.getHours() + 48);

        await prisma.task.create({
          data: {
            title: `Llamada de seguimiento: ${opportunity.title}`,
            description: `Seguimiento automático a las 48h de ingresar en etapa ${opportunity.stageName || "propuesta"}.`,
            dueDate: due,
            priority: "medium",
            status: "pending",
            clientId: opportunity.clientId,
            leadId: opportunity.leadId,
            opportunityId: opportunity.id,
            userId: opportunity.ownerId || userId || null,
          },
        });

        await prisma.automationRule.update({
          where: { id: rule.id },
          data: {
            executionCount: { increment: 1 },
            lastRunAt: new Date(),
          },
        });

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executed: true,
          actionTaken: rule.actionType,
        });
      }
    }
  }

  return results;
}

/**
 * Escaneo y ejecución de reactivación de prospectos estancados.
 * Busca leads sin actividad en más de X días (default: 14) y crea tareas de reactivación.
 */
export async function executeStaleLeadsCheck(
  organizationId: string,
  userId?: string
): Promise<StaleLeadsCheckResult> {
  const rule = await prisma.automationRule.findFirst({
    where: {
      organizationId,
      triggerEvent: TRIGGER_EVENT.STALE_LEADS_CHECK,
    },
  });

  let thresholdDays = DEFAULT_STALE_DAYS_THRESHOLD;
  if (rule?.conditionJson) {
    try {
      const parsed = JSON.parse(rule.conditionJson);
      if (typeof parsed.inactiveDays === "number") {
        thresholdDays = parsed.inactiveDays;
      }
    } catch {
      thresholdDays = DEFAULT_STALE_DAYS_THRESHOLD;
    }
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

  // Leads abiertos no convertidos ni eliminados
  const candidateLeads = await prisma.lead.findMany({
    where: {
      organizationId,
      isDeleted: false,
      status: { in: ["new", "contacted", "qualified"] },
      updatedAt: { lte: cutoffDate },
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      clientId: true,
      updatedAt: true,
    },
    take: 100,
  });

  const details: StaleLeadsCheckResult["details"] = [];
  let tasksCreated = 0;

  for (const lead of candidateLeads) {
    // Comprobar si ya existe una tarea pendiente de reactivación para este lead
    const existingTask = await prisma.task.findFirst({
      where: {
        leadId: lead.id,
        status: "pending",
        title: { startsWith: "Reactivación de prospecto estancado" },
      },
    });

    if (!existingTask) {
      const daysInactive = Math.floor(
        (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      const taskTomorrow = new Date();
      taskTomorrow.setDate(taskTomorrow.getDate() + 1);

      const createdTask = await prisma.task.create({
        data: {
          title: `Reactivación de prospecto estancado: ${lead.name}`,
          description: `Prospecto sin actividad comercial desde hace ${daysInactive} días. Sugerencia de contacto: 'Hola ${lead.name}, te escribo para dar seguimiento a nuestra propuesta. ¿Continúan interesados en acelerar sus ventas este mes?'`,
          dueDate: taskTomorrow,
          priority: "high",
          status: "pending",
          leadId: lead.id,
          clientId: lead.clientId,
          userId: lead.ownerId || userId || null,
        },
      });

      tasksCreated++;
      details.push({
        leadId: lead.id,
        leadName: lead.name,
        daysInactive,
        taskId: createdTask.id,
      });
    }
  }

  if (rule && tasksCreated > 0) {
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: {
        executionCount: { increment: tasksCreated },
        lastRunAt: new Date(),
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: userId || null,
      action: "automation_stale_leads_check_executed",
      entityType: "AutomationRule",
      entityId: rule?.id || null,
      detailsJson: JSON.stringify({
        thresholdDays,
        leadsAnalyzed: candidateLeads.length,
        tasksCreated,
      }),
    },
  });

  return {
    leadsAnalyzed: candidateLeads.length,
    staleLeadsFound: candidateLeads.length,
    tasksCreated,
    details,
  };
}
