import jsPDF from 'jspdf';
import type { ActionItem, OwnedPage, QueryDiagnostic, RecommendationModule, ReportBundle } from '../types/report';

type PdfCursor = {
  pdf: jsPDF;
  x: number;
  y: number;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
};

function clean(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function formatDate(value: string | undefined) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

function ensurePage(cursor: PdfCursor, requiredHeight = 12) {
  if (cursor.y + requiredHeight <= cursor.pageHeight - cursor.margin) return;
  cursor.pdf.addPage();
  cursor.y = cursor.margin;
}

function addText(cursor: PdfCursor, text: string, options?: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number; indent?: number; lineHeight?: number; maxWidth?: number }) {
  const size = options?.size ?? 10;
  const lineHeight = options?.lineHeight ?? size * 0.42;
  const indent = options?.indent ?? 0;
  const maxWidth = options?.maxWidth ?? cursor.contentWidth - indent;
  const gap = options?.gap ?? 3;
  const pdf = cursor.pdf;

  pdf.setFont('helvetica', options?.bold ? 'bold' : 'normal');
  pdf.setFontSize(size);
  pdf.setTextColor(...(options?.color ?? [15, 23, 42]));

  const lines = pdf.splitTextToSize(clean(text), maxWidth) as string[];
  const blockHeight = Math.max(lineHeight, lines.length * lineHeight) + gap;
  ensurePage(cursor, blockHeight);
  pdf.text(lines, cursor.x + indent, cursor.y);
  cursor.y += blockHeight;
}

function addSection(cursor: PdfCursor, title: string) {
  ensurePage(cursor, 18);
  cursor.y += 3;
  addText(cursor, title.toUpperCase(), { size: 10, bold: true, color: [71, 85, 105], gap: 5 });
  cursor.pdf.setDrawColor(226, 232, 240);
  cursor.pdf.line(cursor.margin, cursor.y - 2, cursor.pageWidth - cursor.margin, cursor.y - 2);
}

