import * as WasmHandler from './wasmHandler';

(async function () { let canvas, ctx;
const timeSinceStart = performance.now();

const version = 'v3.0.0';

let scaleFactor = 2;

let width = 0;
let height = 0;

let frame = 0;
let fpsArr = new Array(10);

let xCam = 0;
let yCam = 0;

let scale = 1.2;

let keys = [];

let autozoom = false;
let autozoomSpeed = 1;
let autozoomInterval;

let locations = [ // TODO: Require adding +0.5 to all X due to xCam shift in Rust instead of in JS
  {
    name: 'Overview',
    xCam: 0,
    yCam: 0,
    scale: 1.2
  },
  {
    name: 'Left Mandelbrots',
    xCam: -1.16,
    yCam: 0,
    scale: 0.20
  },
  {
    name: 'Main Left Mandelbrot',
    xCam: -1.26,
    yCam: 0,
    scale: 0.03
  },
  {
    name: 'A Right Mandelbrot',
    xCam: 0.9322,
    yCam: 0.2278,
    scale: 0.003
  },
  {
    name: 'A Top Mandelbrot',
    xCam: 0.339195,
    yCam: -1.0338,
    scale: 0.01203
  },
  {
    name: 'Main Left Left Left Mandelbrot',
    xCam: -1.2877647,
    yCam: 0.00000030719355,
    scale: 0.0000059845
  }
];

let juliaSelection = 0;

const juliaXEl = document.getElementById('juliaX');
const juliaYEl = document.getElementById('juliaY');

juliaXEl.oninput = updateJuliaVectorFromSliders;

juliaYEl.oninput = updateJuliaVectorFromSliders;

function setJuliaVector() {
  let x = 0;
  let y = 0;

  switch (juliaSelection) {
    case 0:
      //x = 0;
      //y = 0;
      break;
    case 1:
      x = -0.4;
      y = 0.6;
      break;
    case 2:
      x = 0.285;
      // y = 0;
      break;
    case 3:
      x = 0.285;
      y = 0.01;
      break;
    case 4:
      x = 0.45;
      y = 0.1428;
      break;
    case 5:
      x = -0.70176;
      y = -0.3842;
      break;
    case 6:
      x = -0.835;
      y = -0.2321;
      break;
    case 7:
      x = -0.8;
      y = 0.156;
      break;
    case 8:
      x = -0.7269;
      y = 0.1889;
      break;
    case 9:
    default:
      // x = 0;
      y = -0.8;
      break;
  }

  juliaXEl.value = x;
  juliaYEl.value = y;

  updateJuliaVectorFromSliders();
}

let juliaAnimationState = true;
let juliaAnimationFirst = true;

function juliaAnimation() {
  if (juliaAnimationFirst) {
    maxIterationEl.value = 10;
  }

  if (juliaAnimationState) {
    juliaXEl.value = parseFloat(juliaXEl.value) - 0.04;
    if (juliaXEl.value < -1.9) juliaAnimationState = false;
  } else {
    juliaXEl.value = parseFloat(juliaXEl.value) + 0.04;
    if (juliaXEl.value > -0.05) juliaAnimationState = true;
  }

  setMaxIterationFromSlider();

  updateJuliaVectorFromSliders();

  //requestAnimationFrame(juliaAnimation);

  if (juliaXEl.value < 0.6) {
    //juliaXEl.value = juliaXEl.value + 0.01;
  }
}

const introductionEl = document.getElementById('introduction');

introductionEl.onclick = () => {
  introductionEl.style.display = 'none';
};

function updateJuliaVectorFromSliders() {
  WasmHandler.setWorkerSettings('juliaVectorX', parseFloat(juliaXEl.value));
  WasmHandler.setWorkerSettings('juliaVectorY', parseFloat(juliaYEl.value));
}

const locationsEl = document.getElementById('locations');
function generateLocationButtons() {
  for (let loc of locations) {
    let el = document.createElement('button');
    el.textContent = loc.name;
    el.onclick = function () { gotoLocation(this.textContent); };

    locationsEl.appendChild(el);
  }
}

generateLocationButtons();

const locationInterpolateProgressBarEl = document.getElementById('locationInterpolateProgressBar');
let transitionTopScale = 1.19;
let transitionSpeed = 1;

async function gotoLocation(locationName) {
  let loc = locations.find((x) => x.name === locationName);

  let oXCam = Number(xCam);
  let oYCam = Number(yCam);
  let oScale = Number(scale);

  locationInterpolateProgressBarEl.value = 0;
  locationInterpolateProgressBarEl.className = 'show';

  let t = 0;
  let scaleT = 0;

  let transitionPoint = [-1, 0];
  let everZoomedOut = false;
  while (t < 1 || scaleT < 1) {/// || (xCam !== loc.xCam && yCam !== loc.yCam && scale !== loc.scale)) {
    if (t < 1) {
      xCam = bezierInterpolate(oXCam, loc.xCam, t);
      yCam = bezierInterpolate(oYCam, loc.yCam, t);
    }

    if ((Math.abs(xCam - loc.xCam) > 0.8 || Math.abs(yCam - loc.yCam) > 0.8) && (transitionTopScale > loc.scale && transitionTopScale > scale && transitionTopScale > oScale)) {
      everZoomedOut = true;
      if (transitionPoint[0] !== 1) {
        transitionPoint = [1, scale];
        scaleT = 0;
      }

      scale = bezierInterpolate(transitionPoint[1], transitionTopScale, scaleT);
    } else {
      if (transitionPoint[0] !== 0) {
        transitionPoint = [0, scale];
        scaleT = 0;
      }

      scale = bezierInterpolate(transitionPoint[1], loc.scale, scaleT);
    }

    t += 0.005;
    scaleT += everZoomedOut ? 0.007 : 0.005;
    if (scaleT > 1) scaleT = 1;
    if (t > 1) t = 1;

    locationInterpolateProgressBarEl.value = bezierBlend(Math.min(t, 1));

    await (new Promise(resolve => setTimeout(resolve, 10 / transitionSpeed)));
  }

  locationInterpolateProgressBarEl.className = '';

  //gotoLocationInterval = setInterval(() => { stepToLocation(loc); }, 10);
}

let transitionSpeedEl = document.getElementById('transitionSpeed');

transitionSpeedEl.oninput = () => {
  transitionSpeed = parseFloat(transitionSpeedEl.value);
  console.log(transitionSpeed);
};

function bezierInterpolate(a, b, t) {
  let bezierT = bezierBlend(t);

  return (1 - bezierT) * a + bezierT * b;
}

function bezierBlend(t) {
  return t * t * (3 - 2 * t);
}

function scaleCanvas() {
  width = Math.floor(window.innerWidth / scaleFactor);
  height = Math.floor(window.innerHeight / scaleFactor);

  canvas.width = width;
  canvas.height = height;

  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
}

let loadingEl = document.getElementById('loading');

canvas = document.getElementById('canvas');
ctx = canvas.getContext('2d');

const multithreadingInitLoadTime = await WasmHandler.init(ctx, (x) => {
  loadingEl.textContent = x;

  if (x === 'Loaded all multithreading workers') {
    loadingEl.textContent = x;
  }
});

scaleCanvas();
window.onresize = scaleCanvas;

document.oncontextmenu = function(e) {
  e.preventDefault();
  return false;
};

function generateKeyName(e) {
  return (e.ctrlKey ? 'ctrl_' : '') + (e.shiftKey ? 'shift_' : '') + e.key.toLowerCase();
}
  
document.onkeydown = function(e) {
  let name = generateKeyName(e);

  if (keys[name] !== 'override') keys[name] = true;

  if (name === 'ctrl_=' || name === 'ctrl_-') {
    e.preventDefault();
  }
};

document.onkeyup = function(e) {
  keys[generateKeyName(e)] = false;
};

let dragging = false;
let lastDragX = 0;
let lastDragY = 0;

function mousePanAmount() {
  return 0.0025 * scale;
}

function mouseDownHandler(e) {
  if (e.which === 3) { // Right click - auto zoom
    if (autozoom === false) {
      autozoom = {clientX: e.clientX, clientY: e.clientY, deltaY: -autozoomSpeed};
      autozoomInterval = setInterval(() => { wheelHandler(autozoom); }, 10);
    } else {
      clearInterval(autozoomInterval);
      autozoom = false;
    }

    return;
  }

  dragging = true;

  lastDragX = e.clientX;
  lastDragY = e.clientY;

  //WasmHandler.setHandlerSetting('combineMultithreadedData', true);
}

function mouseMoveHandler(e) {
  if (!dragging) return;

  //let diffX = x - lastDragX;
  //let diffY = y - lastDragY;

  let mouseInMandelBeforeX = scaleX(e.clientX / scaleFactor) - xCam;
  let mouseInMandelBeforeY = scaleY(e.clientY / scaleFactor) - yCam;

  if (lastDragX === 0 && lastDragY === 0) {
    lastDragX = mouseInMandelBeforeX;
    lastDragY = mouseInMandelBeforeY;
  }

  console.log(mouseInMandelBeforeX, lastDragX);
  console.log(mouseInMandelBeforeY, lastDragY);

  xCam -= mouseInMandelBeforeX - lastDragX; // * mousePanAmount();
  yCam -= mouseInMandelBeforeY - lastDragY; // * mousePanAmount();

  lastDragX = mouseInMandelBeforeX;
  lastDragY = mouseInMandelBeforeY;
}

function mouseUpHandler(e) {
  dragging = false;

  //WasmHandler.setHandlerSetting('combineMultithreadedData', false);
}

function scaleX(x) {
  return ((x / (width / 3.5)) - 1.75) * scale + xCam;
}

function scaleY(y) {
  return (((y / (height / 2.0)) - 1.0)) * scale + yCam;
}

function wheelHandler(e) {
  let zoom = (e.deltaY * 0.001);

  //xCam -= ((scaleX(e.clientX / scaleFactor) * zoom) - xCam) / scaleFactor;

  let mouseInMandelBeforeX = scaleX(e.clientX / scaleFactor) - xCam;
  let mouseInMandelBeforeY = scaleY(e.clientY / scaleFactor) - yCam;

  //console.log(mouseInMandelBeforeX);

  scale *= 1 + zoom;

  xCam -= (scaleX(e.clientX / scaleFactor) - xCam) - mouseInMandelBeforeX;

  yCam -= (scaleY(e.clientY / scaleFactor) - yCam) - mouseInMandelBeforeY;

  //let diffX = (scaleX(e.clientX / scaleFactor) - xCam) + mouseInMandelBeforeX;
  //console.log(diffX)

  //xCam += diffX;

  //xCam -= scaleX(e.clientX) * zoom / scaleFactor;

  //xCam = xCam - scaleX(e.clientX / window.innerWidth * (sWidthAfter - sWidthBefore));
  //yCam = yCam - scaleY(e.clientY / window.innerHeight * (sHeightAfter - sHeightBefore));

  if (e.preventDefault) e.preventDefault();
}

canvas.onmousedown = mouseDownHandler;
canvas.onmousemove = mouseMoveHandler;
canvas.onmouseup = mouseUpHandler;

canvas.onwheel = wheelHandler;

let lastUpdateTime = performance.now();

let panAmount = 0.02;

function scalePanAmount() {
  return panAmount * scale;
}

let settingsEl = document.getElementById('settings');
let locationsContainerEl = document.getElementById('locationsContainer');

let introIterationAnimation = true;

let settingsShowing = true;

async function update() {
  let timeNow = performance.now();
  let deltaTime = (timeNow - lastUpdateTime) / 1000;
  lastUpdateTime = timeNow;

  //juliaAnimation();

  fpsArr.push(Math.round(1 / deltaTime));
  if (fpsArr.length > 10) fpsArr.shift();

  if (introIterationAnimation) {
    let newValue = parseInt(maxIterationEl.value);
    maxIterationEl.value = Math.ceil(newValue * 1.15); // > 100 ? newValue + 7 : newValue;

    if (newValue > 500) { // || Object.values(keys).some((x) => x)) { // If maxIteration reaches 500 or any keys pressed
      maxIterationEl.value = 500;
      introIterationAnimation = false;
    }

    setMaxIterationFromSlider();
  }

  if (keys['w'] || keys['arrowup']) {
    yCam -= scalePanAmount();
  }

  if (keys['s'] || keys['arrowdown']) {
    yCam += scalePanAmount();
  }

  if (keys['a'] || keys['arrowleft']) {
    xCam -= scalePanAmount();
  }

  if (keys['d'] || keys['arrowright']) {
    xCam += scalePanAmount();
  }

  if (keys['z'] || keys['ctrl_=']) {
    scale *= 0.99;
  }

  if (keys['x'] || keys['ctrl_-']) {
    scale *= 1.01;
  }

  if (keys['0'] === true) {
    gotoLocation(locations[0].name);
    keys['0'] = 'override';
  }

  if (keys[']'] === true) {
    juliaSelection++;
    if (juliaSelection > 9) juliaSelection = 0;
    setJuliaVector();

    keys[']'] = 'override';
  }

  if (keys['h'] === true) {
    settingsShowing = !settingsShowing;

    settingsEl.style.display = settingsShowing ? 'block' : 'none';

    keys['h'] = 'override';
  }

  if (keys['shift_h'] === true) {
    locationsContainerEl.style.display = locationsContainerEl.style.display === 'block' ? 'none' : 'block';

    keys['shift_h'] = 'override';
  }

  await WasmHandler.renderFrame(width, height, xCam, yCam, scale);

  frame++;

  if (settingsShowing) drawDebug();

  requestAnimationFrame(update);
}

let debugEl = document.getElementById('debug');

let resScaleEl = document.getElementById('resScale');

resScaleEl.oninput = () => {
  scaleFactor = resScaleEl.value;

  scaleCanvas();
};

let maxIterationEl = document.getElementById('maxIteration');

function setMaxIterationFromSlider() {
  WasmHandler.setWorkerSettings('maxIteration', maxIterationEl.value);
  WasmHandler.setWorkerSettings('maxIterationColorScale', 255 / maxIterationEl.value);
}

maxIterationEl.oninput = setMaxIterationFromSlider;

let autozoomSpeedEl = document.getElementById('autozoomSpeed');

autozoomSpeedEl.oninput = () => {
  autozoomSpeed = autozoomSpeedEl.value;
  if (autozoom !== false) autozoom.deltaY = -autozoomSpeed;
}

let linesBetweenEl = document.getElementById('linesBetween');

linesBetweenEl.oninput = () => {
  WasmHandler.setWorkerSettings('linesBetweenMultithreadColumns', linesBetweenEl.checked);
};

let borderTracingEl = document.getElementById('borderTracing');

borderTracingEl.oninput = () => {
  WasmHandler.setWorkerSettings('useBorderTracing', borderTracingEl.checked);
};

let combineDataEl = document.getElementById('combineData');

combineDataEl.oninput = () => {
  WasmHandler.setHandlerSetting('combineMultithreadedData', combineDataEl.checked);
};

function arrAverage(arr) {
  return arr.reduce((a, b) => a + b) / arr.length;
}

async function drawDebug() {
  let fps = Math.round(arrAverage(fpsArr));

  debugEl.textContent = `${version}

Load Time - ${startLoadTime.toFixed(2)}ms:
  Multithreading: ${multithreadingInitLoadTime.toFixed(2)}ms

Frames: ${frame}, FPS: ${fps}

Position Information:
  Camera Position: ${xCam.toPrecision(8)}, ${yCam.toPrecision(8)}
  Scale: ${scale.toPrecision(8)}

Resolution:
  Scaled: ${width}x${height}
  Scale Factor: ${scaleFactor}
  Raw: ${window.innerWidth}x${window.innerHeight}

Multithreading:
  Workers (Threads): ${WasmHandler.multithreadingAmount} (Assumed: ${WasmHandler.failedToGetThreadCount})

Memory (Heap): ${(window.performance.memory.usedJSHeapSize / 1000000).toFixed(2)}MB used / ${(window.performance.memory.totalJSHeapSize / 1000000).toFixed(2)}MB total`;
}

/*async function autoGeneratePerformance() {
  let times = [];

  for (let i = 0; i < 2; i++) {
    let startTime = performance.now();

    await WasmHandler.renderFrame(width, height, xCam, yCam, scale);

    times.push(performance.now() - startTime);
  }

  let timeTaken = arrAverage(times);

  loadingEl.textContent = `Auto modifying values for good performance... (${timeTaken.toFixed(0)}ms / ${(1000 / 15).toFixed(0)}ms)`;

  if (timeTaken < 1000 / 15) {
    let current = Number(maxIterationEl.value);
    maxIterationEl.value = current + 20; //(parseInt(maxIterationEl.value) - 5).toString();
    setMaxIterationFromSlider();

    await (new Promise(resolve => setTimeout(resolve, 10)));

    await autoGeneratePerformance();
  }
}*/

/*async function increaseMaxIterationAnimation() {
  await (new Promise(resolve => setTimeout(resolve, 200)));

  if (maxIterationEl.value < 500) {
    maxIterationEl.value = parseInt(maxIterationEl.value) + 10;
    console.log(maxIterationEl.value);
    setMaxIterationFromSlider();

    //await (new Promise(resolve => setTimeout(resolve, 100)));

    await increaseMaxIterationAnimation();
  }
}*/

loadingEl.className = 'hide';
//increaseMaxIterationAnimation();


//loadingEl.textContent = 'Auto modifying values for good performance...';

//await autoGeneratePerformance();

const startLoadTime = performance.now() - timeSinceStart;

update();
})();