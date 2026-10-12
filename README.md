# SpeechCoach AI: Contrastive Speech Analytics & Temporal Flaw Grounding

> **Multimodal AI Hackathon 2026 — Track C**  
> **Team**:  
> • **Team Leader**: Ranjeet Kumar  
> • **Member**: Deepak Kumar  
> **Core Motto**: *Better evidence → Better feedback → Better speakers*

---

## 1. Project Overview

Evaluating competitive spoken performances—including **Interpretive Reading**, **Declamation**, **Extemporaneous Speaking**, and **Persuasive Oratory**—is inherently subjective. Judges must balance delivery cadence, volume, pauses, and pitch against content quality, resulting in inconsistent judging scores and vague feedback ("improve your delivery").

**SpeechCoach AI** solves this by:
1. **Contrasting** a participant's speech with an **ideal delivery** of the exact same spoken text.
2. **Temporally Grounding Delivery Flaws** at exact audio start/end timestamps.
3. **Explaining Mathematical Evidence** (acoustic deltas in WPM, semitones, pause duration, RMS energy, and spectral centroid).
4. **Calculating Reproducible Rubric Scores** across 5 forensic dimensions totaling 100%.
5. **Interactive Full-Stack Dashboard**: WaveSurfer.js seekable audio playback, synchronized Recharts overlays, and attempt comparison history.

---

## 2. Key Features

- **Contrastive & Standalone Modes**: Compare participant speech against an ideal baseline or perform standalone rubric evaluation.
- **WaveSurfer.js Interactive Audio Player**: Seekable audio waveform with colored flaw interval visual markers; clicking any flaw seeks directly to that timestamp.
- **Synchronized Recharts Time-Series**: Multi-tab contour charts displaying participant vs. baseline RMS Energy, Pitch ($F_0$ / Semitones), and Spectral Centroid.
- **8 Track C Flaw Categories**:
  1. Excessively fast speech
  2. Excessively slow speech
  3. Long or poorly placed pauses
  4. Monotone delivery
  5. Unusual pitch variation
  6. Inconsistent vocal energy
  7. Unclear articulation
  8. Emphasis that differs from reference delivery
- **Speaker-Agnostic Normalization**: Converts pitch to semitones relative to the speaker's own median $F_0$, preventing bias against naturally different vocal ranges.
- **Word-Level Aligned Transcript**: Highlights active words during playback and tags defect regions.
- **Persistent SQLite History & Attempt Comparison**: Store evaluations, track score improvements across attempts, and inspect comparative deltas.
- **Dataset Management & Export**: Download paired metadata in JSON or CSV.

---

## 3. Technology Stack

- **Frontend**: React 18, Vite, Recharts, WaveSurfer.js, Lucide Icons, Vanilla CSS (Dark navy/cyan theme).
- **Backend**: Python 3.12/3.13, FastAPI, Uvicorn, NumPy, SciPy, Librosa, OpenAI Whisper, SpeechRecognition, SQLite.
- **Audio Processing**: YIN algorithm pitch tracking, short-time RMS framing, 13-dim MFCCs, Spectral Centroid, Hanning smoothed syllable nucleus detection.

---

## 4. Repository Structure

