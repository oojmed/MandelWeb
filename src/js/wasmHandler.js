import module from '../../wasm/Cargo.toml';

let multithreading = true;

let multithreadingWorkers = [];
let multithreadingAmount = navigator.hardwareConcurrency;
let ctx;

const webworkerLoaded = w =>
  new Promise(r => w.addEventListener("message", r, { once: true }));

export async function init(_ctx) {
  ctx = _ctx;

  let loads = [];
  for (let i = 0; i < multithreadingAmount; i++) {
    let worker = new Worker('wasmMultithread.js');

    worker.onmessage = handleMultithreaderReturn;

    multithreadingWorkers.push(worker);
    loads.push(webworkerLoaded(worker));
  }

  let startTime = performance.now();
  await Promise.all(loads);

  console.log(`${(performance.now() - startTime).toFixed(2)}ms`);

  //await (new Promise(resolve => setTimeout(resolve, 1000)));
}

function handleMultithreaderReturn(e) {
  if (e.data === 'loaded') return;

  let [i, width, height, data, text] = e.data;

  let startX = (i * width);

  let imageData = new ImageData(data, width, height);

  ctx.putImageData(imageData, startX, 0);

  if (i === 0) {
    renderText(4, 14, 12, 'black', text, 'left');
    //console.log(text);
  }
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

export async function renderFrame(width, height, xCam, yCam, scale, text) {
  if (!multithreading) {
    handleMultithreaderReturn({data: [0, width, height, module.gen_data(width, width, 0, height, xCam, yCam, scale), text]});
    //module.render_frame(ctx, width, height, xCam, yCam, scale);

    return;
  }

  let stripWidth = Math.floor(width / multithreadingAmount);

  //let stripCurrent = 0;
  let waits = [];
  for (let i = 0; i < multithreadingAmount; i++) {
    multithreadingWorkers[i].postMessage([i, stripWidth, width, height, xCam, yCam, scale, text]);

    //stripCurrent += stripWidth;

    waits.push(webworkerLoaded(multithreadingWorkers[i]));
  }

  await Promise.all(waits);

  //module.render_frame(ctx, width, height, xCam, yCam, scale);
}