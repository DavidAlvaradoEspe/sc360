# Update Plan — Move Current Working Demo to Ambisonics (FOA → Binaural)

This plan updates your existing working demo (currently binaural/spatial in some form) to the required MVP pipeline:

**3 mono stems (objects)** → **FOA ambisonic encoding (AudioWorklet)** → **FOA bus mix** → **binaural decoder at the end (AudioWorklet)** → **stereo headphone output**. :contentReference[oaicite:0]{index=0}

Constraints / Decisions:
- **FOA only (1st order)**. :contentReference[oaicite:1]{index=1}
- **Width/Roll optional** (do not implement for MVP). :contentReference[oaicite:2]{index=2}
- **Room encoder excluded**. :contentReference[oaicite:3]{index=3}
- **SOFA + libmysofa is the “real” decoder dataset** (Phase 4). :contentReference[oaicite:4]{index=4}
- **ACN channel order for FOA must be consistent end-to-end**:
  - ch0: W
  - ch1: Y
  - ch2: Z
  - ch3: X :contentReference[oaicite:5]{index=5}

---

## Overview of What Changes (Conceptual)

If your current demo does *direct per-object binaural convolution* (SOFA per object), you will:
1) Remove/disable per-object binaural processing
2) Encode each mono object into **FOA (4 channels)** using azimuth/elevation
3) Sum all objects into a **single FOA bus (4 channels)**
4) Perform **one** binaural decode at the end:
   - FOA → N virtual speakers → HRIR convolve → stereo out :contentReference[oaicite:6]{index=6}

This matches the required architecture. :contentReference[oaicite:7]{index=7}

---

## Phase 0 — Preflight Checklist (Do Not Skip)

### Inputs
- Confirm your stems are mono WAVs.
- Confirm you can play all 3 simultaneously in plain stereo (baseline). :contentReference[oaicite:8]{index=8}

### UI
- You already have the grid with 3 draggable dots.
- You already compute azimuth/elevation from dot position:
  - X → azimuth [-180°, +180°]
  - Y → elevation [-45°, +45°] :contentReference[oaicite:9]{index=9}

### Validation Gate (must pass before moving on)
- Start Audio works (autoplay policy).
- Play/Stop works cleanly.
- Moving dots updates azimuth/elevation values. :contentReference[oaicite:10]{index=10}

---

## Phase 1 — Implement FOA Encoder Worklet + FOA Bus (No Binaural Yet)

### Goal
Replace current routing (stereo/binaural per object) with:
- Object (mono) → FOA encoder worklet (4ch)
- Sum into a single FOA bus (4ch) :contentReference[oaicite:11]{index=11}

### Tasks

#### 1. Create / confirm target structure
Add (or confirm) folders: :contentReference[oaicite:12]{index=12}
- `src/worklets/foa-encoder.worklet.ts`
- `src/audio/audioEngine.ts`
- (Optional debug) `src/audio/meters.ts`

#### 2. Add FOA encoder worklet
Implement FOA formula: :contentReference[oaicite:13]{index=13}
- W = s * 0.70710678
- X = s * cos(el) * cos(az)
- Y = s * cos(el) * sin(az)
- Z = s * sin(el)

**Must output channels in this order**: W, Y, Z, X. :contentReference[oaicite:14]{index=14}

#### 3. Update audio graph to produce a 4-channel FOA bus
For each object:
- source → gain → FOA encoder (4ch out) :contentReference[oaicite:15]{index=15}

Then:
- connect all encoder outputs to a single FOA bus node (4ch explicit). :contentReference[oaicite:16]{index=16}

Important implementation rule:
- Set `channelCountMode="explicit"` and keep FOA channels **discrete** (avoid automatic downmix).

#### 4. Add metering (debug)
Add an analyser/meter per FOA channel (W/Y/Z/X). :contentReference[oaicite:17]{index=17}

### Validation Gate (must pass)
- No runtime errors.
- Audio still plays (will sound odd / not spatial; expected).
- FOA channel meters respond; moving dots redistributes energy across X/Y/Z. :contentReference[oaicite:18]{index=18}

**STOP HERE** until it passes. :contentReference[oaicite:19]{index=19}

---

## Phase 2 — Add Binaural Decoder Worklet (Stub HRIR) for End-to-End Spatial

