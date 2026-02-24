#!/usr/bin/env python3
"""
Kirtos NLP Intent Classifier — Training Script
Uses scikit-learn TF-IDF + LinearSVC for fast, offline intent classification.

Training data is expanded with:
 - Natural language paraphrases
 - Common voice-transcription typos
 - Conversational wrappers ("can you", "please", "I want to")
 - Colloquial/informal phrasing
"""

import json
import os
import pickle
import random
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score
import numpy as np

# =====================================================
# TRAINING DATA — comprehensive examples per intent
# =====================================================
TRAINING_DATA = {
    # ── Chat / Conversation ──────────────────────────
    "chat.message": [
        "how are you", "what's up", "hello there", "hey kirtos", "good morning",
        "good night", "what do you think about this", "tell me something interesting",
        "who are you", "what can you do", "are you alive", "how's it going",
        "is utkarsh normal or abnormal", "do you like pizza", "what is love",
        "I'm bored", "talk to me", "hi", "thank you", "goodbye", "see you later",
        "you're the best", "I like you", "what is your name", "whats your favorite color",
        "how old are you", "where are you from", "are you real", "do you have feelings",
        "can you think", "are you intelligent", "what do you know", "i am sad",
        "i feel happy today", "whats your opinion on AI", "do you sleep",
        "are you a robot", "tell me about yourself", "i don't know what to say",
        "can you help me with something", "that's awesome", "nice job",
        "well done", "i appreciate it", "thanks a lot", "you're welcome",
        "lol", "haha", "that's funny", "interesting", "cool", "okay",
        "fine", "sure", "alright", "not bad", "whatever", "i see",
        "tell me more", "go on", "continue", "elaborate", "can we chat",
        "let's have a conversation", "just wanna talk", "I need someone to talk to",
        "what should i eat today", "should i go out today", "what do you recommend",
        "whats new", "anything interesting happening", "is AI taking over the world",
        # ── GeniSys Dataset — Conversational ──
        "my user is adam", "this is adam", "i am adam", "it is adam",
        "my user is bella", "this is bella", "i am bella", "it is bella",
        "how are you doing", "hope you are doing well",
        "good thanks my user is adam", "great thanks this is bella",
        "what is my name", "what do you call me", "who do you think I am",
        "what do you think I am", "who are you talking to",
        "what name do you call me by", "tell me my name",
        "what is your name", "what could I call you", "what can I call you",
        "what do your friends call you", "tell me your name",
        "what is your real name", "your real name", "your real name please",
        "OK thank you", "OK thanks", "OK", "thanks", "that's helpful",
        "I am not talking to you", "I was not talking to you",
        "not talking to you", "wasn't for you", "wasn't meant for you",
        "do you understand what I am saying", "do you understand me",
        "do you know what I am saying", "do you get me", "comprendo",
        "know what I mean",
        "be quiet", "stop talking", "enough talking", "please be quiet", "shhh",
        "bye", "adios", "goodbye",
        "thanks bye", "thanks for the help goodbye", "thank you bye",
        "thank you goodbye", "thanks goodbye",
        "can you see me", "do you see me", "identify me", "who am I please",
        "you are very clever", "you are very intelligent", "you are a genius",
        "clever girl", "genius",
        "can you prove you are self-aware", "can you prove you are self aware",
        "can you prove you have a conscious", "prove you have a conscious",
        "I am bored gossip with me", "got any gossip",
        "I want to hear some gossip", "tell me some gossip",
        "any gossip", "tell me some more gossip",
        "open the pod bay door", "pod bay door",
        "why not", "surely you can", "tell me why",
    ],

    "query.greet": [
        "hi kirtos", "hello", "hey", "good morning kirtos", "good evening",
        "yo", "sup", "whats up", "howdy", "greetings", "namaste", "hola",
        "hi there", "good afternoon", "hey buddy", "hey there kirtos",
        "what's going on", "how do you do", "hey assistant", "morning",
        "evening", "hi bot", "hello assistant", "hey AI",
        # ── GeniSys Dataset — Greetings ──
        "hya", "hya there", "hello there",
        "hi how are you", "hello how are you", "hola how are you",
        "how are you doing", "hope you are doing well",
        "hello hope you are doing well",
    ],

    "query.time": [
        "what time is it", "what's the time", "tell me the time", "what is the current time",
        "time please", "whats the time now", "current time", "clock",
        "how late is it", "what time do we have", "give me the time",
        "can you tell me the time", "what's the clock say", "check the time",
        "time right now", "what hour is it", "do you know the time",
        "time check", "whats the current time", "time kya hai",
        # ── GeniSys Dataset — Time ──
        "what is the time", "do you know what time it is",
        "tell me what time it is", "time",
    ],

    "query.help": [
        "help", "help me", "what can you do", "show me commands", "list commands",
        "what are your abilities", "what features do you have", "i need help",
        "how does this work", "show me what you can do", "what do you support",
        "list all features", "what commands are available", "what are the options",
        "how to use you", "guide me", "show instructions", "help menu",
        "what are your capabilities", "list everything you can do",
    ],

    # ── Browser ──────────────────────────────────────
    "browser.search": [
        "search for python tutorials", "google machine learning", "search youtube for cooking",
        "look up React documentation", "find information about black holes",
        "search the web for best laptops 2026", "google how to make pasta",
        "search for latest news", "look up weather forecast", "find restaurants near me",
        "search stack overflow for node js error", "google what is quantum computing",
        "web search for AI news", "search bing for smartphone reviews",
        "look up how to cook biryani", "google the meaning of life",
        "search for iphone 16 price", "find a good gym near me",
        "search how to learn python", "google best programming languages 2026",
        "look up train schedule", "search for flights to delhi",
        "find cheap hotels in goa", "google translate hello to hindi",
        "search for free courses online", "web search machine learning tutorials",
        "find out about the latest iphone", "search for recipe of pasta",
        "google symptoms of cold", "look up cricket score",
        "search for movies releasing this week", "find best books on AI",
        "google distance from delhi to mumbai", "search for jobs in tech",
        "look up stock market today", "search directions to airport",
    ],

    "browser.open": [
        "open google.com", "open youtube", "go to github.com", "open reddit",
        "visit twitter.com", "open localhost 3000", "go to amazon.com",
        "navigate to docs.python.org", "open the website example.com",
        "browse to vercel.com", "open wikipedia.org", "visit linkedin.com",
        "go to facebook.com", "open instagram.com", "navigate to netflix.com",
        "browse to stackoverflow.com", "open chatgpt.com", "go to figma.com",
        "open hacker news", "visit product hunt", "open mail.google.com",
        "open calendar.google.com", "go to notion.so", "open trello.com",
    ],

    "browser.play_youtube": [
        "play lofi beats on youtube", "play despacito on youtube",
        "youtube play funny cat videos", "play music on youtube",
        "play arijit singh songs on youtube", "watch marvel trailer on youtube",
        "play coding music youtube", "youtube play relaxing music",
        "play diljit dosanjh on youtube", "play interstellar soundtrack on youtube",
        "play some jazz on youtube", "watch ted talk on youtube",
        "play bollywood songs youtube", "play workout music on youtube",
        "youtube play baby shark", "play piano music on youtube",
        "watch how to make butter chicken on youtube", "play kk songs on youtube",
        "play edm on youtube", "youtube play lo fi hip hop",
        "play eminem songs on youtube", "watch cricket highlights on youtube",
        "play classical music youtube", "play meditation music on youtube",
        "play ap dhillon on youtube", "watch movie trailer on youtube",
        "play chill vibes on youtube", "youtube play study music",
    ],

    # ── WhatsApp ──────────────────────────────────────
    "whatsapp.connect": [
        "connect whatsapp", "connect to whatsapp", "start whatsapp",
        "setup whatsapp", "whatsapp connect", "link whatsapp",
        "open whatsapp", "initialize whatsapp", "connect my whatsapp",
        "connect whatapp", "connect watsapp", "start my whatsapp",
        "launch whatsapp", "enable whatsapp", "activate whatsapp",
        "pair whatsapp", "login to whatsapp", "sign in to whatsapp",
        "whatsapp login", "whatsapp setup", "can you connect whatsapp",
        "please connect to whatsapp", "i want to use whatsapp",
    ],

    "whatsapp.send": [
        "send whatsapp to 919876543210 hello", "send message to utkarsh on whatsapp hello",
        "whatsapp utkarsh that i will be late", "send whatsapp message to mom saying call me",
        "message vaibhav on whatsapp hi there", "send msg to utkarsh on whatapp that i will not come today",
        "whatsapp 919876543210 hey there", "send a whatsapp to rahul saying lets meet",
        "text utkarsh on whatsapp are you coming", "write a whatsapp to priya hi how are you",
        "send massage to utkarsh on whatsapp that i will be there by 8 pm",
        "wa utkarsh that im running late", "send whatsapp to vaibaav that i will not come today",
        "message 919876543210 on whatsapp good morning",
        "send whatsapp to dad saying pick me up", "whatsapp mom i love you",
        "message rahul on whatsapp lets play cricket", "send a wa to utkarsh saying thanks",
        "whatsapp message to friend that party is cancelled",
        "send whatsapp msg to bro saying where are you",
        "text mom on whatsapp that dinner is ready", "whatsapp dad good morning",
        "send to utkarsh on wa that meeting is at 5", "msg utkarsh on whatsapp come fast",
        "whatsapp to vaibhav saying happy birthday", "send whatsapp to sister good night",
        "send a msg on whatsapp to rahul invitation for party",
        "whatsapp priya that i will call later", "message utkarsh whatsapp hi bro",
        "can you send a whatsapp message to utkarsh saying hello",
        "please message rahul on whatsapp that im busy",
    ],

    "whatsapp.read": [
        "read whatsapp messages", "show my whatsapp messages", "read my messages on whatsapp",
        "check whatsapp", "any new whatsapp messages", "whatsapp messages",
        "show recent whatsapp chats", "read latest whatsapp", "check my whatsapp inbox",
        "get whatsapp messages", "read all messages from whatsapp", "unread whatsapp messages",
        "can you read all the messages from whatsapp", "show whatsapp chats",
        "do i have any whatsapp messages", "check for new messages on whatsapp",
        "read my wa messages", "any messages on whatsapp", "whatsapp inbox",
        "show me my whatsapp", "what messages do i have on whatsapp",
        "check unread whatsapp", "open my whatsapp messages",
    ],

    "whatsapp.status": [
        "whatsapp status", "is whatsapp connected", "is whatsapp running",
        "whatsapp connection status", "check whatsapp connection",
        "am i connected to whatsapp", "is my whatsapp linked",
        "whatsapp connection check", "status of whatsapp",
    ],

    "whatsapp.disconnect": [
        "disconnect whatsapp", "stop whatsapp", "close whatsapp",
        "disconnect from whatsapp", "turn off whatsapp", "logout from whatsapp",
        "whatsapp disconnect", "unlink whatsapp", "exit whatsapp",
        "end whatsapp session", "sign out of whatsapp",
    ],

    # ── System ────────────────────────────────────────
    "system.status": [
        "system status", "how is the system", "system health", "system info",
        "show system status", "computer status", "is the system running fine",
        "check system health", "system diagnostics", "how's the computer",
        "is everything okay", "status check", "computer health check",
    ],

    "system.uptime": [
        "system uptime", "how long has the computer been on", "machine uptime",
        "how long has it been running", "uptime", "show uptime",
        "how long is the system up", "computer uptime", "when did i turn on the computer",
        "how long since last reboot", "time since boot",
    ],

    "system.resource_usage": [
        "resource usage", "cpu usage", "memory usage", "ram usage",
        "show resources", "how much memory is being used", "disk usage",
        "show cpu and ram", "system resources", "check cpu", "check ram",
        "how much disk space is left", "processor usage", "memory consumption",
        "is the cpu overloaded", "show resource usage",
    ],

    "system.volume.set": [
        "set volume to 50", "volume 80 percent", "turn the volume up",
        "turn volume down", "increase volume", "decrease volume",
        "set volume to maximum", "volume to 30 percent", "change volume to 60",
        "lower the volume", "raise the volume", "volume up",
        "volume down", "make it louder", "make it quieter",
        "set sound to 70", "put volume at 40", "crank up the volume",
        "reduce volume to 20", "volume 100", "full volume",
        "half volume", "volume 50 percent", "adjust volume to 75",
        "turn up the speaker", "lower the sound", "increase the audio",
    ],

    "system.volume.mute": [
        "mute", "mute the sound", "unmute", "toggle mute", "silence the computer",
        "mute volume", "turn off sound", "quiet", "shut up", "silence",
        "mute audio", "mute the speaker", "turn on sound", "unmute audio",
        "mute the computer", "stop all sound",
    ],

    "system.brightness.set": [
        "set brightness to 50", "increase brightness", "decrease brightness",
        "brightness 80 percent", "turn up the brightness", "dim the screen",
        "make screen brighter", "brightness to maximum", "lower brightness",
        "change brightness to 40", "make it brighter", "make it dimmer",
        "screen brightness to 70", "full brightness", "minimum brightness",
        "brighten the display", "reduce screen brightness", "adjust brightness",
        "brightness up", "brightness down", "dim display", "bright screen",
    ],

    "system.app.open": [
        "open terminal", "open safari", "launch chrome", "start vscode",
        "open finder", "open spotify", "launch xcode", "open slack",
        "start discord", "open activity monitor", "launch telegram",
        "open notes", "open calculator", "start preview",
        "open system preferences", "launch iterm", "open pages",
        "start keynote", "open photos", "launch mail",
        "open whatsapp desktop", "start zoom", "open teams",
        "launch adobe photoshop", "open figma", "start notion",
    ],

    "system.focus.set": [
        "enable do not disturb", "turn on focus mode", "disable do not disturb",
        "turn off focus", "activate dnd", "deactivate focus mode",
        "enable focus", "start do not disturb", "stop do not disturb",
        "focus mode on", "focus mode off", "turn on dnd",
        "turn off dnd", "enable quiet mode",
    ],

    "system.notification.show": [
        "show notification hello world", "send notification reminder meeting at 3",
        "notify me about the deadline", "create a notification",
        "display notification test", "push notification check",
        "send a reminder notification", "show alert meeting in 10 minutes",
        "notify me to drink water", "set notification for 5 pm",
    ],

    "system.kill_switch": [
        "enable kill switch", "disable kill switch", "turn on kill switch",
        "turn off kill switch", "activate kill switch", "emergency stop",
        "deactivate kill switch", "kill switch on", "kill switch off",
    ],

    # ── Knowledge ─────────────────────────────────────
    "knowledge.search": [
        "what is python", "who is elon musk", "tell me about artificial intelligence",
        "explain quantum computing", "what is machine learning", "who invented the telephone",
        "what is the capital of france", "history of india", "what is blockchain",
        "define neural network", "who is narendra modi", "what is javascript",
        "explain relativity theory", "wikipedia artificial intelligence",
        "search wikipedia for black holes", "tell me about the solar system",
        "what is photosynthesis", "who wrote hamlet", "when was india founded",
        "what is DNA", "how does the internet work", "what causes earthquakes",
        "who discovered gravity", "tell me about mars", "what is cryptocurrency",
        "explain how computers work", "what is the speed of light",
        "who is APJ Abdul Kalam", "tell me about world war 2",
        "what is climate change", "explain evolution",
        "what is the population of india", "who invented the light bulb",
        "tell me about the moon landing", "what is democracy",
        "how do airplanes fly", "what is the hadron collider",
        "who painted mona lisa", "what is the fibonacci sequence",
        "tell me about the renaissance", "what is dark matter",
        "who is albert einstein", "explain the big bang theory",
        "what is the meaning of philosophy", "tell me about alexander the great",
    ],

    # ── Fun ───────────────────────────────────────────
    "fun.joke": [
        "tell me a joke", "say something funny", "make me laugh",
        "joke please", "got any jokes", "tell a joke",
        "i want to hear a joke", "crack a joke", "humor me",
        "give me a joke", "another joke", "one more joke",
        "tell me a funny joke", "any good jokes", "joke time",
        "make me smile", "something humorous", "entertain me with a joke",
        "do you know any jokes", "tell a funny story",
        # ── GeniSys Dataset — Joke Requests ──
        "how about a joke", "i need cheering up",
        "cheer me up", "say a joke", "got a joke for me",
        "know any good jokes", "joke", "jokes please",
    ],

    # ── Media ─────────────────────────────────────────
    "media.play_music": [
        "play music", "play some songs", "play my music",
        "start playing music", "play beats", "play some tunes",
        "put on some music", "play a song", "start music",
        "turn on music", "play my playlist", "shuffle my music",
        "play random songs", "music please", "i want to listen to music",
        "can you play some music", "put on a song",
    ],

    "media.list_music": [
        "list my music", "show my songs", "what music do i have",
        "show music library", "list songs", "my music collection",
        "what songs are available", "show all music", "browse music library",
    ],

    # ── Communication ─────────────────────────────────
    "communication.send_message": [
        "send imessage to rahul how are you", "text mom saying dinner is ready",
        "send message to priya i will call you later", "imessage dad good morning",
        "message vaibhav on imessage lets play", "send text to utkarsh hello bro",
        "send sms to 9876543210 hey", "text dad i am coming home",
        "send a text to mom love you", "imessage friend that meeting is cancelled",
        "text vaibhav saying happy birthday", "message sister on imessage goodnight",
        "send imessage to boss that i am sick today",
        "text rahul that game starts at 7", "imessage priya are you free",
        "message dad that car needs service", "text brother to pick me up",
    ],

    # ── Screen Capture ────────────────────────────────
    "screen.capture": [
        "take a screenshot", "capture screen", "screenshot",
        "grab the screen", "take a screen capture", "snapshot",
        "capture my screen", "print screen", "screen grab",
        "take a snap of the screen", "capture the display",
        "screenshot this", "save screenshot", "screen capture now",
    ],

    # ── Clock / Timer ─────────────────────────────────
    "clock.alarm.set": [
        "set alarm for 7 am", "wake me up at 6", "set an alarm for tomorrow morning",
        "alarm at 8 30", "set alarm 5 am", "create alarm for 9 pm",
        "alarm 7 o'clock", "set morning alarm", "wake me at 6 30",
        "alarm for 10 pm", "set alarm for 5 in the morning",
        "can you set an alarm for 8 am", "put an alarm at 7",
    ],

    "clock.timer.start": [
        "set timer for 5 minutes", "start a timer for 10 minutes",
        "timer 3 minutes", "countdown 30 seconds", "set a 15 minute timer",
        "start timer for 1 hour", "timer 2 minutes", "set a countdown for 5 minutes",
        "start 30 second timer", "10 minute timer please",
        "set timer for 45 minutes", "can you set a timer for 20 minutes",
    ],

    # ── Shell / Code ──────────────────────────────────
    "shell.exec": [
        "run ls in terminal", "execute pwd", "run command git status",
        "terminal command top", "shell exec npm install", "run ps aux in the terminal",
        "execute the command df", "run git log", "terminal run whoami",
        "execute npm run dev", "shell run python test.py",
        "run curl google.com", "execute node index.js",
        "shell command cd Desktop", "run echo hello",
    ],

    "code.run": [
        "run python script", "execute this code", "run the node script",
        "compile and run", "execute python hello.py", "run script test.js",
        "run my code", "execute the program", "compile the code",
        "run this program", "start the script", "execute the script",
    ],

    # ── Docker ────────────────────────────────────────
    "docker.list": [
        "list docker containers", "show running containers", "docker ps",
        "list all containers", "show docker", "what containers are running",
        "docker container list", "show all docker containers",
        "which containers are up", "docker status",
    ],

    "docker.start": [
        "start docker container redis", "docker start nginx",
        "start container my-app", "spin up the postgres container",
        "start the redis container", "docker run my-app",
        "bring up the database container", "start mongo container",
    ],

    "docker.stop": [
        "stop docker container redis", "docker stop nginx",
        "stop container my-app", "shut down the postgres container",
        "kill the redis container", "docker stop all",
        "bring down the database container", "stop mongo container",
    ],

    "docker.restart": [
        "restart docker container redis", "docker restart nginx",
        "restart container my-app", "reboot the postgres container",
        "restart the redis container", "docker restart all",
        "bounce the database container", "restart mongo container",
    ],

    "docker.logs": [
        "show docker logs for redis", "docker logs nginx",
        "container logs my-app", "show logs for postgres",
        "docker container logs", "view logs of redis container",
        "tail docker logs for my-app", "get logs from mongo",
    ],

    # ── Network ───────────────────────────────────────
    "network.ping": [
        "ping google.com", "ping 8.8.8.8", "is google reachable",
        "check connection to github.com", "network ping",
        "ping localhost", "check if server is up", "can you ping example.com",
        "test network connection", "ping test",
    ],

    "network.scan": [
        "scan network", "network scan", "scan for devices",
        "show network devices", "who is on my network",
        "discover network devices", "list devices on wifi",
        "check connected devices", "network discovery",
    ],

    # ── File ──────────────────────────────────────────
    "file.read": [
        "read file config.json", "show contents of readme",
        "cat index.js", "view file package.json", "read the file",
        "display file contents", "show me the file readme.md",
        "open and read config.yaml", "read contents of .env",
    ],

    "file.write": [
        "write to file test.txt hello world", "create file notes.md",
        "save to file", "write file output.json",
        "create a new file called todo.txt", "write hello to test.txt",
        "save output to results.json", "create file and write data",
    ],

    "file.list": [
        "list files", "show files in directory", "ls the current folder",
        "what files are here", "show directory contents",
        "list all files", "show me the files", "directory listing",
        "what's in this folder", "files in the current directory",
    ],

    # ── Device Workflows ──────────────────────────────
    "device.morning_routine": [
        "start morning routine", "morning routine", "good morning routine",
        "start my day", "begin morning workflow", "run morning routine",
        "do the morning setup", "morning startup", "daily routine",
    ],

    "device.open_app": [
        "open the app spotify", "launch application chrome",
        "start app terminal", "open app calculator",
        "launch the app slack", "open application notes",
        "start the application zoom", "open the program vscode",
    ],

    "device.toggle_focus": [
        "toggle focus", "switch focus mode", "toggle do not disturb",
        "flip focus", "change focus state", "toggle dnd mode",
    ],

    "device.set_brightness": [
        "set device brightness", "brightness to 70", "adjust screen brightness",
        "device brightness 50", "change display brightness",
    ],

    "device.open_workspace": [
        "open workspace", "open my workspace", "switch to workspace",
        "open project workspace", "load workspace", "workspace open",
    ],

    "device.run_tests": [
        "run tests", "run the test suite", "execute tests",
        "run unit tests", "npm test", "run all tests",
        "start testing", "execute test suite", "test the code",
    ],

    "device.deploy_backend": [
        "deploy backend", "deploy the backend", "push to production",
        "deploy server", "deploy to production", "push backend",
        "release backend", "deploy the server",
    ],

    "device.restart_stack": [
        "restart stack", "restart the development stack", "restart all services",
        "reboot the stack", "restart everything", "restart dev environment",
    ],

    "device.clean_node_modules": [
        "clean node modules", "delete node_modules", "remove node_modules",
        "clear node modules", "nuke node_modules", "clean up node modules",
    ],

    "device.toggle_hotspot": [
        "toggle hotspot", "turn on hotspot", "turn off hotspot",
        "enable hotspot", "disable hotspot", "switch hotspot",
        "start hotspot", "stop hotspot",
    ],

    "device.mute_notifications": [
        "mute notifications", "silence notifications", "stop notifications",
        "disable notifications", "turn off notifications",
        "quiet notifications", "suppress notifications",
    ],

    "device.set_alarm": [
        "device set alarm 7 am", "set device alarm", "alarm for tomorrow",
        "set an alarm on the device", "device alarm 6 30 am",
    ],

    # ── Computer ──────────────────────────────────────
    "computer.type": [
        "type hello world", "type this text for me",
        "keyboard type something", "type the following",
        "computer type hello", "type out this message",
        "can you type this for me", "type these words",
    ],
}

