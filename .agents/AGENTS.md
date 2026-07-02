# VoxCommand Project Development Guidelines

This document serves as the architectural and design source of truth for the **VoxCommand** project. All agents and developers must strictly adhere to these guidelines to ensure consistency, security, and a premium user experience.

## 1. System Architecture

VoxCommand is a lightweight, client-heavy voice control service designed for high performance and local shell command automation.

### 1.1 Tech Stack
- **Backend API:** Node.js (v22.x+), Express.js.
- **Frontend / Client:** Vanilla JS / HTML / CSS (utilizing the `Web Speech API`).
- **Data Persistence:** Local JSON files (e.g., `commands.json`).
- **Process Management:** Shell scripts (`start.sh`, `stop.sh`) for background execution and logging.

### 1.2 Core Capabilities
- **Speech Recognition:** Client-side inference via `SpeechRecognition` API.
- **Speech Synthesis:** Client-side Text-to-Speech (TTS) via `SpeechSynthesis` API.
- **Fuzzy Token Matching:** Splits triggers and vocal input into token sets to allow natural, flexible command matching.
- **Host Execution:** Express backend uses `child_process.exec` to execute shell commands.

### 1.3 Security Constraints
- **LAN Restriction:** VoxCommand possesses host-level shell access. Always operate under the assumption that it is running in a trusted Local Area Network (LAN) or loopback environment.
- **Microphone Loop Prevention:** The client must temporarily halt the `SpeechRecognition` listener when TTS is active to prevent feedback loops.

## 2. UI/UX Design System

The application must deliver a **premium, "WOW" factor** user interface. Avoid basic or generic HTML forms. The design language emphasizes depth, responsiveness, and a modern aesthetic suited for a voice assistant dashboard.

### 2.1 Aesthetic Principles (Glassmorphism & Premium Design)
- **Glassmorphism:** Heavily utilize translucent, frosted-glass effects (`backdrop-filter: blur(10px)`) with semi-transparent, bright borders for the main dashboard, command lists, and control panels.
- **Color Palette:** Use deep, dark mode backgrounds (e.g., `#0f172a`, `#121212`) paired with vibrant glowing accents (e.g., neon cyan, electric purple, or vibrant green) for primary actions. Avoid flat, generic colors.
- **Typography:** Modern, clean, and highly readable fonts (e.g., Inter, Roboto, or Outfit) sourced from Google Fonts. Use stark white or off-white for primary text and muted colors for secondary information.

### 2.2 Core UI Components
- **The Glowing Microphone Orb:** The central interaction point must be an animated, glowing orb. 
  - **State - Inactive:** Subtle pulsing, dim glow.
  - **State - Listening:** Energetic pulsing, bright vibrant glow (e.g., neon blue/green) that scales with audio input if possible.
  - **State - Speaking/Executing:** Distinct color shift (e.g., purple/orange) with a stable or sweeping animation.
- **Activity Console:** A terminal-like output window styled with glassmorphism to display shell `stdout` and `stderr` streams cleanly. Include custom scrollbars.
- **Command Management Cards:** Command configurations should be displayed as sleek, hover-responsive cards.

### 2.3 Animations & Interactions
- **Micro-animations:** Implement smooth transitions (`transition: all 0.3s ease`) for all interactive elements. Buttons and cards should slightly elevate and glow on hover.
- **Dynamic Feedback:** Provide immediate visual feedback when a voice command is recognized (e.g., text fading in, checkmarks, success flashes).

## 3. Coding Standards & Conventions

### 3.1 Frontend
- **Semantic HTML:** Use proper HTML5 elements. Ensure the UI is fully responsive and centered.
- **Vanilla CSS:** Use native CSS variables (`--color-primary`, etc.) for theme tokens. Group styles logically and avoid inline styling.
- **JavaScript Structure:** Keep client-side logic modular. Separate API interaction logic, Speech API management, and UI state updates.

### 3.2 Backend (Node.js / Express)
- **Asynchronous Execution:** Ensure all `child_process.exec` or filesystem operations are handled non-blockingly. Use Promises/`async`/`await` for clean code structure.
- **JSON Formatting:** Maintain strict JSON formats for API payloads and configuration files. Return proper HTTP status codes (`200 OK`, `400 Bad Request`, `404 Not Found`).
- **Error Handling:** Gracefully handle execution errors (e.g., invalid shell commands) and relay the `stderr` string back to the client for display in the Activity Console.

## 4. Agent Workflow Rules

When working on this project, all AI agents must:
1. **Prioritize UI Quality:** Any frontend changes must adhere to the premium, glassmorphic design system and incorporate smooth animations.
2. **Respect the Flow:** Maintain the token-intersection matching logic and the Speech Synthesis loop prevention logic exactly as architected.
3. **No Unsafe Execution Changes:** Do not alter the fundamental way `child_process.exec` interacts with the host unless explicitly requested, due to the high security risks.
4. **Test & Verify:** Validate API responses against the specifications outlined in the `README.md`.