function addMetricRow(cursor: PdfCursor, metrics: Array<{ label: string; value: string | number }>) {
  const pdf = cursor.pdf;
  const cardGap = 4;
  const cols = Math.min(metrics.length, 4);
  const cardWidth = (cursor.contentWidth - cardGap * (cols - 1)) / cols;
  const cardHeight = 23;
  ensurePage(cursor, cardHeight + 6);

  metrics.slice(0, cols).forEach((metric, index) => {
    const x = cursor.margin + index * (cardWidth + cardGap);
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(x, cursor.y, cardWidth, cardHeight, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.setTextColor(15, 23, 42);
    pdf.text(String(metric.value), x + 4, cursor.y + 9);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(pdf.splitTextToSize(metric.label, cardWidth - 8), x + 4, cursor.y + 17);
  });
  cursor.y += cardHeight + 7;
}

function addBulletList(cursor: PdfCursor, items: string[], limit = 5) {
  items.filter(Boolean).slice(0, limit).forEach((item) => addText(cursor, `• ${item}`, { indent: 2, size: 9.5, color: [51, 65, 85], gap: 2 }));
}

function addQuery(cursor: PdfCursor, query: QueryDiagnostic, index: number) {
  addText(cursor, `${index + 1}. ${query.query}`, { bold: true, size: 10.5, gap: 2 });
  addText(cursor, `Journey: ${query.journey || 'Unclassified'} | AI visibility: ${query.aiVisibilityScore ?? 0}/100 | Status: ${query.visibilityStatus || 'not supplied'}`, { size: 8.8, color: [71, 85, 105], gap: 1 });
  const competitors = query.competitorBrands?.length ? query.competitorBrands.join(', ') : query.leadingCompetitor;
  if (competitors) addText(cursor, `Competitors: ${competitors}`, { size: 8.8, color: [71, 85, 105], gap: 1 });
  if (query.winningExternalSourceTypes?.length) addText(cursor, `Winning source types: ${query.winningExternalSourceTypes.join(', ')}`, { size: 8.8, color: [71, 85, 105], gap: 1 });
  if (query.leadingPublisher) addText(cursor, `Leading citation domain: ${query.leadingPublisher}`, { size: 8.8, color: [71, 85, 105], gap: 4 });
}

function addOwnedPage(cursor: PdfCursor, page: OwnedPage, index: number) {
  addText(cursor, `${index + 1}. ${page.url}`, { bold: true, size: 9.5, gap: 1 });
  const jsonLd = page.technicalSignals?.jsonLdPresent === undefined ? 'not checked' : page.technicalSignals.jsonLdPresent ? 'present' : 'missing';
  addText(cursor, `GEO score: ${page.geoScore}/120 | Journey: ${page.journeyCategory || 'Unclassified'} | Linked queries: ${page.relatedQueries?.length ?? 0} | JSON-LD: ${jsonLd}`, { size: 8.8, color: [71, 85, 105], gap: 1 });
  if (page.title) addText(cursor, page.title, { size: 8.8, color: [71, 85, 105], gap: 1 });
  addBulletList(cursor, page.diagnostics || [], 3);
}

function addRecommendation(cursor: PdfCursor, rec: RecommendationModule, index: number, mode: 'CMS' | 'PR') {
  addText(cursor, `${index + 1}. ${rec.title}`, { bold: true, size: 10, gap: 1 });
  const target = mode === 'CMS' ? `URL: ${rec.targetUrl}` : `Source pattern: ${rec.sourceType || rec.targetSourceTypes?.join(', ') || 'Grouped source opportunity'}`;
  addText(cursor, `${target} | Priority: ${rec.priority} | Value score: ${rec.valueScore ?? 'n/a'} | Query coverage: ${rec.queryCoverageCount ?? rec.linkedQueryIds?.length ?? 0}`, { size: 8.8, color: [71, 85, 105], gap: 1 });
  if (rec.placement || rec.htmlElement) addText(cursor, `Placement/component: ${rec.htmlElement || rec.placement}`, { size: 8.8, color: [71, 85, 105], gap: 1 });
  if (rec.introCopy) addText(cursor, `Intro copy: ${rec.introCopy}`, { size: 9, gap: 1 });
  if (rec.bodyCopy) addText(cursor, rec.bodyCopy, { size: 9, color: [51, 65, 85], gap: 1 });
  addBulletList(cursor, rec.bulletPoints || [], 4);
  if (!rec.introCopy && !rec.bodyCopy && rec.recommendation) addText(cursor, rec.recommendation, { size: 9, color: [51, 65, 85], gap: 2 });
  if (rec.evidenceBasis) addText(cursor, `Evidence basis: ${rec.evidenceBasis}`, { size: 8.5, color: [71, 85, 105], gap: 3 });
}

function addAction(cursor: PdfCursor, action: ActionItem, index: number) {
  addText(cursor, `${index + 1}. ${action.action}`, { bold: true, size: 9.4, gap: 1 });
  addText(cursor, `Owner: ${action.owner} | Workstream: ${action.workstream || action.category || action.source || 'n/a'} | Priority: ${action.priority} | Effort: ${action.effort} | Status: ${action.status} | Value: ${action.valueScore ?? 'n/a'} | Queries: ${action.queryCoverageCount ?? action.linkedQueryIds?.length ?? 0}`, { size: 8.4, color: [71, 85, 105], gap: 3 });
}

function addFooter(cursor: PdfCursor) {
  const pdf = cursor.pdf;
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`AI Brand Visibility · AEO/GEO Intelligence Dashboard · Page ${i} of ${pages}`, cursor.margin, cursor.pageHeight - 8);
  }
}

