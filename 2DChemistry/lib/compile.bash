#!/bin/bash

# See: https://stackoverflow.com/questions/69544565/webassembly-instantiatestreaming-ignores-importobjects-js-mem
# Avoid -s IMPORTED_MEMORY for now

emcc distCheck.c -o distCheck.js \
    -s WASM=1 \
    -s INITIAL_MEMORY=128kB \
    -s ALLOW_MEMORY_GROWTH \
    -s EXPORTED_FUNCTIONS='["_check_distance", "_detect_collisions", "_test" ]' \
    -s EXPORTED_RUNTIME_METHODS='["cwrap"]'
