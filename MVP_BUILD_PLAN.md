# MVP_BUILD_PLAN.md — React Spatial Audio MVP (FOA → Binaural) with Phase Gates

## Goal
Build an MVP web app (React) that correctly implements this audio pipeline:

**3 mono stems (objects)** → **FOA ambisonic encoding (AudioWorklet)** → **FOA bus mix** → **binaural decoder at the end (AudioWorklet)** → **stereo headphone output**

We will intentionally:
- Implement **FOA only** (1st order).
- Skip “room encoder” (optional, not required).
- Treat **width/roll as optional**: do not implement in MVP; keep extension points.

We will avoid old/archived spatial libraries (no Omnitone, no Resonance).  
We will integrate **libmysofa + SOFA HRTF** as the “real” decoder in Phase 4.

---

## Assets
Place the following mono WAV files in:

`/public/audio/`
- `01AcousticGtr.wav`
- `02AcousticGtrDI.wav`
- `03Saxophone.wav`

Later (Phase 4), place:
`/public/hrtf/hrtf.sofa`

---

## Project Stack
- React + Vite
- TypeScript
- Web Audio API
- AudioWorklet (custom DSP)

No additional DSP libraries unless unavoidable.

---

## UX Requirements (MVP)
- A rectangular **grid**.
- **3 draggable dots** (one per object).
- Move dot → updates:
  - **Azimuth**: X mapped to [-180°, +180°]
  - **Elevation**: Y mapped to [-45°, +45°]
- Buttons:
  - **Start Audio** (must exist; autoplay policy)
  - **Play / Stop**
- Simple per-object:
  - mute toggle OR gain slider (recommended)

---

## Audio Requirements (MVP)
- Each object is mono.
- Each object is encoded into FOA via AudioWorklet.
- Encoded FOA signals are summed into one FOA bus.
- The FOA bus is binaurally decoded **at the end** to stereo.

### FOA Encoding Formula (SN3D/ACN documented)
Let `s` be the mono sample, `az` and `el` in radians:

- `W = s * 0.70710678`
- `X = s * cos(el) * cos(az)`
- `Y = s * cos(el) * sin(az)`
- `Z = s * sin(el)`

**Channel order (ACN)** used in this MVP:
- ch0: W
- ch1: Y
- ch2: Z
- ch3: X

This order must stay consistent end-to-end.

---

## Folder Structure (Target)
src/
app/
App.tsx
styles.css
audio/
audioEngine.ts
assets.ts
constants.ts
worklets/
foa-encoder.worklet.ts
foa-binaural-decoder.worklet.ts
hrtf/
hrirBuiltIn.ts (Phase 3 stub set)
sofaLoader.ts (Phase 4)
public/
audio/
01AcousticGtr.wav
02AcousticGtrDI.wav
03Saxophone.wav
hrtf/
hrtf.sofa (Phase 4)

---

# Phase 1 — Scaffolding + UI Grid + Audio Loading (No Ambisonics Yet)
## Objective
Get a working React app that:
- Loads the 3 WAV files
- Plays them simultaneously
- Provides per-object gain/mute
- Shows the grid with draggable dots
- Updates and displays computed azimuth/elevation values (but does not spatialize yet)

## Implementation Tasks
- Create Vite React TS project
- Implement grid UI
- Implement drag logic for 3 dots
- Compute azimuth/elevation from dot position
- Implement Web Audio:
  - AudioContext
  - Decode 3 WAVs into AudioBuffers
  - Create BufferSource per object
  - GainNode per object
  - Connect all to destination (temporary, plain stereo)
- Add Start Audio + Play/Stop controls

## Validation Gate (Must Pass)
- App runs with `npm run dev`
- Start Audio button resumes AudioContext
- Play starts all 3 stems, Stop stops them cleanly
- Moving dots updates azimuth/elevation numbers on screen
- Per-object gain/mute affects only that object

**STOP HERE** until this passes.

---

