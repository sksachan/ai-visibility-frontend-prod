import type { ReportBundle } from '../types/report';

/**
 * Export the current report to PDF using html2canvas + jsPDF.
 *
 * html2canvas does not support modern CSS color functions like oklab() / oklch().
 * We patch these before capture and restore afterwards.
 */
export async function exportReportToPdf(report: ReportBundle, fileName?: string): Promise<void> {
  const target = document.getElementById('pdf-report-root');
  if (!target) {
    alert('PDF export container not found. Please try again.');
    return;
  }

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    // Patch oklab/oklch colors that html2canvas cannot parse
    const patched: Array<{ el: HTMLElement; prop: string; orig: string }> = [];
    const oklabRe = /oklch?\s*\(/i;
    const props = ['color', 'background-color', 'border-color', 'outline-color', 'fill', 'stroke'];

    const walk = (root: Element) => {
      root.querySelectorAll('*').forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const cs = window.getComputedStyle(node);
        props.forEach((p) => {
          const val = cs.getPropertyValue(p);
          if (val && oklabRe.test(val)) {
            patched.push({ el: node, prop: p, orig: node.style.getPropertyValue(p) });
            const fb = p === 'color' ? '#edf2f5' : p === 'background-color' ? '#171717' : '#232323';
            node.style.setProperty(p, fb, 'important');
          }
        });
      });
    };
    walk(target);

    // Also patch the target element itself
    const tcs = window.getComputedStyle(target);
    props.forEach((p) => {
      const val = tcs.getPropertyValue(p);
      if (val && oklabRe.test(val)) {
        patched.push({ el: target, prop: p, orig: target.style.getPropertyValue(p) });
        target.style.setProperty(p, p === 'background-color' ? '#000000' : '#edf2f5', 'important');
      }
    });

    const canvas = await html2canvas(target, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#000000',
      windowWidth: 1200,
      onclone: (clonedDoc: Document) => {
        clonedDoc.body.style.backgroundColor = '#000000';
        clonedDoc.body.style.color = '#edf2f5';
        // Patch cloned doc too
        walk(clonedDoc.body);
      },
    });

    // Restore patched elements
    patched.forEach(({ el, prop, orig }) => {
      if (orig) el.style.setProperty(prop, orig);
      else el.style.removeProperty(prop);
    });

    const imgW = 210;
    const imgH = (canvas.height * imgW) / canvas.width;
    const pageH = 297;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    let pos = 0;
    let rem = imgH;

    while (rem > 0) {
      if (pos > 0) pdf.addPage();
      const sliceH = Math.min(rem, pageH);
      const sc = document.createElement('canvas');
      sc.width = canvas.width;
      sc.height = Math.round((sliceH / imgH) * canvas.height);
      const ctx = sc.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, Math.round((pos / imgH) * canvas.height), canvas.width, sc.height, 0, 0, sc.width, sc.height);
      }
      pdf.addImage(sc.toDataURL('image/png'), 'PNG', 0, 0, imgW, sliceH);
      pos += pageH;
      rem -= pageH;
    }

    const name = fileName || `${report.brand}_${report.market}_${report.runId}_report.pdf`.replace(/\s+/g, '_');
    pdf.save(name);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('PDF export error:', msg);
    alert(`PDF export failed: ${msg}`);
  }
}
