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

function toCssProperty(prop: string) {
  return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function sanitizeCloneForHtml2Canvas(doc: Document) {
  const root = doc.getElementById('pdf-report-root') || doc.body;

  root.querySelectorAll<HTMLElement | SVGElement>('*').forEach((element) => {
    const style = doc.defaultView?.getComputedStyle(element);
    if (!style) return;

    for (const prop of colorProps) {
      const value = style[prop as keyof CSSStyleDeclaration] as string;
      if (isUnsupportedColor(value)) {
        element.style.setProperty(toCssProperty(prop), fallbackFor(prop, value), 'important');
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

function sliceCanvasToJpeg(canvas: HTMLCanvasElement, y: number, height: number) {
  const pageCanvas = document.createElement('canvas');
  const sliceHeight = Math.min(height, canvas.height - y);
  pageCanvas.width = canvas.width;
  pageCanvas.height = sliceHeight;

  const ctx = pageCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not create PDF page canvas context');

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
  ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

  // Use JPEG instead of PNG because jsPDF's PNG parser can fail on very tall
  // html2canvas output with embedded SVG/data images ("wrong PNG signature").
  return {
    dataUrl: pageCanvas.toDataURL('image/jpeg', 0.92),
    sliceHeight
  };
}

export async function exportElementToPdf(elementId: string, fileName: string) {
  const node = document.getElementById(elementId);
  if (!node) throw new Error(`Element ${elementId} not found`);

  const originalStyle = node.getAttribute('style') || '';
  node.setAttribute(
    'style',
    'position:absolute;left:0;top:0;width:1200px;z-index:-1;opacity:1;pointer-events:none;background:#f8fafc;color:#0f172a;'
  );
  await new Promise((resolve) => window.setTimeout(resolve, 250));

  try {
    const canvas = await html2canvas(node, {
      scale: 1.15,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#f8fafc',
      windowWidth: 1280,
      scrollX: 0,
      scrollY: 0,
      onclone: sanitizeCloneForHtml2Canvas
    });

    const pdf = new jsPDF('p', 'mm', 'a4', true);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageCanvasHeight = Math.floor((canvas.width * pageHeight) / pageWidth);

    let y = 0;
    let pageIndex = 0;

    while (y < canvas.height) {
      const { dataUrl, sliceHeight } = sliceCanvasToJpeg(canvas, y, pageCanvasHeight);
      const imageHeightMm = (sliceHeight * pageWidth) / canvas.width;

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWidth, imageHeightMm, undefined, 'FAST');

      y += sliceHeight;
      pageIndex += 1;
    }

    pdf.save(fileName);
  } finally {
    node.setAttribute('style', originalStyle);
  }
}
