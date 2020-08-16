import * as WasmHandler from './wasmHandler';

(async function () { let canvas, ctx;

let scaleFactor = 2.5;

let width = 0;
let height = 0;

let frame = 0;
let fps;

let xCam = -0.5;
let yCam = 0;

let scale = 1.2;

let keys = [];

function upscaleCanvas() {
  width = Math.floor(window.innerWidth / scaleFactor);
  height = Math.floor(window.innerHeight / scaleFactor);

  canvas.width = width;
  canvas.height = height;

  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
}

function renderText(x, startY, size, color, text, align = 'center', lineSpacing = 5) {
  ctx.font = `${size}px Roboto`;
  ctx.fillStyle = color;
  ctx.textAlign = align;

  let newlineSplit = text.split('\n');
  for (let i = 0; i < newlineSplit.length; i++) {
    let y = startY + (i * (size + lineSpacing));
    ctx.fillText(newlineSplit[i], x, y);
  }
}

canvas = document.getElementById('canvas');
ctx = canvas.getContext('2d');

await WasmHandler.init(ctx);

upscaleCanvas();
window.onresize = upscaleCanvas;
  
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

  await WasmHandler.renderFrame(width, height, xCam, yCam, scale, `${frame} ${fps} | ${xCam.toFixed(2)} ${yCam.toFixed(2)} | ${scale.toFixed(2)}`);

  frame++;

  //renderText(4, 14, 12, 'black', `${frame} | ${(performance.now() - startTime).toFixed(2)}ms ${fps} | ${xCam.toFixed(2)} ${yCam.toFixed(2)} | ${scale.toFixed(2)}`, 'left');

  requestAnimationFrame(update);
}

update();
})();