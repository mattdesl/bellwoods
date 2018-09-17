import Character from './components/Character';
import Terrain from './components/Terrain';
import Painter from './components/Painter';
import Controller from './components/Controller';
import Camera from './components/Camera';
import Worlds from './components/Worlds';
import { ease, clamp01 } from './math';
import { array, vec3, noise } from './util';

export default function (context, audio) {
  const worlds = Worlds();
  let currentFloweringWorld = worlds.current;

  const restyle = () => {
    document.body.style.background = currentFloweringWorld.background;
    document.body.style.color = currentFloweringWorld.user;
  };

  restyle();

  const camera = Camera();
  const painter = Painter(context, camera, worlds);
  const terrain = Terrain(camera, audio);
  noise._MIN_reset(currentFloweringWorld.seed);
  terrain.reset(currentFloweringWorld.seed, currentFloweringWorld);

  const controller = Controller(camera, terrain);
  const character = Character(camera, terrain, controller);
  const PORTAL_OFF = [ 0, 1, 0 ];

  let transitionTime = 0;
  let transitioning = -1;
  let portalUnderPlayer = null;

  let firstTransition = true;
  const transitionDuration = 0.5;

  const tmp01 = [];
  const tmp02 = [];
  let isIgnoreDuration = 1;
  let isIgnoreTime = isIgnoreDuration;
  const portalRadiusPx = 16;
  let curPortalSize = 1;

  let initialTime = 0;
  const tapPool = array(15).map(() => {
    return {
      position: [],
      time: 0,
      duration: 0.5,
      active: false,
      index: -1
    };
  });

  function currentTransitionDuration () {
    return firstTransition ? 1 : transitionDuration;
  }

  function _MIN_step (elapsed, dt, width, height, mouse, mouseDown) {
    initialTime += dt;
    const hypot = Math.sqrt(width * width + height * height);
    curPortalSize = Math.max(12, (hypot / 1280) * portalRadiusPx);

    // Called once per frame to update values from last frame
    audio._MIN_tick(currentFloweringWorld);

    // Update projection matrices
    camera.set(width, height);

    // Update worlds...
    const currentWorld = worlds.current;
    worlds.flowering = currentFloweringWorld;

    const transitionDuration = currentTransitionDuration();
    // Step forward the transition
    isIgnoreTime += dt;
    if (transitioning !== 0) {
      transitionTime += dt;
      if (transitionTime > transitionDuration) {
        transitionTime = 0;
        if (transitioning === 1) {
          transitioning = -1;
          noise._MIN_reset(worlds.current.seed);
          terrain.reset(worlds.current.seed, worlds.current);
          currentFloweringWorld = worlds.current;
          restyle();
        } else {
          firstTransition = false;
          transitioning = 0;
        }
      }
    }

    // Move camera controller forward
    controller.step(width, height, elapsed, dt, mouse, mouseDown);

    // Update kite
    character.step(width, height, elapsed, dt, mouse, mouseDown);

    // Kill off old taps/hits
    tapPool.forEach(t => {
      if (!t.active) return;
      t.time += dt;
      if (t.time > t.duration) {
        t.active = false;
      }
    });

    const didEnter = updatePortals(elapsed, dt, true);
    // update new portals
    if (didEnter) updatePortals(elapsed, dt, false);
  }

  function updatePortals (elapsed, dt, allowEnter) {
    let didEnterAny = false;
    let hitAny = false;
    const kitePos2D = camera.project(character._MIN_origin, tmp01);

    for (let i = 0; i < worlds._MIN_portals.length; i++) {
      const portal = worlds._MIN_portals[i];
      const xzPos = terrain.getXZWorldPosition(portal.offset);
      portal._updated = true;
      portal._position = vec3.add(portal._position || [], xzPos, PORTAL_OFF);
      const portal2D = camera.project(portal._position, tmp02);
      const xyzPos = portal._position;
      // const p = camera.project(xyzPos);
      // const portalValue = transitioning === 1 ? (1 - ease2(1 - transitionValue)) : ease2(transitionValue);
      // if (!portal.tail && transitioning === 1) tval = ease(transitionTime / transitionDuration);
      // painter.portal(xyzPos, portal.explored, portal.world.background, portalThreshold, 1);
      // painter.point(xyzPos, config.user, 12);
      // painter.point(xyzPos, portal.world.background, 10);

      const butterfly = worlds._MIN_butterflies[i];
      butterfly.update(xyzPos, character, camera, elapsed, dt);

      // painter.marker(xzPos, threshold, portal.world.background, camera, character, controller, terrain, elapsed);

      const dx = kitePos2D[0] - portal2D[0];
      const dy = kitePos2D[1] - portal2D[1];
      const distSq = (dx * dx + dy * dy);
      const portalThreshold = curPortalSize * 4;
      const thresholdSq = portalThreshold * portalThreshold;
      const isIgnore = isIgnoreTime < isIgnoreDuration;
      const hit = distSq < thresholdSq;
      let canEnter = allowEnter && transitioning === 0 && !isIgnore;
      if (canEnter && hit) {
        // If we haven't stepped on the portal yet, enter it
        if (!portalUnderPlayer || portalUnderPlayer !== portal) {
          isIgnoreTime = 0;
          worlds.enter(portal);
          didEnterAny = true;
          firstTransition = false;
          // audio.note();

          audio._MIN_transition();
          // const { note, octave } = audio.note();
          // console.log(`Playing ${note}${octave + 4}`);
          // TODO: gotta fix portal stepping..
          // console.log('entering world');
          transitioning = 1;
          transitionTime = 0;
        }
        // 
        // if (worlds.collide(portal)) {
        //   worlds.enter(portal);
        //   break;
        // }
      }
      if (hit) {
        hitAny = true;
        portalUnderPlayer = portal;
      }
    }
    if (!hitAny) portalUnderPlayer = null;
    return didEnterAny;
  }

  function findTap () {
    for (let i = 0; i < tapPool.length; i++) {
      if (!tapPool[i].active) return tapPool[i];
    }
    return null;
  }

  function _MIN_render (elapsed, width, height) {
    let transitionDuration = currentTransitionDuration();
    const initialFade = Math.min(1, initialTime / 1);

    // Get the current transition value between worlds
    let transitionValue = 1;
    if (transitioning !== 0) {
      transitionValue = transitionTime / transitionDuration;
      if (transitioning === 1) {
        transitionValue = 1 - (transitionValue);
      }
      // else {
        // transitionValue = transitionValue;
      // }
      transitionValue = ease(transitionValue)
    }

    // render background
    context.clearRect(0, 0, width, height);

    if (transitioning === 1) {
      context.fillStyle = worlds.current.background;
      context.globalAlpha = 1;
      context.fillRect(0, 0, width, height);
    }

    let bgVal = transitioning === 1
      ? (1 - (transitionTime - transitionDuration * 0.5) / (transitionDuration * 0.5))
      : 1;
    var t = clamp01(bgVal);

    context.fillStyle = currentFloweringWorld.background;
    context.globalAlpha = ease(t);
    context.fillRect(0, 0, width, height);

    // context.fillStyle = currentFloweringWorld.background;
    // context.globalAlpha = 1;
    // context.fillRect(0, 0, width, height);

    // painter.point([ 0, 0, 0 ], 'red', 5);
    terrain.mesh(controller.origin, character._MIN_origin, elapsed, 0, transitionValue);

    // Draw mesh terrain
    if (!currentFloweringWorld.empty) drawTerrain(transitionValue);

    // painter.point(character._MIN_kitePosition, 'red', 4);
    // painter.point(character._MIN_tweenKiteOffset, 'blue', 4);
    // painter.point(character.origin, 'green', 4);

    // Draw taps/hits
    context.lineWidth = initialFade;
    context.globalAlpha = 0.5;
    for (let i = 0; i < tapPool.length; i++) {
      const p = tapPool[i];
      if (p.active) {
        const t = Math.sin(p.time / p.duration * Math.PI);
        const radius = t * p.radius * 4;
        if (radius >= 0.0001) {
          const pos = camera.project(p.position, tmp01);
          context.strokeStyle = p.color//currentFloweringWorld.user;
          painter._MIN_circle(pos, radius);
          context.stroke();
        }
      }
    }
    context.globalAlpha = 1;

    painter.kite(camera, character, controller, terrain, elapsed, initialFade);

    worlds._MIN_portals.forEach((portal, i) => {
      const butterfly = worlds._MIN_butterflies[i];
      const xyzPos = portal._position;
      painter.portal(xyzPos, portal.explored, portal.world.background, curPortalSize, initialFade);
      painter.butterfly(butterfly, portal.world.background);
    });
  }

  function drawTerrain (transitionValue) {
    // draw mesh points
    // const projected = result.positions.map(p => camera.project(p.position));
    // const transitionValue = 1 - Math.sin(transitionTime / transitionDuration * Math.PI);
    const lineWidth = 1.5 * transitionValue;
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    const lineColor = currentFloweringWorld.lines;
    context.strokeStyle = lineColor;

    const pool = terrain.pool;
    for (let i = 0; i < pool.length; i++) {
      const point = pool[i];
      if (point.active === false) continue;

      const headProjected = point.headProjected;

      // let radius = point.radius;//lerp(0.25, 4, noiseValue * point.state);
      const alpha = point.state * point.alpha;
      if (point.inside && alpha > 0.01) {
        context.globalAlpha = alpha;
        const floored = point.ground;
        const ground = camera.project(floored, tmp01);
        context.beginPath();
        context.lineTo(headProjected[0], headProjected[1]);
        context.lineTo(ground[0], ground[1]);
        context.stroke();
      }
    }

    context.globalAlpha = 1;
    let lastColor;
    for (let i = 0; i < pool.length; i++) {
      const point = pool[i];
      if (point.active === false) continue;

      const radius = (point.inside ? point.radius : 1) * transitionValue;
      const hasRadius = radius > 0.001;
      const color = !point.inside
        ? lineColor
        : currentFloweringWorld.petal(point.hash);

      if (!currentFloweringWorld.empty && hasRadius && point.active && point.inside && point.tileIndex === terrain.hitTile) {
        let pooled = findTap();
        // this should probably be in the step() not render...
        if (pooled) {
          vec3.copy(pooled.position, point.head);
          pooled.time = 0;
          pooled.radius = radius;
          pooled.color = point.hasFlower && radius > 0 ? color : lineColor;
          pooled.active = true;
          audio._MIN_schedule({
            flower: point.hasFlower
          });
        }
      }

      if ((hasRadius && point.active && point.hasFlower) || !point.inside) {
        painter._MIN_circle(point.headProjected, radius);
        if (color !== lastColor) {
          context.fillStyle = color;
          lastColor = color;
        }
        context.fill();
      }
    }
  }

  return {
    _MIN_render,
    _MIN_step
  };

  // function ease2 (t) {
  //   return t === 1.0 ? t : 1.0 - Math.pow(2.0, -10.0 * t)
  // }
}
