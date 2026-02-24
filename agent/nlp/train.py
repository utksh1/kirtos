#!/usr/bin/env python3
"""
Kirtos NLP Intent Classifier — Training Script
Uses scikit-learn TF-IDF + LinearSVC for fast, offline intent classification.
"""

import json
import os
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score
import numpy as np

# =====================================================
# TRAINING DATA — examples for each intent
# =====================================================
TRAINING_DATA = {
    # ── Chat / Greetings ─────────────────────────────
    "chat.message": [
        "how are you",
        "what's up",
        "hello there",
        "hey kirtos",
        "good morning",
        "good night",
        "what do you think about this",
        "tell me something interesting",
        "who are you",
        "what can you do",
        "are you alive",
        "how's it going",
        "is Utkarsh normal or abnormal",
        "do you like pizza",
        "what is love",
        "I'm bored",
        "talk to me",
        "hi",
        "thank you",
        "goodbye",
        "see you later",
        "you're the best",
        "I like you",
        "what is your name",
        "whats your favorite color",
    ],

    "query.greet": [
        "hi kirtos",
        "hello",
        "hey",
        "good morning kirtos",
        "good evening",
        "yo",
        "sup",
        "whats up",
        "howdy",
        "greetings",
    ],

    "query.time": [
        "what time is it",
        "what's the time",
        "tell me the time",
        "what is the current time",
        "time please",
        "whats the time now",
        "current time",
        "clock",
        "how late is it",
        "what time do we have",
    ],

    "query.help": [
        "help",
        "help me",
        "what can you do",
        "show me commands",
        "list commands",
        "what are your abilities",
        "what features do you have",
        "i need help",
        "how does this work",
        "show me what you can do",
    ],

    # ── Browser ──────────────────────────────────────
    "browser.search": [
        "search for python tutorials",
        "google machine learning",
        "search youtube for cooking recipes",
        "look up React documentation",
        "find information about black holes",
        "search the web for best laptops 2026",
        "google how to make pasta",
        "search for latest news",
        "look up weather forecast",
        "find restaurants near me",
        "search stack overflow for node js error",
        "google what is quantum computing",
        "web search for AI news",
    ],

    "browser.open": [
        "open google.com",
        "open youtube",
        "go to github.com",
        "open reddit",
        "visit twitter.com",
        "open localhost 3000",
        "go to amazon.com",
        "navigate to docs.python.org",
        "open the website example.com",
        "browse to vercel.com",
    ],

    "browser.play_youtube": [
        "play lofi beats on youtube",
        "play despacito on youtube",
        "youtube play funny cat videos",
        "play music on youtube",
        "play arijit singh songs on youtube",
        "watch marvel trailer on youtube",
        "play coding music youtube",
        "youtube play relaxing music",
        "play diljit dosanjh on youtube",
        "play interstellar soundtrack on youtube",
    ],

    # ── WhatsApp ──────────────────────────────────────
    "whatsapp.connect": [
        "connect whatsapp",
        "connect to whatsapp",
        "start whatsapp",
        "setup whatsapp",
        "whatsapp connect",
        "link whatsapp",
        "open whatsapp",
        "initialize whatsapp",
        "connect my whatsapp",
        "connect whatapp",
    ],

    "whatsapp.send": [
        "send whatsapp to 919876543210 hello",
        "send message to utkarsh on whatsapp hello",
        "whatsapp utkarsh that i will be late",
        "send whatsapp message to mom saying call me",
        "message vaibhav on whatsapp hi there",
        "send msg to utkarsh on whatapp that i will not come today",
        "whatsapp 919876543210 hey there",
        "send a whatsapp to rahul saying lets meet",
        "text utkarsh on whatsapp are you coming",
        "write a whatsapp to priya hi how are you",
        "send massage to utkarsh on whatsapp that i will be there by 8 pm",
        "wa utkarsh that im running late",
        "send whatsapp to vaibaav that i will not come today",
        "message 919876543210 on whatsapp good morning",
    ],

    "whatsapp.read": [
        "read whatsapp messages",
        "show my whatsapp messages",
        "read my messages on whatsapp",
        "check whatsapp",
        "any new whatsapp messages",
        "whatsapp messages",
        "show recent whatsapp chats",
        "read latest whatsapp",
        "check my whatsapp inbox",
        "get whatsapp messages",
        "read all messages from whatsapp",
        "unread whatsapp messages",
        "can you read all the messages from whatsapp",
    ],

    "whatsapp.status": [
        "whatsapp status",
        "is whatsapp connected",
        "is whatsapp running",
        "whatsapp connection status",
        "check whatsapp connection",
        "am i connected to whatsapp",
    ],

    "whatsapp.disconnect": [
        "disconnect whatsapp",
        "stop whatsapp",
        "close whatsapp",
        "disconnect from whatsapp",
        "turn off whatsapp",
        "logout from whatsapp",
    ],

    # ── System ────────────────────────────────────────
    "system.status": [
        "system status",
        "how is the system",
        "system health",
        "system info",
        "show system status",
        "computer status",
    ],

    "system.uptime": [
        "system uptime",
        "how long has the computer been on",
        "machine uptime",
        "how long has it been running",
        "uptime",
        "show uptime",
    ],

    "system.resource_usage": [
        "resource usage",
        "cpu usage",
        "memory usage",
        "ram usage",
        "show resources",
        "how much memory is being used",
        "disk usage",
        "show cpu and ram",
    ],

    "system.volume.set": [
        "set volume to 50",
        "volume 80 percent",
        "turn the volume up",
        "turn volume down",
        "increase volume",
        "decrease volume",
        "set volume to maximum",
        "volume to 30 percent",
        "change volume to 60",
        "lower the volume",
    ],

    "system.volume.mute": [
        "mute",
        "mute the sound",
        "unmute",
        "toggle mute",
        "silence the computer",
        "mute volume",
        "turn off sound",
    ],

    "system.brightness.set": [
        "set brightness to 50",
        "increase brightness",
        "decrease brightness",
        "brightness 80 percent",
        "turn up the brightness",
        "dim the screen",
        "make screen brighter",
        "brightness to maximum",
        "lower brightness",
        "change brightness to 40",
    ],

    "system.app.open": [
        "open terminal",
        "open safari",
        "launch chrome",
        "start vscode",
        "open finder",
        "open spotify",
        "launch xcode",
        "open slack",
        "start discord",
        "open activity monitor",
    ],

    "system.focus.set": [
        "enable do not disturb",
        "turn on focus mode",
        "disable do not disturb",
        "turn off focus",
        "activate dnd",
        "deactivate focus mode",
        "enable focus",
    ],

    "system.notification.show": [
        "show notification hello world",
        "send notification reminder meeting at 3",
        "notify me about the deadline",
        "create a notification",
        "display notification test",
    ],

    "system.kill_switch": [
        "enable kill switch",
        "disable kill switch",
        "turn on kill switch",
        "turn off kill switch",
        "activate kill switch",
        "emergency stop",
    ],

    # ── Knowledge ─────────────────────────────────────
    "knowledge.search": [
        "what is python",
        "who is elon musk",
        "tell me about artificial intelligence",
        "explain quantum computing",
        "what is machine learning",
        "who invented the telephone",
        "what is the capital of france",
        "history of india",
        "what is blockchain",
        "define neural network",
        "who is narendra modi",
        "what is javascript",
        "explain relativity theory",
        "wikipedia artificial intelligence",
        "search wikipedia for black holes",
        "tell me about the solar system",
    ],

    # ── Fun ───────────────────────────────────────────
    "fun.joke": [
        "tell me a joke",
        "say something funny",
        "make me laugh",
        "joke please",
        "got any jokes",
        "tell a joke",
        "i want to hear a joke",
        "crack a joke",
        "humor me",
        "give me a joke",
    ],

    # ── Media ─────────────────────────────────────────
    "media.play_music": [
        "play music",
        "play some songs",
        "play my music",
        "start playing music",
        "play beats",
        "play some tunes",
        "put on some music",
        "play a song",
    ],

    "media.list_music": [
        "list my music",
        "show my songs",
        "what music do i have",
        "show music library",
        "list songs",
        "my music collection",
    ],

    # ── Communication ─────────────────────────────────
    "communication.send_message": [
        "send imessage to rahul how are you",
        "text mom saying dinner is ready",
        "send message to priya i will call you later",
        "imessage dad good morning",
        "message vaibhav on imessage lets play",
        "send text to utkarsh hello bro",
        "send sms to 9876543210 hey",
    ],

    # ── Screen Capture ────────────────────────────────
    "screen.capture": [
        "take a screenshot",
        "capture screen",
        "screenshot",
        "grab the screen",
        "take a screen capture",
        "snapshot",
        "capture my screen",
        "print screen",
    ],

    # ── Clock / Timer ─────────────────────────────────
    "clock.alarm.set": [
        "set alarm for 7 am",
        "wake me up at 6",
        "set an alarm for tomorrow morning",
        "alarm at 8 30",
        "set alarm 5 am",
        "create alarm for 9 pm",
    ],

    "clock.timer.start": [
        "set timer for 5 minutes",
        "start a timer for 10 minutes",
        "timer 3 minutes",
        "countdown 30 seconds",
        "set a 15 minute timer",
        "start timer for 1 hour",
    ],

    # ── Shell / Code ──────────────────────────────────
    "shell.exec": [
        "run ls in terminal",
        "execute pwd",
        "run command git status",
        "terminal command top",
        "shell exec npm install",
        "run ps aux in the terminal",
    ],

    "code.run": [
        "run python script",
        "execute this code",
        "run the node script",
        "compile and run",
        "execute python hello.py",
        "run script test.js",
    ],

    # ── Docker ────────────────────────────────────────
    "docker.list": [
        "list docker containers",
        "show running containers",
        "docker ps",
        "list all containers",
        "show docker",
        "what containers are running",
    ],

    "docker.start": [
        "start docker container redis",
        "docker start nginx",
        "start container my-app",
        "spin up the postgres container",
    ],

    "docker.stop": [
        "stop docker container redis",
        "docker stop nginx",
        "stop container my-app",
        "shut down the postgres container",
    ],

    "docker.restart": [
        "restart docker container redis",
        "docker restart nginx",
        "restart container my-app",
        "reboot the postgres container",
    ],

    "docker.logs": [
        "show docker logs for redis",
        "docker logs nginx",
        "container logs my-app",
        "show logs for postgres",
    ],

    # ── Network ───────────────────────────────────────
    "network.ping": [
        "ping google.com",
        "ping 8.8.8.8",
        "is google reachable",
        "check connection to github.com",
        "network ping",
    ],

    "network.scan": [
        "scan network",
        "network scan",
        "scan for devices",
        "show network devices",
        "who is on my network",
    ],

    # ── File ──────────────────────────────────────────
    "file.read": [
        "read file config.json",
        "show contents of readme",
        "cat index.js",
        "view file package.json",
        "read the file",
    ],

    "file.write": [
        "write to file test.txt hello world",
        "create file notes.md",
        "save to file",
        "write file output.json",
    ],

    "file.list": [
        "list files",
        "show files in directory",
        "ls the current folder",
        "what files are here",
        "show directory contents",
    ],

    # ── Device Workflows ──────────────────────────────
    "device.morning_routine": [
        "start morning routine",
        "morning routine",
        "good morning routine",
        "start my day",
        "begin morning workflow",
    ],

    "device.open_app": [
        "open the app spotify",
        "launch application chrome",
        "start app terminal",
        "open app calculator",
    ],

    "device.toggle_focus": [
        "toggle focus",
        "switch focus mode",
        "toggle do not disturb",
    ],

    "device.set_brightness": [
        "set device brightness",
        "brightness to 70",
        "adjust screen brightness",
    ],

    "device.open_workspace": [
        "open workspace",
        "open my workspace",
        "switch to workspace",
        "open project workspace",
    ],

    "device.run_tests": [
        "run tests",
        "run the test suite",
        "execute tests",
        "run unit tests",
        "npm test",
    ],

    "device.deploy_backend": [
        "deploy backend",
        "deploy the backend",
        "push to production",
        "deploy server",
    ],

    "device.restart_stack": [
        "restart stack",
        "restart the development stack",
        "restart all services",
        "reboot the stack",
    ],

    "device.clean_node_modules": [
        "clean node modules",
        "delete node_modules",
        "remove node_modules",
        "clear node modules",
    ],

    "device.toggle_hotspot": [
        "toggle hotspot",
        "turn on hotspot",
        "turn off hotspot",
        "enable hotspot",
        "disable hotspot",
    ],

    "device.mute_notifications": [
        "mute notifications",
        "silence notifications",
        "stop notifications",
        "disable notifications",
    ],

    "device.set_alarm": [
        "device set alarm 7 am",
        "set device alarm",
        "alarm for tomorrow",
    ],

    # ── Computer ──────────────────────────────────────
    "computer.type": [
        "type hello world",
        "type this text for me",
        "keyboard type something",
        "type the following",
        "computer type hello",
    ],
}


