/**
 * Print page for Knowledge Asset formal document.
 * Uses the Figma A4 (595×842px) layout with:
 * - Auto-paginated TOC (6 entries per page)
 * - Auto-paginated chapter content (character-estimate)
 * - Forced page break between chapters
 * URL: /[locale]/insights/[slug]/print
 */
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

// ── Constants ────────────────────────────────────────────────────────────────
const ACCENT = "#f6645a";
const PAPER = "#ebebeb";
const QUOTE_BG = "#e9ddcf";
const TEXT = "#3a3a3a";
const MUTED = "#5e5e5e";

// Characters that fit in one content-body page (467px wide × 696px tall at 12px/16px)
// Rough empirical: ~1 char ≈ 7px wide, 12px height, 467/7 ≈ 66 chars/line, 696/16 ≈ 43 lines → ~2800 chars/page
const CONTENT_BODY_CHARS = 2600;
// Characters in a chapter-opening page (shorter body: 468px height)
const CHAPTER_BODY_CHARS = 2000;
// TOC entries per page
const TOC_PER_PAGE = 6;

// ── Data fetching ─────────────────────────────────────────────────────────────
type ChapterData = {
  index: number;
  title: string;
  subtitle?: string;
  content?: string;
  keyPoints?: string[];
};

async function getAsset(slug: string, locale: string) {
  const asset = await prisma.knowledgeAsset.findUnique({
    where: { slug },
    include: {
      institutions: { include: { institution: { select: { name: true, nameEn: true } } } },
    },
  });
  if (!asset || asset.status !== "PUBLISHED") return null;

  const isEn = locale === "en";

  const title = (isEn && asset.titleEn) ? asset.titleEn : asset.title;
  const subtitle = (isEn && asset.subtitleEn) ? asset.subtitleEn : (asset.subtitle || asset.title);
  const summary = (isEn && asset.summaryEn) ? asset.summaryEn : (asset.summary || "");
  const pullQuote = (isEn && asset.pullQuoteEn) ? asset.pullQuoteEn : (asset.pullQuote || "");
  const pullQuoteCaption = (isEn && asset.pullQuoteCaptionEn) ? asset.pullQuoteCaptionEn : (asset.pullQuoteCaption || "");
  const aboutUs = (isEn && asset.aboutUsEn) ? asset.aboutUsEn : (asset.aboutUs || "");

  const rawChapters = isEn
    ? (asset.chaptersEn as ChapterData[] | null)
    : (asset.chapters as ChapterData[] | null);
  const chapters: ChapterData[] = Array.isArray(rawChapters) ? rawChapters : [];

  // Publisher date
  const publishDate = asset.publishDate
    ? new Date(asset.publishDate).toLocaleDateString(isEn ? "en-US" : "zh-CN", { year: "numeric", month: "long" })
    : "";

  // Institution org name
  const orgName = asset.institutions[0]
    ? (isEn && asset.institutions[0].institution.nameEn
        ? asset.institutions[0].institution.nameEn
        : asset.institutions[0].institution.name)
    : "Shanghai Climate Week";

  // About Us fallback via SiteContent
  let aboutUsText = aboutUs;
  if (!aboutUsText) {
    const siteContent = await prisma.siteContent.findUnique({
      where: { key: "about_us" },
    });
    if (siteContent) {
      aboutUsText = (isEn && siteContent.descriptionEn) ? siteContent.descriptionEn : (siteContent.description || "");
    }
  }

  // Logo URLs from SiteContent
  const logoContent = await prisma.siteContent.findUnique({ where: { key: "org_logo" } });
  const logoUrl = logoContent?.extra ? (logoContent.extra as Record<string, string>).horizontal || "" : "";

  return {
    title,
    subtitle,
    summary,
    pullQuote,
    pullQuoteCaption,
    aboutUs: aboutUsText,
    logoUrl,
    publishDate,
    orgName,
    author: asset.author || "",
    chapters,
    fileUrl: asset.fileUrl || "",
  };
}

// ── Pagination helpers ────────────────────────────────────────────────────────
function paginateText(text: string, charsPerPage: number): string[] {
  if (!text) return [];
  const pages: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= charsPerPage) {
      pages.push(remaining);
      break;
    }
    // Break at paragraph boundary
    const slice = remaining.slice(0, charsPerPage);
    const lastBreak = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "), slice.lastIndexOf("。"));
    const breakAt = lastBreak > charsPerPage * 0.5 ? lastBreak + 1 : charsPerPage;
    pages.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  return pages;
}

function buildTocEntries(chapters: ChapterData[], startPage: number) {
  return chapters.map((c, i) => ({
    label: c.title,
    page: startPage + i, // approximate, each chapter at least 1 page
  }));
}

