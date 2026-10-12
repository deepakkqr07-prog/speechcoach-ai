# Dataset Construction & Annotation Protocol

**Multimodal AI Hackathon 2026 — Track C**  
**SpeechCoach AI**: Contrastive Speech Analytics & Temporal Flaw Grounding

---

## 1. Methodology Motivation

Existing speech corpora (e.g., LibriSpeech, CommonVoice) focus on speech recognition rather than evaluating the rhetorical quality of delivery. There are few datasets pairing good rhetorical delivery against flawed deliveries of the exact same text.

SpeechCoach AI establishes a **Paired Contrastive Spectrum** where every sample consists of:
- **Ideal Reference Audio**: Natural cadence, expressive pitch inflection, clean rhetorical pauses.
- **Flawed Delivery Mirror**: Intentionally injected flaws (pacing surges, monotone pitch, dead air pauses, energy drops).
- **Exact Temporal Ground Truth**: Precise start and end timestamps bounding the flawed acoustic region.

---

## 2. Speech Event Taxonomy

The dataset incorporates representative speeches across the four primary competitive speech events:
1. **Interpretive Reading**: Expressive reading of literature requiring subtle tonal modulation and rhythmic breath control.
2. **Declamation**: Delivery of a historically significant address requiring sustained projection and persuasive cadence.
3. **Extemporaneous Speaking**: Analytical speech prepared under tight time constraints requiring fluid pacing without hesitation pauses.
4. **Persuasive Oratory**: Rhetorical argument requiring dynamic emphasis and clear consonant articulation.

---

## 3. Flaw Injection & Generation Protocol

The demonstration dataset pairs were generated using an acoustic formant model (`backend/app/audio/generator.py`):
- **Formant Resonators**: Formants $F_1, F_2, F_3$ are synthesized with harmonic glottal pulse trains.
- **Controlled Defect Parameters**:
  - *Pause Disruption*: Silence interval inserted between words exceeding 2.0s.
  - *Velocity Surge*: Syllabic compression accelerating speech rate past 230 WPM.
  - *Monotone Prosody*: Pitch variation modulation reduced to $\le 0.05$, holding F0 flat.
  - *Vocal Energy Collapse*: Output amplitude attenuated by $>70\%$ across trailing clauses.
  - *Muffled Consonants*: Moving average low-pass filtering applied to simulate slurred enunciation.

---

## 4. Annotation Schema & File Format

Metadata is exported simultaneously in both JSON (`dataset/metadata/dataset.json`) and CSV (`dataset/metadata/dataset.csv`):

```json
{
  "sample_id": "SPCH_FLAW_001",
  "title": "Pause Disruption in Rhetorical Delivery",
  "category": "Interpretive Reading",
  "transcript": "Good speech evaluation demands rigorous metrics not subjective impressions.",
  "ideal_audio_path": "dataset/sample_data/SPCH_FLAW_001_ideal.wav",
  "flawed_audio_path": "dataset/sample_data/SPCH_FLAW_001_flawed.wav",
  "speaker_id": "SPK_SYNTH_01",
  "flaw_category": "Long or poorly placed pauses",
  "flaw_start": 2.10,
  "flaw_end": 4.20,
  "severity": "severe",
  "annotation_notes": "Injected 2.1-second awkward silence breaking grammatical continuity.",
  "recording_conditions": "Studio conditions (Synthetic Formant Acoustic Model, 16kHz, 16-bit)",
  "split": "test"
}
```

---

## 5. Validation & Quality Assurance

- Every generated pair is verified through `backend/tests/test_speechcoach.py`:
  1. Duration and clipping checks.
  2. Detection of ground-truth flaw category.
  3. Bounding timestamp alignment within tolerance bounds ($\pm 0.3\text{s}$).
  4. Speaker-agnostic normalization consistency across all test splits.
