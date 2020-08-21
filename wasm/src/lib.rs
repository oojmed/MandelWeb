use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;

use web_sys::{CanvasRenderingContext2d, ImageData};

use js_sys::Uint8ClampedArray;

use std::cell::RefCell;
use std::rc::Rc;
use std::cell::RefMut;
use std::collections::VecDeque;

extern crate console_error_panic_hook;
use console_error_panic_hook::set_once as set_panic_hook;

#[wasm_bindgen]
extern "C" {
    // Use `js_namespace` here to bind `console.log(..)` instead of just
    // `log(..)`
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

fn scale_x(x: f64, width: f64, xCam: f64, scale: f64) -> f64 { // 0..x..width -> Mandelbrot X scale -2.5..x..1
  ((x / (width / 3.5)) - 1.75) * scale + xCam
}

fn scale_y(y: f64, height: f64, yCam: f64, scale: f64) -> f64 { // 0..y..height -> Mandelbrot Y scale -1..y..1
  (((y / (height / 2.0)) - 1.0)) * scale + yCam
}

//static MAX_ITERATION: u32 = 160;
//static MAX_ITERATION_SCALE: f64 = 255.0 / (MAX_ITERATION as f64);

/*fn calc_pixel(maxIteration: u32, pX: u32, pY: u32, width: u32, height: u32, xCam: f64, yCam: f64, scale: f64) -> u32 {
  let x0: f64 = scale_x(pX as f64, width as f64, xCam, scale);
  let y0: f64 = scale_y(pY as f64, height as f64, yCam, scale);

  let mut x: f64 = 0.0;
  let mut y: f64 = 0.0;

  let mut iteration: u32 = 0;

  let mut xSq = x * x;
  let mut ySq = y * y;

  while xSq + ySq <= 4.0 && iteration < maxIteration {
    /*let xTemp: f64 = x * x - y * y + x0;
    y = 2.0 * x * y + y0;
    x = xTemp;*/

    let xTemp: f64 = xSq - ySq + x0;
    y = x * y;
    y += y;
    y += y0;

    x = xTemp;

    xSq = x * x;
    ySq = y * y;

    iteration += 1;
  }

  iteration
}*/

struct TracingGlobal {
  data: Vec<u32>,
  done: Vec<u8>,
  queue: VecDeque<u32>,
  queueSize: usize,
  queueHead: usize,
  queueTail: usize,

  width: u32,
  actualWidth: u32,
  height: u32,

  maxIteration: u32,
  xCam: f64,
  yCam: f64,
  scale: f64,
  xOffset: u32,
  juliaVectorX: f64,
  juliaVectorY: f64
}

fn calc_pixel(tracingGlobal: &TracingGlobal, pX: u32, pY: u32) -> u32 {
  let mut mandelbrotXOffset: f64 = 0.0;

  let mut x0: f64 = scale_x(pX as f64, tracingGlobal.actualWidth as f64, tracingGlobal.xCam, tracingGlobal.scale);
  let y0: f64 = scale_y(pY as f64, tracingGlobal.height as f64, tracingGlobal.yCam, tracingGlobal.scale);

  let mut juliaX = tracingGlobal.juliaVectorX;
  let mut juliaY = tracingGlobal.juliaVectorY;
  
  if juliaX == 0.0 && juliaY == 0.0 {
    x0 -= 0.5;

    juliaX = x0;
    juliaY = y0;
  }

  let mut x: f64 = x0;
  let mut y: f64 = y0;

  let mut iteration: u32 = 0;

  let mut xSq = x * x;
  let mut ySq = y * y;

  let mut r = 0;
  let mut g = 0;
  let mut b = 0;

  while xSq + ySq <= 4.0 && iteration < tracingGlobal.maxIteration {
    let xTemp: f64 = xSq - ySq + juliaX;
    y = x * y;
    y += y + juliaY;

    x = xTemp;

    xSq = x * x;
    ySq = y * y;

    iteration += 1;
  }

  iteration
}

