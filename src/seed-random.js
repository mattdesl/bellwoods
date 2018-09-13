// Alea PRNG adapted from
// https://github.com/davidbau/seedrandom

export const MAX = 2147483647;

export default (t = 0.5) => {
  let prng = Alea();
  set(t);

  return {
    next () {
      return prng.next();
    },
    range (min, max) {
      return this.next() * (max - min) + min;
    },
    gauss () {
      return Math.sqrt(-2.0 * Math.log(this.next())) * Math.cos(2.0 * Math.PI * this.next());
    },
    shuffle (arr, ret) {
      var rand;
      var tmp;
      var len = arr.length;
      while (len) {
        rand = Math.floor(this.next() * len--);
        tmp = ret[len];
        ret[len] = ret[rand];
        ret[rand] = tmp;
      }
      return ret;
    },
    set
  };

  function set (newT) {
    newT = newT % 1;
    prng.set(~~(newT * MAX) % MAX);
  }
};

// From http://baagoe.com/en/RandomMusings/javascript/
// And https://github.com/coverslide/node-alea/blob/master/alea.js
// Modified by mattdesl

function Alea () {
  var s0, s1, s2, c;
  var masher = 0xefc8249d;
  var S0 = mash(' ');
  var S1 = mash(' ');
  var S2 = mash(' ');
  var initial = masher;

  return {
    next () {
      var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
      s0 = s1;
      s1 = s2;
      return s2 = t - (c = t | 0);
    },
    set (newSeed) {
      // Johannes Baagøe <baagoe@baagoe.com>, 2010
      const newSeedStr = String(newSeed);
      // const newSeedStr = newSeed+'';
      s0 = s1 = s2 = 0;
      c = 1;
      masher = initial;
      s0 = S0 - mash(newSeedStr);
      if (s0 < 0) {
        s0 += 1;
      }
      s1 = S1 - mash(newSeedStr);
      if (s1 < 0) {
        s1 += 1;
      }
      s2 = S2 - mash(newSeedStr);
      if (s2 < 0) {
        s2 += 1;
      }
    }
  };

  function mash (data) {
    for (var i = 0; i < data.length; i++) {
      // masher += (+data.charAt(i)) + 48; // assume all number input
      masher += data.charCodeAt(i);
      var h = 0.02519603282416938 * masher;
      masher = h >>> 0;
      h -= masher;
      h *= masher;
      masher = h >>> 0;
      h -= masher;
      masher += h * 0x100000000; // 2^32
    }
    return (masher >>> 0) * 2.3283064365386963e-10; // 2^-32
  }
}
