import { env } from "./env.js";

const RESEND_URL = "https://api.resend.com/emails";

export class EmailError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "EmailError";
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new EmailError(`Resend respondeu ${res.status}: ${body}`, res.status);
  }
}

export function sendCodigoEmail(to: string, codigo: string): Promise<void> {
  return sendEmail(
    to,
    "Seu código de verificação — Callout",
    `<div style="font-family:sans-serif;font-size:15px;color:#111">
      <p>Seu código de verificação é:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:.08em">${codigo}</p>
      <p style="color:#666">Ele expira em 15 minutos. Se você não pediu isso, ignore este email.</p>
    </div>`,
  );
}
