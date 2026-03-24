import nodemailer from "nodemailer";

type PasswordResetEmailInput = {
  to: string;
  resetToken: string;
  recipientName?: string | null;
  locale?: string;
};

type SupportedLocale = "zh" | "en";

export function getBaseUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function normalizeLocale(locale?: string): SupportedLocale {
  return locale === "en" ? "en" : "zh";
}

export function buildPasswordResetUrl(resetToken: string, locale?: string) {
  return `${getBaseUrl()}/${normalizeLocale(locale)}/auth/reset-password?token=${encodeURIComponent(
    resetToken
  )}`;
}

function getPasswordResetCopy(locale?: string) {
  if (normalizeLocale(locale) === "en") {
    return {
      defaultGreetingName: "there",
      subject: "Shanghai Climate Week 2026 password reset",
      intro: "Please click the link below to reset your password:",
      cta: "Reset password",
      fallback: "If the button does not open, copy this link into your browser:",
      expiry: "This link will expire in 1 hour. If you did not request this, you can ignore this email.",
    };
  }

  return {
    defaultGreetingName: "您好",
    subject: "上海气候周2026密码重置",
    intro: "请点击以下链接重置您的密码：",
    cta: "重置密码",
    fallback: "如果按钮无法打开，请复制以下链接到浏览器：",
    expiry: "该链接将在1小时后失效。如果这不是您的操作，请忽略此邮件。",
  };
}

function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendPasswordResetEmail({
  to,
  resetToken,
  recipientName,
  locale,
}: PasswordResetEmailInput) {
  const transporter = getMailTransporter();

  if (!transporter) {
    return false;
  }

  const resetUrl = buildPasswordResetUrl(resetToken, locale);
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const copy = getPasswordResetCopy(locale);
  const greetingName = recipientName?.trim() || copy.defaultGreetingName;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: copy.subject,
      text: `${greetingName}${normalizeLocale(locale) === "en" ? "," : "，"}\n\n${copy.intro}\n${resetUrl}\n\n${copy.expiry}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <p>${greetingName}${normalizeLocale(locale) === "en" ? "," : "，"}</p>
          <p>${copy.intro}</p>
          <p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 20px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 8px;">
              ${copy.cta}
            </a>
          </p>
          <p>${copy.fallback}</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>${copy.expiry}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Password reset email send error:", error);
    return false;
  }

  return true;
}