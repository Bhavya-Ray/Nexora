import sounddevice as sd
import numpy as np
import requests
from faster_whisper import WhisperModel
import subprocess
import tempfile
import os
from scipy.io.wavfile import write

model = WhisperModel("base")

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3"

PIPER_EXE = r"C:\Users\sanja\Desktop\Bhavya\bgpt\piper_windows_amd64\piper\piper.exe"
VOICE_MODEL = r"C:\Users\sanja\Desktop\Bhavya\bgpt\piper_windows_amd64\piper\en_US-lessac-medium.onnx"

def record_audio():
    fs = 16000
    duration = 5

    print("Listening...")
    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1)
    sd.wait()

    temp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    write(temp.name, fs, recording)

    return temp.name

def speech_to_text(file):
    segments, _ = model.transcribe(file)
    text = ""

    for seg in segments:
        text += seg.text

    return text

def ask_llm(prompt):
    payload = {
        "model": MODEL,
        "prompt": f"System: You are a fast voice assistant running locally on the user's computer. Keep answers short, speak naturally, avoid long paragraphs, and answer like a helpful assistant. If the user asks coding questions, explain clearly and concisely.\nUser:{prompt}",
        "stream": False
    }

    try:
        r = requests.post(OLLAMA_URL, json=payload)
        r.raise_for_status()
        return r.json().get("response", "I generated an empty response.")
    except Exception as e:
        print(f"Error calling Ollama: {e}")
        return "I had trouble connecting to my brain."

def speak(text):
    if not os.path.exists(VOICE_MODEL):
        print(f"\n[!] Voice model not found at:\n{VOICE_MODEL}")
        print("Please download 'en_US-lessac-medium.onnx' and its '.json' file and place them in the piper folder before running.")
        return

    subprocess.run([
        PIPER_EXE,
        "-m",
        VOICE_MODEL,
        "-t",
        text
    ])

if __name__ == "__main__":
    print(f"Starting Voice Assistant using Piper at: {PIPER_EXE}")
    print("Ready to listen.")
    while True:
        try:
            audio = record_audio()
            text = speech_to_text(audio)

            print("You:", text)

            if text.strip() == "":
                continue

            response = ask_llm(text)
            print("AI:", response)

            speak(response)
        except KeyboardInterrupt:
            print("\nExiting voice assistant...")
            break
        except Exception as e:
            print(f"An error occurred: {e}")
