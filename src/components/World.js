import { mod, lerp } from '../math';
import { hsl } from '../color';
import seedRandom, { MAX } from '../seed-random';

let hasHitEmpty;

export default function World (worlds, id = 0, first) {
  id = ~~(id) % MAX;
  const seed = id / MAX;
  const random = seedRandom(seed);
  const hue = random.next();
  const pS = random.range() > 0.5 ? random.range(0.25, 0.5) : 0.5;
  const lineLight = 0.5;

  const hueType = Math.floor(random.range(0, 4));
  const analogComplement = random.range(0.1, 0.3);
  const dark = random.next() > 0.9;
  const chroma = random.next() > 0.99 ? 0 : 1;

  let singleColor = random.next() > 0.9;
  // white or black tulip
  const accentDir = random.next() > 0.5 ? 1 : -1;
  // whether to accent
  const accent = random.next() > 0.8 ? accentDir : 0;

  const light = 0.75;
  const pL1 = random.range(light * 0.45, light);
  const pL2 = random.range(light * 0.45, light);

  let hue2, hue3;
  if (hueType === 0) { // same hue
    hue2 = hue3 = hue;
  } else if (hueType === 1) { // analogous
    hue2 = hue - analogComplement;
    hue3 = hue + analogComplement;
  } else if (hueType === 2) { // complementary
    hue2 = hue + 0.5;
    hue3 = hue - 0.5;
  } else if (hueType === 3) { // triadic
    hue2 = hue + (1 / 3);
    hue3 = hue - (1 / 3);
    singleColor = true; // not a big fan of 3-color triad, looks too messy
  }

  let bgSat = (dark ? random.range(0.0, 0.3) : 0.65) * chroma;
  let bgLight = dark ? (random.range(0.2, 0.3)) : 0.75;

  let offset = first || [
    (random.next() * 2 - 1) * 0.5,
    (random.next() * 2 - 1) * 0.5
  ];

  let empty = worlds.depth >= 15 && !hasHitEmpty && random.next() > 0.1;
  let flowers = random.next() > 0.2;

  if (empty) {
    flowers = false;
    hasHitEmpty = true;
    bgLight = 0.0;
  }

  const maxChildren = 3;
  let colors = [ hsl(hue2, pS * chroma, pL1), hsl(hue3, pS * chroma, pL2) ];
  if (accent) {
    colors = [ hsl(0, 0, accent > 0 ? 1 : 0) ];
  } else if (singleColor) {
    colors = [ colors[Math.floor(random.next() * colors.length)] ];
  }

  let lines = hsl(hue + 0.0, pS * chroma, lineLight);
  let background = hsl(hue, bgSat, bgLight);
  const blackAndWhite = worlds.explored >= 5 && random.next() < 0.025;
  const night = blackAndWhite && random.next() < 0.5;
  let AB = ['white', 'black'];
  let user = AB[0];
  if (blackAndWhite) {
    if (night) AB.reverse();
    lines = user = AB[1];
    background = AB[0];
    colors = [ AB[1] ];
  }

  if (first) {
    flowers = true;
    empty = false;
    user = 'white';
    colors = [ '#50a0c5', '#b5d3f1' ];
    lines = '#c3776d';
    background = '#e29990';
  }

  return {
    first,
    flowers,
    empty,
    hash: random.next(),
    _MIN_audioRandom: random.next() > 0.5,
    _MIN_audioVariance: random.next(),
    _MIN_audioPitch: random.next(),
    user,
    offset,
    id,
    seed,
    depth: 0,
    random,
    _MIN_numChildren: Math.floor(1 + random.next() * maxChildren),
    background,
    colors,
    lines,
    petal (hash) {
      const idx = mod(~~(hash * this.colors.length), this.colors.length);
      return this.colors[idx];
    }
  };
}

// function hsl2rgb (h, s, l) {
//   var t1, t2, t3, rgb, val;
//   if (s === 0) {
//     val = l * 255;
//     return [ val, val, val ];
//   } else {
//     if (l < 0.5) {
//       t2 = l * (1 + s);
//     } else {
//       t2 = l + s - l * s;
//     }
//     t1 = 2 * l - t2;

//     rgb = [0, 0, 0];
//     for (var i = 0; i < 3; i++) {
//       t3 = h + 1 / 3 * -(i - 1);
//       if (t3 < 0) {
//         t3++;
//       } else if (t3 > 1) {
//         t3--;
//       }

//       if (6 * t3 < 1) {
//         val = t1 + (t2 - t1) * 6 * t3;
//       } else if (2 * t3 < 1) {
//         val = t2;
//       } else if (3 * t3 < 2) {
//         val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
//       } else {
//         val = t1;
//       }

//       rgb[i] = val * 255;
//     }
//     return rgb;
//   }
// }
