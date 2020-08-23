# MandelWeb Changelog

## v4.0.0

### UI

- Added options for:
  - Histogram Coloring
  - Smooth Coloring

- Removed option for border tracing
- Upped upper limit for max iterations
- Disabled intro animation
- Reorganised top left panel into sections


### Rust WASM

- Added histogram coloring (WIP)
- Added smooth coloring (WIP)



## v3.0.1

### UI

- Fixed introduction panel spacing


### Rust WASM

- Fixed border tracing being disabled doing nothing



## v3.0.0

### UI

- Made FPS counter average (10 frames)
- Tweaked some values of options sliders
- Adjusted some styling for the settings panel
- Added a lot more information to debug text
- Formatted debug more vertically
- Added loading text for start
- Added more options (mostly for new features)
- Added introduction panel


### Locations

- Added Locations


### Controls

- Added Ctrl + - as alias for zooming out control
- Added Ctrl + + as alias for zooming in control
- Added shortcut to hide settings panel
- Mouse dragging / panning now scales with scale


### Rust WASM

- Added Julia Vector changing (also speeding up perfomance by ~1.5x)
- Added Border Tracing (speeds up performance >3x)
- Optimised pixel calculation slightly
- Now using 64-bit floating point variables instead of 32-bit allowing for double the zooming (without glitches)


### Development-side

- Added changelog.md
- (Probably more things we missed)