### Goal
Add binaural output at the end of the chain:
- FOA bus → binaural decoder worklet → destination :contentReference[oaicite:20]{index=20}

Use a tiny built-in HRIR set first (stub) so you can validate architecture before SOFA. :contentReference[oaicite:21]{index=21}

### Tasks

#### 1. Create decoder worklet
Add:
- `src/worklets/foa-binaural-decoder.worklet.ts` :contentReference[oaicite:22]{index=22}

#### 2. Create stub HRIR dataset
Add:
- `src/hrtf/hrirBuiltIn.ts` containing short HRIR arrays (128–256 taps). :contentReference[oaicite:23]{index=23}

#### 3. Implement decoder approach
Decoder method: :contentReference[oaicite:24]{index=24}
1) Decode FOA to **N virtual speakers** (N=4 or N=8, el=0).
2) Convolve each speaker with HRIR_L / HRIR_R (short FIR).
3) Sum all speakers to final stereo.

#### 4. Connect graph
- FOA bus → decoder → `audioContext.destination` :contentReference[oaicite:25]{index=25}

#### 5. Add smoothing on parameter updates
When dot moves, do not step az/el instantly; ramp values (linear ramp) to avoid crackles. :contentReference[oaicite:26]{index=26}

### Validation Gate (must pass)
With headphones:
- Moving one dot left/right clearly moves only that object.
- Objects move independently.
- No crackles at normal movement speed.
- CPU acceptable for 3 objects. :contentReference[oaicite:27]{index=27}

**STOP HERE** until it passes. :contentReference[oaicite:28]{index=28}

---

## Phase 3 — Replace Stub HRIR with Real SOFA (libmysofa WASM)

### Goal
Load real HRTFs from SOFA and feed them into the decoder worklet. :contentReference[oaicite:29]{index=29}

### Tasks

#### 1. Place SOFA file
Put:
- `/public/hrtf/hrtf.sofa` :contentReference[oaicite:30]{index=30}

#### 2. Add SOFA loader module
Add `src/hrtf/sofaLoader.ts` to: :contentReference[oaicite:31]{index=31}
- fetch SOFA as ArrayBuffer
- init libmysofa WASM
- extract HRIRs for the same N virtual speakers (same az angles you used in Phase 2)
- resample or trim to target tap length

#### 3. Update decoder initialization
Decoder worklet must accept HRIRs via `postMessage` or constructor options. :contentReference[oaicite:32]{index=32}

#### 4. Add fallback
If SOFA fails to load, fall back to stub HRIR set. :contentReference[oaicite:33]{index=33}

#### 5. Performance constraint
No blocking main thread: do heavy work before playback or in a worker-like init step. :contentReference[oaicite:34]{index=34}

### Validation Gate (must pass)
- SOFA loads successfully (log confirmation).
- Audio plays binaurally using SOFA-derived HRIRs.
- Spatial movement feels improved vs stub.
- No main-thread stalls during playback. :contentReference[oaicite:35]{index=35}

**STOP HERE** until it passes. :contentReference[oaicite:36]{index=36}

---

## Phase 4 — Final MVP “Definition of Done” Checklist

You are done when all are true: :contentReference[oaicite:37]{index=37}
- One track with 3 mono objects.
- Draggable grid controls azimuth/elevation.
- Correct pipeline exists:
  **Objects → FOA encoder → FOA mix → binaural decoder at end**
- Works in headphones; movement audible and independent per object.

---

## Phase 5 — Polish (Optional but Recommended)

Usability / stability improvements: :contentReference[oaicite:38]{index=38}
- Reset positions button
- Clamp/smooth parameter updates more aggressively
- Per-object solo/mute
- CPU safeguards (reduce N speakers, shorter tap length)

Validation:
- No pops while dragging
- Chrome/Edge OK; document Safari limitations
- README with setup + known limitations :contentReference[oaicite:39]{index=39}

---

## Implementation Notes (Avoid Common Breaks)

- Always preserve FOA channel order: W,Y,Z,X. :contentReference[oaicite:40]{index=40}
- Make FOA nodes “explicit 4ch” to prevent browser downmixing.
- Do not re-load SOFA or rebuild HRIRs on every drag; only update encoder params.
- Keep N small first (4 or 8) and tap length modest (128–256). :contentReference[oaicite:41]{index=41}

---