def train():
    """Train the intent classifier and save to disk."""
    print("📊 Building training data...")

    texts = []
    labels = []

    for intent, examples in TRAINING_DATA.items():
        for text in examples:
            texts.append(text.lower().strip())
            labels.append(intent)

    print(f"   {len(texts)} examples across {len(set(labels))} intents")

    # Build the pipeline: TF-IDF + LinearSVC
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 3),        # unigrams, bigrams, trigrams
            max_features=10000,
            sublinear_tf=True,
            strip_accents='unicode',
            analyzer='word',
            min_df=1,
        )),
        ('clf', LinearSVC(
            C=1.0,
            class_weight='balanced',
            max_iter=10000,
        ))
    ])

    # Cross-validation
    print("🧪 Cross-validating (5-fold)...")
    scores = cross_val_score(pipeline, texts, labels, cv=5, scoring='accuracy')
    print(f"   Accuracy: {scores.mean():.1%} ± {scores.std():.1%}")

    # Train on full data
    print("🧠 Training on full dataset...")
    pipeline.fit(texts, labels)

    # Save model
    model_path = os.path.join(os.path.dirname(__file__), "intent_model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(pipeline, f)

    print(f"✅ Model saved to {model_path}")
    print(f"   File size: {os.path.getsize(model_path) / 1024:.0f} KB")

    # Quick test
    print("\n🧪 Quick test:")
    test_cases = [
        "send massage to Utkarsh on whatsapp that i will be late",
        "play some lofi music on youtube",
        "what is the weather like today",
        "set volume to 50 percent",
        "tell me a joke",
        "read my whatsapp messages",
        "is Utkarsh normal or abnormal",
        "open spotify",
        "what time is it",
        "connect to whatsapp",
        "take a screenshot of the screen",
        "who is narendra modi",
    ]

    for text in test_cases:
        pred = pipeline.predict([text.lower()])[0]
        # Get confidence via decision function
        decision = pipeline.decision_function([text.lower()])
        confidence = float(np.max(decision)) / (float(np.max(decision)) + 1.0)  # Normalize to 0-1
        print(f"   {'✅' if confidence > 0.3 else '⚠️ '} \"{text}\" → {pred} ({confidence:.0%})")

    return pipeline


if __name__ == "__main__":
    train()
