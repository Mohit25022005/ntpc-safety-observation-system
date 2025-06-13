# NTPC Safety Management System

A web application designed for NTPC (National Thermal Power Corporation) to efficiently record and manage safety observations. This system allows users to submit detailed safety reports, upload supporting documents, and view previously submitted records.

---

## 📌 Overview

The NTPC Safety Management System allows users to record safety observations with key details like:

* User ID and name
* Safety zone and zone leaders
* Engineer-in-Charge (EIC)
* Department and EIC mobile number
* Specific location and observation description
* Optional file upload (PDF, JPG, DOC, up to 2MB)

---

## ✨ Features

* 📝 **Form Submission** with validation
* 📁 **File Uploads** via Cloudinary
* 📟 **MongoDB Database Storage** for all observation data
* ✅ **Feedback System** for success/error messages
* 👁️ **View Observations Page** with file links
* 🛡️ Planned support for edit/delete and authentication

---

## 🧰 Tech Stack

* **Backend**: Node.js, Express.js
* **Database**: MongoDB with Mongoose
* **File Storage**: Cloudinary
* **Templating**: EJS (Embedded JavaScript)
* **Middleware**: Multer (file uploads), Morgan (logging)
* **Environment Management**: dotenv

---

## ⚙️ Prerequisites

Make sure you have:

* **Node.js** v20.16.0 or later
* **MongoDB** (local or MongoDB Atlas)
* **Cloudinary Account** (sign up at [cloudinary.com](https://cloudinary.com))

  * Enable PDF delivery in **Settings → Security → Allow delivery of PDF and ZIP files**

---

## 🔢 .env file

```
MONGO_URI=mongodb://localhost/ntpc_safety
PORT=3000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd ntpc-safety-system
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Start the Web App

```bash
nodemon server.js
```

---

## 🔄 NLP Microservice Integration (Duplicate Detection)

This project includes a Python microservice that uses **NLP** to detect **duplicate near miss reports**.

### 🧠 What’s Used

* `FastAPI` for serving the similarity API
* `sentence-transformers` for semantic similarity
* `uvicorn` as the server runner

### 🧪 How It Works

Before saving a near miss report, the Node.js backend calls the `/similarity` endpoint of the Python service. If similarity with past reports is **greater than 85%**, the submission is flagged as duplicate.

### ▶️ Start or Restart the Python NLP Microservice

1. Navigate to the service folder:

```bash
cd nlp_service
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Start the service:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Available at: [http://localhost:8000/similarity](http://localhost:8000/similarity)

---


### Git Commands to Push Code

```bash
git init
git remote add origin https://github.com/your-username/ntpc-safety-system.git
git add .
git commit -m "Initial commit with Node + Python services"
git push -u origin main
```

---

