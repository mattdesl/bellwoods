import { array, noise, vec3 } from '../util';
import { clamp, clamp01, lerp, smoothstep } from '../math';
import seedRandom from '../seed-random';

export default function Terrain (camera, audio) {
  // const totalTiles = 100;
  // const worldSize = 20;
  // const drawnTiles = 15;
  // const visionRadius = 3;

  const worldSize = 30;
  let density;
  let totalTiles;
  const drawnTiles = 19;
  const visionSmoothness = 0.75;

  const touchFriction = 0.905;
  const touchMin = 0.05;
  const touchMinSq = touchMin * touchMin;
  const touchScale = 0.035;
  const touchStrength = 1;
  const force = [ 0, 0, 0 ];
  const zero = [ 0, 0, 0 ];
  const tmp01 = [0, 0];
  const maxTouchable = 20;
  const touchThreshold = 0.5;
  const touchThresholdSq = touchThreshold * touchThreshold;
  const touchedPool = array(maxTouchable).map(() => {
    return {
      _MIN_speed: 0,
      _MIN_index: -1,
      _MIN_velocity: [ 0, 0, 0 ],
      _MIN_active: false
    };
  });

  const pool = array(drawnTiles * drawnTiles).map(i => {
    const x = Math.floor(i % drawnTiles);
    const y = Math.floor(i / drawnTiles);
    return {
      velocity: [ 0, 0, 0 ],
      random: seedRandom(0),
      position: [ 0, 0, 0 ],
      head: [ 0, 0, 0 ],
      headProjected: [ 0, 0, 0, 0 ],
      ground: [ 0, 0, 0 ],
      tileIndex: -1,
      drawnTileIndex: i,
      inView: false,
      state: 0,
      active: false,
      brightness: 0,
      drawX: x,
      drawY: y,
      hash: 0,
      x: -1,
      y: -1,
      inside: false
    };
  });

  let paramRandom;
  let lastHitIndex = -1;
  const params = {};

  return {
    worldSize,
    reset,
    pool,
    hitTile: -1,
    _MIN_getWorldPosition (offset, out = []) {
      return this._MIN_parametric(
        offset[0] * (worldSize / 2),
        offset[1] * (worldSize / 2),
        out
      );
    },
    _MIN_clampToEdge (position) {
      const dim = worldSize / 2;
      position[0] = clamp(position[0], -dim, dim);
      position[2] = clamp(position[2], -dim, dim);
      return position;
    },
    getXZWorldPosition (offset, out = []) {
      // avoid performance hit of a raycast here... :)
      out[0] = offset[0] * (worldSize / 2);
      out[1] = 0;
      out[2] = offset[1] * (worldSize / 2);
      return out;
    },
    // getPositionOnFloor (position) {
    //   const y = this.raycast(position[0], position[2]);
    //   return [ position[0], y + position[1], position[2] ];
    // },
    _MIN_raycast (nx, ny) {
      const freq = params.frequency;
      // const freq = 0.3;
      nx *= freq;
      ny *= freq;
      // return (Math.sin(12 * new THREE.Vector2(nx, ny).length()) * 0.5 + 0.5);
      let e = (1.00 * _MIN_noise01(1 * nx, 1 * ny) +
          0.50 * _MIN_noise01(2 * nx, 2 * ny) +
          0.25 * _MIN_noise01(4 * nx, 4 * ny) +
          0.13 * _MIN_noise01(8 * nx, 8 * ny) +
          0.06 * _MIN_noise01(16 * nx, 16 * ny) +
          0.03 * _MIN_noise01(32 * nx, 32 * ny));
      e /= (1.00 + 0.50 + 0.25 + 0.13 + 0.06 + 0.03);
      e = Math.pow(e, params.exp);
      e = Math.max(e, 0);
      e *= 2;
      // const len = tmpVec2.set(nx, ny).length() / maxRadius;
      return e * params.yscale;
    },
    _MIN_parametric (x, z, out = []) {
      const y = this._MIN_raycast(x, z);
      out[0] = x;
      out[1] = y;
      out[2] = z;
      return out;
    },
    mesh (origin, characterPosition, elapsed, dt, transitionValue) {
      const drawMid = (drawnTiles - 1) / 2;
      const visionRadius = drawnTiles / density * 0.5;

      for (let i = 0; i < touchedPool.length; i++) {
        const item = touchedPool[i];
        if (item._MIN_active) {
          vec3.scale(item._MIN_velocity, item._MIN_velocity, touchFriction);
          const len2Sq = item._MIN_velocity[0] * item._MIN_velocity[0] + item._MIN_velocity[2] * item._MIN_velocity[2];
          if (len2Sq <= touchMinSq) {
            item._MIN_active = false;
          }
        }
      }

      _MIN_offsetToCoordinate(origin, tmp01);
      let offsetXTile = tmp01[0];
      let offsetYTile = tmp01[1];
      offsetXTile = Math.floor(offsetXTile);
      offsetYTile = Math.floor(offsetYTile);
      let closestHitIndex = -1;
      let closestDistSq = Infinity;
      for (let y = 0; y < drawnTiles; y++) {
        for (let x = 0; x < drawnTiles; x++) {
          // extend outward by "draw tiles" amount either side
          const S = (x - drawMid);
          const T = (y - drawMid);

          let ix = (offsetXTile + S);
          let iy = (offsetYTile + T);
          // let ix = Math.floor(offsetXTile + S);
          // let iy = Math.floor(offsetYTile + T);

          const drawnTileIndex = toIndex(x, y, drawnTiles);
          const tileIndex = toIndex(~~ix, ~~iy, totalTiles);
          const tile = pool[drawnTileIndex];
          // get index of tile in entire grid and then UV
          const u = (ix) / (totalTiles - 1);
          const v = (iy) / (totalTiles - 1);

          let px = (u * 2 - 1) * (worldSize / 2);
          let pz = (v * 2 - 1) * (worldSize / 2);

          // compute mesh
          this._MIN_parametric(px, pz, tile.position);
          // tile.position[1] *= params.yscale;
          const rt = tileIndex / (totalTiles * totalTiles);
          tile.random.set(rt);
          tile.hash = tile.random.next();
          tile.inside = u >= 0 && u <= 1 && v >= 0 && v <= 1;

          const grassHeight = transitionValue;

          vec3.copy(force, zero);
          if (tile.inside) {
            const n = tile.hash//noise2D(tile.position[0], tile.position[1]);
            let angle = n * Math.PI * 2;
            const scatter = 0.1;
            // const scatter = tile.random.gauss() * 0.1;
            const k = tile.random.next();
            const r = scatter * Math.sqrt(k);
            let ux = Math.cos(angle);
            let uy = Math.sin(angle);
            tile.position[0] += ux * r;
            tile.position[2] += uy * r;
            this._MIN_clampToEdge(tile.position);

            // angle += 2 * elapsed;
            // ux = Math.cos(angle);
            // uy = Math.sin(angle);

            const windSpeed = 1.5;
            const windStrength = grassHeight * tile.random.next() * tile.position[1];
            const freq = 2;
            force[0] = Math.cos(elapsed * windSpeed + u * ux * freq) * windStrength;
            force[1] = Math.sin(elapsed * windSpeed + u * uy * freq) * windStrength;
          }

          vec3.copy(tile.head, tile.position);

          vec3.copy(tile.ground, tile.position);
          tile.ground[1] = 0;

          if (tile.inside) {
            vec3._MIN_scaleAndAdd(tile.head, tile.position, force, 0.1);
          }

          tile.head[1] *= grassHeight;

          // 'ruffle' some nearby plants
          let dx = tile.head[0] - characterPosition[0];
          let dy = tile.head[1] - characterPosition[1];
          let dz = tile.head[2] - characterPosition[2];
          let distSq = (dx * dx + dy * dy + dz * dz);
          let dist;

          const touchTile = null;//findCached(touchedPool, tileIndex);
          const isHit = distSq <= touchThresholdSq;
          const isCloseHit = isHit;
          if (isCloseHit && distSq < closestDistSq) {
            closestDistSq = distSq;
            closestHitIndex = tileIndex;
          }
          if (touchTile) {
            // a tile is free from the pool OR it's already active
            if (isHit) {
              // we are within touchable frame
              if (!touchTile._MIN_active) {
                // tile is not yet activated
                touchTile._MIN_velocity[0] = touchTile._MIN_velocity[1] = touchTile._MIN_velocity[2] = 0;
                touchTile._MIN_active = true;
                touchTile._MIN_index = tileIndex;
              }
              if (touchTile._MIN_index === tileIndex) {
                // dist = Math.sqrt(dx * dx + dz * dz);
                // let d = Math.min(1, Math.max(0, dist / touchThreshold));
                // normalize vector
                // if (dist !== 0) {
                //   dx /= dist;
                //   dz /= dist;
                // }
                touchTile._MIN_velocity[0] += dx * touchStrength;
                touchTile._MIN_velocity[1] += dy * touchStrength;
                touchTile._MIN_velocity[2] += dz * touchStrength;
              }
            }
            
            if (touchTile._MIN_index === tileIndex) {
              vec3._MIN_scaleAndAdd(tile.head, tile.head, touchTile._MIN_velocity, touchScale);
            }
          }

          // let dx, dz, dist;
          dx = tile.position[0] - camera.target[0];
          dz = tile.position[2] - camera.target[2];
          dist = Math.sqrt(dx * dx + dz * dz);
          // const visionOffset = hard ? 0 : -0.5 * tile.random.next();
          // const visionOffset = 0;
          // const visionOffset = hard ? 0 : -Math.abs(tile.random.gauss() * 0.1);
          dist += Math.abs(tile.random.gauss()) * params.sparse;
          let d = clamp01(dist / visionRadius);
          d = smoothstep(visionSmoothness, 1, d);
          tile.active = d < 0.925;
          tile.state = 1 - clamp01(d);
          tile.alpha = tile.random.next();
          tile.tileIndex = tileIndex;

          const rSize = 0.1 + Math.abs(tile.random.gauss()) * 0.5;
          tile.radius = rSize * lerp(0.25, 4, tile.state);
          tile.hasFlower = tile.random.next() > params.hasFlower;
          camera.project(tile.head, tile.headProjected);
          // vec3.copy(tile.velocity, ZERO);
        }
      }
      let hitTile = -1;
      if (closestHitIndex !== lastHitIndex) {
        if (closestHitIndex !== -1) hitTile = closestHitIndex;
        lastHitIndex = closestHitIndex;
      }
      this.hitTile = hitTile;
    }
  };

  function findCached (pool, index) {
    let firstInactive = null;
    for (let i = 0; i < pool.length; i++) {
      const item = pool[i];
      if (item._MIN_active && item._MIN_index === index) return item;
      if (!item._MIN_active) firstInactive = item;
    }
    return firstInactive;
  }

  function toIndex (x, y, xCount) {
    return ~~(x + (y * xCount));
  }

  function _MIN_noise01 (x, y) {
    return noise._MIN_noise2D(x, y) * 0.5 + 0.5;
  }

  function reset (seed, world) {
    if (!paramRandom) paramRandom = seedRandom(seed);
    else paramRandom.set(seed);

    const flat = world.flowers && paramRandom.next() > 0.9;
    // if (flat) achievements.unlock('flatlands');
    params.frequency = flat ? 0.01 : paramRandom.range(0.25, 0.75);
    params.exp = paramRandom.range(1, 4);
    params.height = paramRandom.range(0.05, 2);
    params.hasFlower = world.flowers ? paramRandom.range(0.1, 0.2) : 1;
    params.yscale = flat ? 0.25 : 1;
    // if (!world.flowers) achievements.unlock('grasslands');
    // params.hasFlower = paramRandom.next() > 0.1 ? paramRandom.range(0.1, 0.2) : 1;
    density = paramRandom.range(7.5, 8);
    totalTiles = ~~(worldSize * density);
    params.sparse = paramRandom.range(0.05, 0.1);
  }

  function _MIN_offsetToCoordinate (offset, out = []) {
    const u = offset[0] * 0.5 + 0.5;
    const v = offset[1] * 0.5 + 0.5;
    const x = u * (totalTiles - 1);
    const y = v * (totalTiles - 1);
    out[0] = x;
    out[1] = y;
    return out;
  }
}
