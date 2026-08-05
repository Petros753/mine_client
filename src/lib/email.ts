import { Resend } from "resend";

export interface EmailMessage {
  to: string;
  subject: string;
  /** Текстовая версия письма — обязательна, её видят почтовики без HTML */
  text: string;
  html?: string;
}

export interface SendEmailResult {
  ok: boolean;
  /** true, если письмо не отправлялось: не задан RESEND_API_KEY */
  skipped?: boolean;
  error?: string;
}

const DEFAULT_FROM = "Booking Platform <onboarding@resend.dev>";

let client: Resend | null = null;

function getClient(apiKey: string): Resend {
  if (!client) {
    client = new Resend(apiKey);
  }
  return client;
}

/**
 * Отправка письма через Resend.
 *
 * Никогда не бросает исключение: почта — вспомогательный канал, и падение
 * отправки не должно ломать создание или изменение записи. Результат
 * возвращается вызывающему коду, чтобы он мог записать его в журнал.
 *
 * Без переменной окружения RESEND_API_KEY письмо не отправляется, а его
 * содержимое выводится в консоль — это режим локальной разработки.
 */
export async function sendEmail(
  message: EmailMessage
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  if (!apiKey) {
    console.info(
      `[email] RESEND_API_KEY не задан, письмо не отправлено.\n` +
        `  Кому: ${message.to}\n` +
        `  Тема: ${message.subject}\n` +
        `${message.text}`
    );
    return { ok: false, skipped: true };
  }

  try {
    const { error } = await getClient(apiKey).emails.send({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    });

    if (error) {
      console.error("[email] Resend вернул ошибку:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error("[email] Не удалось отправить письмо:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
