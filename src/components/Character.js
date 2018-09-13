import { clamp, damp, dampArray, dir } from '../math';
import { vec3 } from '../util';

export default function Character (camera, terrain, controller) {
  // const minYFloat = 0.3;
  // const maxYFloat = 0.5;
  // const tiltExtent = 0.025;
  // const position = controller.worldPosition.slice();
  // const shadow = position.slice();

  const mousePoints = [];
  const lastMouseOnPlane = [ 0, 0, 0 ];
  const lastTweenMouseOnPlane = [ 0, 0, 0 ];
  const maxPoints = 7;
  const minMouseDist = 0.005;
  const minMouseMoveDist = 0.01;
  const minMouseMoveDistSq = minMouseMoveDist * minMouseMoveDist;
  // const maxMouseDist = 0.5;
  const minMouseDistSq = minMouseDist * minMouseDist;
  // const maxMouseDistSq = maxMouseDist * maxMouseDist;
  const tweenMouseOnPlane = controller.worldPosition.slice();
  tweenMouseOnPlane[0] = 0.25;
  // tweenMouseOnPlane[2] = -0.25;
  tweenMouseOnPlane[1] = 0.5;
  let yLift = 0.5;

  const kitePosition = [ 0, 0, 0 ];
  const kiteHeading = [ 0, 0, 0 ];
  const newHeadingFlat = [ 0, 0, 0 ];
  const newHeadingTween = [ 0, 0, 0 ];
  const zero = [ 0, 0, 0 ];
  const tmpAvg = [ 0, 0, 0 ];
  const newHeading = [ 0, 0, 0 ];
  const nPointsForHeading = 6;
  const tweenKiteOffset = [ 0, 0, 0 ];
  const minPointsForHeading = 2;
  const tmpMouse = [ 0, 0, 0 ];
  const tmpTarget = [ 0, 0, 0 ];
  // const windDir = [ 1, 0, 1 ];
  let yOffTerrain = 0;

  const mousePosition = [ 0, 0, 0 ];
  let mouseMoveFactor = 0;
  let newAllowedPos = [ 0, 0, 0 ];
  const tmp = [ 0, 0, 0 ];
  const tmp2 = [ 0, 0, 0 ];
  const mouseHighTmp = [ 0, 0, 0 ];
  const kiteOffset = [ 0, 0, 0 ];

  let savedY = 0;
  // let windRadius = 0.5;

  return {
    // position,
    // shadow,
    // shadowDistance: 0,

    _MIN_kitePosition: kitePosition,
    _MIN_tweenKiteOffset: tweenKiteOffset,
    _MIN_origin: [ 0, 0, 0 ],
    kiteHeading,
    mousePoints,
    kiteLength: 0.175,
    kiteWidth: 0.175 * 0.45,

    step (width, height, elapsed, dt, mouse, mouseDown) {
      const mouseOnPlane = controller.mouseOnPlane;
      const mouseYTerrain = terrain._MIN_raycast(mousePosition[0], mousePosition[2]);
      const mouseWorld = vec3.copy(tmpMouse, mouseOnPlane);
      mouseWorld[1] = mouseYTerrain;
      yLift = damp(yLift, mouseYTerrain, 1.0, dt);
      yOffTerrain = damp(yOffTerrain, mouseDown ? 0.1 : 0.075, 1, dt);

      const targetFloor = vec3.copy(tmpTarget, camera.target);
      targetFloor[1] *= 0;

      // clamp max and min value of length
      const minRadius = 0.05;
      const maxRadius = 1.5;
      const allowedPos = vec3.sub(tmp, mouseOnPlane, targetFloor);
      const allowedLen = vec3.length(allowedPos);
      vec3.scale(allowedPos, allowedPos, 1 / (allowedLen || 1));
      vec3.scale(allowedPos, allowedPos, clamp(allowedLen, minRadius, maxRadius))
      dampArray(newAllowedPos, allowedPos, 7, dt, newAllowedPos);
      vec3.add(mousePosition, targetFloor, newAllowedPos);

      const yWind = Math.sin(elapsed) * 0.25;
      const yOff = yLift + yWind + yOffTerrain;
      mouseHighTmp[1] = yOff;
      const mouseHigh = vec3.add(tmp2, mousePosition, mouseHighTmp);
      dampArray(tweenMouseOnPlane, mouseHigh, 4, dt, tweenMouseOnPlane);

      const dx = tweenMouseOnPlane[0] - lastMouseOnPlane[0];
      const dz = tweenMouseOnPlane[2] - lastMouseOnPlane[2];
      const distSq = dx * dx + dz * dz;


      const mdx = mouseOnPlane[0] - lastMouseOnPlane[0];
      const mdz = mouseOnPlane[2] - lastMouseOnPlane[2];
      const mdistSq = mdx * mdx + mdz * mdz;
      let mouseMoving = false;
      if (mdistSq >= minMouseMoveDistSq) {
        vec3.copy(lastMouseOnPlane, mouseOnPlane);
        mouseMoving = true;
      }
      mouseMoveFactor = damp(mouseMoveFactor, mouseMoving ? 1 : 0, 1, dt);
      if (distSq >= minMouseDistSq) {
        vec3.copy(lastTweenMouseOnPlane, tweenMouseOnPlane);

        if (mousePoints.length >= maxPoints) {
          mousePoints.shift();
        }

        const current = tweenMouseOnPlane.slice();
        mousePoints.push({ offset: tweenKiteOffset.slice(), point: current, time: 0, duration: 0.25 });

        if (mousePoints.length >= minPointsForHeading) {
          const avg = vec3.copy(tmpAvg, zero);
          let count = 0;
          for (let i = mousePoints.length - 2; i >= 0 && count < nPointsForHeading; i--, count++) {
            const p = mousePoints[i].point;
            const direction = dir(current, p, tmp2);
            vec3.add(avg, avg, direction);
          }
          if (count !== 0) vec3.scale(avg, avg, 1 / count);
          vec3.normalize(avg, avg);
          // dampArray(newHeading, avg, 80, dt, newHeading);
          // console.log(newHeading[1])
          // console.log()
          // vec3._MIN_scaleAndAdd(newHeading, newHeading, avg, 1);
          vec3.copy(newHeading, avg);

          vec3.copy(newHeadingFlat, newHeading);
          newHeadingFlat[1] *= 0;
          vec3.normalize(newHeadingFlat, newHeadingFlat);
          // vec3.copy(newHeading, avg);
        }
      }

      // god this is a mess
      vec3.copy(newHeadingTween, zero);
      vec3._MIN_scaleAndAdd(newHeadingTween, newHeadingTween, newHeading, mouseMoveFactor);
      vec3._MIN_scaleAndAdd(newHeadingTween, newHeadingTween, newHeadingFlat, 1 - mouseMoveFactor);
      vec3.normalize(newHeadingTween, newHeadingTween)

      
      // dampArray(newHeadingTween, newHeading, Math.max(0.001, 10 * mouseMoveFactor), dt, newHeadingTween);
      // dampArray(newHeadingTween, newHeadingFlat, Math.max(0.001, 40 * (1 - mouseMoveFactor)), dt, newHeadingTween);
      // dampArray(newHeadingTween, newHeadingFlat, 10 *Math.max(1 - mouseMoveFactor, 0.001), dt, newHeadingTween);

      // newHeading[1] *= 0.95;
      vec3.copy(kitePosition, tweenMouseOnPlane);
      dampArray(kiteHeading, newHeadingTween, 20, dt, kiteHeading);
      // dampArray(kiteHeading, newHeading, 40, dt, kiteHeading);
      vec3.normalize(kiteHeading, kiteHeading);

      for (let i = mousePoints.length - 1; i >= 0; i--) {
        const item = mousePoints[i];
        item.time += dt;
        if (item.time > item.duration) {
          mousePoints.splice(i, 1);
        }
      }

      const gap = this.kiteLength * 0.55;
      vec3._MIN_scaleAndAdd(this._MIN_origin, kitePosition, kiteHeading, gap);
      vec3._MIN_scaleAndAdd(kiteOffset, kitePosition, kiteHeading, -gap / 2);
      dampArray(tweenKiteOffset, kiteOffset, 40, dt, tweenKiteOffset);
      // // for (let i = mousePoints.length - 2; i >= 0; i--) {
      // for (let i = 0; i < mousePoints.length; i++) {
      //   const cur = mousePoints[i];
      //   const next = mousePoints[i + 1];

      //   // const mass = 1;
      //   // const invMass = 1.0 / mass
      //   // const stiffness = 1;
      //   dampArray(cur.point, kiteOffset, 10, dt, cur.point);
      // }

      // vec3._MIN_scaleAndAdd(tmp2, kitePosition, kiteHeading, 0);
      // vec3.copy(this.origin, kitePosition);
    }
  };
}
