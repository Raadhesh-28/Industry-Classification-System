# Functional Document

## 1. Introduction
The **Industry Classification System (Talent Intelligence Platform)** is an AI-driven platform designed to automate the ingestion, parsing, and classification of professional resumes. It leverages a Next.js front-end for user interaction and a FastAPI backend empowered with Machine Learning models and PostgreSQL (`pgvector`) to efficiently map candidate profiles to their respective target industries.

## 2. Product Goal
The primary objective of this product is to reduce the manual overhead of evaluating candidate resumes by leveraging Natural Language Processing (NLP). The platform aims to automatically infer the most suitable industry (e.g., Software Engineering, Healthcare, Finance) based on unstructured resume text, providing recruiters with highly accurate, searchable talent pools.

## 3. Demography (Users, Location)
- **Primary Users:** Human Resources (HR) Administrators, Technical Recruiters, and Talent Acquisition Specialists.
- **Location:** Global application; deployed via cloud infrastructure, accessible through modern web browsers independent of geographic limitations.

## 4. Business Processes
The core business workflow operates linearly:
1. **Document Ingestion:** A recruiter uploads a candidate's resume (PDF format) via the Next.js visual dashboard.
2. **Text Extraction:** The FastAPI backend securely receives the file and runs basic text extraction (or OCR fallbacks) to isolate raw candidate data.
3. **Machine Learning Inference:** The extracted payload is passed through the pre-loaded ML pipeline, returning a predicted Industry label alongside a statistical Confidence Score.
4. **Persistence:** The parsed data, classification results, and semantic embeddings are stored permanently via SQLAlchemy into a PostgreSQL database.
5. **Retrieval & Review:** Recruiters utilize semantic vector search on the dashboard to filter, review, or manually override the categorized candidates.

## 5. Features

### 5.1 Document Ingestion & Parsing
1. **Description:** A secured API endpoint and drag-and-drop UI component designed to accept incoming PDF resumes. The system validates MIME types before initiating asynchronous text extraction routines to prevent server blocking.
2. **User Story:** As a recruiter, I want to upload a batch of PDF resumes into the system so that I don't have to manually read each document before initial screening.

### 5.2 AI Industry Classification Engine
1. **Description:** The core ML inference module integrated within FastAPI. It tokenizes resume text and categorizes the candidate into predefined industries utilizing a trained classification model. 
2. **User Story:** As an HR administrator, I want the system to automatically tag a resume with an industry label and confidence score so I can quickly sort candidates into relevant talent pools.

### 5.3 Semantic Search Dashboard
1. **Description:** A responsive React (Next.js) interface that displays all classified resumes in a tabular/list view. It allows users to filter candidates by industry or execute similarity searches leveraging the database's `pgvector` HNSW indexes.
2. **User Story:** As a talent acquisition specialist, I want to search for specific skills (e.g., "React Native") via a search bar so that the system immediately returns the most relevant, pre-classified candidates.

## 6. Authorization Matrix

| Role | View Dashboard | Upload Resumes | Execute Searches | Override Classifications | Delete Records |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **System Admin** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Recruiter** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Read-Only Appraiser** | ✓ | ✗ | ✓ | ✗ | ✗ |

## 7. Assumptions
- **Format Requirements:** Submitted resumes are primarily well-formatted PDF files with extractable text layers (minimal scanned/image-only documents).
- **Backend Infrastructure:** The deployment environment has sufficient RAM to keep the NLP classification pipeline loaded in memory via FastAPI lifespan context managers, avoiding cold starts.
- **Database Support:** The PostgreSQL instance being used supports the installation of the `pgvector` extension for semantic search capabilities.
- **Data Availability:** The initial machine learning model is already trained and verified on an adequate dataset of resumes and job descriptions.
