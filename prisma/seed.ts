import "dotenv/config";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { campaignTypeValues } from "../src/schemas/campaign";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type DispositionSeed = {
  code: string;
  label: string;
  category: "POSITIVE" | "CONVERSION" | "FOLLOW_UP" | "NO_INTEREST" | "NOT_REACHED";
  requiresNextContact: boolean;
  defaultTemperature: "HOT" | "WARM" | "FOLLOW_UP" | "COLD" | "NOT_REACHED";
};

// Pareceres padrão (templates globais, campaignId = null). Reutilizáveis por
// qualquer campanha futura; o supervisor pode adicionar pareceres específicos
// de uma campanha depois (campaignId preenchido) sem afetar este template.
const DEFAULT_DISPOSITIONS: DispositionSeed[] = [
  // POSITIVO
  { code: "interested_in_event", label: "Interessado no evento", category: "POSITIVE", requiresNextContact: false, defaultTemperature: "WARM" },
  { code: "interested_in_trade", label: "Interessado em trocar de veículo", category: "POSITIVE", requiresNextContact: false, defaultTemperature: "WARM" },
  { code: "wants_to_evaluate_vehicle", label: "Quer avaliar o veículo", category: "POSITIVE", requiresNextContact: false, defaultTemperature: "HOT" },
  { code: "wants_to_know_conditions", label: "Quer conhecer condições", category: "POSITIVE", requiresNextContact: false, defaultTemperature: "WARM" },
  { code: "wants_to_receive_offers", label: "Quer receber ofertas", category: "POSITIVE", requiresNextContact: false, defaultTemperature: "WARM" },
  { code: "wants_to_talk_to_seller", label: "Quer falar com vendedor", category: "POSITIVE", requiresNextContact: false, defaultTemperature: "HOT" },

  // CONVERSÃO
  { code: "visit_scheduled", label: "Visita agendada", category: "CONVERSION", requiresNextContact: false, defaultTemperature: "HOT" },
  { code: "forwarded_to_seller", label: "Encaminhado para vendedor", category: "CONVERSION", requiresNextContact: false, defaultTemperature: "HOT" },
  { code: "negotiation_open", label: "Negociação aberta", category: "CONVERSION", requiresNextContact: false, defaultTemperature: "HOT" },

  // FOLLOW-UP
  { code: "requested_callback", label: "Pediu retorno", category: "FOLLOW_UP", requiresNextContact: true, defaultTemperature: "FOLLOW_UP" },
  { code: "call_back_later", label: "Retornar mais tarde", category: "FOLLOW_UP", requiresNextContact: true, defaultTemperature: "FOLLOW_UP" },
  { code: "call_back_another_day", label: "Retornar outro dia", category: "FOLLOW_UP", requiresNextContact: true, defaultTemperature: "FOLLOW_UP" },
  { code: "awaiting_confirmation", label: "Aguardando confirmação", category: "FOLLOW_UP", requiresNextContact: true, defaultTemperature: "FOLLOW_UP" },
  { code: "cannot_talk_now", label: "Não pode falar agora", category: "FOLLOW_UP", requiresNextContact: true, defaultTemperature: "FOLLOW_UP" },
  { code: "undefined_situation", label: "Situação indefinida", category: "FOLLOW_UP", requiresNextContact: true, defaultTemperature: "FOLLOW_UP" },

  // SEM INTERESSE
  { code: "not_interested_now", label: "Não pretende trocar agora", category: "NO_INTEREST", requiresNextContact: false, defaultTemperature: "COLD" },
  { code: "bought_another_vehicle", label: "Comprou outro veículo", category: "NO_INTEREST", requiresNextContact: false, defaultTemperature: "COLD" },
  { code: "sold_vehicle", label: "Vendeu o veículo", category: "NO_INTEREST", requiresNextContact: false, defaultTemperature: "COLD" },
  { code: "not_interested_in_event", label: "Sem interesse no evento", category: "NO_INTEREST", requiresNextContact: false, defaultTemperature: "COLD" },
  { code: "do_not_contact", label: "Não quer receber contato", category: "NO_INTEREST", requiresNextContact: false, defaultTemperature: "COLD" },

  // CONTATO NÃO REALIZADO
  { code: "no_answer", label: "Não atendeu", category: "NOT_REACHED", requiresNextContact: false, defaultTemperature: "NOT_REACHED" },
  { code: "voicemail", label: "Caixa postal", category: "NOT_REACHED", requiresNextContact: false, defaultTemperature: "NOT_REACHED" },
  { code: "phone_off", label: "Telefone desligado", category: "NOT_REACHED", requiresNextContact: false, defaultTemperature: "NOT_REACHED" },
  { code: "invalid_number", label: "Número inválido", category: "NOT_REACHED", requiresNextContact: false, defaultTemperature: "NOT_REACHED" },
  { code: "whatsapp_no_reply", label: "WhatsApp sem retorno", category: "NOT_REACHED", requiresNextContact: false, defaultTemperature: "NOT_REACHED" },
  { code: "max_attempts_reached", label: "3 tentativas sem sucesso", category: "NOT_REACHED", requiresNextContact: false, defaultTemperature: "NOT_REACHED" },
];

