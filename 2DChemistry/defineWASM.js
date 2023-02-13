/*
    Web assembly working area.
*/

/*
    Memory array hosted by JS to handle data transfer between JS and WASM.
    
    WARNING: Memory function is not simple. Compiler will not import without a IMPORT MEMORY FLAG.
*/

const WASM = {
    bLoad: false,
    mem: undefined,
    instance: undefined,
};

// WASM.mem = new WebAssembly.Memory({
  // initial: 10,
  // maximum: 100,
  // shared: true,
// });

// Get the various collision C functions.

WebAssembly.instantiateStreaming(
    fetch("lib/distCheck.wasm"),
    {
        // env: { memory: WASM.mem },        
        //js: { mem: WASM.mem },
    }
).then( (obj) => {
    WASM.instance = obj.instance;
    WASM.mem = obj.instance.exports.memory ;
});

// The WASM code will need a pointer reference to the start of this memory block to help computations.
/*
    Webassembly import section. Check for loading and stuff as needed.
    Assume that the WASM module is named Module.
*/


WASM.bLoad = true;
// int n, float* x, float* y, flost* r, int* out,
