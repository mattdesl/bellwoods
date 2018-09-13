import seedRandom from './seed-random';

// Adapted from
// https://github.com/jwagner/simplex-noise.js/blob/master/simplex-noise.js
export default function SimplexNoise () {
  var F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  var G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
  var G22 = 2.0 * G2;
  const initialSimplexSeed = Math.random();

  var table = new Uint8Array(256);
  var perm = new Uint8Array(512);
  var permMod12 = new Uint8Array(512);
  var grad3 = new Float32Array([
    1, 1, 0,
    -1, 1, 0,
    1, -1, 0,

    -1, -1, 0,
    1, 0, 1,
    -1, 0, 1,

    1, 0, -1,
    -1, 0, -1,
    0, 1, 1,

    0, -1, 1,
    0, 1, -1,
    0, -1, -1
  ]);

  _MIN_reset(initialSimplexSeed);

  return {
    _MIN_reset,
    _MIN_noise2D (xin, yin) {
      var n0 = 0; // Noise contributions from the three corners
      var n1 = 0;
      var n2 = 0;
      // Skew the input space to determine which simplex cell we're in
      var s = (xin + yin) * F2; // Hairy factor for 2D
      var i = Math.floor(xin + s);
      var j = Math.floor(yin + s);
      var t = (i + j) * G2;
      var X0 = i - t; // Unskew the cell origin back to (x,y) space
      var Y0 = j - t;
      var x0 = xin - X0; // The x,y distances from the cell origin
      var y0 = yin - Y0;
      // For the 2D case, the simplex shape is an equilateral triangle.
      // Determine which simplex we are in.
      var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
      if (x0 > y0) {
        i1 = 1;
        j1 = 0;
      } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
      else {
        i1 = 0;
        j1 = 1;
      } // upper triangle, YX order: (0,0)->(0,1)->(1,1)
      // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
      // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
      // c = (3-sqrt(3))/6
      var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
      var y1 = y0 - j1 + G2;
      var x2 = x0 - 1.0 + G22; // Offsets for last corner in (x,y) unskewed coords
      var y2 = y0 - 1.0 + G22;
      // Work out the hashed gradient indices of the three simplex corners
      var ii = i & 255;
      var jj = j & 255;
      // Calculate the contribution from the three corners
      var t0 = 0.5 - x0 * x0 - y0 * y0;
      var t1 = 0.5 - x1 * x1 - y1 * y1;
      var t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t0 >= 0) {
        var gi0 = permMod12[ii + perm[jj]];
        // t0 *= t0;
        n0 = t0 * t0 * t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0); // (x,y) of grad3 used for 2D gradient
      }
      if (t1 >= 0) {
        var gi1 = permMod12[ii + i1 + perm[jj + j1]];
        // t1 *= t1;
        n1 = t1 * t1 * t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
      }
      if (t2 >= 0) {
        var gi2 = permMod12[ii + 1 + perm[jj + 1]];
        // t2 *= t2;
        n2 = t2 * t2 * t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
      }
      // Add contributions from each corner to get the final noise value.
      // The result is scaled to return values in the interval [-1,1].
      return 70.0 * (n0 + n1 + n2);
    }
  };

  function _MIN_reset (seed) {
    var seeded = seedRandom(seed);
    _MIN_buildPermutationTable(seeded.next);
    for (var i = 0; i < 512; i++) {
      perm[i] = table[i & 255];
      permMod12[i] = (perm[i] % 12) * 3;
    }
  }

  function _MIN_buildPermutationTable (random) {
    var i;
    for (i = 0; i < 256; i++) {
      table[i] = i;
    }
    for (i = 0; i < 255; i++) {
      var r = i + ~~(random() * (256 - i));
      var aux = table[i];
      table[i] = table[r];
      table[r] = aux;
    }
  }
}
