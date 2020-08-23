import module from '../../wasm/Cargo.toml';

let defaultMaxIteration = 500;

let settings = {
  linesBetweenMultithreadColumns: false,
  maxIteration: defaultMaxIteration,
  maxIterationColorScale: 255 / defaultMaxIteration,
  usehistogramColoring: false,
  useSmoothColoring: false,
  juliaVectorX: 0,
  juliaVectorY: 0
};

onmessage = (e) => {
  if (e.data.length === 3) { // Set / get setting
    let [type, key, value] = e.data;

    if (type === 'set') {
      settings[key] = value;

      return;
    } else { // Get
      postMessage(['gotSetting', settings[key]]);
    }

    return;
  }

  if (e.data.length === 2) { // generate and send histograph colors
    let [width, height] = e.data;

    postMessage([module.gen_histo_data(settings.maxIteration, settings.juliaVectorX, settings.juliaVectorY, width, height)]);

    return;
  }

  //console.log(self.linesBetweenMultithreadColumn);
  let [i, renderWidth, actualWidth, height, xCam, yCam, scale, histoColors] = e.data;
  let xOffset = (i * renderWidth);

  let result = module.gen_data(histoColors, settings.linesBetweenMultithreadColumns, settings.usehistogramColoring, settings.useSmoothColoring, settings.maxIteration, settings.maxIterationColorScale, settings.juliaVectorX, settings.juliaVectorY, renderWidth, actualWidth, xOffset, height, xCam, yCam, scale);
  postMessage([i, renderWidth, height, result]);
  //postMessage([i, width, height, xCam, yCam, scale]);

  //module.render_frame()
  //postMessage(e.data.toString());
  //postMessage(module.render_frame())
};

postMessage('loaded');