# 🎮 Paper.io Clone - Multiplayer Real-Time Game

A real-time multiplayer territory conquest game built with **React**, **Node.js**, and **Socket.io**. This project is fully containerized with **Docker** and includes **Cloudflare Tunneling** for instant global deployment.

![Game Preview](https://via.placeholder.com/800x400?text=Paper.io+Clone+Preview)

## 🚀 Features

* **Real-Time Multiplayer:** Seamless synchronization using Socket.io.
* **Territory Conquest:** Capture land by drawing loops; squash enemies to steal their progress.
* **Competitive Gameplay:**
    * **Tail Cut:** Cross an enemy's tail to eliminate them.
    * **Squash Mechanic:** Encircle an enemy completely to squash them!
    * **Global Leaderboard:** Track top players in real-time.
* **Cross-Platform:**
    * **Desktop:** Arrow key controls.
    * **Mobile:** Responsive touch D-Pad controls.
* **Deploy Anywhere:** Single-command deployment using **Docker Compose**.
* **Global Access:** Integrated **Cloudflare Tunnel** to share a public link with friends instantly.

---

## 🛠️ Tech Stack

* **Frontend:** React.js, HTML5 Canvas
* **Backend:** Node.js, Express, Socket.io
* **Containerization:** Docker, Docker Compose
* **Networking:** Cloudflare Tunnel (Cloudflared)

---

## ⚡ Quick Start (The Easy Way)

You do not need to install Node.js or any dependencies manually. You only need **Docker Desktop**.

### 1. Clone the Repository
```bash
git clone [https://github.com/YOUR_USERNAME/paper.io.git](https://github.com/YOUR_USERNAME/paper.io.git)
cd paper.io/paper-io-clone
2. Run with Docker ComposeThis command builds the game, sets up the server, and creates a public tunnel.Bashdocker compose up
3. Play!Local Access: Open your browser to http://localhost:4000.Global Access: Look at the terminal logs for the Cloudflare Magic Link:Plaintext+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at:                                          |
|  [https://random-name-here.trycloudflare.com](https://random-name-here.trycloudflare.com)                                                |
+--------------------------------------------------------------------------------------------+
Share this link with friends to play together over the internet!👨‍💻 Manual Installation (For Developers)If you want to modify the code and run it without Docker:PrerequisitesNode.js (v16 or higher)npm1. Install DependenciesBash# Install dependencies for both Frontend and Backend
npm install
2. Start the Backend ServerBashnode server/index.js
Server runs on port 4000.3. Start the Frontend (React)Open a new terminal:Bashnpm start
The game will launch at http://localhost:3000.🎮 ControlsDesktopKeyActionArrow UpMove UpArrow DownMove DownArrow LeftMove LeftArrow RightMove RightMobileUse the On-Screen D-Pad located at the bottom right of the screen.📂 Project StructurePlaintextpaper-io-clone/
├── .dockerignore       # Docker ignore rules
├── .gitignore          # Git ignore rules
├── docker-compose.yml  # Multi-container orchestration
├── Dockerfile          # Single-service build instructions
├── package.json        # Dependencies & Scripts
├── public/             # Static assets
├── README.md           # Project Documentation
├── server/             # Backend Logic
│   └── index.js        # Socket.io Server & Game Loop
└── src/                # React Frontend
    ├── components/     # GameCanvas & UI Components
    ├── App.js          # Main Component
    └── index.css       # Global Styles
🤝 ContributingContributions are welcome! Please follow these steps:Fork the repository.Create a feature branch (git checkout -b feature/NewFeature).Commit your changes.Push to the branch.Open a Pull Request.📜 LicenseThis project is open-source and available under the MIT License.