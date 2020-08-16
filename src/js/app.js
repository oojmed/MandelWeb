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

  if (keys['z']) {
    scale *= 0.99;
  }

  if (keys['x']) {
    scale *= 1.01;
  }

  await WasmHandler.renderFrame(width, height, xCam, yCam, scale);

  frame++;

  drawDebug();

  //renderText(4, 14, 12, 'black', `${frame} | ${(performance.now() - startTime).toFixed(2)}ms ${fps} | ${xCam.toFixed(2)} ${yCam.toFixed(2)} | ${scale.toFixed(2)}`, 'left');

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

async function drawDebug() {
  debugEl.textContent = `F: ${frame} FPS: ${fps}
Camera Position: ${xCam.toFixed(2)}, ${yCam.toFixed(2)} Scale: ${scale.toFixed(2)}
Resolution: Scaled: ${width}x${height}, Scale Factor: ${scaleFactor}, Raw: ${window.innerWidth}x${window.innerHeight}
Multithreading: ${WasmHandler.multithreading} - ${WasmHandler.multithreadingAmount}
`;
}

update();
})();