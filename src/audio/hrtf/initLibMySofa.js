import * as createModuleImport from "../../../wasm/libmysofa/libmysofa_wasm.js";

// Normalize CJS/ESM export styles
const createModule = createModuleImport.default ?? createModuleImport;

export async function initLibMySofa() {
    const Module = await createModule({
        locateFile: (p) => {
            // When the glue code asks for the .wasm file, return the public URL
            if (p.endsWith(".wasm")) return "/wasm/libmysofa_wasm.wasm";
            return p;
        },
    });

    // Wrap your exported C functions (names must match your sofa_wrap.c exports)
    const sofa_open = Module.cwrap("sofa_open", "number", ["string", "number"]);
    const sofa_err = Module.cwrap("sofa_err", "number", ["number"]);
    const sofa_filter_length = Module.cwrap("sofa_filter_length", "number", ["number"]);
    const sofa_get_filter = Module.cwrap("sofa_get_filter", "number", [
        "number", "number", "number", "number",
        "number", "number", "number", "number"
    ]);
    const sofa_close = Module.cwrap("sofa_close", null, ["number"]);

    return {
        Module,
        api: {
            open: (path, sampleRate) => sofa_open(path, sampleRate),
            err: (h) => sofa_err(h),
            filterLength: (h) => sofa_filter_length(h),

            // x,y,z should be a unit vector direction
            getFilter: (h, x, y, z) => {
                const len = sofa_filter_length(h);
                if (!len) throw new Error("Invalid filter length");

                const bytes = len * 4;
                const leftPtr = Module._malloc(bytes);
                const rightPtr = Module._malloc(bytes);

                // IMPORTANT: delays are float* in your mysofa.h
                const leftDelayPtr = Module._malloc(4);
                const rightDelayPtr = Module._malloc(4);

                try {
                    const rc = sofa_get_filter(
                        h, x, y, z,
                        leftPtr, rightPtr,
                        leftDelayPtr, rightDelayPtr
                    );
                    if (rc !== 0) throw new Error(`sofa_get_filter failed: ${rc}`);

                    // Access WASM memory through HEAPU8.buffer 
                    // (Module.HEAPU8 is exported via EXPORTED_RUNTIME_METHODS)
                    const heapBuffer = Module.HEAPU8.buffer;
                    const left = new Float32Array(heapBuffer, leftPtr, len).slice();
                    const right = new Float32Array(heapBuffer, rightPtr, len).slice();

                    // Read delay values
                    const delayView = new Float32Array(heapBuffer);
                    const leftDelay = delayView[leftDelayPtr >> 2];
                    const rightDelay = delayView[rightDelayPtr >> 2];

                    return { left, right, leftDelay, rightDelay };
                } finally {
                    Module._free(leftPtr);
                    Module._free(rightPtr);
                    Module._free(leftDelayPtr);
                    Module._free(rightDelayPtr);
                }
            },

            close: (h) => sofa_close(h),
        },
    };
}
