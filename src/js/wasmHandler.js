import module from '../../wasm/Cargo.toml';

export let multithreading = true;

let multithreadingWorkers = [];
export let multithreadingAmount = navigator.hardwareConcurrency;
let ctx;

/*let linesBetweenColumns = false;
export function setLinesBetweenColumns(val) { // Allowing setting it externally
  linesBetweenColumns = val;
}*/

const webworkerLoaded = w =>
  new Promise(r => w.addEventListener("message", r, { once: true }));

export function setWorkerSettings(name, val) {
  for (let i = 0; i < multithreadingAmount; i++) {
    multithreadingWorkers[i].postMessage([name, val]);
  }
}

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

  let [i, width, height, data] = e.data;

  let startX = (i * width);

  let imageData = new ImageData(data, width, height);

  ctx.putImageData(imageData, startX, 0);
}

export async function renderFrame(width, height, xCam, yCam, scale) {
  if (!multithreading) {
    handleMultithreaderReturn({data: [0, width, height, module.gen_data(width, width, 0, height, xCam, yCam, scale)]});
    //module.render_frame(ctx, width, height, xCam, yCam, scale);

    return;
  }

  let stripWidth = Math.floor(width / multithreadingAmount);

  //let stripCurrent = 0;
  let waits = [];
  for (let i = 0; i < multithreadingAmount; i++) {
    multithreadingWorkers[i].postMessage([i, stripWidth, width, height, xCam, yCam, scale]);

    //stripCurrent += stripWidth;

    waits.push(webworkerLoaded(multithreadingWorkers[i]));
  }

  await Promise.all(waits);

  //module.render_frame(ctx, width, height, xCam, yCam, scale);
}