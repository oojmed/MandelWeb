import module from '../../wasm/Cargo.toml';

let settings = {
  linesBetweenMultithreadColumns: false
};

onmessage = (e) => {
  if (e.data.length === 2) { // Set setting
    settings[e.data[0]] = e.data[1];
    return;
  }

  //console.log(self.linesBetweenMultithreadColumn);
  let [i, renderWidth, actualWidth, height, xCam, yCam, scale] = e.data;
  let xOffset = (i * renderWidth);
  let result = module.gen_data(settings['linesBetweenMultithreadColumns'], renderWidth, actualWidth, xOffset, height, xCam, yCam, scale);
  postMessage([i, renderWidth, height, result]);
  //postMessage([i, width, height, xCam, yCam, scale]);

  //module.render_frame()
  //postMessage(e.data.toString());
  //postMessage(module.render_frame())
};

postMessage('loaded');