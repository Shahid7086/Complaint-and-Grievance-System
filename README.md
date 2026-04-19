# Complaint and Grievance Management System

A full-stack web application designed to streamline the process of submitting, tracking, and resolving complaints. It features dedicated portals for both regular users and administrators.

## 🚀 Features

### For Users:
- **User Authentication:** Secure registration and login.
- **Submit Complaints:** Submit grievances with relevant details (Department, Subcategory, Description).
- **Track Status:** View the history and real-time status (Pending, In Progress, Resolved) of submitted complaints.
- **Responsive Dashboard:** A clean, modern interface to monitor all past and active grievances.

### For Administrators:
- **Admin Dashboard:** Centralized console to manage all incoming complaints.
- **Status Management:** Update complaint statuses as they are being resolved.
- **Department Routing:** Re-assign complaints to appropriate departments and subcategories.
- **Complaint History:** View a detailed audit trail of all status and department changes made to any complaint.
- **Analytics:** At-a-glance metrics showing total complaints, open cases, resolved cases, and resolution rate.

## 🛠️ Tech Stack

- **Frontend:** React.js, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Authentication:** JSON Web Tokens (JWT), bcrypt.js

## 📁 Project Structure

```text
grievance-system/
├── backend/               # Node.js & Express server
│   ├── models/            # MongoDB Schemas (User, Complaint, History)
│   ├── routes/            # API Endpoints (Auth, Complaints)
│   ├── middleware/        # JWT Authentication Middleware
│   └── server.js          # Entry point for the backend
│
└── frontend/              # React application
    ├── src/               # React components, styles, and logic
    └── public/            # Static assets
```

## ⚙️ Local Setup and Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally or MongoDB Atlas URI)

### 1. Clone the Repository
```bash
git clone https://github.com/Shahid7086/Complaint-and-Grievance-System.git
cd Complaint-and-Grievance-System
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory with the following variables:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/grievanceDB
JWT_SECRET=your_super_secret_key
ADMIN_EMAIL=admin@grievance.com
ADMIN_PASSWORD=admin123
```
Start the backend server:
```bash
npm start
```

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
```
Start the React development server:
```bash
npm start
```

## 🌐 Usage

1. Open `http://localhost:3000` in your browser.
2. **User Portal:** Create a new account or log in to submit a complaint.
3. **Admin Portal:** Use the admin credentials defined in your `.env` file to access the management dashboard.
