use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;

use web_sys::{CanvasRenderingContext2d, ImageData};

use js_sys::Uint8ClampedArray;

extern crate console_error_panic_hook;
use console_error_panic_hook::set_once as set_panic_hook;

/*#[wasm_bindgen]
extern "C" {
    // Use `js_namespace` here to bind `console.log(..)` instead of just
    // `log(..)`
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}*/

fn scale_x(x: f32, width: f32, xCam: f32, scale: f32) -> f32 { // 0..x..width -> Mandelbrot X scale -2.5..x..1
  ((x / (width / 3.5)) - 1.75) * scale + xCam - 0.5
}

fn scale_y(y: f32, height: f32, yCam: f32, scale: f32) -> f32 { // 0..y..height -> Mandelbrot Y scale -1..y..1
  (((y / (height / 2.0)) - 1.0)) * scale + yCam
}

//static MAX_ITERATION: u32 = 160;
//static MAX_ITERATION_SCALE: f32 = 255.0 / (MAX_ITERATION as f32);

fn calc_pixel(maxIteration: u32, pX: u32, pY: u32, width: u32, height: u32, xCam: f32, yCam: f32, scale: f32) -> u32 {
  let x0: f32 = scale_x(pX as f32, width as f32, xCam, scale);
  let y0: f32 = scale_y(pY as f32, height as f32, yCam, scale);

  let mut x: f32 = 0.0;
  let mut y: f32 = 0.0;

  let mut iteration: u32 = 0;

  while x * x + y * y <= 4.0 && iteration < maxIteration {
    let xTemp: f32 = x * x - y * y + x0;
    y = 2.0 * x * y + y0;
    x = xTemp;

    iteration += 1;
  }

  iteration
}

fn gen_color_from_iteration(iteration: u32, maxIterationColorScale: f32) -> u8 {
  ((iteration as f32) * maxIterationColorScale).round() as u8
}

#[wasm_bindgen]
pub fn gen_data(linesBetweenColumns: bool, maxIteration: u32, maxIterationColorScale: f32, renderWidth: u32, actualWidth: u32, xOffset: u32, height: u32, xCam: f32, yCam: f32, scale: f32) -> Uint8ClampedArray { //Vec<u8> {
  set_panic_hook();

  //let mut data: Vec<u8> = Vec::new();
  let mut data: Uint8ClampedArray = Uint8ClampedArray::new_with_length(renderWidth * height * 4);

  let mut i = 0;
  for y in 0..height {
    for x in 0..renderWidth {
      let iteration = calc_pixel(maxIteration, x + xOffset, y, actualWidth, height, xCam, yCam, scale);

      let mut r = 0;
      let mut g = 0;
      let mut b = 0;

      if iteration != maxIteration {
        let color = gen_color_from_iteration(iteration, maxIterationColorScale);
        r = color;
        g = color;
        b = 255;
      }

      data.set_index(i, r);
      data.set_index(i + 1, g);
      data.set_index(i + 2, b);
      data.set_index(i + 3, if linesBetweenColumns && x == renderWidth - 1 { 0 } else { 255 });

      i += 4;

      //data.push(r);
      //data.push(g);
      //data.push(b);
      //data.push(255);
    }
  }

  data
}