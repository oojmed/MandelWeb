import module from '../../wasm/Cargo.toml';

onmessage = (e) => {
  let [i, renderWidth, actualWidth, height, xCam, yCam, scale, text] = e.data;
  let xOffset = (i * renderWidth);
  let result = module.gen_data(renderWidth, actualWidth, xOffset, height, xCam, yCam, scale);
  postMessage([i, renderWidth, height, result, text]);
  //postMessage([i, width, height, xCam, yCam, scale]);

  //module.render_frame()
  //postMessage(e.data.toString());
  //postMessage(module.render_frame())
};

postMessage('loaded');