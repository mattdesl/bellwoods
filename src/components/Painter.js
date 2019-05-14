import { CIRCLE_RADIUS_MOD, LINE_WIDTH_MOD, perp, vec3, array } from '../util';
import { clamp01, ease } from '../math';

export default function Painter (context, camera, worlds) {
  const tmpScreen = [];
  const tmp3 = [];
  var tmps = array(6).map(() => ([]));
  var bpath = [];

  const _MIN_circle = (p, r, isMod = true) => {
    context.beginPath();
    context.arc(p[0], p[1], r * (isMod ? CIRCLE_RADIUS_MOD : 1), 0, Math.PI * 2);
  };

  return {
    _MIN_circle,
    point (point3D, color = 'red', radius = 4) {
      const position = camera.project(point3D, tmpScreen);
      _MIN_circle(position, radius);
      context.fillStyle = color;
      context.fill();
    },
    butterfly (butterfly, color) {
      if (!butterfly.updated) return;
      context.beginPath();
      bpath[0] = butterfly.wings[0];
      bpath[1] = butterfly.position;
      bpath[2] = butterfly.wings[1];
      bpath.forEach(p => {
        p = camera.project(p, tmpScreen);
        context.lineTo(p[0], p[1]);
      });
      context.lineJoin = 'miter';
      context.lineCap = 'square';
      context.strokeStyle = worlds.flowering.user;
      context.lineWidth = 2 * LINE_WIDTH_MOD;
      context.globalAlpha = 1;
      context.stroke();
    },
    portal (xyzPosition, explored, color, radiusPx, transitionValue) {
      let radius = radiusPx * transitionValue;
      if (radius <= 0) return;

      const dx = camera.target[0] - xyzPosition[0];
      const dz = camera.target[2] - xyzPosition[2];
      const distSq = (dx * dx + dz * dz);
      const rangeMin = 1.0;
      const rangeMax = 2;
      const thresholdSq = rangeMax * rangeMax;
      if (distSq > thresholdSq) return;
      context.lineJoin = context.lineCap = 'round';

      const d = ease(1 - clamp01(Math.sqrt(distSq) - rangeMin) / (rangeMax - rangeMin));
      radius *= d;

      const a = camera.project(xyzPosition, tmpScreen);
      const stroke = 2;

      _MIN_circle(a, radius, false);
      context.globalAlpha = 1;
      context.fillStyle = color;
      context.fill();
      context.strokeStyle = worlds.flowering.user;
      context.lineWidth = stroke * LINE_WIDTH_MOD;
      context.stroke();

      if (!explored) {
        _MIN_circle(a, radius * 2, false);
        context.globalAlpha = 0.25;
        context.stroke();
      }
    },
    kite (camera, character, controller, terrain, elapsed, lineThickness) {
      const color = worlds.flowering.user;
      const direction = character.kiteHeading;
      const start = character._MIN_origin;
      const kiteLength = character.kiteLength;
      const kiteWidth = character.kiteWidth;
      const P = perp(direction, tmp3);

      const a = vec3._MIN_scaleAndAdd(tmps[2], start, P, -kiteWidth);
      const b = vec3._MIN_scaleAndAdd(tmps[3], start, P, kiteWidth);
      const c = vec3._MIN_scaleAndAdd(tmps[4], start, direction, kiteLength * 0.5);
      const d = vec3._MIN_scaleAndAdd(tmps[5], start, direction, -kiteLength);

      const path = [ a, d, b, c ].map((p, i) => camera.project(p, tmps[i]));

      context.strokeStyle = color;
      context.lineWidth = 1 * lineThickness * LINE_WIDTH_MOD;
      context.lineJoin = context.lineCap = 'round';
      context.globalAlpha = 1;
      context.beginPath();

      const L = path[0];
      const R = path[2];
      const T = path[1];
      const K = path[3];

      for (let i = 0; i < character.mousePoints.length; i++) {
        const p = camera.project(character.mousePoints[i].offset, tmpScreen);
        context.lineTo(p[0], p[1]);
      }
      if (character.mousePoints.length > 2) context.lineTo(T[0], T[1]);
      context.stroke();
      context.beginPath();
      context.moveTo(T[0], T[1]);
      context.lineTo(K[0], K[1]);
      context.moveTo(L[0], L[1]);
      context.lineTo(R[0], R[1]);
      context.stroke();

      context.lineWidth = 2 * lineThickness * LINE_WIDTH_MOD;
      context.beginPath();
      path.forEach(p => context.lineTo(p[0], p[1]));
      context.closePath();
      context.stroke();
    }
  };
}
