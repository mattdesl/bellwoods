import { vec3 } from './util';

export function dir (a, b, out = []) {
  return vec3.normalize(out, vec3.sub(out, a, b));
}

export function ease (t) {
  return Math.sqrt(1 - ( --t * t ))
}

export function clamp (value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function clamp01 (v) {
  return clamp(v, 0, 1);
}

export function mod (a, b) {
  return ((a % b) + b) % b;
}

export function lerp (min, max, t) {
  return min * (1 - t) + max * t;
}

export function smoothstep (min, max, value) {
  var x = clamp01((value - min) / (max - min));
  return x * x * (3 - 2 * x);
}

export function damp (a, b, lambda, dt) {
  return lerp(a, b, 1 - Math.exp(-lambda * dt));
}

export function dampArray (a, b, lambda, dt, out = []) {
  for (let i = 0; i < a.length; i++) {
    out[i] = damp(a[i], b[i], lambda, dt);
  }
  return out;
}
