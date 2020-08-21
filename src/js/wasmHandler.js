export let combineMultithreadedData = true;

let multithreadingWorkers = [];
export let multithreadingAmount = navigator.hardwareConcurrency || 4; // Use 4 if can't get CPU core / thread count
export let failedToGetThreadCount = navigator.hardwareConcurrency === undefined;

let ctx;

/*let linesBetweenColumns = false;
export function setLinesBetweenColumns(val) { // Allowing setting it externally
  linesBetweenColumns = val;
}*/

const webworkerLoaded = w => new Promise(r => w.addEventListener("message", r, { once: true }));

export async function setHandlerSetting(name, val) {
  switch (name) {
    case 'combineMultithreadedData':
      combineMultithreadedData = val;
      break;
  }
}

export async function setWorkerSettings(name, val) {
  for (let i = 0; i < multithreadingAmount; i++) {
    multithreadingWorkers[i].postMessage([name, val]);
  }
}

export async function init(_ctx, loadingCallback = () => {}) {
  loadingCallback('Loading multithreading workers');

  let startTime = performance.now();

  ctx = _ctx;

  let loads = [];
  for (let i = 0; i < multithreadingAmount; i++) {
    loadingCallback(`Spawning worker ${i + 1}`);

    let worker = new Worker('wasmMultithread.js');

    worker.onmessage = handleMultithreaderReturn;

    multithreadingWorkers.push(worker);
    loads.push(webworkerLoaded(worker));
  }

  for (let i = 0; i < multithreadingAmount; i++) {
    loadingCallback(`Waiting for worker ${i + 1} to load`);
    await loads[i];
  }

  loadingCallback('Loaded all multithreading workers');

  return performance.now() - startTime;

  //await Promise.all(loads);

  //console.log(`${(performance.now() - startTime).toFixed(2)}ms`);

  //await (new Promise(resolve => setTimeout(resolve, 1000)));
}

let combineImageData;
let combineImageDataIndex;
function handleMultithreaderReturn(e) {
  if (e.data === 'loaded') return;

  let [i, width, height, data] = e.data;

  let startX = (i * width);

  let imageData = new ImageData(data, width, height);

  if (combineMultithreadedData) {
    combineImageData[combineImageDataIndex] = [imageData, startX];
    combineImageDataIndex++;

    if (combineImageDataIndex === multithreadingAmount) {
      for (let i = 0; i < multithreadingAmount; i++) {
        ctx.putImageData(combineImageData[i][0], combineImageData[i][1], 0);
      }
    }

    return;
  }

  ctx.putImageData(imageData, startX, 0);
}

export async function renderFrame(width, height, xCam, yCam, scale) {
  combineImageData = Array(multithreadingAmount);
  combineImageDataIndex = 0;

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