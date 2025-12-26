# SC360 - Spatial Audio Web Application

A professional web-based spatial audio application featuring First Order Ambisonics (FOA) encoding and binaural decoding with real-time HRTF processing.

## ✨ Features

- **Interactive Spatial Grid** - Drag audio sources in real-time to position them in 3D space
- **FOA Encoding** - First Order Ambisonics (W, Y, Z, X) signal processing
- **Binaural Decoding** - HRTF-based stereo rendering for headphone listening
- **Professional Mixer UI** - Channel strips with rotary knobs, mute controls, and level meters
- **SOFA HRTF Support** - Load custom HRTF data from SOFA files
- **Mobile-First Design** - Responsive UI optimized for all screen sizes
- **Real-Time Metering** - FOA bus level visualization with logarithmic scaling

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/sc360.git
cd sc360

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

## 🎧 Usage

1. Click **START AUDIO** to initialize the Web Audio context
2. Click **Play** to begin playback of the audio stems
3. **Drag the numbered dots** on the spatial grid to move audio sources
4. Adjust volume with the **rotary knobs** in the Channel Mixer
5. Click **M** to mute/unmute individual channels
6. Watch the **FOA Bus Levels** meter respond to spatial positioning

## 🛠️ Tech Stack

- **React 19** + TypeScript
- **Vite** - Build tool and dev server
- **Web Audio API** - Audio processing
- **AudioWorklet** - Low-latency DSP processing
- **libmysofa (WASM)** - SOFA HRTF file parsing

## 📁 Project Structure

```
sc360/
├── public/
│   ├── audio/          # Audio stem files
│   ├── hrtf/           # SOFA HRTF files
│   └── wasm/           # WASM binary files
├── src/
│   ├── app/            # React components & styles
│   └── audio/          # Audio engine & worklets
├── wasm/               # WASM source & build files
└── index.html
```

## 🎛️ Audio Architecture

```
Audio Sources → Gain Nodes → FOA Encoders → FOA Bus → Binaural Decoder → Output
                                              ↓
                                     Channel Analyzers
```

- **FOA Encoding**: Mono sources encoded to 4-channel Ambisonics (ACN/SN3D)
- **Binaural Decoding**: 8-speaker virtual array with HRTF convolution
- **HRTF Source**: SOFA file with automatic fallback to built-in HRIRs

## 📱 Browser Support

- Chrome 66+
- Firefox 76+
- Safari 14.1+
- Edge 79+

## 📄 License

MIT License

## 🙏 Acknowledgments

- [libmysofa](https://github.com/hoene/libmysofa) - SOFA file reading library
- HRTF data from research databases
