# Reproducible Evaluative Rubric & Scoring Methodology

**Multimodal AI Hackathon 2026 — Track C**  
**SpeechCoach AI**: Contrastive Speech Analytics & Temporal Flaw Grounding

---

## 1. Rubric Architecture & Weighting

SpeechCoach AI evaluates speech delivery using 5 configurable categories totaling **100%**:

| Dimension | Default Weight | Target Ideal Range | Measured Acoustic Indicator |
| :--- | :--- | :--- | :--- |
| **Pacing** | 25% ($w_1 = 0.25$) | 125 – 165 WPM | Syllable nucleus rate & WPM |
| **Pause Management** | 20% ($w_2 = 0.20$) | 14% – 26% silence ratio | VAD unvoiced interval duration |
| **Pitch & Vocal Variation** | 20% ($w_3 = 0.20$) | 3.0 – 7.0 semitones range | YIN $F_0$ normalized semitone std |
| **Vocal Energy & Consistency** | 15% ($w_4 = 0.15$) | 12 – 24 dB dynamic range | Short-time RMS contour stability |
| **Articulation & Clarity** | 20% ($w_5 = 0.20$) | 1600 – 3200 Hz centroid | Spectral centroid & flatness |

All weights are configurable in real time via `GET /api/rubric` and `POST /api/rubric`. When custom weights are submitted, the system auto-normalizes them to sum to $1.0$.

---

## 2. Category Mathematical Scoring Formulas

### A. Pacing Score ($S_{\text{pacing}} \in [10, 100]$)
- If $125 \le \text{WPM} \le 165$: Base score is $95\text{ points}$.
- If $\text{WPM} < 125$:
  $$\text{Base} = \max(40, 95 - (125 - \text{WPM}) \times 0.8)$$
- If $\text{WPM} > 165$:
  $$\text{Base} = \max(40, 95 - (\text{WPM} - 165) \times 0.8)$$
- Flaw Deduction: Sum of penalties for grounded pacing flaws ($\text{mild}: -4\text{p}$, $\text{moderate}: -8\text{p}$, $\text{severe}: -15\text{p}$).

### B. Pause Management Score ($S_{\text{pause}} \in [10, 100]$)
- Ideal Pause Ratio: $R_{\text{pause}} \in [14\%, 26\%]$.
- If $R_{\text{pause}} < 14\%$: $\text{Base} = \max(50, 95 - (14 - R_{\text{pause}}) \times 2.5)$.
- If $R_{\text{pause}} > 26\%$: $\text{Base} = \max(40, 95 - (R_{\text{pause}} - 26) \times 2.0)$.
- Deductions applied for detected prolonged pauses exceeding the 0.80s threshold.

### C. Pitch & Vocal Variation Score ($S_{\text{pitch}} \in [10, 100]$)
- Expressive semitone range: $\Delta_{\text{semitones}} \in [3.0, 7.0\text{ st}]$.
- If $\Delta_{\text{semitones}} < 3.0$: $\text{Base} = \max(35, 94 - (3.0 - \Delta_{\text{semitones}}) \times 18.0)$.
- Deductions applied for monotone segments ($\sigma_{\text{semitones}} < 1.2\text{ st}$) and erratic pitch swings ($>8.0\text{ st}$).

### D. Vocal Energy & Consistency Score ($S_{\text{energy}} \in [10, 100]$)
- Dynamic Range: $\text{DR}_{\text{dB}} \in [12, 24\text{ dB}]$.
- If $\text{DR}_{\text{dB}} < 12$: $\text{Base} = \max(45, 93 - (12 - \text{DR}_{\text{dB}}) \times 3.5)$.
- Deductions applied for sudden mid-phrase power drops $>65\%$.

### E. Articulation & Clarity Score ($S_{\text{articulation}} \in [10, 100]$)
- Target Spectral Centroid: $C \in [1600, 3200\text{ Hz}]$.
- If $C < 1600$: $\text{Base} = \max(40, 94 - (1600 - C) \times 0.05)$.
- Deductions applied for low centroid slurred or muffled intervals.

---

## 3. Overall Composite Score

$$\text{Score}_{\text{overall}} = w_1 S_{\text{pacing}} + w_2 S_{\text{pause}} + w_3 S_{\text{pitch}} + w_4 S_{\text{energy}} + w_5 S_{\text{articulation}}$$

---

## 4. Handling Missing or Unreliable Audio

1. **Unvoiced Pitch**: If speech is unvoiced or whispery, frames are marked `NaN` rather than injecting artificial pitch. Confidence is appropriately reduced.
2. **Short Clips**: Audio shorter than 0.5s is rejected outright by preprocessing validation.
3. **No Reference Baseline**: When user does not provide reference audio, the engine automatically switches to **Standalone Rubric Mode**, clearly indicated in the report without claiming false contrastive certainty.
