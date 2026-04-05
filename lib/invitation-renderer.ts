import QRCode from "qrcode";
import type { SignaturePreset } from "@/lib/invitation-signature-presets";

export type InvitationLang = "zh" | "en";

export type InvitationRenderData = {
  language: InvitationLang;
  secondTitle: string;
  bodyContentHtml: string;
  eventInfoLabel: string;
  eventDateText: string;
  eventTimeText: string;
  eventVenueText: string;
  closingText: string;
  greetingText: string;
  /** Used for zh invitations and en single-sig fallback (when no preset is supplied). */
  signatureHtml: string;
  footerNoteText: string;
  footerLinkText: string;
  qrCodeDataUrl: string;
  coverImageUrl: string;
  bodyBgImageUrl: string;
  backBgImageUrl: string;
  /**
   * EN-only: when provided, overrides signatureHtml and selects the
   * appropriate single‑ or dual‑signatory CSS layout.
   */
  signaturePreset?: SignaturePreset | null;
};

const FIXED_TEXT = {
  zh: {
    title: "邀请函",
    coverAlt: "邀请函封面",
    bgAlt: "正文页背景",
    backBgAlt: "邀请函封底背景",
    qrAlt: "二维码",
  },
  en: {
    title: "Invitation",
    coverAlt: "Invitation cover",
    bgAlt: "Page background",
    backBgAlt: "Invitation back cover background",
    qrAlt: "QR code",
  },
} as const;

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function generateQrCodeDataUrl(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, { margin: 1, width: 130 });
  } catch {
    return "";
  }
}

