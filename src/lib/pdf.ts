import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportElementToPdf(elementId: string, fileName: string) {
  const node = document.getElementById(elementId);
  if (!node) throw new Error(`Element ${elementId} not found`);

  const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(fileName);
}