// ── Inline CSS (A4 page system) ───────────────────────────────────────────────
const PAGE_CSS = `
  @page { size: 595px 842px; margin: 0; }
  :root {
    --accent: ${ACCENT}; --paper: ${PAPER}; --text: ${TEXT}; --muted: ${MUTED};
    --quote-bg: ${QUOTE_BG}; --white: #fff; --caption: #868686;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: var(--text); background: #d8d8d8; }
  .document { width: max-content; margin: 24px auto 64px; }
  .page {
    position: relative; width: 595px; height: 842px; overflow: hidden;
    margin: 0 auto 24px; box-shadow: 0 2px 14px rgba(0,0,0,.14);
    page-break-after: always; break-after: page; background: var(--paper);
  }
  .page.white { background: #fff; }
  .page.accent { background: var(--accent); }
  .page.quote { background: var(--quote-bg); }

  /* Footer */
  .footer {
    position: absolute; left: 0; bottom: 0; width: 595px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; line-height: 16px; letter-spacing: .24px;
  }
  .footer.dark { background: var(--accent); color: #fff; }
  .footer.light { color: var(--muted); }
  .footer.toc-foot { color: #fff; }

  /* Title page */
  .title-bg { position: absolute; left: 0; top: 0; width: 595px; height: 567px; background: var(--accent); }
  .title-main { position: absolute; left: 64px; top: 247px; width: 437px; color: #fff; font-size: 72px; line-height: 80px; letter-spacing: -0.96px; font-weight: 800; }
  .title-sub { position: absolute; left: 64px; top: 590px; width: 444px; color: var(--muted); font-size: 36px; line-height: 44px; letter-spacing: -0.72px; font-weight: 700; font-family: Georgia, serif; }
  .title-date { position: absolute; left: 64px; top: 700px; color: #868686; font-size: 14px; line-height: 16px; font-weight: 500; text-transform: uppercase; }
  .title-author { position: absolute; left: 64px; top: 722px; color: #868686; font-size: 13px; }
  .title-logo { position: absolute; left: 64px; top: 760px; max-width: 160px; max-height: 48px; object-fit: contain; }

  /* TOC */
  .toc-line { position: absolute; left: 64px; top: 112px; width: 64px; height: 1px; background: #fff; }
  .toc-title { position: absolute; left: 64px; top: 215px; width: 436px; color: #fff; font-size: 64px; line-height: 72px; letter-spacing: -1.44px; font-weight: 600; }
  .toc-list { position: absolute; left: 64px; top: 396px; width: 467px; color: #fff; font-size: 12px; line-height: 16px; letter-spacing: .24px; }
  .toc-item { position: relative; width: 467px; height: 24px; display: flex; align-items: center; }
  .toc-label { flex: 1; white-space: nowrap; overflow: hidden; }
  .toc-dots { flex: 1; border-bottom: 1px dotted rgba(255,255,255,.4); margin: 0 6px; }
  .toc-page { width: 24px; text-align: right; }

  /* Introduction */
  .intro-line { position: absolute; left: 64px; top: 96px; width: 96px; height: 1px; background: var(--accent); }
  .intro-title { position: absolute; left: 64px; top: 244px; width: 467px; font-size: 64px; line-height: 72px; letter-spacing: -1.44px; font-weight: 600; color: #000; }
  .intro-sub { position: absolute; left: 64px; top: 380px; width: 467px; font-size: 28px; line-height: 36px; letter-spacing: -0.56px; font-weight: 600; color: var(--muted); font-family: Georgia, serif; }
  .intro-body { position: absolute; left: 64px; top: 430px; width: 467px; height: 336px; overflow: hidden; font-size: 12px; line-height: 16px; letter-spacing: .24px; }
  .intro-body p { margin-bottom: 8px; }

  /* Quote page */
  .quote-mark { position: absolute; left: 64px; top: 271px; width: 456px; font-size: 102px; line-height: 45px; font-weight: 700; font-family: Georgia, serif; color: var(--accent); }
  .quote-text { position: absolute; left: 64px; top: 291px; width: 456px; font-size: 28px; line-height: 38px; letter-spacing: -0.56px; font-weight: 600; font-family: Georgia, serif; }
  .quote-caption { position: absolute; left: 64px; top: 560px; width: 456px; font-size: 14px; line-height: 16px; letter-spacing: -0.14px; font-weight: 500; color: var(--muted); text-transform: uppercase; }

  /* Chapter opener */
  .chapter-title { position: absolute; left: 64px; top: 79px; width: 467px; font-size: 64px; line-height: 72px; letter-spacing: -1.44px; font-weight: 600; color: #000; }
  .chapter-sub { position: absolute; left: 64px; top: 215px; width: 467px; font-size: 28px; line-height: 36px; letter-spacing: -0.56px; font-weight: 600; color: var(--accent); font-family: Georgia, serif; }
  .chapter-line { position: absolute; left: 64px; top: 262px; width: 64px; height: 1px; background: var(--accent); }
  .chapter-body { position: absolute; left: 64px; top: 276px; width: 467px; height: 500px; overflow: hidden; font-size: 12px; line-height: 16px; letter-spacing: .24px; }
  .chapter-body p { margin-bottom: 8px; }
  .key-points { margin-top: 12px; padding: 10px 12px; background: rgba(246,100,90,.06); border-left: 3px solid var(--accent); }
  .key-points ul { list-style: disc; padding-left: 16px; }
  .key-points li { font-size: 11px; line-height: 16px; margin-bottom: 4px; }

  /* Continuation page */
  .content-body { position: absolute; left: 64px; top: 64px; width: 467px; height: 712px; overflow: hidden; font-size: 12px; line-height: 16px; letter-spacing: .24px; }
  .content-body p { margin-bottom: 8px; }

  /* Final page */
  .final-band { position: absolute; left: 0; top: 593px; width: 595px; height: 249px; background: var(--accent); }
  .final-line { position: absolute; left: 64px; top: 623px; width: 64px; height: 1px; background: #fff; }
  .final-title { position: absolute; left: 64px; top: 648px; width: 467px; color: #fff; font-size: 40px; line-height: 52px; letter-spacing: -0.8px; font-weight: 700; font-family: Georgia, serif; }
  .final-body { position: absolute; left: 64px; top: 707px; width: 467px; color: #fff; font-size: 11px; line-height: 15px; }
  .final-logo { position: absolute; left: 64px; top: 79px; max-width: 160px; max-height: 56px; object-fit: contain; }
  .final-download { position: absolute; left: 64px; top: 500px; }
  .final-download a { display: inline-block; padding: 8px 20px; background: var(--accent); color: #fff; font-size: 12px; border-radius: 4px; text-decoration: none; }

  @media print { body { background: #fff; } .document { margin: 0; } .page { margin: 0; box-shadow: none; } }
  @media screen { .print-btn { position: fixed; top: 16px; right: 16px; padding: 8px 18px; background: var(--accent); color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; z-index: 999; } }
  @media print { .print-btn { display: none; } }
`;