fn gen_color_from_iteration(iteration: u32, maxIterationColorScale: f64) -> u8 {
  //float regulator = (iteration as f64) - log(log(dot(p, p)) / log(2.0)) / log(2.0);
  //color = vec3(0.95 + .012 * regulator, 1.0, .1 + .4 * (1.0 + sin(.3 * regulator)));

  ((iteration as f64) * maxIterationColorScale).round() as u8
}

static DONE_QUEUED: u8 = 2;
static DONE_LOADED: u8 = 1;

fn addQueue(mut tracingGlobal: &mut TracingGlobal, p: usize) {
  if tracingGlobal.done[p] & DONE_QUEUED == DONE_QUEUED {
    return;
  }

  tracingGlobal.done[p] |= DONE_QUEUED;
  tracingGlobal.queue.push_back(p as u32);
  //tracingGlobal.queue[tracingGlobal.queueHead] = p;

  tracingGlobal.queueHead += 1;

  if tracingGlobal.queueHead == tracingGlobal.queueSize {
    tracingGlobal.queueHead = 0;
  }
}

fn get_xy_from_p(tracingGlobal: &TracingGlobal, p: u32) -> (u32, u32) {
  (p % tracingGlobal.width, p / tracingGlobal.width)
}

fn load(tracingGlobal: &mut TracingGlobal, p: usize) -> u32 {
  if tracingGlobal.done[p] & DONE_LOADED == DONE_LOADED {
    return tracingGlobal.data[p];
  }

  let (x, y) = get_xy_from_p(tracingGlobal, p as u32);

  let result = calc_pixel(tracingGlobal, x + tracingGlobal.xOffset, y);
  tracingGlobal.done[p] |= DONE_LOADED;

  tracingGlobal.data[p] = result;
  return result;
}

fn scan(tracingGlobal: &mut TracingGlobal, p: u32) {
  let (x, y) = get_xy_from_p(tracingGlobal, p as u32);

  let center = load(tracingGlobal, p as usize);

  let ll = x >= 1;
  let rr = x < tracingGlobal.width - 1;
  let uu = y >= 1;
  let dd = y < tracingGlobal.height - 1;

  let lp = (p - 1) as usize;
  let rp = (p + 1) as usize;
  let up = (p - tracingGlobal.width) as usize;
  let dp = (p + tracingGlobal.width) as usize;

  let l = ll && load(tracingGlobal, lp) != center; // tracingGlobal.maxIteration; //center;
  let r = rr && load(tracingGlobal, rp) != center; // tracingGlobal.maxIteration; //center;
  let u = uu && load(tracingGlobal, up) != center; // tracingGlobal.maxIteration; //center;
  let d = dd && load(tracingGlobal, dp) != center; // tracingGlobal.maxIteration; //center;

  if l { addQueue(tracingGlobal, lp); }
  if r { addQueue(tracingGlobal, rp); }
  if u { addQueue(tracingGlobal, up); }
  if d { addQueue(tracingGlobal, dp); }

  if (uu && ll) && (l || u) { addQueue(tracingGlobal, up - 1); }
  if (uu && rr) && (r || u) { addQueue(tracingGlobal, up + 1); }
  if (dd && ll) && (l || d) { addQueue(tracingGlobal, dp - 1); }
  if (dd && rr) && (r || d) { addQueue(tracingGlobal, dp + 1); }
}

fn innerQueueLoop(tracingGlobal: &mut TracingGlobal) -> u32 {
  let p = tracingGlobal.queue[tracingGlobal.queueTail] as u32;
  tracingGlobal.queueTail += 1;

  if tracingGlobal.queueTail == tracingGlobal.queueSize {
    tracingGlobal.queueTail = 0;
  }

  return p;
}

