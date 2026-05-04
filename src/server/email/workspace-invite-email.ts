import { Resend } from "resend";

type WorkspaceInviteEmailInput = {
  to: string;
  workspaceName: string;
  inviteUrl: string;
  inviteToken: string;
  expiresAtIso: string;
};

const resendApiKey = process.env.RESEND_API_KEY;
const inviteFromEmail = process.env.INVITE_FROM_EMAIL;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

const assertEmailConfig = () => {
  if (!resendApiKey) {
    throw new Error("Env RESEND_API_KEY nao configurada.");
  }

  if (!inviteFromEmail) {
    throw new Error("Env INVITE_FROM_EMAIL nao configurada.");
  }

  if (!appUrl) {
    throw new Error("Env NEXT_PUBLIC_APP_URL nao configurada.");
  }
};

const formatPtBrDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const getInviteHtml = ({ workspaceName, inviteUrl, inviteToken, expiresAtIso }: Omit<WorkspaceInviteEmailInput, "to">) => {
  const logoUrl = `${appUrl}/orbicom-logo.png`;
  const expiresLabel = formatPtBrDate(expiresAtIso);

  return `
  <div style="background:#f5f7fb;padding:24px;font-family:Arial,sans-serif;color:#0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:24px;border-bottom:1px solid #e2e8f0;background:#ffffff;">
          <img src="${logoUrl}" alt="Orbicom" style="height:36px;display:block;" />
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:#0f172a;">Convite para acessar a Orbicom</h1>
          <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#334155;">
            Voce recebeu um convite para participar da empresa <strong>${workspaceName}</strong>.
          </p>
          <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">
            Clique no botao abaixo para aceitar o convite. Esse link expira em <strong>${expiresLabel}</strong>.
          </p>
          <p style="margin:0 0 20px 0;">
            <a href="${inviteUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-size:14px;font-weight:600;">Aceitar convite</a>
          </p>
          <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#475569;">
            Se preferir, voce tambem pode copiar o token abaixo e colar na tela de boas-vindas da plataforma:
          </p>
          <div style="padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;font-family:monospace;font-size:13px;word-break:break-all;">${inviteToken}</div>
          <p style="margin:18px 0 0 0;font-size:12px;line-height:1.6;color:#64748b;">
            Se voce nao reconhece este convite, ignore este e-mail.
          </p>
        </td>
      </tr>
    </table>
  </div>`;
};

const getInviteText = ({ workspaceName, inviteUrl, inviteToken, expiresAtIso }: Omit<WorkspaceInviteEmailInput, "to">) => {
  const expiresLabel = formatPtBrDate(expiresAtIso);

  return [
    `Voce recebeu um convite para participar da empresa ${workspaceName} na Orbicom.`,
    `Aceite pelo link: ${inviteUrl}`,
    `Expira em: ${expiresLabel}`,
    "",
    "Se preferir, utilize o token manual na tela de boas-vindas:",
    inviteToken,
  ].join("\n");
};

export const sendWorkspaceInviteEmail = async (input: WorkspaceInviteEmailInput) => {
  assertEmailConfig();
  const apiKey = resendApiKey as string;
  const from = inviteFromEmail as string;

  const resend = new Resend(apiKey);
  const subject = `Convite Orbicom - ${input.workspaceName}`;

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject,
    html: getInviteHtml(input),
    text: getInviteText(input),
  });

  if (error) {
    throw new Error(`Falha ao enviar convite por e-mail: ${error.message}`);
  }
};
