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
  /** EN-only: language line text, e.g. "Language: English and Chinese" */
  eventLanguageText?: string;
  /** Guest name used for the browser print/save filename via <title> */
  guestName?: string;
  /**
   * ZH-only: when provided, renders the official seal image at the signature
   * position of the Chinese invitation letter.
   */
  stampImageUrl?: string | null;
  /**
   * Whether to render the floating print/save-as-PDF button.
   * Should be true only for admin/download renders, not user preview.
   * Defaults to false.
   */
  showPrintButton?: boolean;
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
      ? `<img class="v-signed-b-en" src="${escHtml(preset.signatoryBImageUrl)}" alt="" />`
      : "";
    const sigAImg = preset.signatoryAImageUrl
      ? `<img class="v-signed-a-en" src="${escHtml(preset.signatoryAImageUrl)}" alt="" />`
      : "";
    return `
      ${sigBImg}
      <div class="v-sender-b-en">${preset.signatoryBHtml ?? ""}</div>
      ${sigAImg}
      <div class="v-sender-a-en">${preset.signatoryAHtml ?? ""}</div>`;
  })();

  // EN uses a dedicated CSS class (.inside-en) that matches the reference template exactly
  const sectionClass = isEnglish ? "inside-en" : "inside";
  const eventLanguageHtml =
    isEnglish && data.eventLanguageText ? escHtml(data.eventLanguageText) : "";

  // Full EN-specific CSS — injected only for EN invitations
  const enPageCss = !isEnglish ? "" : `
    .inside-en .bg { z-index: 0; }

    .inside-en .panel {
      position: absolute;
      left: 73px;
      top: 100px;
      width: 2162px;
      height: 3343px;
      background: var(--panel-bg);
      z-index: 1;
    }

    .inside-en .title {
      position: absolute;
      left: 610px;
      top: 266px;
      width: 1142px;
      font-family: ${bodyFont};
      text-align: center;
      font-size: 160px;
      line-height: 1;
      color: var(--text-main);
      font-weight: 400;
      z-index: 2;
    }

    .inside-en .v-second-title {
      position: absolute;
      left: 285px;
      top: 520px;
      width: 1792px;
      font-family: ${bodyFont};
      text-align: center;
      font-size: 50px;
      line-height: 1.2;
      color: var(--text-main);
      font-weight: 700;
      z-index: 2;
    }

    .inside-en .v-body-content {
      position: absolute;
      left: 294px;
      top: 755px;
      width: 1795px;
      height: 1444px;
      overflow: hidden;
      font-family: ${bodyFont};
      font-size: 36px;
      line-height: 1.4;
      color: var(--text-main);
      text-align: justify;
      z-index: 2;
    }

    .inside-en .v-body-content p { margin: 0; }
    .inside-en .v-body-content p + p { margin-top: 20px; }

    .inside-en .v-body-content .salutation,
    .inside-en .v-body-content .recipient-title {
      text-align: left;
      font-weight: 700;
    }

    .inside-en .v-body-content strong {
      font-weight: 700;
      color: var(--text-strong);
    }

    .inside-en .v-event-note,
    .inside-en .v-event-date,
    .inside-en .v-event-time,
    .inside-en .v-event-venue,
    .inside-en .v-event-language,
    .inside-en .v-invitation-end {
      position: absolute;
      left: 295px;
      width: 1794px;
      font-family: ${bodyFont};
      font-size: 34px;
      line-height: 1.2;
      color: var(--text-main);
      z-index: 2;
    }

    .inside-en .v-event-note    { top: 2266px; font-weight: 700; }
    .inside-en .v-event-date    { top: 2321px; }
    .inside-en .v-event-time    { top: 2373px; }
    .inside-en .v-event-venue   { top: 2425px; }
    .inside-en .v-event-language { top: 2478px; }
    .inside-en .v-invitation-end { top: 2554px; }

    .inside-en .v-invitation-sincerely {
      position: absolute;
      left: 294px;
      top: 2720px;
      width: 420px;
      font-family: ${bodyFont};
      font-size: 34px;
      line-height: 1.2;
      color: var(--text-main);
      white-space: nowrap;
      z-index: 2;
    }

    /* Single sig */
    .inside-en .v-invitation-sender {
      position: absolute;
      left: 294px;
      top: 2816px;
      width: 1774px;
      font-family: ${bodyFont};
      text-align: left;
      font-size: 34px;
      line-height: 1.2;
      color: var(--text-main);
      white-space: nowrap;
      z-index: 2;
    }

    /* Single sig with image: image sits at top, text shifted down by image height */
    .inside-en .v-sig-image-single {
      position: absolute;
      left: 294px;
      top: 2816px;
      max-width: 400px;
      max-height: 200px;
      object-fit: contain;
      display: block;
      z-index: 3;
    }

    .inside-en .v-sig-image-single ~ .v-invitation-sender {
      top: 3040px;
    }

    /* Dual sig */
    .inside-en .v-signed-b-en {
      position: absolute;
      left: 294px;
      top: 2839.67px;
      width: 208.051px;
      height: 338.083px;
      object-fit: contain;
      display: block;
      z-index: 2;
    }

    .inside-en .v-sender-b-en {
      position: absolute;
      left: 294px;
      top: 3135px;
      width: 756px;
      min-height: 135px;
      font-family: ${bodyFont};
      font-size: 34px;
      line-height: 1.2;
      color: var(--text-main);
      z-index: 2;
    }

    .inside-en .v-signed-a-en {
      position: absolute;
      left: 1452.09px;
      top: 2839.67px;
      width: 208.051px;
      height: 338.083px;
      object-fit: contain;
      display: block;
      z-index: 2;
    }

    .inside-en .v-sender-a-en {
      position: absolute;
      left: 1431px;
      top: 3129px;
      width: 756px;
      min-height: 135px;
      font-family: ${bodyFont};
      font-size: 34px;
      line-height: 1.2;
      color: var(--text-main);
      z-index: 2;
    }

    .inside-en .v-footer-notes,
    .inside-en .v-footer-confirm-webaddress {
      position: absolute;
      width: 1617px;
      font-family: var(--font-footer);
      font-size: 30px;
      color: var(--text-main);
      z-index: 2;
    }

    .inside-en .v-footer-notes {
      left: 294px;
      top: 3340px;
      line-height: 20px;
    }

    .inside-en .v-footer-confirm-webaddress {
      left: 294px;
      top: 3380px;
      line-height: 20px;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .inside-en .v-footer-qrcode {
      position: absolute;
      left: 1938px;
      top: 3293px;
      width: 131px;
      height: 131px;
      object-fit: cover;
      display: block;
      background: #fff;
      z-index: 2;
    }
  `;

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

  const stampSection =
    !isEnglish && data.stampImageUrl
      ? `<img class="v-cn-stamp" src="${escHtml(data.stampImageUrl)}" alt="" />`
      : "";

  const name = data.guestName?.trim() || "";
  const docTitle = isEnglish
    ? name ? `Invitation SHCW (${name})` : "Invitation SHCW"
    : name ? `上海气候周邀请函（${name}）` : "上海气候周邀请函";

  return `<!DOCTYPE html>
<html lang="${langAttr}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${docTitle}</title>
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

    /* (EN single-sig and dual-sig use .inside-en classes; no sig rules needed here) */

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

    .inside .v-cn-stamp {
      position: absolute;
      left: 1550px;
      top: 2732px;
      width: 547px;
      height: 532px;
      object-fit: contain;
      display: block;
      transform: rotate(-1.06deg);
      z-index: 3;
      opacity: 0.95;
      pointer-events: none;
    }

    ${enPageCss}

    @page {
      size: 2362px 3543px;
      margin: 0;
    }

    @media print {
      html, body {
        background: #fff;
        padding: 0;
        margin: 0;
        width: 2362px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .stack {
        gap: 0;
        align-items: flex-start;
      }

      .scaled {
        transform: none;
        margin-bottom: 0;
      }

      .page {
        box-shadow: none;
        width: 2362px;
        height: 3543px;
        overflow: hidden;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page:last-child {
        page-break-after: avoid;
        break-after: avoid;
      }

      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .v-print-btn {
        display: none !important;
      }
    }

  .v-print-btn {
    position: fixed;
    top: 20px;
    right: 24px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #059669;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-family: system-ui, -apple-system, sans-serif;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    transition: background 0.15s;
  }

  .v-print-btn:hover {
    background: #047857;
  }
  </style>
</head>
<body>
  <div class="stack">
    <section class="page scaled">
      ${coverSection}
    </section>

    <section class="page ${sectionClass} scaled">
      ${bodyBgSection}
      <div class="panel"></div>

      <div class="title">${escHtml(t.title)}</div>
      <div class="v-second-title">${secondTitle}</div>
      <div class="v-body-content">${bodyContentHtml}</div>
      <div class="v-event-note">${eventInfoLabel}</div>
      <div class="v-event-date">${eventDateText}</div>
      <div class="v-event-time">${eventTimeText}</div>
      <div class="v-event-venue">${eventVenueText}</div>
      ${eventLanguageHtml ? `<div class="v-event-language">${eventLanguageHtml}</div>` : ""}
      <div class="v-invitation-end">${closingText}</div>
      <div class="v-invitation-sincerely">${greetingText}</div>
      ${signatureSection}
      ${stampSection}
      <div class="v-footer-notes">${footerNoteText}</div>
      <div class="v-footer-confirm-webaddress">${footerLinkText}</div>

      ${qrSection}
    </section>

    <section class="page scaled">
      ${backBgSection}
    </section>
  </div>

  ${data.showPrintButton ? `<button class="v-print-btn" onclick="window.print()">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    ${data.language === "en" ? "Print / Save as PDF" : "\u6253\u5370 / \u4fdd\u5b58\u4e3aPDF"}
  </button>` : ""}
</body>
</html>`;
}
