import module from '../../wasm/Cargo.toml';

let defaultMaxIteration = 1;

let settings = {
  linesBetweenMultithreadColumns: false,
  maxIteration: defaultMaxIteration,
  maxIterationColorScale: 255 / defaultMaxIteration,
  useBorderTracing: true,
  juliaVectorX: 0,
  juliaVectorY: 0
};

onmessage = (e) => {
  if (e.data.length === 2) { // Set setting
    settings[e.data[0]] = e.data[1];
    return;
  }

  //console.log(self.linesBetweenMultithreadColumn);
  let [i, renderWidth, actualWidth, height, xCam, yCam, scale] = e.data;
  let xOffset = (i * renderWidth);
  let result = module.gen_data(settings.linesBetweenMultithreadColumns, settings.useBorderTracing, settings.maxIteration, settings.maxIterationColorScale, settings.juliaVectorX, settings.juliaVectorY, renderWidth, actualWidth, xOffset, height, xCam, yCam, scale);
  postMessage([i, renderWidth, height, result]);
  //postMessage([i, width, height, xCam, yCam, scale]);

  //module.render_frame()
  //postMessage(e.data.toString());
  //postMessage(module.render_frame())
};

postMessage('loaded');