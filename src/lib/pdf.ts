import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const colorProps = [
  'color',
  'backgroundColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'textDecorationColor',
  'columnRuleColor',
  'fill',
  'stroke'
] as const;

function isUnsupportedColor(value: string | null | undefined) {
  return Boolean(value && /(oklch|oklab|lch\(|lab\(|color\()/i.test(value));
}

function fallbackFor(prop: string, value: string) {
  if (prop === 'backgroundColor') {
    if (/transparent|rgba\(0, 0, 0, 0\)/i.test(value)) return 'transparent';
    return '#ffffff';
  }
  if (prop.includes('border') || prop === 'outlineColor' || prop === 'columnRuleColor') return '#e2e8f0';
  if (prop === 'fill' || prop === 'stroke') return '#0f172a';
  return '#0f172a';
}

function sanitizeCloneForHtml2Canvas(doc: Document) {
  const root = doc.getElementById('pdf-report-root') || doc.body;
  root.querySelectorAll<HTMLElement | SVGElement>('*').forEach((element) => {
    const style = doc.defaultView?.getComputedStyle(element);
    if (!style) return;
    for (const prop of colorProps) {
      const value = style[prop as keyof CSSStyleDeclaration] as string;
      if (isUnsupportedColor(value)) {
        element.style.setProperty(prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), fallbackFor(prop, value), 'important');
      }
    }
    if (isUnsupportedColor(style.boxShadow)) element.style.setProperty('box-shadow', 'none', 'important');
    if (isUnsupportedColor(style.textShadow)) element.style.setProperty('text-shadow', 'none', 'important');
  });

  // html2canvas can also inspect stylesheet variables. Strip modern color functions
  // from the cloned document stylesheets without touching the live page.
  doc.querySelectorAll('style').forEach((styleTag) => {
    if (styleTag.textContent && /(oklch|oklab|lch\(|lab\(|color\()/i.test(styleTag.textContent)) {
      styleTag.textContent = styleTag.textContent
        .replace(/oklch\([^)]*\)/gi, '#0f172a')
        .replace(/oklab\([^)]*\)/gi, '#0f172a')
        .replace(/lch\([^)]*\)/gi, '#0f172a')
        .replace(/lab\([^)]*\)/gi, '#0f172a')
        .replace(/color\([^)]*\)/gi, '#0f172a');
    }
  });
}

export async function exportElementToPdf(elementId: string, fileName: string) {
  const node = document.getElementById(elementId);
  if (!node) throw new Error(`Element ${elementId} not found`);

  const originalStyle = node.getAttribute('style') || '';
  node.setAttribute('style', 'position:absolute;left:0;top:0;width:1200px;z-index:-1;opacity:1;pointer-events:none;background:#f8fafc;color:#0f172a;');
  await new Promise((resolve) => window.setTimeout(resolve, 250));

  try {
    const canvas = await html2canvas(node, {
      scale: 1.35,
      useCORS: true,
      backgroundColor: '#f8fafc',
      windowWidth: 1280,
      scrollX: 0,
      scrollY: 0,
      onclone: sanitizeCloneForHtml2Canvas
    });
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
  } finally {
    node.setAttribute('style', originalStyle);
  }
}
