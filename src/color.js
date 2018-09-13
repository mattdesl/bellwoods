import { mod } from './math';

export const hsl = (h, s, l) => {
  h = mod(h * 360, 360).toFixed(5);
  s = (s * 100).toFixed(5);
  l = (l * 100).toFixed(5);
  return `hsl(${h}, ${s}%, ${l}%)`;
};
