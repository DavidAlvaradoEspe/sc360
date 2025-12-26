cmake_minimum_required(VERSION 3.18)
project(libmysofa_wasm C)

set(CMAKE_C_STANDARD 11)

file(GLOB RESAMPLER_SRC
  ../src/src/resampler/*.c
)

add_executable(libmysofa_wasm
  sofa_wrap.c

  # hrtf sources (src/src/hrtf)
  ../src/src/hrtf/easy.c
  ../src/src/hrtf/reader.c
  ../src/src/hrtf/resample.c
  ../src/src/hrtf/tools.c
  ../src/src/hrtf/minphase.c
  ../src/src/hrtf/interpolate.c
  ../src/src/hrtf/lookup.c
  ../src/src/hrtf/spherical.c
  ../src/src/hrtf/kdtree.c
  ../src/src/hrtf/neighbors.c
  ../src/src/hrtf/check.c
  ../src/src/hrtf/loudness.c
  ../src/src/hrtf/cache.c

  # hdf sources (src/src/hdf)
  ../src/src/hdf/dataobject.c
  ../src/src/hdf/gunzip.c
  ../src/src/hdf/fractalhead.c
  ../src/src/hdf/gcol.c
  ../src/src/hdf/superblock.c
  ../src/src/hdf/btree.c

  ${RESAMPLER_SRC}
)

target_include_directories(libmysofa_wasm PRIVATE
  ${CMAKE_CURRENT_SOURCE_DIR}
  ../src/src/hrtf
  ../src/src/hdf
  ../src/src/resampler

)

# Emscripten: enable zlib so <zlib.h> works (robust for older CMake)
set_target_properties(libmysofa_wasm PROPERTIES
  COMPILE_FLAGS "-sUSE_ZLIB=1"
  LINK_FLAGS "-sUSE_ZLIB=1 \
    -sEXPORTED_RUNTIME_METHODS=['cwrap','FS','getValue','setValue','HEAPU8','HEAPF32'] \
    -sEXPORTED_FUNCTIONS=['_sofa_open','_sofa_err','_sofa_filter_length','_sofa_get_filter','_sofa_close','_malloc','_free'] \
    -sMODULARIZE=1 \
    -sEXPORT_ES6=1 \
    -sALLOW_MEMORY_GROWTH=1 \
    -sASSERTIONS=1"
)