```
speechcoach-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entrypoint, static audio mounts, CORS
│   │   ├── api/
│   │   │   ├── endpoints_analysis.py # /api/analyze, /api/transcribe, /api/align
│   │   │   ├── endpoints_history.py  # /api/history, /api/history/{id}, compare
│   │   │   ├── endpoints_dataset.py  # /api/dataset, /api/dataset/export
│   │   │   └── endpoints_rubric.py   # /api/rubric (configurable weights)
│   │   ├── audio/
│   │   │   ├── loader.py            # Audio validation, mono 16kHz resampling, SNR/clipping
│   │   │   └── generator.py         # Formant speech synthesizer creating paired dataset
│   │   ├── features/
│   │   │   └── extractor.py         # MFCCs, YIN F0, RMS, Semitones, Centroid, VAD
│   │   ├── alignment/
│   │   │   └── aligner.py           # Whisper ASR & pause-aware word aligner
│   │   ├── comparison/
│   │   │   └── contrastive_engine.py# DTW alignment, temporal flaw grounding
│   │   ├── scoring/
│   │   │   └── rubric.py            # 5-dimension rubric scoring (0-100)
│   │   ├── database/
│   │   │   └── db.py                # SQLite schema and dataset seeder
│   │   └── schemas/
│   │       └── schemas.py           # Pydantic request/response models
│   ├── tests/
│   │   └── test_speechcoach.py      # Automated test suite (7/7 passed)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AudioWaveformPlayer.jsx # WaveSurfer player with flaw markers
│   │   │   ├── ScoreBreakdownCards.jsx # Overall score banner & 5 category cards
│   │   │   ├── FlawGroundingList.jsx   # Flaw cards with mathematical evidence
│   │   │   └── WordAlignmentViewer.jsx # Aligned transcript viewer
│   │   ├── pages/
│   │   │   ├── HomeDashboard.jsx       # Metrics, frequent flaws, recent runs
│   │   │   ├── AnalyzeSpeech.jsx       # Audio upload, mic recording, presets
│   │   │   ├── ResultsDashboard.jsx    # Complete evaluation report & charts
│   │   │   ├── DatasetExplorer.jsx     # Paired dataset browser & audio player
│   │   │   ├── HistoryPage.jsx         # Saved history & attempt comparison
│   │   │   └── AboutPage.jsx           # Hackathon context, team, architecture
│   │   ├── charts/
│   │   │   └── AcousticContourCharts.jsx # Recharts multi-contour overlays
│   │   ├── services/
│   │   │   └── api.js                  # Frontend API client
│   │   ├── App.jsx                     # Navigation & state coordinator
│   │   └── index.css                   # Cohesive design system
│   ├── Dockerfile
│   └── nginx.conf
├── dataset/
│   ├── metadata/
│   │   ├── dataset.json             # Contrastive metadata with ground-truth bounds
│   │   └── dataset.csv              # Exportable CSV
│   ├── sample_data/                 # 16 WAV audio files (8 ideal, 8 flawed mirrors)
│   └── README.md
├── docs/
│   ├── architecture.md              # Complete technical specifications
│   ├── dataset_methodology.md       # Dataset construction & annotation protocol
│   └── scoring_rubric.md            # Rubric formulas & threshold definitions
├── .env.example
├── .gitignore
├── docker-compose.yml
└── requirements.txt
```

---

## 5. Prerequisites & Installation

### Prerequisites
- Python 3.11, 3.12, or 3.13
- Node.js 18+ and npm
- (Optional) Docker and Docker Compose

### Step 1: Clone Repository
```bash
git clone https://github.com/ranjeet-deepak/speechcoach-ai.git
cd speechcoach-ai
```

### Step 2: Backend Setup
```bash
# Install Python dependencies
py -3.13 -m pip install -r requirements.txt

# Initialize database and seed contrastive dataset
py -3.13 backend/app/database/db.py
```

### Step 3: Frontend Setup
```bash
cd frontend
npm install
npm run build
cd ..
```

---

## 6. How to Run Locally

### Start the Backend Server (Port 8000)
```powershell
py -3.13 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be live at: `http://localhost:8000/docs`

### Start the Frontend Dev Server (Port 5173)
```powershell
cd frontend
npm run dev
```
Open your browser at: `http://localhost:5173`

### (Alternative) Run with Docker Compose
```bash
docker-compose up --build
```

---

## 7. Speech Recognition Models Configuration

SpeechCoach AI supports multi-tier transcription and alignment:
- **Default Local Model**: OpenAI Whisper `tiny` or `base` for fast local CPU inference.
- To configure model size, set the environment variable:
  ```env
  WHISPER_MODEL=base   # options: tiny, base, small, medium
  ```
- **Fallback Engine**: If Whisper model weights are not loaded, the system automatically falls back to `SpeechRecognition` and pause-aware acoustic alignment.

---

## 8. Automated Testing & Verification

Run the test suite with:
```powershell
py -3.13 -m pytest backend/tests/test_speechcoach.py -v
```

