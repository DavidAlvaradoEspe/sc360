#include <stdlib.h>
#include <string.h>

#include "../src/src/hrtf/mysofa.h"


/*
  Simple wrapper so JS can:
  - open a SOFA file (already in Emscripten MEMFS)
  - ask for HRIR filters at a given direction (x,y,z)
  - close and free
*/

typedef struct {
  struct MYSOFA_EASY* hrtf;
  int filter_length;
  int err;
} SofaHandle;

SofaHandle* sofa_open(const char* path, int sample_rate) {
  SofaHandle* h = (SofaHandle*)calloc(1, sizeof(SofaHandle));
  if (!h) return NULL;

  h->hrtf = mysofa_open(path, (float)sample_rate, &h->filter_length, &h->err);
  if (!h->hrtf) {
    return h; // err populated
  }
  return h;
}

int sofa_err(SofaHandle* h) {
  if (!h) return -9999;
  return h->err;
}

int sofa_filter_length(SofaHandle* h) {
  if (!h || !h->hrtf) return 0;
  return h->filter_length;
}

/*
  x,y,z = unit vector direction (cartesian). This is what mysofa expects.
  leftIR/rightIR must point to float arrays of length >= filter_length.
  delays returned in samples.
*/
int sofa_get_filter(SofaHandle* h, float x, float y, float z,
                    float* leftIR, float* rightIR,
                    float* leftDelay, float* rightDelay) {
  if (!h || !h->hrtf) return -1;
  mysofa_getfilter_float(h->hrtf, x, y, z, leftIR, rightIR, leftDelay, rightDelay);
  return 0;
}



void sofa_close(SofaHandle* h) {
  if (!h) return;
  if (h->hrtf) mysofa_close(h->hrtf);
  free(h);
}
