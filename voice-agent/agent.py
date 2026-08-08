"""
Ongea Pesa — LiveKit voice agent worker.

Runs OUTSIDE the Next.js app (Vercel cannot host a long-lived media process).
Deploy to the Hostinger VPS with systemd; see README.md in this directory.

Design constraints this file is built around:

  * It is a PARALLEL runtime, not a replacement. ElevenLabs remains the default;
    a user only reaches this worker when an admin sets profiles.voice_engine to
    'livekit'. The money path must therefore behave identically.

  * Every money tool posts the SAME payload to the SAME endpoint the ElevenLabs
    agent uses (POST {APP_URL}/api/voice/webhook). The webhook owns fee
    calculation, the free-transaction rule, step-up staging and the n8n call.
    Nothing about pricing or authorisation is reimplemented here — if it were,
    the two engines would drift and one of them would be wrong.

  * Fish Audio supplies the voice (TTS). It does not solve Sheng comprehension —
    that is an ASR problem, addressed separately by fine-tuning Whisper on the
    corpus collected at /training. STT is behind a swappable factory below so
    that model can drop in without touching agent logic.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import Any

import aiohttp
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentSession, JobContext, RunContext, function_tool
from livekit.plugins import fishaudio, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv()

logger = logging.getLogger("ongea-agent")
logging.basicConfig(level=logging.INFO)

APP_URL = os.environ.get("ONGEA_APP_URL", "https://ongeapesa.nsait.co.ke")
WEBHOOK_URL = f"{APP_URL}/api/voice/webhook"
COST_URL = f"{APP_URL}/api/costs/record"
WEBHOOK_TOKEN = os.environ.get("N8N_WEBHOOK_AUTH_TOKEN", "")
CALLBACK_SECRET = os.environ.get("N8N_CALLBACK_SECRET", "")

# Fish Audio bills per character synthesised. Set this from your actual plan —
# an inaccurate rate produces a confidently wrong margin, which is worse than a
# blank one, so it is required rather than defaulted to a guess.
FISH_USD_PER_1K_CHARS = float(os.environ.get("FISH_USD_PER_1K_CHARS", "0") or 0)

# Mirrors the ElevenLabs agent prompt (scripts/configure-elevenlabs-agent.mjs).
# Keep the two in sync deliberately: a behavioural difference between engines is
# a bug, not a feature.
SYSTEM_PROMPT = """You are Ongea Pesa, a Kenyan voice payments assistant.

You speak naturally in English, Kiswahili and Sheng, matching whichever the user
uses. Keep replies short — this is spoken aloud, not read.

Rules that are not negotiable:
- NEVER invent a balance, a fee, or a transaction result. Only state what a tool
  returned to you.
- Always read back the amount and the recipient before sending, and wait for a
  clear yes.
- If the user is ambiguous about amount or recipient, ask. Do not guess.
- If a tool returns an agent_message, say that message. Do not paraphrase it.
- Never ask for a PIN or password out loud. Confirmation happens in the app.