# =====================================================
# DATA AUGMENTATION — generate more variations
# =====================================================

CONVERSATIONAL_PREFIXES = [
    "can you ", "could you ", "would you ", "please ", "i want to ",
    "i'd like to ", "can you please ", "would you please ", "i need to ",
    "hey can you ", "yo ", "just ", "quickly ", "go ahead and ",
]

TRAILING_PHRASES = [
    " please", " for me", " right now", " now", " quickly",
    " asap", " thanks", " thank you", " if you can",
]

def augment_data(data):
    """Add conversational wrappers to existing examples."""
    augmented = {}
    for intent, examples in data.items():
        augmented[intent] = list(examples)

        # Skip augmenting chat/greet — they're already conversational
        if intent in ('chat.message', 'query.greet'):
            continue

        for text in examples[:10]:  # Augment first 10 examples
            # Add 2 random prefixes
            for prefix in random.sample(CONVERSATIONAL_PREFIXES, min(2, len(CONVERSATIONAL_PREFIXES))):
                augmented[intent].append(f"{prefix}{text}")

            # Add 1 random trailing phrase
            suffix = random.choice(TRAILING_PHRASES)
            augmented[intent].append(f"{text}{suffix}")

    return augmented


def train():
    """Train the intent classifier and save to disk."""
    random.seed(42)
    print("📊 Building training data...")

    # Augment the data
    augmented = augment_data(TRAINING_DATA)

    texts = []
    labels = []

    for intent, examples in augmented.items():
        for text in examples:
            texts.append(text.lower().strip())
            labels.append(intent)

    print(f"   {len(texts)} examples across {len(set(labels))} intents")

    # Build the pipeline: TF-IDF + CalibratedClassifierCV(LinearSVC)
    # CalibratedClassifierCV gives us proper probability estimates
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 3),
            max_features=15000,
            sublinear_tf=True,
            strip_accents='unicode',
            analyzer='word',
            min_df=1,
        )),
        ('clf', CalibratedClassifierCV(
            LinearSVC(
                C=1.0,
                class_weight='balanced',
                max_iter=10000,
            ),
            cv=3,
            method='sigmoid'
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
        "can you search for python tutorials",
        "hey how are you doing",
        "turn on do not disturb",
        "run npm test",
    ]

    for text in test_cases:
        pred = pipeline.predict([text.lower()])[0]
        proba = pipeline.predict_proba([text.lower()])[0]
        confidence = float(np.max(proba))
        print(f"   {'✅' if confidence > 0.3 else '⚠️ '} \"{text}\" → {pred} ({confidence:.0%})")

    return pipeline


if __name__ == "__main__":
    train()