/** Render a complete 3-page invitation HTML document using the updated page 2 template structure. */
export function renderInvitationHtml(data: InvitationRenderData): string {
  const t = data.language === "en" ? FIXED_TEXT.en : FIXED_TEXT.zh;
  const langAttr = data.language === "en" ? "en" : "zh-CN";
  const bodyFont = data.language === "en" ? "var(--font-footer)" : "var(--font-cn)";
  const isEnglish = data.language === "en";
  const bodyTextFontSize = isEnglish ? 34 : 46;
  const bodyTextLineHeight = isEnglish ? 48 : 66;
  const bodyParagraphGap = isEnglish ? 18 : 34;
  const salutationLineHeight = isEnglish ? 44 : 54;
  const salutationMarginBottom = isEnglish ? 44 : 78;
  const greetingWidth = isEnglish ? 980 : 720;
  const signatureHeight = isEnglish ? 170 : 220;
  const signatureHtml = data.language === "en"
    ? data.signatureHtml.match(/<br\s*\/?>/i)
      ? data.signatureHtml
      : data.signatureHtml.replace(
          /\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i,
          "<br />$1 $2"
        )
    : data.signatureHtml;

  const secondTitle = escHtml(data.secondTitle);
  const eventInfoLabel = escHtml(data.eventInfoLabel);
  const eventDateText = escHtml(data.eventDateText);
  const eventTimeText = escHtml(data.eventTimeText);
  const eventVenueText = escHtml(data.eventVenueText);
  const closingText = escHtml(data.closingText);
  const greetingText = escHtml(data.greetingText);
  const footerNoteText = escHtml(data.footerNoteText);
  const footerLinkText = escHtml(data.footerLinkText);
  const bodyContentHtml = data.bodyContentHtml;

  // Build signature section — preset is only honoured for EN invitations
  const signatureSection = (() => {
    const preset = isEnglish ? (data.signaturePreset ?? null) : null;
    if (!preset) {
      return `<div class="v-invitation-sender">${signatureHtml}</div>`;
    }
    if (preset.type === "single") {
      const imgHtml = preset.singleImageUrl
        ? `<img class="v-sig-image-single" src="${escHtml(preset.singleImageUrl)}" alt="" />`
        : "";
      const textHtml = preset.singleHtml ?? signatureHtml;
      return `${imgHtml}<div class="v-invitation-sender">${textHtml}</div>`;
    }
    // dual — B on the left, A on the right (per reference template)
    const sigBImg = preset.signatoryBImageUrl
      ? `<img src="${escHtml(preset.signatoryBImageUrl)}" alt="" />`
      : "";
    const sigAImg = preset.signatoryAImageUrl
      ? `<img src="${escHtml(preset.signatoryAImageUrl)}" alt="" />`
      : "";
    return `
      <div class="v-sig-left">
        ${sigBImg}
        <div class="v-sender">${preset.signatoryBHtml ?? ""}</div>
      </div>
      <div class="v-sig-right">
        ${sigAImg}
        <div class="v-sender">${preset.signatoryAHtml ?? ""}</div>
      </div>`;
  })();

  const coverSection = data.coverImageUrl
    ? `<img class="bg-full" src="${escHtml(data.coverImageUrl)}" alt="${escHtml(t.coverAlt)}" />`
    : "";
  const bodyBgSection = data.bodyBgImageUrl
    ? `<img class="bg-full bg" src="${escHtml(data.bodyBgImageUrl)}" alt="${escHtml(t.bgAlt)}" />`
    : "";
  const backBgSection = data.backBgImageUrl
    ? `<img class="bg-full" src="${escHtml(data.backBgImageUrl)}" alt="${escHtml(t.backBgAlt)}" />`
    : "";
  const qrSection = data.qrCodeDataUrl
    ? `<img class="v-footer-qrcode" src="${data.qrCodeDataUrl}" alt="${escHtml(t.qrAlt)}" />`
    : "";

  return `<!DOCTYPE html>
<html lang="${langAttr}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SHCW 2026 Invitation</title>
  <style>
    :root {
      --page-width: 2362px;
      --page-height: 3543px;
      --text-main: rgba(0, 0, 0, 0.6);
      --text-strong: rgba(0, 0, 0, 0.72);
      --panel-bg: rgba(234, 244, 248, 0.39);
      --font-cn: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
      --font-footer: "Myanmar MN", "Arial Rounded MT Bold", "PingFang SC", sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 36px 0 80px;
      background: #0f1115;
      font-family: ${bodyFont};
    }

    .stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 52px;
    }

    .page {
      position: relative;
      width: var(--page-width);
      height: var(--page-height);
      overflow: hidden;
      background: #dfe8ee;
      box-shadow: 0 28px 90px rgba(0, 0, 0, 0.38);
    }

    .scaled {
      transform: scale(0.28);
      transform-origin: top center;
      margin-bottom: calc(var(--page-height) * -0.72);
    }

    .bg-full {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .inside .bg {
      z-index: 0;
    }

    .inside .panel {
      position: absolute;
      left: 100px;
      top: 100px;
      width: 2162px;
      height: 3343px;
      background: var(--panel-bg);
      z-index: 1;
    }

    .inside .title {
      position: absolute;
      left: 285px;
      top: 266px;
      width: 1792px;
      font-family: ${bodyFont};
      text-align: center;
      font-size: 160px;
      line-height: 1;
      color: var(--text-main);
      font-weight: 400;
      z-index: 2;
    }

    .inside .v-second-title {
      position: absolute;
      left: 310px;
      top: 520px;
      width: 1792px;
      font-family: ${bodyFont};
      text-align: center;
      font-size: 60px;
      line-height: 1.2;
      color: var(--text-main);
      font-weight: 400;
      z-index: 2;
    }

    .inside .v-body-content {
      position: absolute;
      left: 310px;
      top: 754px;
      width: 1747px;
      height: 1471px;
      overflow: hidden;
      font-family: ${bodyFont};
      font-size: ${bodyTextFontSize}px;
      line-height: ${bodyTextLineHeight}px;
      color: var(--text-main);
      text-align: justify;
      z-index: 2;
    }

    .inside .v-body-content p {
      margin: 0;
    }

    .inside .v-body-content p + p {
      margin-top: ${bodyParagraphGap}px;
    }

    .inside .v-body-content .salutation {
      line-height: ${salutationLineHeight}px;
      margin-bottom: ${salutationMarginBottom}px;
      text-align: left;
    }

    .inside .v-body-content strong {
      font-weight: 700;
      color: var(--text-strong);
    }

    .inside .v-event-note,
    .inside .v-event-date,
    .inside .v-event-time,
    .inside .v-event-venue,
    .inside .v-invitation-end {
      position: absolute;
      left: 318px;
      width: 1742px;
      font-family: ${bodyFont};
      font-size: ${bodyTextFontSize}px;
      line-height: ${bodyTextLineHeight}px;
      color: var(--text-main);
      z-index: 2;
    }

    .inside .v-event-note { top: 2327px; }
    .inside .v-event-date { top: 2418px; }
    .inside .v-event-time { top: 2486px; }
    .inside .v-event-venue { top: 2554px; }
    .inside .v-invitation-end {
      left: 315px;
      top: 2665px;
    }

    .inside .v-invitation-sincerely {
      position: absolute;
      left: 315px;
      top: 2818px;
      width: ${greetingWidth}px;
      font-family: ${bodyFont};
      font-size: ${bodyTextFontSize}px;
      line-height: ${bodyTextLineHeight}px;
      color: var(--text-main);
      white-space: nowrap;
      z-index: 2;
    }

    .inside .v-invitation-sender {
      position: absolute;
      right: 305px;
      top: 2953px;
      width: 1752px;
      min-height: ${signatureHeight}px;
      font-family: ${bodyFont};
      text-align: right;
      font-size: ${bodyTextFontSize}px;
      line-height: ${bodyTextLineHeight}px;
      color: var(--text-main);
      white-space: nowrap;
      z-index: 2;
    }

    /* EN single-sig with image ----------------------------------------- */
    .inside .v-sig-image-single {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      top: 2860px;
      max-width: 530px;
      max-height: 280px;
      object-fit: contain;
      display: block;
      z-index: 2;
    }

    /* EN dual-sig layout ------------------------------------------------ */
    .inside .v-sig-left,
    .inside .v-sig-right {
      position: absolute;
      top: 2816px;
      width: 700px;
      z-index: 2;
    }

    .inside .v-sig-left  { left: 310px; }
    .inside .v-sig-right { right: 310px; text-align: right; }

    .inside .v-sig-left img,
    .inside .v-sig-right img {
      max-width: 530px;
      max-height: 280px;
      object-fit: contain;
      display: block;
      margin-bottom: 24px;
    }

    .inside .v-sig-right img {
      margin-left: auto;
    }

    .inside .v-sig-left .v-sender,
    .inside .v-sig-right .v-sender {
      font-family: ${bodyFont};
      font-size: ${bodyTextFontSize}px;
      line-height: ${bodyTextLineHeight}px;
      color: var(--text-main);
      white-space: nowrap;
      margin-top: 24px;
    }

    .inside .v-footer-notes,
    .inside .v-footer-confirm-webaddress {
      position: absolute;
      left: 305px;
      width: 1617px;
      font-family: var(--font-footer);
      font-size: 30px;
      color: var(--text-main);
      z-index: 2;
    }

    .inside .v-footer-notes {
      top: 3269px;
      line-height: 26px;
    }

    .inside .v-footer-confirm-webaddress {
      top: 3332px;
      line-height: 26px;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .inside .v-footer-qrcode {
      position: absolute;
      left: 1926px;
      top: 3244px;
      width: 130px;
      height: 130px;
      object-fit: cover;
      display: block;
      background: #fff;
      z-index: 2;
    }

    @media print {
      body {
        background: #fff;
        padding: 0;
      }

      .stack {
        gap: 0;
      }

      .scaled {
        transform: none;
        margin-bottom: 0;
      }

      .page {
        box-shadow: none;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="stack">
    <section class="page scaled">
      ${coverSection}
    </section>

    <section class="page inside scaled">
      ${bodyBgSection}
      <div class="panel"></div>

      <div class="title">${escHtml(t.title)}</div>
      <div class="v-second-title">${secondTitle}</div>
      <div class="v-body-content">${bodyContentHtml}</div>
      <div class="v-event-note">${eventInfoLabel}</div>
      <div class="v-event-date">${eventDateText}</div>
      <div class="v-event-time">${eventTimeText}</div>
      <div class="v-event-venue">${eventVenueText}</div>
      <div class="v-invitation-end">${closingText}</div>
      <div class="v-invitation-sincerely">${greetingText}</div>
      ${signatureSection}
      <div class="v-footer-notes">${footerNoteText}</div>
      <div class="v-footer-confirm-webaddress">${footerLinkText}</div>

      ${qrSection}
    </section>

    <section class="page scaled">
      ${backBgSection}
    </section>
  </div>
</body>
</html>`;
}
