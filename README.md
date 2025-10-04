# 🌍 EnviroMon: Full-Stack IoT Microclimate Monitoring System 🌡️💨

**Project Type:** Undergraduate Thesis / Capstone Project

This project implements a comprehensive, end-to-end (full-stack) Internet of Things (IoT) solution for localized environmental (microclimate) monitoring. It transitions from a typical academic prototype into a robust, self-hosted platform designed with **production-ready practices** and a modern technology stack.

---

## ✨ Live Demo

[![Open Live Demo](https://img.shields.io/badge/Open-Live_Demo-brightgreen?style=for-the-badge&logo=vercel)](https://enviromon.ir)
> **Click the button above to view the live project.**

---


## ✨ Key Features & Achievements

* **Full-Stack Architecture:** A complete, integrated system spanning hardware (Perception Layer), data communication (Network Layer), and a modern Web UI (Application Layer).
* **Production-Ready Backend:** The Flask/Python API is configured to run efficiently using a robust **SQLAlchemy ORM** and supports scalable deployment via **PostgreSQL** or simple self-hosting with SQLite.
* **Microclimate Data Collection:** Utilizes low-cost, multi-sensor hardware (ESP32-S3) to collect high-fidelity data on **Temperature, Humidity, Barometric Pressure, Air Quality (MQ-135), and Light Intensity.**
* **Intuitive User Interface (UI):** A modern, responsive dashboard built with **React and Tailwind CSS** for real-time data visualization and historical analysis.
* **System Stability Proof:** Successfully completed a **72-hour continuous operation test** to demonstrate system reliability and data stability.

---

## 🏗️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Hardware** | **ESP32-S3** | Microcontroller with integrated Wi-Fi for efficient data acquisition and transmission. |
| **Sensors** | **DHT22, BMP280, MQ-135, TEMT6000** | Comprehensive environmental parameter coverage. |
| **Firmware** | **Arduino/C++** | Logic for sensor reading, data formatting (JSON), and robust HTTP communication. |
| **Backend (API)**| **Python / Flask** | Lightweight, high-performance API endpoints for data ingestion and retrieval. |
| **Database** | **PostgreSQL / SQLite** | Scalable relational database model (defined by SQLAlchemy) for secure data storage. |
| **Frontend (UI)**| **React, Tailwind CSS, Recharts**| Modern, component-based interface for dynamic real-time charting and historical views. |

---

## 📊 System Architecture

The system follows a standard three-layer IoT architecture, optimized for performance and self-hosting:

1.  **Perception Layer:** The ESP32-S3 microcontroller collects data from the connected sensors.
2.  **Network Layer:** Data is securely packaged (JSON) and transmitted via **HTTP/Wi-Fi** to the self-hosted API.
3.  **Application Layer:** The Flask API validates and stores the data in the PostgreSQL/SQLite database. The React frontend then fetches this data to render live and historical charts for the end-user.

---
## Acknowledgements

This work is submitted as a final project for the Bachelor of Science in Mechanical Engineering at Shahid Beheshti University. I would like to express my sincere gratitude to my supervisor, [Dr. Abbas Rouhani](https://scholar.google.com/citations?user=YtyojdAAAAAJ&hl=en), for his invaluable guidance and support throughout this project.

--- 
## 🚀 Getting Started / Local Setup

Follow the steps below to run this project on your local machine.

**Prerequisites:**
* Git
* Python 3.10+ and `pip`
* Node.js 18+ and `npm`

```bash
# 1. Clone the repository
git clone https://github.com/soootode/EnviroMon
cd EnviroMon

# 2. Set up the Backend
cd backend
python -m venv venv
# On Windows, run: venv\Scripts\activate
# On macOS/Linux, run: source venv/bin/activate
pip install -r requirements.txt
python app.py &

# 3. Set up the Frontend (in a new terminal)
cd frontend
npm install
npm run dev
---