#[wasm_bindgen]
pub fn gen_data(linesBetweenColumns: bool, useBorderTracing: bool, maxIteration: u32, maxIterationColorScale: f64, juliaVectorX: f64, juliaVectorY: f64, renderWidth: u32, actualWidth: u32, xOffset: u32, height: u32, xCam: f64, yCam: f64, scale: f64) -> Uint8ClampedArray { //Vec<u8> {
  //set_panic_hook();

  let areaU: u32 = (renderWidth * height);
  let area: usize = areaU as usize;

  let queueSizeU: u32 = areaU * 4;
  let queueSize: usize = queueSizeU as usize;

  let mut pixels: Uint8ClampedArray = Uint8ClampedArray::new_with_length(queueSizeU);

  let mut tracingGlobal = TracingGlobal {
    data: vec![0; area],
    done: vec![0; area],

    queue: VecDeque::new(),
    queueSize: queueSize,

    queueHead: 0,
    queueTail: 0,

    width: renderWidth,
    actualWidth: actualWidth,
    height: height,

    maxIteration: maxIteration,
    xCam: xCam,
    yCam: yCam,
    scale: scale,
    xOffset: xOffset,
    
    juliaVectorX: juliaVectorX,
    juliaVectorY: juliaVectorY
  };

  let mut i = 0;

  /*if !useBorderTracing {
    for y in 0..height {
      for x in 0..renderWidth {
        let iteration = calc_pixel(&tracingGlobal, x + xOffset, y); //calc_pixel(maxIteration, x + xOffset, y, actualWidth, height, xCam, yCam, scale);
  
        let mut r = 0;
        let mut g = 0;
        let mut b = 0;
  
        if iteration != maxIteration {
          let color = gen_color_from_iteration(iteration, maxIterationColorScale);
          r = color;
          g = color;
          b = 255;
        }
  
        pixels.set_index(i, r);
        pixels.set_index(i + 1, g);
        pixels.set_index(i + 2, b);
        pixels.set_index(i + 3, if linesBetweenColumns && x == renderWidth - 1 { 0 } else { 255 });
  
        i += 4;
      }
    }

    return pixels;
  }*/
  

  let refcell: Rc<RefCell<TracingGlobal>> = Rc::new(RefCell::new(tracingGlobal));

  let mut borrowMut = refcell.borrow_mut();

  for y in 0..height {
    let left = y * renderWidth;
    addQueue(&mut *borrowMut, left as usize);
    addQueue(&mut *borrowMut, (left + (renderWidth - 1)) as usize);
  }

  for x in 1..(renderWidth - 1) {
    addQueue(&mut *borrowMut, x as usize);
    addQueue(&mut *borrowMut, ((height - 1) * renderWidth + x) as usize)
  }

  //let mut numIterationsPerPixel
  let mut flag: u32 = 0;
  while borrowMut.queue.len() > 0 {
    let p = borrowMut.queue.pop_front().unwrap();
    scan(&mut *borrowMut, p);
  }

  for p in 0..area {
    let ind = p as usize;
    let iteration = borrowMut.data[ind];

    if p != area - 1 && (borrowMut.done[ind] & DONE_LOADED) == 1 {
      if (borrowMut.done[ind + 1] & DONE_LOADED) == 0 {
        borrowMut.data[ind + 1] = iteration;
        borrowMut.done[ind + 1] |= DONE_LOADED;
      }
    }

    let mut r = 0;
    let mut g = 0;
    let mut b = 0;

    if iteration != maxIteration {
      let color = gen_color_from_iteration(iteration, maxIterationColorScale);
      r = color;
      g = color;
      b = 255;
    }

    pixels.set_index(i, r);
    pixels.set_index(i + 1, g);
    pixels.set_index(i + 2, b);
    pixels.set_index(i + 3, if linesBetweenColumns && ((p as u32) % renderWidth) == renderWidth - 1 { 0 } else { 255 });

    i += 4;
  }

  pixels
}