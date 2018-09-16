import createScene from './scene';
import Audio from './components/Audio';

const now = performance && performance.now
  ? () => performance.now()
  : Date.now;

createApp();

function createApp () {
  const canvas = window.canvas;
  const context = canvas.getContext('2d', {
    // speed up compositing a little
    alpha: false,
    // probably not used in 2D contexts... but worth a try
    powerPreference: 'high-performance'
  });

  const ratios = [ 1.0, 1.25, 2 ];
  let quality = 2;
  // Sorry FF, you get gimped because large canvas2D elements are slow on OSX!
  if (/firefox/i.test(navigator.userAgent)) {
    quality--;
  }

  let pixelRatio, targetPixelRatio;

  const setPixelRatio = target => {
    targetPixelRatio = target;
    pixelRatio = Math.min(window.devicePixelRatio, target);
  };

  setPixelRatio(ratios[quality]);

  const audio = Audio();

  let width, height, scene, loop;
  resize(); // set initial size first
  scene = createScene(context, audio, save);

  const mouse = [ -width / 2, -height / 2 ];
  let isMouseDown = false;
  loop = createLoop(render, step, adaptive);
  step(0, 0.00001);
  render();
  canvas.style.display = 'none';
  let clicked = false;
  const begin = ev => {
    if (clicked) return;
    resize();
    // window.muteC.style.display = 'block';
    window.W.style.display = 'none';
    // window.R.style.display = 'block';
    clicked = true;
    if (ev) ev.preventDefault();
    audio._MIN_resume();
    // createMouse();
    loop.start();
    canvas.style.display = '';
  };
  // window.S.addEventListener('click', begin, { passive: false });
  // window.S.addEventListener('touchend', audio._MIN_resume, { passive: false });
  // window.S.addEventListener('touchstart', begin, { passive: false });
  begin();
  // For whatever reason latest FF doesn't trigger mousemove
  // after mousedown events unless you cancel drag
  window.ondragstart = () => false;

  // Avoid iOS drag events
  document.addEventListener('touchmove', ev => ev.preventDefault(), {
    passive: false
  });

  window.addEventListener('mousemove', mousemove);
  window.addEventListener('touchmove', touchmove);

  function fit (w = window.innerWidth, h = window.innerHeight) {
    width = w;
    height = h;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  function resize (w, h) {
    fit(w, h);
    if (loop) render(loop.elapsed);
  }

  function render () {
    if (scene) {
      context.save();
      context.scale(pixelRatio, pixelRatio);
      scene.render(loop.elapsed, width, height);
      context.restore();
    }
  }

  function adaptive (deltaTime) {
    let oldRatio = targetPixelRatio;
    if (deltaTime > (1 / 29)) {
      // worse than ~30 FPS, lower to low-range pixel ratio
      quality = Math.min(quality, 0);
    } else if (deltaTime > (1 / 40)) {
      // worse than 40 FPS, lower to mid-range pixel ratio
      quality = Math.min(quality, 1);
    }
    setPixelRatio(ratios[quality]);
    if (oldRatio !== targetPixelRatio) {
      fit();
    }
  }

  function step (elapsed, dt) {
    scene.step(elapsed, dt, width, height, mouse, isMouseDown);
  }

  function touchmove (ev) {
    // mouse[0] = ev.changedTouches[0].clientX;
    // mouse[1] = height - ev.changedTouches[0].clientY - 1;
  }
  
  function mousemove (ev) {
    // mouse[0] = ev.clientX;
    // mouse[1] = height - ev.clientY - 1;
  }

  function createMouse () {
    // Add all events
    const eventMap = {
      resize,
      mouseup,
      mousedown,
      touchend: mouseup,
      touchstart: mousedown
    };
    Object.keys(eventMap).forEach(key => {
      window.addEventListener(key, eventMap[key]);
    });

    function mousedown (ev) {
      if (ev.target.id==='mute') return;
      isMouseDown = true;
      audio._MIN_resume();
    }

    function mouseup () {
      isMouseDown = false;
    }
  }

  function save () {
    const res = 2;
    resize(1280 * res, 720 * res);
    const uri = canvas.toDataURL('image/png');
    resize();
    saveDataURI(defaultFile('.png'), uri);
  }

  function dataURIToBlob (dataURI) {
    const binStr = window.atob(dataURI.split(',')[1]);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      arr[i] = binStr.charCodeAt(i);
    }
    return new window.Blob([arr]);
  }

  function saveDataURI (name, dataURI) {
    const blob = dataURIToBlob(dataURI);

    // force download
    const link = document.createElement('a');
    link.download = name;
    link.href = window.URL.createObjectURL(blob);
    link.onclick = () => {
      process.nextTick(() => {
        window.URL.revokeObjectURL(blob);
        link.removeAttribute('href');
      });
    };
    link.click();
  }

  function defaultFile (ext) {
    const str = `${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}${ext}`;
    return str.replace(/\//g, '-').replace(/:/g, '.');
  }
}

function createLoop (render, step, adaptive, fps = 60) {
  let currrentTime = now();
  let lastTime = currrentTime;

  let avgDeltaCount = 0;
  let avgDeltaSum = 0;
  let avgDeltaInterval = 5;
  let avgDeltaTime = 0;

  const loop = {
    elapsed: 0,
    start () {
      lastTime = currrentTime = now();
      animate();
    },
    animate
  };
  return loop;

  function animate () {
    requestAnimationFrame(animate);
    const newTime = now();

    const realDelta = Math.min(150, newTime - lastTime) / 1000;
    lastTime = newTime;

    avgDeltaTime += realDelta;
    avgDeltaCount++;
    avgDeltaSum += realDelta;
    if (avgDeltaTime > avgDeltaInterval) {
      const avgDelta = avgDeltaSum / avgDeltaCount;
      avgDeltaTime = avgDeltaCount = avgDeltaSum = 0;
      adaptive(avgDelta);
    }

    loop.elapsed += realDelta;
    step(loop.elapsed, realDelta);
    render(loop.elapsed);
  }
}

