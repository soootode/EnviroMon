# EnviroMon
# 🌍 Full-Stack IoT Microclimate Monitoring System 🌡️💨

**Project Type:** Undergraduate Thesis / Capstone Project

This project implements a comprehensive, end-to-end (full-stack) Internet of Things (IoT) solution for localized environmental (microclimate) monitoring. It transitions from a typical academic prototype into a robust, self-hosted platform designed with **production-ready practices** and a modern technology stack.

---

## ✨ Key Features & Achievements

* **Full-Stack Architecture:** Complete, integrated system spanning hardware (Perception Layer), data communication (Network Layer), and a modern Web UI (Application Layer).
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
| **Backend (API)** | **Python / Flask** | Lightweight, high-performance API endpoints for data ingestion and retrieval. |
| **Database** | **PostgreSQL / SQLite** | Scalable relational database model (defined by SQLAlchemy) for secure data storage. |
| **Frontend (UI)** | **React, Tailwind CSS, Recharts** | Modern, component-based interface for dynamic real-time charting and historical views. |

---

## 📊 System Architecture

The system follows a standard three-layer IoT architecture, optimized for performance and self-hosting:

1.  **Perception Layer:** ESP32-S3 collects data from connected sensors.
2.  **Network Layer:** Data is securely packaged (JSON) and transmitted via **HTTP/Wi-Fi** to the self-hosted API.
3.  **Application Layer:** The Flask API validates and stores data in the PostgreSQL/SQLite database. The React frontend fetches this data to render live and historical charts for the end-user.

---

## 🚀 Getting Started

*(You can add specific setup instructions here, e.g., cloning the repo, installing Python/Node dependencies, and running the Flask server)*

```bash
# 1. Clone the repository
git clone [YOUR_REPO_URL]
cd [YOUR_PROJECT_FOLDER]

# 2. Install Python dependencies (Backend)
pip install -r requirements.txt
# Set environment variable for DB (optional)

# 3. Install Node dependencies (Frontend)
cd frontend
npm install

# 4. Run the application
# Start Backend
python app.py & 
# Start Frontend
npm start
