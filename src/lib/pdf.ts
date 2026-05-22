import type { ReportBundle } from '../types/report';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportReportToPdf(report: ReportBundle, fileName = 'ai_visibility_report.pdf'): Promise<void> {
  const root = document.getElementById('pdf-report-root');
  if (!root) {
    console.warn('PDF export: #pdf-report-root not found in DOM.');
    return;
  }

  try {
    // Temporarily make the off-screen root visible for capture
    const originalStyle = root.style.cssText;
    root.style.cssText = 'position: absolute; left: 0; top: 0; width: 1200px; z-index: -1; opacity: 1;';

    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: 1200,
      windowWidth: 1200,
    });

    // Restore original style
    root.style.cssText = originalStyle;

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');
    let heightLeft = imgHeight;
    let position = 0;

    // Add header
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(`AI Brand Visibility — ${report.brand} / ${report.market}`, 10, 8);
    pdf.text(`Generated: ${report.generatedAt}`, 10, 13);

    pdf.addImage(imgData, 'PNG', 0, 18, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 18);

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position + 18, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
}
