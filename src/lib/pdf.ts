import type { ReportBundle } from '../types/report';

export async function exportReportToPdf(_report: ReportBundle, fileName: string): Promise<void> {
  const root = document.getElementById('pdf-report-root');
  if (!root) {
    throw new Error('PDF render target (#pdf-report-root) not found in the DOM.');
  }

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const patchedElements: Array<{ el: HTMLElement; prop: string; original: string }> = [];
  const problematicColorPattern = /oklab|oklch|color-mix|color\(/i;
  const colorProperties = ['color', 'background-color', 'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'box-shadow', 'text-shadow', 'text-decoration-color'];

  try {
    const allElements = root.querySelectorAll('*');
    allElements.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const computed = window.getComputedStyle(el);
      for (const prop of colorProperties) {
        const value = computed.getPropertyValue(prop);
        if (value && problematicColorPattern.test(value)) {
          patchedElements.push({ el, prop, original: el.style.getPropertyValue(prop) });
          if (prop === 'color' || prop === 'text-decoration-color') {
            el.style.setProperty(prop, '#edf2f5', 'important');
          } else if (prop.includes('background')) {
            el.style.setProperty(prop, '#171717', 'important');
          } else if (prop.includes('border') || prop === 'outline-color') {
            el.style.setProperty(prop, '#232323', 'important');
          } else {
            el.style.setProperty(prop, 'transparent', 'important');
          }
        }
      }
    });

    const origLeft = root.style.left;
    root.style.left = '0';
    root.style.position = 'absolute';
    root.style.zIndex = '-1';

    const canvas = await html2canvas(root, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#000000',
      windowWidth: 1200,
    });

    root.style.left = origLeft;
    root.style.position = 'fixed';
    root.style.zIndex = '';

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF('p', 'mm', 'a4');

    let heightLeft = imgHeight;
    let position = 0;
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = -(imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
  } finally {
    for (const { el, prop, original } of patchedElements) {
      if (original) {
        el.style.setProperty(prop, original);
      } else {
        el.style.removeProperty(prop);
      }
    }
  }
}
