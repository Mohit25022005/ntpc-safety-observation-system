# NTPC Safety Management System

A web application designed for NTPC (National Thermal Power Corporation) to efficiently record and manage safety observations. This system allows users to submit detailed safety reports, upload supporting documents, and view previously submitted records.

---

## 📌 Overview

The NTPC Safety Management System allows users to record safety observations with key details like:

- User ID and name
- Safety zone and zone leaders
- Engineer-in-Charge (EIC)
- Department and EIC mobile number
- Specific location and observation description
- Optional file upload (PDF, JPG, DOC, up to 2MB)

---

## ✨ Features

- 📝 **Form Submission** with validation
- 📁 **File Uploads** via Cloudinary
- 🧾 **MongoDB Database Storage** for all observation data
- ✅ **Feedback System** for success/error messages
- 👁️ **View Observations Page** with file links
- 🛡️ Planned support for edit/delete and authentication

---

## 🧰 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **File Storage**: Cloudinary
- **Templating**: EJS (Embedded JavaScript)
- **Middleware**: Multer (file uploads), Morgan (logging)
- **Environment Management**: dotenv

---


## ⚙️ Prerequisites

Make sure you have:

- **Node.js** v20.16.0 or later
- **MongoDB** give mongo_uri in your .env file
- **Cloudinary Account** (sign up at [cloudinary.com](https://cloudinary.com))
  - Enable PDF delivery in **Settings → Security → Allow delivery of PDF and ZIP files**

- 
---

## dotenv file
- MONGO_URI=mongodb://localhost/ntpc_safety  or your mongo atlas uri
- PORT=3000
- CLOUDINARY_CLOUD_NAME=your_cloud_name
- CLOUDINARY_API_KEY=your_api_key
- CLOUDINARY_API_SECRET=your_api_secret

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ntpc-safety-system

npm install


