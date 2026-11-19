import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import Letter from '../components/Letter.jsx';
import { fonts, getPages } from './themes.js';

const PAGE_W = 600; // CSS px the paper is rendered at; captured at 2x

async function capturePage(letter, page) {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_W}px;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(createElement(Letter, { letter, page, bare: true })));
    const font = fonts.find((f) => f.id === letter.font) || fonts[0];
    await document.fonts.load(`24px ${font.family}`).catch(() => {});
    await document.fonts.ready;
    await Promise.all([...host.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
    const html2canvas = (await import('html2canvas-pro')).default;
    const canvas = await html2canvas(host.firstElementChild, { scale: 2, backgroundColor: '#ffffff', logging: false });
    const b64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
    return { jpeg: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), w: canvas.width, h: canvas.height };
  } finally {
    root.unmount();
    host.remove();
  }
}

// One JPEG per PDF page, assembled by hand so no PDF library is needed.
function buildPdf(shots) {
  const enc = new TextEncoder();
  const parts = [];
  const offsets = [];
  let offset = 0;
  const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); offset += b.length; };
  const obj = (n, body) => { offsets[n] = offset; push(`${n} 0 obj\n${body}\nendobj\n`); };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${shots.map((_, i) => `${3 + 3 * i} 0 R`).join(' ')}] /Count ${shots.length} >>`);

  shots.forEach((s, i) => {
    const W = 420;
    const H = Math.round((W * s.h) / s.w);
    const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    obj(3 + 3 * i, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${5 + 3 * i} 0 R >> >> /Contents ${4 + 3 * i} 0 R >>`);
    obj(4 + 3 * i, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    offsets[5 + 3 * i] = offset;
    push(`${5 + 3 * i} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${s.w} /Height ${s.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${s.jpeg.length} >>\nstream\n`);
    push(s.jpeg);
    push('\nendstream\nendobj\n');
  });

  const count = 2 + 3 * shots.length;
  const xref = offset;
  push(`xref\n0 ${count + 1}\n0000000000 65535 f \n`);
  for (let n = 1; n <= count; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${count + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

export async function exportLetterPdf(letter) {
  const shots = [];
  for (let i = 0; i < getPages(letter).length; i++) shots.push(await capturePage(letter, i));
  return buildPdf(shots);
}

export const pdfName = (letter) => {
  const slug = (letter.to || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? `love-letter-for-${slug}.pdf` : 'love-letter.pdf';
};

export async function savePdf(blob, filename) {
  // Inside the Claude preview, downloads go through the host; on a normal site use a plain link.
  const host = window.claude?.use ? await window.claude.use('downloads') : null;
  if (host) { await host.save({ filename, data: blob }); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
