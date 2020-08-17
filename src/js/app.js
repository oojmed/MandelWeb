import * as WasmHandler from './wasmHandler';

(async function () { let canvas, ctx;

let scaleFactor = 2;

let width = 0;
let height = 0;

let frame = 0;
let fps;

let xCam = 0;
let yCam = 0;

let scale = 1.2;

let keys = [];

let autozoom = false;
let autozoomSpeed = 1;
let autozoomInterval;

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

WasmHandler.init(ctx, (x) => {
  loadingEl.textContent = x;

  if (x === 'Loaded all multithreading workers') {
    loadingEl.className = 'hide';
  }
});

scaleCanvas();
window.onresize = scaleCanvas;
  
document.oncontextmenu = function(e) {
  e.preventDefault();
  return false;
}
  
document.onkeydown = function(e) {
  let key = e.key.toLowerCase();

  keys[key] = true;
};

document.onkeyup = function(e) {
  let key = e.key.toLowerCase();
    
  keys[key] = false;
};

let dragging = false;
let lastDragX = 0;
let lastDragY = 0;

function mouseDownHandler(e) {
  if (e.which === 3) { // Right click - auto zoom
    if (autozoom === false) {
      autozoom = {clientX: e.clientX, clientY: e.clientY, deltaY: -autozoomSpeed};
      autozoomInterval = setInterval(() => { wheelHandler(autozoom); });
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

  let x = e.clientX;
  let y = e.clientY;

  let diffX = x - lastDragX;
  let diffY = y - lastDragY;

  xCam -= diffX / 400;
  yCam -= diffY / 400;

  lastDragX = x;
  lastDragY = y;
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
  console.log(e);

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

async function update() {
  let timeNow = performance.now();
  let deltaTime = (timeNow - lastUpdateTime) / 1000;
  lastUpdateTime = timeNow;

  fps = Math.round(1 / deltaTime);

  let receivingGoodInput = false;

  if (keys['w'] || keys['arrowup']) {
    yCam -= scalePanAmount();

    receivingGoodInput = true;
  }

  if (keys['s'] || keys['arrowdown']) {
    yCam += scalePanAmount();

    receivingGoodInput = true;
  }

  if (keys['a'] || keys['arrowleft']) {
    xCam -= scalePanAmount();

    receivingGoodInput = true;
  }

  if (keys['d'] || keys['arrowright']) {
    xCam += scalePanAmount();

    receivingGoodInput = true;
  }

  if (keys['z']) {
    scale *= 0.99;

    receivingGoodInput = true;
  }

  if (keys['x']) {
    scale *= 1.01;

    receivingGoodInput = true;
  }


  await WasmHandler.renderFrame(width, height, xCam, yCam, scale);

  frame++;

  drawDebug();

  requestAnimationFrame(update);
}

let debugEl = document.getElementById('debug');

let resScaleEl = document.getElementById('resScale');

resScaleEl.oninput = () => {
  scaleFactor = resScaleEl.value;

  scaleCanvas();
};

let maxIterationEl = document.getElementById('maxIteration');

maxIterationEl.oninput = () => {
  WasmHandler.setWorkerSettings('maxIteration', maxIterationEl.value);
  WasmHandler.setWorkerSettings('maxIterationColorScale', 255 / maxIterationEl.value);
};

let autozoomSpeedEl = document.getElementById('autozoomSpeed');

autozoomSpeedEl.oninput = () => {
  autozoomSpeed = autozoomSpeedEl.value;
  autozoom.deltaY = -autozoomSpeed;
}

let linesBetweenEl = document.getElementById('linesBetween');

linesBetweenEl.oninput = () => {
  WasmHandler.setWorkerSettings('linesBetweenMultithreadColumns', linesBetweenEl.checked);
};

let combineDataEl = document.getElementById('combineData');

combineDataEl.oninput = () => {
  WasmHandler.setHandlerSetting('combineMultithreadedData', combineDataEl.checked);
};

async function drawDebug() {
  debugEl.textContent = `F: ${frame} FPS: ${fps}
Camera Position: ${xCam.toFixed(2)}, ${yCam.toFixed(2)} Scale: ${scale.toFixed(2)}
Resolution: Scaled: ${width}x${height}, Scale Factor: ${scaleFactor}, Raw: ${window.innerWidth}x${window.innerHeight}
Multithreading: Workers: ${WasmHandler.multithreadingAmount}, Combine Multithreaded Data: ${WasmHandler.combineMultithreadedData}
`;
}

update();
})();