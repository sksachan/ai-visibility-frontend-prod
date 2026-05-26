import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { ReportBundle } from '../types/report';

/**
 * Regex matching modern CSS color functions that html2canvas cannot parse.
 * Covers oklab(...), oklch(...), color-mix(...), and lab/lch variants.
 */
const UNSUPPORTED_COLOR_RE = /\b(oklab|oklch|color-mix|lab|lch)\s*\(/i;

/** CSS properties that may contain color values. */
const COLOR_PROPS = [
  'color',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'fill',
  'stroke',
  'boxShadow',
  'textDecorationColor',
  'caretColor',
  'columnRuleColor',
] as const;

/**
 * Replace any unsupported color function value with a safe fallback.
 * For box-shadow we strip the entire value; for other props we use a
 * neutral color that preserves readability on the white PDF background.
 */
function safeFallback(prop: string): string {
  if (prop === 'boxShadow') return 'none';
  if (prop === 'color' || prop === 'fill') return '#1e293b'; // slate-800
  if (prop === 'stroke') return '#334155'; // slate-700
  return 'transparent';
}

/**
 * Walk every element (including SVG nodes) inside a cloned document and
 * replace any computed color value that uses oklab/oklch/color-mix with
 * a plain hex/rgb fallback so html2canvas can parse it.
 */
function sanitizeColors(clonedDoc: Document): void {
  const win = clonedDoc.defaultView;
  if (!win) return;

  // Select ALL elements including SVG children
  const allElements = clonedDoc.querySelectorAll('*');
  allElements.forEach((el) => {
    // Must be an Element that supports style — covers HTMLElement and SVGElement
    if (!('style' in el)) return;
    const htmlEl = el as HTMLElement | SVGElement;

    try {
      const computed = win.getComputedStyle(htmlEl);
      for (const prop of COLOR_PROPS) {
        const value = computed.getPropertyValue(
          // Convert camelCase to kebab-case for getPropertyValue
          prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
        );
        if (value && UNSUPPORTED_COLOR_RE.test(value)) {
          (htmlEl as HTMLElement).style.setProperty(
            prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
            safeFallback(prop),
            'important'
          );
        }
      }
    } catch {
      // getComputedStyle can throw on detached nodes — skip silently
    }
  });
}

/**
 * Apply export-safe overrides to the #pdf-report-root container.
 * Strips Tailwind opacity color classes (e.g. bg-emerald-500/10) by
 * forcing plain hex/rgb colors on the root and key child elements.
 */
function applyExportSafeStyles(root: HTMLElement): void {
  root.style.setProperty('background-color', '#ffffff', 'important');
  root.style.setProperty('color', '#0f172a', 'important');
  root.style.setProperty('visibility', 'visible', 'important');
  root.style.setProperty('opacity', '1', 'important');

  // Force all direct section wrappers to white bg
  root.querySelectorAll('[class*="bg-"]').forEach((el) => {
    const htmlEl = el as HTMLElement;
    try {
      const bg = getComputedStyle(htmlEl).backgroundColor;
      if (UNSUPPORTED_COLOR_RE.test(bg) || bg.includes('color-mix')) {
        htmlEl.style.setProperty('background-color', 'transparent', 'important');
      }
    } catch { /* skip */ }
  });
}

function prepareRootForExport(root: HTMLElement): { left: string; position: string; top: string; visibility: string } {
  const original = {
    left: root.style.left,
    position: root.style.position,
    top: root.style.top,
    visibility: root.style.visibility,
  };

  root.style.left = '0';
  root.style.top = '0';
  root.style.position = 'absolute';
  root.style.visibility = 'visible';
  applyExportSafeStyles(root);
  return original;
}

function restoreRoot(root: HTMLElement, original: { left: string; position: string; top: string; visibility: string }): void {
  root.style.left = original.left;
  root.style.position = original.position;
  root.style.top = original.top;
  root.style.visibility = original.visibility;
}

export async function exportReportToPdf(report: ReportBundle, fileName?: string): Promise<void> {
  const root = document.getElementById('pdf-report-root');
  if (!root) {
    throw new Error('PDF report root element (#pdf-report-root) not found.');
  }

  const originalRootStyle = prepareRootForExport(root);

  try {
    const pageElements = Array.from(root.querySelectorAll<HTMLElement>('.pdf-page'));
    const captureTargets = pageElements.length ? pageElements : [root];
    let pdf: jsPDF | null = null;

    for (let index = 0; index < captureTargets.length; index += 1) {
      const target = captureTargets[index];
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc: Document) => {
          // Sanitize ALL elements in the cloned document (HTML + SVG)
          sanitizeColors(clonedDoc);

          // Also apply export-safe styles to the cloned root
          const clonedRoot = clonedDoc.getElementById('pdf-report-root');
          if (clonedRoot) {
            applyExportSafeStyles(clonedRoot);
            clonedRoot.style.left = '0';
            clonedRoot.style.top = '0';
            clonedRoot.style.position = 'relative';
          }

          const clonedPages = clonedDoc.querySelectorAll<HTMLElement>('.pdf-page');
          clonedPages.forEach((page) => {
            page.style.setProperty('background-color', '#ffffff', 'important');
            page.style.setProperty('color', '#111827', 'important');
          });
        },
      });

      const imgData = canvas.toDataURL('image/png');
      if (!pdf) {
        pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
      } else {
        pdf.addPage([canvas.width, canvas.height], 'portrait');
      }
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    }

    if (!pdf) {
      throw new Error('No PDF pages were available to export.');
    }

    const name = fileName || `${report.brand}_${report.market}_${report.runId}_ai_visibility_report.pdf`.replaceAll(' ', '_');
    pdf.save(name);
  } finally {
    restoreRoot(root, originalRootStyle);
  }
}
