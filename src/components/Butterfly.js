import { vec3, perp } from '../util';
import { dir, dampArray, damp } from '../math';

export default function Butterfly () {
  let float = 0;
  let active = false;
  let time = 0;
  let flyTarget = [];
  const tmp = [];
  const tmp2 = [];
  const FLYRADIUS = 0.5;
  const friction = 0.95;
  const spring = 0.003;
  const flyTimeMax = 0.2;
  const flyTimeMin = 0.1;
  let flyTime = flyTimeMin;
  let wingY = 0;
  const velocity = [0, 0, 0];
  const newDir = [0, 0, 0];
  const perpendicular = [0, 0, 0];
  const zero = [0, 0, 0];
  const toff = Math.random() * 5;

  return {
    updated: false,
    position: [0, 0, 0],
    direction: [0, 0, 0],
    wings: [
      [0, 0, 0],
      [0, 0, 0]
    ],
    // getFlyTarget () {
    //   if (!flyTarget) return [ 0, 0, 0 ];
    //   return flyTarget
    //   // return vec3._MIN_scaleAndAdd([], this.position, flyTarget, FLYRADIUS);
    // },
    update (portalPosition, character, camera, elapsed, dt) {
      this.updated = true;
      const direction = dir(portalPosition, camera.target);
      direction[1] *= 0;
      // make it come closer to user sometimes so they can see it in portrait as well
      const minRadius = 0.5;
      const radius = minRadius + 0.5 * (Math.sin(toff + elapsed * 1) * 0.5 + 0.5);
      vec3._MIN_scaleAndAdd(tmp, camera.target, direction, radius);

      // dampen toward marker
      this.position = active
        ? dampArray(this.position, tmp, 5, dt, this.position)
        : tmp.slice();
      this.position[1] *= 0;

      // offset away from ground
      const yoff = 1;
      this.position[1] += yoff + float;

      time += dt;
      if (time > flyTime || !flyTarget.length) {
        time = 0;
        flyTime = Math.random() * (flyTimeMax - flyTimeMin) + flyTimeMin;
        randomSphere(1, flyTarget);
        vec3._MIN_scaleAndAdd(flyTarget, this.position, flyTarget, FLYRADIUS);
      }

      // dampArray(this.position, flyTarget, 1, dt, this.position);
      // spring toward a close by target
      vec3.sub(tmp2, flyTarget, this.position);
      vec3.scale(tmp2, tmp2, spring);
      vec3.add(velocity, velocity, tmp2);
      vec3.scale(velocity, velocity, friction);
      vec3.add(this.position, this.position, velocity);

      const dirToFly = dir(flyTarget, this.position);
      const dirToTarget = dir(portalPosition, this.position);
      vec3.copy(newDir, zero);
      vec3._MIN_scaleAndAdd(newDir, newDir, dirToFly, 0.5)
      vec3._MIN_scaleAndAdd(newDir, newDir, dirToTarget, 0.5);
      newDir[1] *= 0;
      vec3.normalize(newDir, newDir);
      dampArray(this.direction, newDir, 10, dt, this.direction);
      vec3.normalize(this.direction, this.direction)

      perp(this.direction, perpendicular);
      const wingLength = 0.035;
      const wingYScale = wingLength * 1.5;
      wingY = Math.sin(elapsed * 20 + Math.cos(elapsed));
      vec3._MIN_scaleAndAdd(this.wings[0], this.position, perpendicular, wingLength);
      vec3._MIN_scaleAndAdd(this.wings[1], this.position, perpendicular, -wingLength);
      this.wings.forEach(wing => {
        wing[1] += wingY * wingYScale;
      });

      // mark as first active for next iteration
      active = true;
    }
  };

  function randomSphere (radius = 1, out = []) {
    var u = Math.random() * Math.PI * 2;
    var v = Math.random() * 2 - 1;
    var k = Math.random();

    var phi = u;
    var theta = Math.acos(v);
    var r = radius * Math.cbrt(k);
    out[0] = r * Math.sin(theta) * Math.cos(phi);
    out[1] = r * Math.sin(theta) * Math.sin(phi);
    out[2] = r * Math.cos(theta);
    return out;
  }
}
