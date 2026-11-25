/** Paint a window into a PNG using its layout, colors, text, images, and canvases. */

export function captureElement(node) {
  const rect = node.getBoundingClientRect();
  const scale = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(rect.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  paintBox(ctx, node, rect, 0, 0, rect.width, rect.height);
  for (const child of node.querySelectorAll('*')) {
    const box = child.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    if (box.bottom < rect.top || box.top > rect.bottom || box.right < rect.left || box.left > rect.right) continue;
    const x = box.left - rect.left;
    const y = box.top - rect.top;
    paintBox(ctx, child, box, x, y, box.width, box.height);
    const text = [...child.childNodes].filter((item) => item.nodeType === Node.TEXT_NODE).map((item) => item.textContent).join('').replace(/\s+/g, ' ').trim();
    if (text) {
      const style = getComputedStyle(child);
      ctx.fillStyle = style.color || '#111';
      const size = Number.parseFloat(style.fontSize) || 14;
      ctx.font = `${style.fontWeight || 400} ${size}px ${style.fontFamily || 'sans-serif'}`;
      ctx.fillText(text.slice(0, 180), x + 4, y + Math.min(box.height - 2, size + 2));
    }
  }
  return canvas.toDataURL('image/png');
}

function paintBox(ctx, element, box, x, y, w, h) {
  const style = getComputedStyle(element);
  if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(x, y, w, h);
  }
  if (element instanceof HTMLCanvasElement) {
    try { ctx.drawImage(element, x, y, w, h); } catch { /* blank canvas */ }
  }
  if (element instanceof HTMLImageElement && element.complete && element.naturalWidth) {
    try { ctx.drawImage(element, x, y, w, h); } catch { /* undecodable image */ }
  }
}
