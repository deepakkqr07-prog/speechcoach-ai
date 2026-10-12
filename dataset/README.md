# SpeechCoach AI: Contrastive Speech Dataset

This directory contains the paired contrastive speech dataset engineered for **Multimodal AI Hackathon 2026 — Track C: Contrastive Speech Analytics & Temporal Flaw Grounding**.

## 1. Structure

```
dataset/
├── metadata/
│   ├── dataset.json     # Complete structured metadata with exact flaw bounds
│   └── dataset.csv      # Flat tabular metadata export
├── sample_data/         # 16-bit 16kHz PCM WAV audio pairs
│   ├── SPCH_FLAW_001_ideal.wav
│   ├── SPCH_FLAW_001_flawed.wav
│   └── ...
└── README.md
```

## 2. Paired Contrastive Taxonomy

Every sample pairs an **Ideal Reference Baseline** with an intentionally **Flawed Delivery Mirror** of the exact same spoken text:

| Sample ID | Category | Flaw Category | Ground Truth Interval | Severity | Split |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SPCH_FLAW_001` | Interpretive Reading | Long or poorly placed pauses | 2.10s – 4.20s (2.1s duration) | Severe | Test |
| `SPCH_FLAW_002` | Persuasive Oratory | Excessively fast speech | 1.20s – 2.60s (235 WPM surge) | Moderate | Test |
| `SPCH_FLAW_003` | Declamation | Monotone delivery | 0.40s – 3.80s (<0.3 st std) | Severe | Test |
| `SPCH_FLAW_004` | Extemporaneous | Inconsistent vocal energy | 2.40s – 4.10s (72% power drop) | Moderate | Train |
| `SPCH_FLAW_005` | Declamation | Excessively slow speech | 1.00s – 4.50s (68 WPM drag) | Moderate | Train |
| `SPCH_FLAW_006` | Interpretive Reading | Unusual pitch variation | 2.00s – 3.20s (>9 st spike) | Severe | Validation |
| `SPCH_FLAW_007` | Persuasive Oratory | Unclear articulation | 0.20s – 3.50s (<950 Hz centroid) | Mild | Validation |
| `SPCH_FLAW_008` | Extemporaneous | Emphasis that differs from reference | 3.20s – 4.60s (flat dynamic anchor) | Moderate | Test |

## 3. Metadata Schema Fields

Each record in `dataset.json` contains:
- `sample_id`: Unique identifier (e.g., `SPCH_FLAW_001`).
- `title`: Descriptive forensic title.
- `category`: Forensic speech event (Interpretive Reading, Declamation, Extemporaneous, Persuasive Oratory).
- `transcript`: Verbatim transcript text.
- `ideal_audio_path`: Relative path to reference baseline WAV.
- `flawed_audio_path`: Relative path to flawed delivery WAV.
- `speaker_id`: Anonymous speaker identifier.
- `flaw_category`: Target delivery defect category.
- `flaw_start`: Precise start timestamp in seconds.
- `flaw_end`: Precise end timestamp in seconds.
- `severity`: Standard severity rating (`mild`, `moderate`, `severe`).
- `annotation_notes`: Mathematical rationale and injected flaw description.
- `recording_conditions`: Acoustic capture specifications (16kHz, 16-bit PCM).
- `split`: Dataset partition (`train`, `validation`, `test`).

## 4. Attribution & Ethics

- The initial demonstration dataset samples are generated using a controlled vocal tract formant synthesis engine (`backend/app/audio/generator.py`) to provide clean, reproducible temporal ground truth without synthetic voice spoofing claims or unconsented recording scraping.
- All real audio recordings contributed in production must have explicit speaker consent and adhere to speech research fair-use licensing.
