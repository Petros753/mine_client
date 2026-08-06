import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, type EmailMessage } from "@/lib/email";

/** Срок жизни приглашения — 24 часа */
const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;

/** Случайный непредсказуемый токен (256 бит энтропии, URL-safe) */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

function buildInviteUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/invite/${token}`;
}

type EmployeeForInvite = {
  id: string;
  user: { firstName: string; lastName: string | null; email: string };
  branch: { name: string };
};

function buildMessage(employee: EmployeeForInvite, token: string): EmailMessage {
  const name = [employee.user.firstName, employee.user.lastName]
    .filter(Boolean)
    .join(" ");
  const url = buildInviteUrl(token);

  const subject = "Вас пригласили в команду — установите пароль";

  const text = [
    `Здравствуйте, ${name}!`,
    "",
    `Вас добавили сотрудником филиала «${employee.branch.name}» ` +
      "на платформе онлайн-записи.",
    "",
    "Чтобы начать работу, установите пароль по ссылке:",
    url,
    "",
    "Ссылка действительна 24 часа. Если она истекла, попросите " +
      "администратора отправить приглашение повторно.",
  ].join("\n");

  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#18181b;">` +
    `<p>Здравствуйте, ${name}!</p>` +
    `<p>Вас добавили сотрудником филиала «${employee.branch.name}» ` +
    `на платформе онлайн-записи.</p>` +
    `<p>Чтобы начать работу, установите пароль:</p>` +
    `<p><a href="${url}" style="display:inline-block;padding:10px 20px;` +
    `background:#18181b;color:#ffffff;text-decoration:none;border-radius:6px;">` +
    `Установить пароль</a></p>` +
    `<p style="color:#52525b;">Ссылка действительна 24 часа. Если она истекла, ` +
    `попросите администратора отправить приглашение повторно.</p>` +
    `</div>`;

  return { to: employee.user.email, subject, text, html };
}

/**
 * Создаёт приглашение для сотрудника и отправляет письмо со ссылкой.
 *
 * Как и notifyClient, никогда не бросает исключение: недоступная почта
 * не должна откатывать создание сотрудника. Ошибки логируются в консоль.
 */
export async function sendEmployeeInvitation(employeeId: string): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      branch: { select: { name: true } },
    },
  });

  if (!employee) return;

  const token = generateInvitationToken();

  await prisma.invitationToken.create({
    data: {
      employeeId: employee.id,
      token,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    },
  });

  const result = await sendEmail(buildMessage(employee, token));

  if (!result.ok && !result.skipped) {
    console.error(
      `[invitations] Не удалось отправить приглашение сотруднику ${employee.id}:`,
      result.error
    );
  }
}
