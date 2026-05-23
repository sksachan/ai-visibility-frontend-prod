import type { ReportBundle } from '../types/report';

/**
 * Export the current report to PDF using html2canvas + jsPDF.
 *
 * The oklab/oklch colour functions used in modern CSS are NOT supported by
 * html2canvas 1.x. To work around this we:
 *  1. Clone the target DOM subtree into an off-screen container.
 *  2. Walk every element and inline-replace any computed colour that uses
 *     oklab/oklch with a safe fallback (rgb or hex).
 *  3. Render the sanitised clone with html2canvas.
 *  4. Remove the clone.
 */
export async function exportReportToPdf(report: ReportBundle, fileName?: string): Promise<void> {
  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');

  const source = document.getElementById('pdf-report-root');
  if (!source) throw new Error('PDF report root element not found.');

  // ── 1. Clone into a visible but off-screen container ──────────────────
  const clone = source.cloneNode(true) as HTMLElement;
  clone.id = 'pdf-clone-root';
  Object.assign(clone.style, {
    position: 'fixed',
    left: '-20000px',
    top: '0',
    width: '1200px',
    zIndex: '-9999',
    background: '#ffffff',
    color: '#000000',
  });
  document.body.appendChild(clone);

  // ── 2. Sanitise colours that html2canvas cannot parse ─────────────────
  const UNSUPPORTED_RE = /\b(oklab|oklch|color-mix|lch|lab)\s*\(/i;

  function sanitiseElement(el: HTMLElement) {
    const style = window.getComputedStyle(el);
    const props = ['color', 'background-color', 'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'box-shadow', 'text-shadow', 'fill', 'stroke'];
    for (const prop of props) {
      const val = style.getPropertyValue(prop);
      if (val && UNSUPPORTED_RE.test(val)) {
        // Replace with a safe fallback
        if (prop === 'background-color') {
          el.style.backgroundColor = '#ffffff';
        } else if (prop === 'color') {
          el.style.color = '#000000';
        } else if (prop.includes('border')) {
          el.style.setProperty(prop, '#cccccc');
        } else if (prop === 'box-shadow' || prop === 'text-shadow') {
          el.style.setProperty(prop, 'none');
        } else {
          el.style.setProperty(prop, 'transparent');
        }
      }
    }
    // Also override CSS variables that may resolve to oklab
    el.style.setProperty('--bg-app', '#ffffff');
    el.style.setProperty('--bg-surface', '#f8f9fa');
    el.style.setProperty('--bg-panel', '#ffffff');
    el.style.setProperty('--bg-card', '#ffffff');
    el.style.setProperty('--bg-card-hover', '#f0f0f0');
    el.style.setProperty('--border-subtle', '#e0e0e0');
    el.style.setProperty('--border-strong', '#cccccc');
    el.style.setProperty('--text-primary', '#111111');
    el.style.setProperty('--text-secondary', '#555555');
    el.style.setProperty('--text-muted', '#888888');
  }

  // Walk all elements in the clone
  sanitiseElement(clone);
  const allElements = clone.querySelectorAll('*');
  allElements.forEach((child) => {
    if (child instanceof HTMLElement) sanitiseElement(child);
  });

  // ── 3. Render with html2canvas ────────────────────────────────────────
  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 1200,
      windowWidth: 1200,
    });

    // ── 4. Build PDF ──────────────────────────────────────────────────────
    const imgWidth = 210; // A4 mm
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const name = fileName || `${report.brand}_${report.market}_${report.runId}_ai_visibility_report.pdf`.replaceAll(' ', '_');
    pdf.save(name);
  } finally {
    // ── 5. Cleanup ────────────────────────────────────────────────────────
    document.body.removeChild(clone);
  }
}
