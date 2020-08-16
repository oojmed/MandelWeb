import * as WasmHandler from './wasmHandler';

(async function () { let canvas, ctx;

let scaleFactor = 2;

let width = 0;
let height = 0;

let frame = 0;
let fps;

let xCam = -0.5;
let yCam = 0;

let scale = 1.2;

let keys = [];

function scaleCanvas() {
  width = Math.floor(window.innerWidth / scaleFactor);
  height = Math.floor(window.innerHeight / scaleFactor);

  canvas.width = width;
  canvas.height = height;

  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
}

canvas = document.getElementById('canvas');
ctx = canvas.getContext('2d');

await WasmHandler.init(ctx);

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

document.onmousedown = mouseDownHandler;
document.onmousemove = mouseMoveHandler;
document.onmouseup = mouseUpHandler;

let lastUpdateTime = performance.now();

let panAmount = 0.01;

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
let resScaleTextEl = document.getElementById('resScaleText');

resScaleEl.oninput = () => {
  scaleFactor = resScaleEl.value;
  resScaleTextEl.textContent = scaleFactor;

  scaleCanvas();
};

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
Multithreading: ${WasmHandler.multithreading}, Workers: ${WasmHandler.multithreadingAmount}, Combine Multithreaded Data: ${WasmHandler.combineMultithreadedData}
`;
}

update();
})();