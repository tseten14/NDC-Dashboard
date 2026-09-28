/**
 * Formats inventory exercise values, labels, and status details consistently across the review workflow.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { downloadFile } from './inventory-workspace';
export const seriesColors = { collected: '#a4643b', a: '#268577', b: '#527fa6', output: '#268577' };
export const number = (value: number | null | undefined, digits = 2) => value == null ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });

/** Export the plotted SVG with its source legend and exercise context. */
export function downloadChart(containerId: string, title: string, legend: { name: string; color: string }[], filename = 'inventory-comparison.svg') {
  const source = document.getElementById(containerId)?.querySelector<SVGSVGElement>('svg.recharts-surface');
  if (!source) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const width = source.width.baseVal.value;
  const height = source.height.baseVal.value;
  svg.setAttribute('xmlns', ns); svg.setAttribute('width', String(width)); svg.setAttribute('height', String(height + 90));
  const bg = document.createElementNS(ns, 'rect'); bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', getComputedStyle(source.closest('section')!).backgroundColor); svg.append(bg);
  function label(text: string, x: number, y: number, color: string, size = 13) {
    const element = document.createElementNS(ns, 'text'); element.textContent = text; element.setAttribute('x', String(x)); element.setAttribute('y', String(y)); element.setAttribute('fill', color); element.setAttribute('font-family', 'sans-serif'); element.setAttribute('font-size', String(size)); svg.append(element);
  }
  label(title, 16, 24, getComputedStyle(source).color, 14);
  const chart = source.cloneNode(true) as SVGSVGElement;
  const originals = source.querySelectorAll('*');
  chart.querySelectorAll('*').forEach((element, i) => {
    const style = getComputedStyle(originals[i]);
    element.setAttribute('fill', style.fill); element.setAttribute('stroke', style.stroke);
  });
  chart.setAttribute('y', '36'); chart.style.color = getComputedStyle(source).color; svg.append(chart);
  legend.forEach((s, i) => label(s.name, 16, height + 48 + i * 16, s.color, 11));
  downloadFile(filename, new XMLSerializer().serializeToString(svg), 'image/svg+xml');
}