// ── Page components (as JSX strings rendered server-side) ─────────────────────
function htmlEsc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function nl2p(text: string) {
  return text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((p) => `<p>${htmlEsc(p.trim())}</p>`)
    .join("");
}

// ── Main page component ───────────────────────────────────────────────────────
export default async function InsightPrintPage({
  params,
}: {
  params: { slug: string; locale: string };
}) {
  const { slug, locale } = params;
  const asset = await getAsset(slug, locale);
  if (!asset) notFound();

  const { title, subtitle, summary, pullQuote, pullQuoteCaption, aboutUs, logoUrl, publishDate, author, chapters, fileUrl } = asset;

  // ── Build all pages ────────────────────────────────────────────────────────
  const pageChunks: { html: string; bg: string }[] = [];
  let pageCount = 0;

  function push(html: string, bg = "paper") {
    pageChunks.push({ html, bg });
    pageCount++;
    return pageCount;
  }

  // Page 1: Cover
  push(`
    <div class="title-bg"></div>
    <h1 class="title-main">${htmlEsc(title)}</h1>
    <p class="title-sub">${htmlEsc(subtitle)}</p>
    ${publishDate ? `<p class="title-date">${htmlEsc(publishDate)}</p>` : ""}
    ${author ? `<p class="title-author">${htmlEsc(author)}</p>` : ""}
    ${logoUrl ? `<img class="title-logo" src="${htmlEsc(logoUrl)}" alt="logo" />` : ""}
    <div class="footer dark">${htmlEsc(title)}</div>
  `);

  // TOC page(s)
  if (chapters.length > 0) {
    // We need to estimate page numbers. Cover=1, TOC pages come next.
    // Pages after TOC: intro=1, quote(if any)=1, then chapters...
    // For TOC display we use rough estimates.
    const tocStart = pageCount + 1 + (chapters.length > 0 ? 1 : 0) + (pullQuote ? 1 : 0) + 1; // approx

    const tocChunks: ChapterData[][] = [];
    for (let i = 0; i < chapters.length; i += TOC_PER_PAGE) {
      tocChunks.push(chapters.slice(i, i + TOC_PER_PAGE));
    }

    let chapterPageEst = tocStart;
    tocChunks.forEach((chunk, ti) => {
      const items = chunk
        .map((c) => {
          const p = chapterPageEst;
          chapterPageEst += 1 + Math.ceil((c.content?.length || 0) / CONTENT_BODY_CHARS);
          return `<div class="toc-item">
            <span class="toc-label">${htmlEsc(c.title)}</span>
            <span class="toc-dots"></span>
            <span class="toc-page">${p}</span>
          </div>`;
        })
        .join("");

      push(`
        <div class="toc-line"></div>
        <h2 class="toc-title">${locale === "en" ? "Table of Contents" : "目录"}</h2>
        <div class="toc-list">${items}</div>
        <div class="footer toc-foot">${ti > 0 ? `${locale === "en" ? "Table of Contents" : "目录"} (${ti + 1})` : ""}</div>
      `, "accent");
    });
  }

  // Introduction page
  if (summary) {
    push(`
      <div class="intro-line"></div>
      <h2 class="intro-title">${locale === "en" ? "Introduction" : "引言"}</h2>
      <p class="intro-sub">${htmlEsc(subtitle)}</p>
      <div class="intro-body">${nl2p(summary)}</div>
      <div class="footer dark">${htmlEsc(title)}</div>
    `);
  }

  // Quote page (optional)
  if (pullQuote) {
    push(`
      <p class="quote-mark">"</p>
      <p class="quote-text">${htmlEsc(pullQuote)}</p>
      ${pullQuoteCaption ? `<p class="quote-caption">${htmlEsc(pullQuoteCaption)}</p>` : ""}
      <div class="footer light">${htmlEsc(title)}</div>
    `, "quote");
  }

  // Chapter pages
  chapters.forEach((chapter) => {
    const chapterText = chapter.content || "";
    const keyPointsHtml = (chapter.keyPoints?.length ?? 0) > 0
      ? `<div class="key-points"><ul>${chapter.keyPoints!.map((k) => `<li>${htmlEsc(k)}</li>`).join("")}</ul></div>`
      : "";

    // First page of chapter (opener layout)
    const firstPageChars = Math.min(chapterText.length, CHAPTER_BODY_CHARS);
    const firstPageText = chapterText.slice(0, firstPageChars);
    const restText = chapterText.slice(firstPageChars).trim();

    push(`
      <h2 class="chapter-title">${htmlEsc(chapter.title)}</h2>
      ${chapter.subtitle ? `<p class="chapter-sub">${htmlEsc(chapter.subtitle)}</p>` : ""}
      <div class="chapter-line"></div>
      <div class="chapter-body">
        ${nl2p(firstPageText)}
        ${restText.length === 0 ? keyPointsHtml : ""}
      </div>
      <div class="footer dark">${htmlEsc(chapter.title)}</div>
    `);

    // Continuation pages for the rest of the chapter content
    if (restText.length > 0) {
      const continuations = paginateText(restText, CONTENT_BODY_CHARS);
      continuations.forEach((chunk, ci) => {
        const isLast = ci === continuations.length - 1;
        push(`
          <div class="content-body">
            ${nl2p(chunk)}
            ${isLast ? keyPointsHtml : ""}
          </div>
          <div class="footer dark">${htmlEsc(chapter.title)}</div>
        `);
      });
    }
  });

  // Final page
  push(`
    ${logoUrl ? `<img class="final-logo" src="${htmlEsc(logoUrl)}" alt="logo" />` : ""}
    <div class="final-band"></div>
    <div class="final-line"></div>
    <p class="final-title">${locale === "en" ? "About Us" : "关于我们"}</p>
    <p class="final-body">${htmlEsc(aboutUs || asset.orgName)}</p>
    ${fileUrl ? `<div class="final-download"><a href="${htmlEsc(fileUrl)}" target="_blank">${locale === "en" ? "Download Full Document" : "下载完整文档"}</a></div>` : ""}
  `);

  // ── Render ────────────────────────────────────────────────────────────────
  const pagesHtml = pageChunks
    .map(({ html, bg }) => `<section class="page${bg === "accent" ? " accent" : bg === "quote" ? " quote" : ""}">${html}</section>`)
    .join("\n");

  return (
    <html lang={locale}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      </head>
      <body>
        <button className="print-btn" type="button" onClick={() => { if (typeof window !== 'undefined') window.print(); }}>
          {locale === "en" ? "Print / Save PDF" : "打印 / 保存PDF"}
        </button>
        <div className="document" dangerouslySetInnerHTML={{ __html: pagesHtml }} />
        <script dangerouslySetInnerHTML={{ __html: `document.querySelector('.print-btn').onclick=function(){window.print()};` }} />
      </body>
    </html>
  );
}