All 7 test suites verify:
- Audio validation (empty audio & digital clipping)
- Acoustic feature extraction accuracy (YIN F0, RMS, pauses)
- Rubric scoring weights and mathematical reproducibility
- Contrastive analysis end-to-end on paired speech samples
- Standalone analysis without reference baseline
- Dataset metadata validity and JSON/CSV export
- Health check and capability endpoints

---

## 9. Reproducible Evaluative Rubric

| Category | Weight | Target Ideal Range | Evaluated Metric |
| :--- | :--- | :--- | :--- |
| **Pacing** | **25%** | 125 – 165 WPM | Syllabic nucleus rate & WPM |
| **Pause Management** | **20%** | 14% – 26% silence ratio | VAD unvoiced duration ($\tau \le 0.80\text{s}$) |
| **Pitch Variation** | **20%** | 3.0 – 7.0 semitones | YIN normalized semitone deviation |
| **Vocal Energy** | **15%** | 12 – 24 dB dynamic range | RMS energy contour stability |
| **Articulation** | **20%** | 1600 – 3200 Hz centroid | Spectral centroid & consonant presence |

Weights are dynamically editable in the UI or via `POST /api/rubric`.

---

## 10. Reproducible Hackathon Demonstration Workflow

1. Open `http://localhost:5173`.
2. Notice the **Acoustic AI Engine: Online** status and summary metrics.
3. Navigate to **Analyze Speech**.
4. In the top bar, click the instant demo preset: **Pause (SPCH_FLAW_001)**.
   - Automatically loads flawed audio submission and binds ideal reference audio.
5. Click **Ground Flaws & Compute Scores**.
6. The app executes validation, feature extraction, and temporal grounding:
   - **Overall Delivery Score** is displayed with 5 category breakdown cards.
   - **WaveSurfer.js Player**: Click on the red highlighted flaw marker on the timeline to jump audio playback directly to the awkward 2.1s silence.
   - Switch between **Participant Audio** and **Ideal Reference Baseline** to listen to the contrast!
   - Inspect **Acoustic Signal Contours** (RMS Energy, Pitch Semitones, Spectral Centroid).
   - In **Temporal Flaw Grounding Cards**, view the mathematical evidence: `Measured: 2.10s, Baseline: 0.35s, Delta: +1.75s`.
7. Go to **Dataset** to browse all 8 paired samples and play ideal vs flawed audio side by side.
8. Go to **History** to compare attempt deltas.

---

## 11. 3–10 Minute YouTube Video Script Outline

- **0:00 – 1:00**: **Introduction & The Forensic Oratory Problem**
  - Introduce Team Leader Ranjeet Kumar & Deepak Kumar (Track C).
  - Explain subjective forensic judging and vague feedback.
- **1:00 – 2:30**: **Dataset Construction & Paired Good/Bad Spectrum**
  - Show `dataset/sample_data/` containing 8 paired recordings.
  - Demonstrate playing ideal vs flawed audio side by side in the Dataset Explorer.
- **2:30 – 4:30**: **Live Demonstration of Temporal Flaw Grounding**
  - Upload `SPCH_FLAW_001_flawed.wav` with ideal reference.
  - Show the WaveSurfer.js seeking: clicking the flaw jumps playback to the exact timestamp (2.10s).
  - Show the mathematical evidence card explaining why it was flagged.
- **4:30 – 6:30**: **Acoustic Time-Series Overlays & Normalization**
  - Inspect the Recharts Energy and Pitch semitone curves.
  - Explain the speaker-agnostic normalization ($F_0$ mapped to semitones relative to median).
- **6:30 – 8:00**: **Rubric Scoring & Attempt Comparison**
  - Show how the 5 weighted categories calculate a 0-100 score.
  - Open History and demonstrate comparing Attempt 1 vs Attempt 2.
- **8:00 – 9:00**: **Conclusion & Impact**
  - "Better evidence → Better feedback → Better speakers."

---

## 12. Known Limitations

- **Complex Polyphonic Signals**: SpeechCoach AI is optimized for single-speaker declamation; heavy background music or polyphonic overlapping voices may degrade pitch tracking accuracy.
- **Extreme Vocal Pathologies**: Severe whisper or aphonia limits fundamental frequency tracking; the system flags unvoiced intervals as `NaN` rather than inventing false pitch.
