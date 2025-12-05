# Billing Application

A full-stack billing application for managing clients, projects, time tracking, and invoice generation.

## Features

- **Client Management**: Create, view, update, and delete clients with contact information
- **Project Management**: Manage projects with billing codes, hourly rates, and active status
- **Time Tracking**: Log hours to active projects with descriptions
- **Invoice Generation**: Create professional PDF invoices using the existing invoice.py script
- **Dashboard**: View active projects with running totals and quick actions

## Architecture

- **Frontend**: React 18 with modern hooks and context API
- **Backend**: FastAPI with Python
- **Database**: MongoDB (local)
- **PDF Generation**: ReportLab via existing invoice.py script

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- MongoDB (running locally on default port 27017)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

   The application will be available at http://localhost:3000

### MongoDB Setup

Make sure MongoDB is running locally on the default port (27017). The application will automatically create the `billing_app` database and required collections.

## Usage

1. **Start with Clients**: Create your first client with contact information
2. **Add Projects**: Create projects for clients with billing rates and codes
3. **Track Time**: Use the dashboard to log hours to active projects
4. **Generate Invoices**: Create invoices for projects and download PDF files

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation.

## File Structure

```
billing-application/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main FastAPI application
│   ├── models.py           # Pydantic models
│   ├── database.py         # MongoDB connection
│   ├── routers/            # API route handlers
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context
│   │   └── utils/          # Utilities (API calls)
│   └── package.json        # Node dependencies
├── invoices/               # Generated PDF invoices
└── invoice.py              # PDF generation script
```

## Development Notes

- The frontend uses a proxy to the backend API (configured in package.json)
- All API calls go through the utils/api.js module
- State management uses React Context API
- The existing invoice.py script is integrated via subprocess calls
- PDF files are saved to the invoices/ directory

## Troubleshooting

- **MongoDB Connection**: Ensure MongoDB is running on localhost:27017
- **CORS Issues**: The backend is configured to allow requests from localhost:3000
- **PDF Generation**: Make sure the invoice.py script has the required dependencies (reportlab, python-dateutil)
- **File Permissions**: Ensure the invoices/ directory is writable
