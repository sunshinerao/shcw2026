import QRCode from "qrcode";

export type InvitationLang = "zh" | "en";

export type InvitationRenderData = {
  language: InvitationLang;
  secondTitle: string;
  honoredGuestName: string;
  mainContentHtml: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  footerUrl: string;
  qrCodeDataUrl: string;
  coverImageUrl: string;
  bodyBgImageUrl: string;
  backBgImageUrl: string;
  backLogoImageUrl: string;
};

const FIXED_TEXT = {
  zh: {
    title: "邀请函",
    intro: `<p>全球气候治理正加速从\u201c承诺时代\u201d迈向\u201c系统性行动时代\u201d。</p><p>在这一关键历史节点，上海气候周2026将于2026年4月20日至28日在中国上海隆重举行。本届主题为\u201c东方既白\u201d，旨在以东方视角与全球协同，开启气候行动的新阶段。</p>`,
    eventInfoLabel: "活动信息：",
    closing: "谨此诚邀，期待您的莅临。",
    greeting: "致以问候，",
    signature1: "上海气候周执行委员会",
    signature2: "2026年3月",
    footerNote: "如蒙应允出席，请通过以下网络链接或者扫描二维码确认您的讯息：",
    backInfoCn: "上海气候周2026",
    backInfoEn: "Shanghai Climate Week 2026",
    backLink: "请访问我们的网站获得最新信息：https://www.shanghaiclimateweek.org.cn/shcw2026/",
    backEmail: "如有任何问题，请联系我们：info@shanghaiclimateweek.org.cn",
    coverAlt: "邀请函封面",
    bgAlt: "正文页背景",
    backBgAlt: "邀请函封底背景",
    backLogoAlt: "SHCW 白色 LOGO",
    qrAlt: "二维码",
    printTip: '<strong>打印为 PDF：</strong>按 <strong>Ctrl+P / Cmd+P</strong> → 边距选<strong>无 (None)</strong> → 取消勾选<strong>页眉和页脚 (Headers and Footers)</strong> → 另存为 PDF。',
  },
  en: {
    title: "Invitation",
    intro: `<p>Global climate governance is accelerating its transition from an era of commitments to an era of systemic action.</p><p>At this pivotal moment in history, Shanghai Climate Week 2026 will be held from April 20 to 28, 2026 in Shanghai, China. This year\u2019s theme, \u201cEastern Dawn, New Partnership,\u201d reflects an Eastern perspective in fostering global climate collaboration and opening a new chapter of climate action.</p>`,
    eventInfoLabel: "Event Information:",
    closing: "We sincerely look forward to your presence.",
    greeting: "With warm regards,",
    signature1: "Shanghai Climate Week Executive Committee",
    signature2: "March 2026",
    footerNote: "Please confirm your attendance via the link below or by scanning the QR code:",
    backInfoCn: "上海气候周2026",
    backInfoEn: "Shanghai Climate Week 2026",
    backLink: "Visit our website for the latest updates: https://www.shanghaiclimateweek.org.cn/shcw2026/",
    backEmail: "For any inquiries, please contact us: info@shanghaiclimateweek.org.cn",
    coverAlt: "Invitation cover",
    bgAlt: "Page background",
    backBgAlt: "Invitation back cover background",
    backLogoAlt: "SHCW white logo",
    qrAlt: "QR code",
    printTip: '<strong>Print to PDF:</strong> Press <strong>Ctrl+P / Cmd+P</strong> → set margins to <strong>None</strong> → uncheck <strong>Headers and Footers</strong> → Save as PDF.',
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

/**
 * Replace template placeholders in admin-configured mainContent HTML.
 * Supported: {eventTitle}, {guestName}, {eventDate}
 * Values are HTML-escaped before substitution.
 */
export function applyMainContentPlaceholders(
  html: string,
  vars: { eventTitle?: string; guestName?: string; eventDate?: string }
): string {
  let result = html;
  if (vars.eventTitle !== undefined) {
    result = result.replaceAll("{eventTitle}", escHtml(vars.eventTitle));
  }
  if (vars.guestName !== undefined) {
    result = result.replaceAll("{guestName}", escHtml(vars.guestName));
  }
  if (vars.eventDate !== undefined) {
    result = result.replaceAll("{eventDate}", escHtml(vars.eventDate));
  }
  return result;
}

/** Render a complete 3-page invitation HTML document. CSS is identical to the original template. */
export function renderInvitationHtml(data: InvitationRenderData): string {
  const t = data.language === "en" ? FIXED_TEXT.en : FIXED_TEXT.zh;
  const langAttr = data.language === "en" ? "en" : "zh-CN";

  // Values used as text nodes — HTML-escaped
  const secondTitle = escHtml(data.secondTitle);
  const honoredGuestName = escHtml(data.honoredGuestName);
  const eventDate = escHtml(data.eventDate);
  const eventTime = escHtml(data.eventTime);
  const eventVenue = escHtml(data.eventVenue);
  const footerUrl = escHtml(data.footerUrl);

  // mainContentHtml is admin-controlled rich HTML (trusted). Placeholders already applied.
  const mainContentHtml = data.mainContentHtml;

  const coverSection = data.coverImageUrl
    ? `<img class="bg-full" src="${escHtml(data.coverImageUrl)}" alt="${escHtml(t.coverAlt)}" />`
    : "";
  const bodyBgSection = data.bodyBgImageUrl
    ? `<img class="bg-full bg" src="${escHtml(data.bodyBgImageUrl)}" alt="${escHtml(t.bgAlt)}" />`
    : "";
  const backBgSection = data.backBgImageUrl
    ? `<img class="bg-full" src="${escHtml(data.backBgImageUrl)}" alt="${escHtml(t.backBgAlt)}" />`
    : "";
  const backLogoSection = data.backLogoImageUrl
    ? `<img class="back-logo" src="${escHtml(data.backLogoImageUrl)}" alt="${escHtml(t.backLogoAlt)}" />`
    : "";
  const qrSection = data.qrCodeDataUrl
    ? `<img class="qr" src="${data.qrCodeDataUrl}" alt="${escHtml(t.qrAlt)}" />`
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
      font-family: var(--font-cn);
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

    /* ========= Page 2 ========= */
    .inside .bg { z-index: 0; }

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
      top: 266px;
      left: 50%;
      transform: translateX(-50%);
      width: 1792px;
      text-align: center;
      font-size: 160px;
      line-height: 1;
      color: var(--text-main);
      font-weight: 400;
      letter-spacing: 1px;
      z-index: 2;
    }

    .inside .subtitle {
      position: absolute;
      top: 520px;
      left: 50%;
      transform: translateX(-50%);
      width: 1792px;
      text-align: center;
      font-size: 60px;
      line-height: 1.15;
      color: var(--text-main);
      font-weight: 400;
      z-index: 2;
    }

    .inside .guest {
      position: absolute;
      left: 310px;
      top: 754px;
      max-width: 1750px;
      font-size: 46px;
      line-height: 66px;
      color: var(--text-main);
      white-space: pre-wrap;
      z-index: 2;
    }

    .inside .intro {
      position: absolute;
      left: 315px;
      top: 886px;
      width: 1742px;
      font-size: 46px;
      line-height: 66px;
      color: var(--text-main);
      z-index: 2;
    }

    .inside .main {
      position: absolute;
      left: 315px;
      top: 1195px;
      width: 1752px;
      min-height: 1054px;
      font-size: 46px;
      line-height: 66px;
      color: var(--text-main);
      text-align: justify;
      z-index: 2;
      overflow: hidden;
    }

    .inside .intro p,
    .inside .main p {
      margin: 0;
    }

    .inside .intro p + p {
      margin-top: 28px;
    }

    .inside .main p + p {
      margin-top: 34px;
    }

    .inside .main strong {
      font-weight: 700;
      color: var(--text-strong);
    }

    .inside .event-title,
    .inside .event-date,
    .inside .event-time,
    .inside .event-venue,
    .inside .closing {
      position: absolute;
      left: 315px;
      width: 1742px;
      font-size: 46px;
      line-height: 66px;
      color: var(--text-main);
      z-index: 2;
    }

    .inside .event-title { top: 2327px; }
    .inside .event-date  { top: 2395px; }
    .inside .event-time  { top: 2463px; left: 310px; }
    .inside .event-venue { top: 2531px; }
    .inside .closing     { top: 2645px; }

    .inside .greeting {
      position: absolute;
      left: 315px;
      top: 2818px;
      font-size: 46px;
      line-height: 1.2;
      color: var(--text-main);
      z-index: 2;
    }

    .inside .signature {
      position: absolute;
      right: 305px;
      top: 2953px;
      text-align: right;
      font-size: 46px;
      line-height: 110px;
      color: var(--text-main);
      white-space: nowrap;
      z-index: 2;
    }

    .inside .footer-note,
    .inside .footer-link {
      position: absolute;
      left: 305px;
      width: 1617px;
      font-family: var(--font-footer);
      font-size: 30px;
      color: var(--text-main);
      z-index: 2;
    }

    .inside .footer-note { top: 3269px; line-height: 26px; }
    .inside .footer-link { top: 3332px; line-height: 26px; white-space: pre-wrap; word-break: break-all; }

    .inside .qr {
      position: absolute;
      left: 1926px;
      top: 3244px;
      width: 130px;
      height: 130px;
      object-fit: cover;
      display: block;
      z-index: 2;
      background: #fff;
    }

    /* ========= Page 3 ========= */
    .back .back-logo {
      position: absolute;
      left: 343px;
      top: 1535px;
      width: 1676px;
      height: 473px;
      object-fit: cover;
      display: block;
      z-index: 2;
    }

    .back .back-info-cn {
      position: absolute;
      left: 227px;
      top: 3069px;
      font-family: "MiSans", var(--font-cn);
      font-size: 48px;
      line-height: 1.2;
      color: #fff;
      white-space: nowrap;
      z-index: 2;
    }

    .back .back-info-en {
      position: absolute;
      left: 227px;
      top: 3133px;
      font-family: "Arial Rounded MT Bold", var(--font-footer);
      font-size: 40px;
      line-height: 1.2;
      color: #fff;
      white-space: nowrap;
      z-index: 2;
    }

    .back .back-link {
      position: absolute;
      left: 227px;
      top: 3263px;
      font-family: "Arial Rounded MT Bold", var(--font-footer);
      font-size: 40px;
      line-height: 1.2;
      color: #fff;
      white-space: nowrap;
      z-index: 2;
    }

    .back .back-email {
      position: absolute;
      left: 227px;
      top: 3343px;
      font-family: "Arial Rounded MT Bold", var(--font-footer);
      font-size: 40px;
      line-height: 1.2;
      color: #fff;
      white-space: nowrap;
      z-index: 2;
    }

    /* ========= Print tip banner (screen only) ========= */
    .print-tip {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #1a1f2e;
      color: #a0aec0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
      padding: 12px 20px;
      text-align: center;
      z-index: 999;
      line-height: 1.6;
    }

    .print-tip strong { color: #68d391; }

    @media print {
      @page { margin: 0; }
      body { background: #fff; padding: 0; }
      .stack { gap: 0; }
      .scaled { transform: none; margin-bottom: 0; }
      .page { box-shadow: none; page-break-after: always; }
      .print-tip { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-tip">${t.printTip}</div>

  <div class="stack">
    <!-- Page 1: Cover -->
    <section class="page scaled">
      ${coverSection}
    </section>

    <!-- Page 2: Content -->
    <section class="page inside scaled">
      ${bodyBgSection}
      <div class="panel"></div>

      <div class="title">${escHtml(t.title)}</div>
      <div class="subtitle">${secondTitle}</div>

      <div class="guest">${honoredGuestName}</div>
      <div class="intro">${t.intro}</div>

      <div class="main">${mainContentHtml}</div>

      <div class="event-title">${escHtml(t.eventInfoLabel)}</div>
      <div class="event-date">${eventDate}</div>
      <div class="event-time">${eventTime}</div>
      <div class="event-venue">${eventVenue}</div>

      <div class="closing">${escHtml(t.closing)}</div>
      <div class="greeting">${escHtml(t.greeting)}</div>

      <div class="signature">
        <div>${escHtml(t.signature1)}</div>
        <div>${escHtml(t.signature2)}</div>
      </div>

      <div class="footer-note">${escHtml(t.footerNote)}</div>
      <div class="footer-link">${footerUrl}</div>

      ${qrSection}
    </section>

    <!-- Page 3: Back cover -->
    <section class="page back scaled">
      ${backBgSection}
      ${backLogoSection}
      <div class="back-info-cn">${escHtml(t.backInfoCn)}</div>
      <div class="back-info-en">${escHtml(t.backInfoEn)}</div>
      <div class="back-link">${escHtml(t.backLink)}</div>
      <div class="back-email">${escHtml(t.backEmail)}</div>
    </section>
  </div>
</body>
</html>`;
}
