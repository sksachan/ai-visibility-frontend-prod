import type { ReportBundle } from '../types/report';

/**
 * Export the report dashboard to PDF using html2canvas + jsPDF.
 * Captures the hidden #pdf-report-root element which renders all sections.
 */
export async function exportReportToPdf(report: ReportBundle, fileName?: string): Promise<void> {
  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');

  const root = document.getElementById('pdf-report-root');
  if (!root) {
    console.error('PDF export: #pdf-report-root element not found');
    return;
  }

  // Temporarily make the hidden root visible for capture
  const originalStyle = root.style.cssText;
  root.style.cssText = 'position: absolute; left: 0; top: 0; width: 1200px; z-index: -1; opacity: 0;';

  try {
    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: 1200,
      windowWidth: 1200,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');
    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Additional pages
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const name = fileName || `${report.brand}_${report.market}_${report.runId}_ai_visibility_report.pdf`.replaceAll(' ', '_');
    pdf.save(name);
  } catch (error) {
    console.error('PDF export failed:', error);
  } finally {
    root.style.cssText = originalStyle;
  }
}
