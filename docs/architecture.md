# SpeechCoach AI: System Architecture & Technical Specifications

**Multimodal AI Hackathon 2026 — Track C: Contrastive Speech Analytics & Temporal Flaw Grounding**  
**Team**: Ranjeet Kumar (Team Leader) & Deepak Kumar (Member)

---

## 1. Executive Overview

SpeechCoach AI transforms subjective forensics judging into an objective, evidence-based evaluation process. By treating spoken performances as multidimensional time-series signals and aligning them with ideal rhetorical baselines, the system:
1. Temporally grounds acoustic delivery defects to precise audio timestamps.
2. Formulates human-interpretable explanations from measurable mathematical deltas.
3. Computes reproducible evaluative scores across 5 forensic rubric dimensions.

```
+-----------------------------------------------------------------------------------+
|                                 SpeechCoach AI Pipeline                           |
+-----------------------------------------------------------------------------------+
       |
       v
 [Audio & Transcript Input] (WAV/MP3/M4A, Live Mic, TXT or ASR)
       |
       +---> [1. Preprocessing] ---> 16kHz Mono Resampling, Clipping & SNR Audit
       |
       +---> [2. ASR & Alignment] ---> OpenAI Whisper / Acoustic Pause-Aware Aligner
       |
       +---> [3. Acoustic Features] ---> RMS Energy, YIN F0 (Semitones), MFCCs, Centroid
       |
       +---> [4. Contrastive Engine] ---> Dynamic Time Warping & Relative Delta Detection
       |
       +---> [5. Temporal Grounding] ---> Start/End Timestamps, Severity, Causal Evidence
       |
       +---> [6. Rubric Scoring] ---> 5 Weighted Categories (0–100 Scale)
       |
       v
 [Interactive Dashboard] (WaveSurfer.js, Recharts Multi-Contours, Flaw Cards, Export)
```

---

## 2. Signal Preprocessing Pipeline

- **Sampling Rate Standardization**: All audio streams are downsampled/upsampled to 16,000 Hz, 32-bit floating point mono.
- **Dynamic Amplitude Verification**:
  - Digital Clipping detection flags frames with $|x| \ge 0.995$.
  - Noise Floor is calculated from the 10th percentile of frame RMS energy.
  - Signal-to-Noise Ratio (SNR) estimate:
    $$\text{SNR}_{\text{dB}} \approx 20 \log_{10}\left(\frac{\text{RMS}_{90\%}}{\max(\text{RMS}_{10\%}, 10^{-5})}\right)$$
  - Audio shorter than 0.5s or containing total silence ($\text{peak} < 10^{-4}$) is rejected with validation errors.

---

## 3. Transcription & Forced Alignment

1. **Primary ASR**: OpenAI Whisper (`tiny`/`base`) generates verbatim text and segment-level or word-level timestamps with token probabilities.
2. **Acoustic Syllable & Pause-Aware Fallback**:
   - When the user supplies their own transcript, speech intervals are partitioned by Voice Activity Detection (VAD) pause boundaries.
   - Syllable nuclei are mapped to local RMS peaks (Mermelstein heuristic) using a 50ms Hanning smoothing filter.
   - Transcript words are anchored between pause intervals to guarantee temporally realistic bounds even in offline or low-compute conditions.

---

## 4. Acoustic Feature Extraction Formulation

- **Short-Time Frame Parameters**:
  - Window Length: $N = 512$ samples ($32\text{ ms}$).
  - Hop Length: $H = 160$ samples ($10\text{ ms}$).
- **RMS Energy Contour**:
  $$\text{RMS}[m] = \sqrt{\frac{1}{N} \sum_{n=0}^{N-1} x[mH + n]^2}$$
- **Pitch Tracking (Fundamental Frequency $F_0$)**:
  - Estimated using the **YIN algorithm** with cumulative mean normalized difference across human voice fundamental ranges ($65\text{ Hz} \le F_0 \le 380\text{ Hz}$).
- **Speaker-Agnostic Pitch Normalization**:
  To ensure natural biological voice differences (e.g., deep male vs high female voices) are not treated as errors, pitch is converted to semitones relative to the speaker's own voiced median $F_{0,\text{med}}$:
  $$\text{Pitch}_{\text{semitones}}[m] = 12 \log_2\left(\frac{F_0[m]}{F_{0,\text{med}}}\right)$$
- **Spectral Centroid (Vocal Brightness & Consonant Articulation)**:
  $$\text{Centroid}[m] = \frac{\sum_{k=0}^{K-1} f_k |X[m, k]|}{\sum_{k=0}^{K-1} |X[m, k]|}$$
- **Mel-Frequency Cepstral Coefficients (MFCC)**: 13-dimensional cepstral vectors capturing vocal tract resonance and spectral envelope shape.

---

## 5. Contrastive Comparison Engine & Dynamic Time Warping (DTW)

- **Acoustic Sequence Alignment**:
  - When comparing a participant with an ideal baseline speaking the same text, time-series vectors are aligned using DTW with cosine distance:
    $$D(i, j) = d(x_i, y_j) + \min(D(i-1, j), D(i, j-1), D(i-1, j-1))$$
- **Documented DTW Limitations**:
  - DTW enforces a monotonic alignment path. While effective for rate-varied phrases, it can cause artificial time warping during long pauses if not bounded.
  - To prevent distortion, SpeechCoach AI segments signals into speech bursts and silence intervals before applying DTW.

---

## 6. Temporal Flaw Grounding Algorithms

The system detects defects across 8 distinct forensic flaw categories:
1. **Long or poorly placed pauses**: Unvoiced intervals exceeding threshold $\tau_{\text{pause}} = 0.80\text{s}$ (or $\Delta > 0.45\text{s}$ relative to baseline).
2. **Excessively fast speech**: Local sliding window speech rate exceeding $185\text{ WPM}$.
3. **Excessively slow speech**: Local speech rate dragging below $100\text{ WPM}$.
4. **Monotone delivery**: Voiced regions $\ge 1.5\text{s}$ with pitch standard deviation $\sigma_{\text{semitones}} < 1.2\text{ st}$.
5. **Unusual pitch variation**: Erratic jumps spanning $>8.0\text{ semitones}$ in short intervals.
6. **Inconsistent vocal energy**: Sudden power collapses $>65\%$ within an active clause.
7. **Unclear articulation**: Spectral centroid depressed below $1200\text{ Hz}$ with muffled consonants.
8. **Emphasis mismatch**: Missing rhetorical peak energy when baseline emphasizes key phrases.

---

## 7. Rubric Scoring Architecture

The overall delivery score is a linear weighted sum of five normalized category scores (each $0\text{--}100$):
$$\text{Score}_{\text{overall}} = \sum_{c=1}^{5} w_c \cdot \text{Score}_c, \quad \text{where } \sum_{c=1}^{5} w_c = 1.0$$
Standard competition weights:
- **Pacing**: $w_1 = 0.25$
- **Pause Management**: $w_2 = 0.20$
- **Pitch & Vocal Variation**: $w_3 = 0.20$
- **Vocal Energy & Consistency**: $w_4 = 0.15$
- **Articulation & Clarity**: $w_5 = 0.20$

Deductions are applied per detected flaw based on its grounded severity ($\text{mild} = -4\text{p}$, $\text{moderate} = -8\text{p}$, $\text{severe} = -15\text{p}$). Scores are clamped to $[0, 100]$.
