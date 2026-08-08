# Fine-tuning ASR for Sheng

**Status: specified, not built.** The data-collection half (`/training`, the
review queue, the `sheng_*` tables) is live. This is what to do with the corpus.

## The problem, stated correctly

It is worth being precise, because the wrong framing sends you shopping for the
wrong product.

Sheng is not a TTS problem. Fish Audio, ElevenLabs and every other voice vendor
solve *speaking*. What breaks on Kenyan speech is *listening* — the model hears
"nitumie chwani mbili" and produces something that is not a payment instruction.
That is automatic speech recognition, and no commercial STT handles Sheng
code-switching acceptably, because there is essentially no Sheng in their
training data.

So: **Fish Audio is the mouth, a fine-tuned Whisper is the ears.**

## Why LoRA rather than full fine-tuning

Full fine-tuning of Whisper on a small in-domain corpus causes catastrophic
forgetting — the model gets better at your 2,000 clips and worse at everything
else, including the English and Kiswahili it already knew. Parameter-efficient
fine-tuning avoids that by freezing the base weights.

The published results are encouraging for a dataset of your likely size:

- [Fine-tuning Whisper Tiny for Swahili ASR](https://aclanthology.org/2025.africanlp-1.11/)
  (AfricaNLP 2025) — measurable gains from ~5,500 Swahili samples, with honest
  reporting of what stays broken: named entities and morphologically complex words.
- [Soft prompt tuning for code-switching ASR](https://arxiv.org/html/2506.21576) —
  directly on the code-switching case, which is what Sheng actually is.
- LoRA with ~2.6M trainable parameters reaches comparable WER to full
  fine-tuning across six low-resource languages.

Practical read: target **2,000+ reviewed clips** before the first run, expect the
first model to be mediocre, and treat WER on a held-out split as the only claim
you make about it.

## Pipeline

### 1. Export approved contributions

Only `status = 'approved'` rows, which means two independent reviewer verdicts
(`REQUIRED_REVIEWS` in `app/api/training/review/route.ts`). Where a reviewer
submitted a correction, the corrected text has already been promoted onto
`sheng_contributions.transcript`, so the column is always the best available label.

```sql
select c.id, c.audio_path, c.transcript, c.variety, c.duration_ms
from public.sheng_contributions c
where c.status = 'approved'
order by c.created_at;
```

Build a HuggingFace `audio`/`sentence` dataset from that plus signed URLs for
each `audio_path` in the `sheng-training-audio` bucket.

**Hold out a real test split.** Split by *contributor*, not by clip — a random
split leaks speaker identity across train and test and gives you a WER number
that flatters the model. Reserve ~15% of speakers, untouched.

### 2. Train on RunPod

Pick a single A40 or A100-40GB; `whisper-small` with LoRA fits comfortably and
is the right starting size. `whisper-large-v3` is better but not worth the cost
until the corpus justifies it.

```bash
pip install transformers datasets peft accelerate evaluate jiwer bitsandbytes
```

Shape of the run:

```python
from peft import LoraConfig, get_peft_model
from transformers import WhisperForConditionalGeneration

model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-small")
model = get_peft_model(model, LoraConfig(
    r=32, lora_alpha=64, lora_dropout=0.05,
    target_modules=["q_proj", "v_proj"],   # attention projections only
    bias="none",
))
model.print_trainable_parameters()   # expect ~1-3M of ~240M
```

Set the tokenizer language to Swahili (`language="sw"`, `task="transcribe"`).
Sheng is closer to Swahili than to English, and starting from the Swahili token
distribution converges faster than starting from English.

### 3. Evaluate honestly

Report WER on the held-out speakers, and report it **per variety** — the
`variety` column exists for this. A model that is excellent at `swahili` and
useless at `sheng` will show a good aggregate number and fail in production,
because production is mostly Sheng.

Also compute WER on a *pre-fine-tuning* baseline with the same script. Without
it you cannot claim the fine-tune helped.

### 4. Serve and wire in

Serve the merged adapter behind an OpenAI-compatible `/v1/audio/transcriptions`
endpoint (faster-whisper or vLLM both do this). Then, in `voice-agent/.env`:

```bash
ONGEA_STT=whisper_sheng
ONGEA_STT_BASE_URL=https://your-gpu-host/v1
ONGEA_STT_MODEL=whisper-sheng-lora
```

`build_stt()` in `voice-agent/agent.py` already branches on this. No agent code
changes.

### 5. Registry (to build)

A `sheng_models` table — `version`, `base_model`, `train_clip_count`,
`wer_overall`, `wer_by_variety jsonb`, `artifact_path`, `created_at` — plus an
admin page charting WER per run. Without it you have no way to tell whether run
7 was better than run 6.

Use the job pattern the codebase already has rather than inventing one: a table
with a partial index on status, a secret-gated worker route modelled on
`app/api/ncba/stk-sweep/route.ts` (including its `timingSafeEqual` check), an
n8n Schedule Trigger, and `hooks/use-transaction-polling.ts` on the status page.

## Cost

A `whisper-small` LoRA run over a few thousand clips is single-digit GPU-hours —
on the order of $2–10 per run on RunPod spot. This is cheap enough to iterate
weekly. The expensive input is reviewed audio, not compute.

## What this will not fix

- **Named entities.** Kenyan personal and business names stay hard; the AfricaNLP
  paper is explicit about this. Mitigate in the agent with contact-list biasing
  (`lib/contact-search.ts` already does fuzzy matching), not in the ASR.
- **Numbers under noise.** Amounts are the highest-stakes tokens in the whole
  system. Always read the amount back for confirmation regardless of ASR quality
  — that behaviour is already in the agent prompt and should never be removed on
  the grounds that the model "got good".
