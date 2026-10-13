// Bake the fog's turbulence/blur once, rather than filtering five layers every frame.
// Run from the repository root after changing these texture definitions.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

await mkdir('public/portraits', { recursive: true });
const filter = `<filter id="fog" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".014 .022" numOctaves="3" seed="8" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="3"/></filter>`;
const gradient = (id, stops) => `<radialGradient id="${id}">${stops.map(([offset,color,opacity=1]) => `<stop offset="${offset}%" stop-color="${color}" stop-opacity="${opacity}"/>`).join('')}</radialGradient>`;
for (const [name, content] of [
  ['fog-cloud', `${gradient('a', [[0,'#fff'],[18,'#fff'],[38,'#f1f3f6'],[66,'#c6cdd8',.85],[100,'#c6cdd8',0]])}${gradient('b', [[0,'#fff'],[15,'#fff'],[40,'#eef0f5'],[67,'#c1c8d5',.8],[100,'#c1c8d5',0]])}</defs><g filter="url(#fog)"><ellipse cx="109" cy="115" rx="147" ry="139" fill="url(#a)"/><ellipse cx="218" cy="205" rx="160" ry="149" fill="url(#b)"/></g>`],
  ['fog-wisp', `${gradient('a', [[0,'#fff',.85],[40,'#f2f4fa',.5],[100,'#f2f4fa',0]])}${gradient('b', [[0,'#fff',.75],[100,'#fff',0]])}</defs><g filter="url(#fog)"><ellipse cx="144" cy="144" rx="208" ry="64" fill="url(#a)"/><ellipse cx="192" cy="211" rx="160" ry="51" fill="url(#b)"/></g>`],
]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><defs>${filter}${content}</svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 86, alphaQuality: 90 }).toFile(`public/portraits/${name}.webp`);
}
