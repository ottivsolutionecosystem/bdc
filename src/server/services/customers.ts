import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { isSupervisorOrAdmin, requireSupervisorOrAdmin, type SessionUser } from "@/lib/permissions";
import { recordAudit } from "@/server/services/audit";
import { normalizePhone } from "@/lib/phone";

export async function listCustomers(user: SessionUser, search?: string) {
  requireSupervisorOrAdmin(user);

  const digits = search?.replace(/\D/g, "") ?? "";
  return prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { document: { contains: search, mode: "insensitive" } },
            ...(digits ? [{ phone: { contains: digits } }] : []),
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      _count: { select: { campaignContacts: true, opportunities: true, appointments: true } },
    },
  });
}

export async function createCustomer(
  user: SessionUser,
  input: { name: string; phone: string; email?: string | null; document?: string | null }
) {
  requireSupervisorOrAdmin(user);
  const phone = normalizePhone(input.phone);
  if (!phone.valid) throw new ApiError(422, "Informe um telefone válido");

  const created = await prisma.customer.create({
    data: {
      name: input.name,
      phone: phone.formatted,
      email: input.email || null,
      document: input.document || null,
    },
  });
  await recordAudit(prisma, {
    userId: user.id,
    entityType: "Customer",
    entityId: created.id,
    action: "CUSTOMER_CREATED",
  });
  return created;
}

export async function updateCustomer(
  user: SessionUser,
  customerId: string,
  input: { name?: string; phone?: string; email?: string | null; document?: string | null }
) {
  requireSupervisorOrAdmin(user);
  const existing = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!existing) throw new ApiError(404, "Cliente não encontrado");

  let phone = input.phone;
  if (phone !== undefined) {
    const normalized = normalizePhone(phone);
    if (!normalized.valid) throw new ApiError(422, "Informe um telefone válido");
    phone = normalized.formatted;
  }

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: input.name,
      phone,
      email: input.email === undefined ? undefined : input.email || null,
      document: input.document === undefined ? undefined : input.document || null,
    },
  });
  await recordAudit(prisma, {
    userId: user.id,
    entityType: "Customer",
    entityId: customerId,
    action: "CUSTOMER_UPDATED",
  });
  return updated;
}

export function assertCustomerAccess(user: SessionUser) {
  if (!isSupervisorOrAdmin(user)) {
    throw new ApiError(403, "Você não tem permissão para acessar o cadastro de clientes");
  }
}
