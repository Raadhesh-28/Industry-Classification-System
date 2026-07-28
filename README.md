# Industry Classification System (Talent Intelligence Platform)

## Overview
The **Industry Classification System** is an AI-driven platform designed to automate the ingestion, parsing, and classification of professional resumes. It reduces the manual overhead of evaluating candidate resumes by leveraging Natural Language Processing (NLP) to infer the most suitable industry (e.g., Software Engineering, Healthcare, Finance) based on unstructured resume text.

## Features
- **Document Ingestion & Parsing:** Upload PDF resumes via a visual dashboard. The system performs text extraction to isolate candidate data.
- **AI Industry Classification Engine:** Analyzes tokenized resume text to categorize candidates into predefined industries, providing a predicted industry label and a confidence score.
- **Semantic Search Dashboard:** A responsive interface that displays classified resumes. Allows recruiters to filter candidates by industry or execute similarity searches using semantic vector search.

## Tech Stack
- **Frontend:** Next.js (React)
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL with `pgvector` for semantic search and embeddings storage
- **Machine Learning:** Custom NLP classification pipeline and semantic embeddings

## Prerequisites
- Node.js (for Next.js frontend)
- Python 3.8+ (for FastAPI backend)
- PostgreSQL database with the `pgvector` extension installed

## Running the Application

To test the full application locally, you will need to start both the backend and frontend servers in separate terminal windows.

### 1. Start the Backend Server (FastAPI)
In your first terminal window, start the intelligence engine and connect to your database:

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload
```
The backend API will run on `http://127.0.0.1:8000`.

### 2. Start the Frontend Server (Next.js)
In your second terminal window, start the React UI:

```bash
cd frontend
npm run dev
```
The frontend dashboard will be accessible at `http://localhost:3000`.

---
Once both are running, open your web browser and navigate to `http://localhost:3000` to interact with the platform.
