/*
    Web assembly working area.
*/

// Momery array hosted by JS to handle data transfer between JS and WASM.
const memWASM = new WebAssembly.Memory({
  initial: 10,
  maximum: 100,
  shared: true,
});

// The WASM code will need a pointer reference to the start of this memory block to help computations.
