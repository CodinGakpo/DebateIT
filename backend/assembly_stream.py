"""
Live microphone streaming to AssemblyAI for real-time transcription.

Usage:
  1) Set your API key:  $env:ASSEMBLYAI_API_KEY="your_key_here"   (PowerShell)
  2) Install deps (mic capture needs pyaudio):
       python -m pip install assemblyai==0.48.1 pyaudio
  3) Run:
       python assembly_stream.py
"""

import logging
import os
from typing import Type

import assemblyai as aai
from assemblyai.streaming.v3 import (
    BeginEvent,
    StreamingClient,
    StreamingClientOptions,
    StreamingError,
    StreamingEvents,
    StreamingParameters,
    StreamingSessionParameters,
    TerminationEvent,
    TurnEvent,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def on_begin(self: Type[StreamingClient], event: BeginEvent):
    logger.info("Session started: %s", event.id)


def on_turn(self: Type[StreamingClient], event: TurnEvent):
    # Print each partial/final transcript chunk
    logger.info("Transcript: %s (end_of_turn=%s)", event.transcript, event.end_of_turn)

    # Ask AssemblyAI to format the current turn once end_of_turn is reached
    if event.end_of_turn and not event.turn_is_formatted:
        params = StreamingSessionParameters(format_turns=True)
        self.set_params(params)


def on_terminated(self: Type[StreamingClient], event: TerminationEvent):
    logger.info("Session terminated: %.2f seconds processed", event.audio_duration_seconds)


def on_error(self: Type[StreamingClient], error: StreamingError):
    logger.error("Streaming error: %s", error)


def main():
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key:
        raise SystemExit("Set ASSEMBLYAI_API_KEY before running.")

    client = StreamingClient(
        StreamingClientOptions(
            api_key=api_key,
            api_host="streaming.assemblyai.com",
        )
    )

    client.on(StreamingEvents.Begin, on_begin)
    client.on(StreamingEvents.Turn, on_turn)
    client.on(StreamingEvents.Termination, on_terminated)
    client.on(StreamingEvents.Error, on_error)

    client.connect(
        StreamingParameters(
            sample_rate=16000,
            format_turns=True,
        )
    )

    try:
        # Requires microphone access and pyaudio installed.
        client.stream(aai.extras.MicrophoneStream(sample_rate=16000))
    finally:
        client.disconnect(terminate=True)


if __name__ == "__main__":
    main()
