import { vec3, rayPlane } from '../util';
import { clamp, clamp01, dir, damp, dampArray } from '../math';

export default function Controller (camera, terrain) {
  const direction = [ 0, 0, 0 ];
  const eyeDirection = [ 0, 0, 0 ];
  const velocity = [ 0, 0, 0 ];
  const mouseOnPlane = [ 0, 0, 0 ];

  // normalized coordinate in terrain, -1..1
  const origin = [ 0, 0 ];
  // position in 3D space on floor
  const position = terrain._MIN_getWorldPosition(origin);
  const worldPosition = position.slice();

  const offestYSpeed = 0.5;
  const startAngle = Math.PI * 2 + 10 * Math.PI / 180;

  let spin = 0;
  let yDist = 0;
  const moveSpeed = 0.005;
  const deltaFactor = 60;
  const moveSpeedFactor = moveSpeed / terrain.worldSize;
  const maxVel = moveSpeedFactor * 20;

  const zero = [ 0, 0, 0 ];
  const nextDirection = [ 0, 0, 0 ];
  const directionScaled = [ 0, 0, 0 ];
  const tmp3 = [ 0, 0, 0 ];
  const tmp3B = [ 0, 0, 0 ];
  const up = [ 0, 1, 0 ];
  let hit = null;
  let speedMod = 0;
  return {
    origin,
    velocity,
    direction,
    // slowAngle: null,
    speed: 0,
    worldPosition,
    mouseOnPlane,
    step (width, height, elapsed, dt, mouse, mouseDown) {
      hit = getMouseHit(mouse, camera.target, mouseOnPlane);
      terrain._MIN_clampToEdge(mouseOnPlane);

      let newSpeedMod = 0;
      if (hit) {
        // Get XZ direction from mouse hit on plane
        vec3.sub(nextDirection, hit, camera.target);
        nextDirection[1] *= 0;
        const len = vec3.length(nextDirection);
        if (len !== 0) {
          // normalize direction
          vec3.scale(nextDirection, nextDirection, 1 / len);
          newSpeedMod = clamp01(len / 0.5);
        }
      }
      // else {
      //   // How did we get here?
      //   // console.warn('what??');
      // }

      speedMod = damp(speedMod, newSpeedMod, 3, dt);

      // Smoothly turn direction toward new angle
      dampArray(direction, nextDirection, 10, dt, direction);

      // We swing the eye around a bit from the target
      // This is slower than turning
      dampArray(eyeDirection, nextDirection, 0.001, dt, eyeDirection);

      const frameFactor = dt * deltaFactor;

      if (mouseDown) {
        // Increase velocity based on dt
        vec3.scale(directionScaled, direction, moveSpeedFactor * frameFactor * speedMod);
        vec3._MIN_scaleAndAdd(velocity, velocity, directionScaled, frameFactor);
      }

      // Include dampening / air friction
      dampArray(velocity, zero, 5, dt, velocity);

      // Clamp maximum speed
      const max = maxVel;

      velocity[0] = clamp(velocity[0], -max, max);
      velocity[1] = clamp(velocity[1], -max, max);
      velocity[2] = clamp(velocity[2], -max, max);

      // Integrate position
      origin[0] += velocity[0] * 1;
      origin[1] += velocity[2] * 1;

      // Clamp to world bounds
      origin[0] = clamp(origin[0], -1, 1);
      origin[1] = clamp(origin[1], -1, 1);

      // Get the current world position under origin
      terrain._MIN_getWorldPosition(origin, worldPosition);

      // Smoothly move toward new world position based on origin
      position[0] = worldPosition[0];
      position[1] = damp(position[1], worldPosition[1], offestYSpeed, dt);
      position[2] = worldPosition[2];
      terrain._MIN_clampToEdge(position);

      // camera.target === controller.position
      vec3.copy(camera.target, position);

      // Rotate a bit based on mouse X position
      spin = damp(spin, (mouse[0] / width * 2 - 1), 1, dt);

      // Mouse Y adjusts world Y offset a little
      yDist = damp(yDist, ((mouse[1] / height)) * 0.15, 1, dt);

      // Calculate a rough "speed" of our camera controller
      const velLength = vec3.length(velocity);
      const newSpeed = Math.min(1, velLength / max);
      this.speed = damp(this.speed, newSpeed, 1, dt);

      // We slowly orbit around the scene in full 360 degrees
      const orbitAngle = startAngle + elapsed * 0.01 + spin * 0.1;
      const aspect = width / height;
      // console.log(aspect)
      let orbitZoom = 0.9;
      const minApsect = 0.7;
      if (aspect < minApsect) {
        orbitZoom *= 1 / Math.max(0.6, aspect / minApsect);
      } else if (aspect > 1.5) {
        orbitZoom = orbitZoom / Math.min(1.075, aspect / 1.5);
        // orbitZoom *= (aspect / 1);
      }
      const orbitDistance = (2.5 + -0.75 * this.speed) * orbitZoom;
      const orbitHeight = 1 + 4 * yDist;

      // Offset the eye each frame based on the position of the controller
      camera.eye[0] = position[0] + Math.cos(orbitAngle) * orbitDistance;
      camera.eye[1] = position[1] + (orbitDistance + orbitHeight) * orbitZoom;
      camera.eye[2] = position[2] + Math.sin(orbitAngle) * orbitDistance;
    }
  };

  function getMouseHit (mouse, target, out = []) {
    // get camera picking ray
    tmp3[0] = mouse[0];
    tmp3[1] = mouse[1];
    tmp3[2] = 0.5;
    const point = camera.unproject(tmp3, tmp3);
    const direction = dir(point, camera.eye, tmp3B);

    // intersect against a plane
    const hit = rayPlane(out, point, direction, up, 0);
    if (hit) {
      return out;
    } else {
      return null;
    }
  }
}