export async function exportReportToPdf(report: ReportBundle, fileName: string) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const cursor: PdfCursor = {
    pdf,
    x: 14,
    y: 18,
    pageWidth: pdf.internal.pageSize.getWidth(),
    pageHeight: pdf.internal.pageSize.getHeight(),
    margin: 14,
    contentWidth: pdf.internal.pageSize.getWidth() - 28
  };

  pdf.setProperties({
    title: `${report.brand} ${report.market} AI visibility report`,
    subject: 'AI Brand Visibility / AEO-GEO Intelligence Dashboard',
    creator: 'AI Brand Visibility Dashboard'
  });

  addText(cursor, 'AI BRAND VISIBILITY', { size: 9, bold: true, color: [100, 116, 139], gap: 3 });
  addText(cursor, 'AEO/GEO Intelligence Dashboard', { size: 20, bold: true, gap: 3 });
  addText(cursor, `${report.brand} · ${report.market} · Run: ${report.runId} · Evidence date: ${formatDate(report.evidenceDate)}`, { size: 9.5, color: [71, 85, 105], gap: 8 });
  addText(cursor, report.executive.summary || 'No executive summary supplied.', { size: 13, bold: true, color: [15, 23, 42], gap: 8 });

  addMetricRow(cursor, [
    { label: 'AI visibility score', value: `${report.executive.headlineMetrics.brandScore ?? report.visibility.brandScore} / 100` },
    { label: 'Queries audited', value: report.executive.headlineMetrics.queryCount ?? report.queries.length },
    { label: 'Avg owned GEO', value: `${report.executive.headlineMetrics.averageOwnedGeoScore120 ?? 0} / 120` },
    { label: 'Owned pages audited', value: report.ownedPages.length || report.executive.headlineMetrics.ownedPageCount || 0 }
  ]);

  addSection(cursor, 'Executive summary');
  addText(cursor, 'What is happening', { bold: true, size: 11, gap: 2 });
  addBulletList(cursor, report.executive.whatIsHappening || [], 6);
  addText(cursor, 'Why it is happening', { bold: true, size: 11, gap: 2 });
  addBulletList(cursor, report.executive.whyNow || [], 6);
  addText(cursor, 'Priority actions', { bold: true, size: 11, gap: 2 });
  addBulletList(cursor, report.executive.priorityActions || [], 6);

  if (report.aiHygiene) {
    const structured = report.aiHygiene.structured_data;
    addSection(cursor, 'AI discoverability hygiene');
    addText(cursor, report.aiHygiene.summary || 'AI hygiene summary was not supplied.', { size: 9.5, gap: 2 });
    addMetricRow(cursor, [
      { label: 'Robots.txt', value: report.aiHygiene.robots_txt?.status || 'not supplied' },
      { label: 'LLMs.txt', value: report.aiHygiene.llms_txt?.status || 'not supplied' },
      { label: 'JSON-LD/schema coverage', value: `${structured?.pages_with_json_ld ?? 0}/${structured?.owned_pages_total ?? report.ownedPages.length}` },
      { label: 'Priority', value: report.aiHygiene.priority || 'not supplied' }
    ]);
  }

  addSection(cursor, 'Query workbench highlights');
  report.queries.slice(0, 20).forEach((query, index) => addQuery(cursor, query, index));
  if (report.queries.length > 20) addText(cursor, `Additional queries in dashboard: ${report.queries.length - 20}`, { size: 8.8, color: [71, 85, 105], gap: 3 });

  addSection(cursor, 'External and competitor source landscape');
  const domains = report.sourceLandscape?.observedNonOwnedDomains || [];
  if (domains.length) {
    domains.slice(0, 30).forEach((domain, index) => addText(cursor, `${index + 1}. ${domain.domain} · ${domain.sourceType} · citations: ${domain.observedCount}`, { size: 9, gap: 1 }));
  } else {
    addText(cursor, 'No observed non-owned domains supplied.', { size: 9 });
  }
  const citations = report.sourceLandscape?.sourceCitations || [];
  if (citations.length) {
    addText(cursor, 'Captured citation evidence', { bold: true, size: 11, gap: 2 });
    citations.slice(0, 60).forEach((citation, index) => addText(cursor, `${index + 1}. ${citation.domain || citation.url} · ${citation.sourceType || 'unknown'} · ${citation.queryId || ''}${citation.snippet ? ` · ${citation.snippet}` : ''}`, { size: 8.5, color: [51, 65, 85], gap: 1 }));
    if (citations.length > 60) addText(cursor, `Additional citation evidence rows in dashboard: ${citations.length - 60}`, { size: 8.5, color: [71, 85, 105], gap: 3 });
  }

  addSection(cursor, 'Owned URL readiness');
  report.ownedPages.forEach((page, index) => addOwnedPage(cursor, page, index));

  addSection(cursor, 'CMS page-level recommendations');
  report.cmsModules.slice(0, 60).forEach((rec, index) => addRecommendation(cursor, rec, index, 'CMS'));

  addSection(cursor, 'Grouped PR opportunities');
  report.prOpportunities.slice(0, 20).forEach((rec, index) => addRecommendation(cursor, rec, index, 'PR'));

  addSection(cursor, 'Action checklist');
  report.actionChecklist.slice(0, 80).forEach((action, index) => addAction(cursor, action, index));

  if (report.parserMeta?.warnings?.length) {
    addSection(cursor, 'Parser and evidence caveats');
    addBulletList(cursor, report.parserMeta.warnings, 20);
  }

  addFooter(cursor);
  pdf.save(fileName);
}

// Kept only for backwards compatibility. The production dashboard now uses
// data-driven PDF generation to avoid blank html2canvas pages and canvas limits.
export async function exportElementToPdf(_elementId: string, fileName: string) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('PDF export requires a report bundle.', 14, 20);
  pdf.save(fileName);
}