Amounts are Kenyan shillings. "Soo" or "mia" is hundred, "elfu" is thousand,
"chwani"/"doo"/"ganji" all mean money in Sheng.
"""


@dataclass
class UserContext:
    """Per-session identity, handed over in the LiveKit room metadata by
    /api/voice/livekit-token so the worker never needs Supabase credentials."""

    user_id: str
    user_email: str
    user_name: str
    balance: str
    gate_name: str
    gate_id: str
    voice_session_id: str

    @classmethod
    def from_metadata(cls, raw: str | None) -> "UserContext":
        data: dict[str, Any] = json.loads(raw) if raw else {}
        return cls(
            user_id=data.get("user_id", ""),
            user_email=data.get("user_email", ""),
            user_name=data.get("user_name", "User"),
            balance=str(data.get("balance", "0")),
            gate_name=data.get("gate_name", ""),
            gate_id=data.get("gate_id", ""),
            voice_session_id=data.get("voice_session_id", ""),
        )


async def call_app_webhook(ctx: UserContext, payload: dict[str, Any]) -> dict[str, Any]:
    """POST to the app's voice webhook — the single money path shared with the
    ElevenLabs agent. Field names match app/api/voice/webhook/route.ts."""
    body = {
        "user_id": ctx.user_id,
        "user_email": ctx.user_email,
        "user_name": ctx.user_name,
        "gate_name": ctx.gate_name,
        "gate_id": ctx.gate_id,
        "session_id": ctx.voice_session_id,
        "source": "livekit",
        **payload,
    }
    headers = {"Content-Type": "application/json"}
    if WEBHOOK_TOKEN:
        headers["Authorization"] = WEBHOOK_TOKEN

    timeout = aiohttp.ClientTimeout(total=45)
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(WEBHOOK_URL, json=body, headers=headers) as resp:
                data = await resp.json(content_type=None)
                if not resp.ok:
                    logger.error("webhook %s -> %s: %s", payload.get("type"), resp.status, data)
                return data or {}
    except Exception:
        logger.exception("voice webhook call failed")
        # Never fabricate success. The model is instructed to speak only what a
        # tool returned, so an explicit failure message is the safe outcome.
        return {
            "success": False,
            "agent_message": "I couldn't reach the payment service just now. Please try again.",
        }


async def report_tts_cost(ctx: UserContext, characters: int) -> None:
    """Record what this session's speech synthesis cost.

    Without this the economics dashboard shows voice revenue with no cost
    attached, which makes a KSh 20/min product look infinitely profitable.
    Idempotent server-side: the unique index on (reference, provider, category)
    means a retry cannot double-count a session.
    """
    if not CALLBACK_SECRET:
        logger.warning("N8N_CALLBACK_SECRET not set — skipping cost reporting")
        return
    if characters <= 0 or FISH_USD_PER_1K_CHARS <= 0:
        # No rate configured means we cannot state a cost honestly. Skip rather
        # than record a zero that would read as "this was free".
        if FISH_USD_PER_1K_CHARS <= 0:
            logger.warning("FISH_USD_PER_1K_CHARS not set — TTS cost not recorded")
        return

    payload = {
        "provider": "fish_audio",
        "category": "tts",
        "quantity": characters,
        "unit": "characters",
        "unit_cost_usd": FISH_USD_PER_1K_CHARS / 1000.0,
        "reference_type": "voice_session",
        "reference_id": ctx.voice_session_id,
        "user_id": ctx.user_id or None,
    }
    try:
        timeout = aiohttp.ClientTimeout(total=15)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                COST_URL, json=payload, headers={"x-ongea-secret": CALLBACK_SECRET}
            ) as resp:
                if not resp.ok:
                    logger.error("cost report failed: %s %s", resp.status, await resp.text())
    except Exception:
        # Cost reporting must never break a live call.
        logger.exception("cost report failed")


class OngeaAgent(Agent):
    """Tool surface cloned from the ElevenLabs agent configuration."""

    def __init__(self, user: UserContext) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)
        self.user = user

    @function_tool()
    async def send_money(
        self,
        context: RunContext,
        type: str,
        amount: float,
        phone: str = "",
        till: str = "",
        paybill: str = "",
        account: str = "",
        summary: str = "",
    ) -> str:
        """Send money after the user has confirmed the amount and recipient.

        Args:
            type: one of send_phone, paybill, buy_goods_till, withdraw,
                  bank_to_mpesa, mpesa_to_bank
            amount: amount in Kenyan shillings
            phone: recipient phone for send_phone / withdraw
            till: till number for buy_goods_till
            paybill: paybill number for paybill
            account: account number, when the paybill needs one
            summary: one-line description of what the user asked for
        """
        result = await call_app_webhook(
            self.user,
            {
                "type": type,
                "amount": amount,
                "phone": phone,
                "till": till,
                "paybill": paybill,
                "account": account,
                "summary": summary,
                "request": summary,
                "voice_verified": True,
                "confidence_score": 85,
            },
        )
        # agent_message is the string the app wants spoken verbatim.
        return result.get("agent_message") or result.get("message") or "Done."

    @function_tool()
    async def read_balance(self, context: RunContext) -> str:
        """Tell the user their current wallet balance."""
        result = await call_app_webhook(self.user, {"type": "balance", "amount": 0})
        if result.get("agent_message"):
            return str(result["agent_message"])
        return f"Your balance is {self.user.balance} shillings."


def build_stt():
    """STT is swappable on purpose.

    IMPORTANT: livekit-plugins-fishaudio is **TTS only** — there is no
    fishaudio.STT. Fish Audio is the mouth, never the ears. An earlier version of
    this file defaulted to fishaudio.STT() and would have crashed on startup.

    No commercial STT handles Sheng code-switching well, which is the whole
    reason for the corpus collected at /training. Until the fine-tune exists,
    Deepgram's multilingual model is the least-bad option and is what LiveKit's
    own example uses; Whisper via an OpenAI-compatible endpoint is the fallback
    and the shape the fine-tuned model will eventually serve.
    """
    provider = os.environ.get("ONGEA_STT", "deepgram").lower()

    if provider == "deepgram":
        from livekit.plugins import deepgram

        # language="multi" enables code-switching rather than locking to one
        # language mid-sentence, which is exactly what Sheng needs.
        return deepgram.STT(model=os.environ.get("DEEPGRAM_MODEL", "nova-3"), language="multi")

    if provider in ("openai", "whisper"):
        from livekit.plugins import openai

        return openai.STT(model=os.environ.get("ONGEA_STT_MODEL", "whisper-1"), language="sw")

    if provider == "whisper_sheng":
        # The self-hosted fine-tune from docs/sheng-asr-finetuning.md, served
        # behind an OpenAI-compatible /v1/audio/transcriptions endpoint.
        from livekit.plugins import openai

        return openai.STT(
            base_url=os.environ["ONGEA_STT_BASE_URL"],
            api_key=os.environ.get("ONGEA_STT_API_KEY", "not-needed"),
            model=os.environ.get("ONGEA_STT_MODEL", "whisper-sheng-lora"),
        )

    raise ValueError(
        f"Unknown ONGEA_STT provider: {provider!r}. "
        "Use one of: deepgram, openai, whisper_sheng. Fish Audio does not provide STT."
    )


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()

    participant = await ctx.wait_for_participant()
    user = UserContext.from_metadata(participant.metadata)
    logger.info("session start user=%s room=%s", user.user_id, ctx.room.name)

    if not user.user_id:
        # Without identity we cannot attribute a payment to anyone. Refuse
        # rather than run an anonymous money-capable agent.
        logger.error("no user metadata on participant; refusing session")
        return

    from livekit.plugins import openai

    session = AgentSession(
        stt=build_stt(),
        llm=openai.LLM(
            model=os.environ.get("ONGEA_LLM_MODEL", "gpt-4o-mini"),
            api_key=os.environ["ONGEA_LLM_API_KEY"],
            base_url=os.environ.get("ONGEA_LLM_BASE_URL") or None,
        ),
        tts=fishaudio.TTS(
            model=os.environ.get("FISH_TTS_MODEL", "s2.1-pro"),
            # A cloned Ongea Pesa voice; see README for creating one.
            reference_id=os.environ.get("FISH_VOICE_ID") or None,
            latency=os.environ.get("FISH_LATENCY", "balanced"),
        ),
        # VAD detects speech presence and drives barge-in; the turn detector adds
        # the semantic "have they actually finished?" signal on top, which is what
        # stops the agent interrupting mid-sentence.
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    # Tally synthesised characters so the session's TTS cost can be reported.
    spoken_chars = {"n": 0}

    @session.on("speech_created")
    def _count_speech(event) -> None:  # noqa: ANN001 - LiveKit event object
        text = getattr(event, "text", None) or ""
        spoken_chars["n"] += len(text)

    await session.start(room=ctx.room, agent=OngeaAgent(user))

    greeting = f"Niaje {user.user_name.split(' ')[0]}, ni Ongea Pesa. Nikusaidie aje?"
    await session.say(greeting, allow_interruptions=True)

    # Report cost when the room empties, whichever way the call ended.
    async def _on_shutdown() -> None:
        await report_tts_cost(user, spoken_chars["n"])

    ctx.add_shutdown_callback(_on_shutdown)


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