async function seedDispositions() {
  for (const [index, item] of DEFAULT_DISPOSITIONS.entries()) {
    const existing = await prisma.campaignDisposition.findFirst({
      where: { campaignId: null, code: item.code },
    });
    if (existing) {
      await prisma.campaignDisposition.update({
        where: { id: existing.id },
        data: { label: item.label, category: item.category, requiresNextContact: item.requiresNextContact, defaultTemperature: item.defaultTemperature, order: index },
      });
      continue;
    }
    await prisma.campaignDisposition.create({
      data: { ...item, campaignId: null, order: index },
    });
  }
  console.log(`Pareceres padrão: ${DEFAULT_DISPOSITIONS.length} garantidos.`);
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const users = [
    { email: "admin@demo.com", name: "Admin Demo", role: "ADMIN" as const },
    { email: "supervisor@demo.com", name: "Supervisora Demo", role: "SUPERVISOR" as const },
    { email: "ana@demo.com", name: "Ana", role: "AGENT" as const },
    { email: "maria@demo.com", name: "Maria", role: "AGENT" as const },
    { email: "julia@demo.com", name: "Julia", role: "AGENT" as const },
    { email: "vendedor@demo.com", name: "Vendedor Demo", role: "SELLER" as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
  }
  console.log(`Usuários de acesso garantidos (senha: demo1234).`);
}

const MOCK_CAMPAIGN_NAMES = ["FESTIVAL FEDERAL CAR 15 ANOS", "Campanha rascunho (E2E)"];

async function clearMockOperationalData() {
  const mockCampaigns = await prisma.campaign.deleteMany({
    where: { name: { in: MOCK_CAMPAIGN_NAMES } },
  });
  if (mockCampaigns.count > 0) {
    console.log(`Campanhas de demonstração removidas: ${mockCampaigns.count}.`);
  }

  const mockCustomers = await prisma.customer.deleteMany({
    where: {
      campaignContacts: { none: {} },
      opportunities: { none: {} },
      appointments: { none: {} },
    },
  });
  if (mockCustomers.count > 0) {
    console.log(`Clientes de demonstração removidos: ${mockCustomers.count}.`);
  }
}

async function normalizeCampaignTypes() {
  const result = await prisma.campaign.updateMany({
    where: { type: { notIn: [...campaignTypeValues] } },
    data: { type: "other" },
  });
  if (result.count > 0) {
    console.log(`Tipos de campanha normalizados: ${result.count}.`);
  }
}

async function main() {
  await seedDispositions();
  await seedUsers();
  await normalizeCampaignTypes();
  await clearMockOperationalData();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