# Phase 2 — FOA Encoder Worklet + FOA Bus Mix (Still No Binaural)
## Objective
Replace direct stereo routing with FOA routing:
- Each object → FOA encoder worklet (mono → 4ch FOA)
- Sum the FOA outputs into a single FOA bus
- For this phase, do NOT decode binaurally yet (we will validate via metering/logging)

## Implementation Tasks
- Add AudioWorklet modules:
  - `foa-encoder.worklet.ts`
- For each object:
  - source → gain → FOA encoder worklet (4ch output)
- Mix FOA:
  - Route encoder outputs into a FOA bus node (4ch)
- Add a simple analyser/meter per FOA channel (visual debug)

## Validation Gate (Must Pass)
- No runtime errors in console
- Audio still plays (even if it sounds “odd” or not spatial; that’s expected without decoding)
- Channel meters respond and change when moving dots (az/el changes should redistribute energy across X/Y/Z)

**STOP HERE** until this passes.

---

# Phase 3 — Binaural Decoder Worklet (Stub HRIR Set) — End-to-End Spatial MVP
## Objective
Implement binaural output at the end:
- FOA bus → binaural decoder worklet → stereo destination
- Use a tiny built-in HRIR set (hardcoded) to validate architecture and headphone spatial motion.

## Decoder Approach (MVP)
1) Decode FOA to **N virtual speakers** (N=4 or N=8, el=0 for MVP).
2) For each speaker:
   - convolve speaker signal with HRIR_L and HRIR_R (short FIR, 128–256 taps)
3) Sum all speakers into final stereo output.

## Implementation Tasks
- Add `foa-binaural-decoder.worklet.ts`
- Add `hrtf/hrirBuiltIn.ts` with small HRIR arrays (short)
- Connect:
  - FOA bus → decoder worklet → `audioContext.destination`
- Add parameter smoothing for az/el updates (e.g., linear ramp)

## Validation Gate (Must Pass)
- With headphones:
  - Moving one dot left/right clearly moves that object
  - Objects move independently
- No crackles at normal movement speed
- CPU usage acceptable for 3 objects

**STOP HERE** until this passes.

---

# Phase 4 — Real HRTF via SOFA + libmysofa (WASM)
## Objective
Replace the built-in stub HRIRs with real HRIRs loaded from a SOFA file:
- Load `/public/hrtf/hrtf.sofa`
- Use libmysofa (WASM) to extract HRIRs for the same N virtual speakers
- Feed those HRIRs into the binaural decoder worklet

## Implementation Tasks
- Add `sofaLoader.ts`:
  - fetch SOFA file as ArrayBuffer
  - initialize libmysofa WASM
  - extract HRIRs for speaker directions (az angles)
  - resample or trim to target tap length if needed
- Update decoder worklet initialization:
  - accept HRIR data via `postMessage` or constructor options
- Validate fallback:
  - if SOFA fails to load, fall back to built-in HRIR set

## Validation Gate (Must Pass)
- SOFA loads successfully (log confirmation)
- Audio plays binaurally using SOFA-derived HRIRs
- Spatial movement feels improved vs stub
- No blocking main thread (heavy ops happen before playback or in worker-like initialization)

**STOP HERE** until this passes.

---

# Phase 5 — Polish (Still MVP Scope)
## Objective
Improve usability and stability:
- Better UI labels, reset positions
- Clamp/smooth parameter updates
- Per-object solo/mute
- Basic performance safeguards

## Validation Gate (Must Pass)
- No audible pops when dragging
- Works on Chrome/Edge; note Safari limitations if any
- Clear README with setup + known limitations

---

## Notes / Decisions (Recorded)
- Stems are **mono**.
- Width/roll are optional: not in MVP.
- FOA only for MVP. HOA is future.
- Room encoder is optional and excluded from MVP.

---

## Definition of Done (MVP)
- One track with 3 mono objects.
- Draggable grid controls azimuth/elevation.
- Correct pipeline exists:
  **Objects → FOA encoder → FOA mix → binaural decoder at end**
- Works in headphones and movement is audible and independent per object.
