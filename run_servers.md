# Running the Application

To test the full application, you will need to open **two separate terminal windows**.

### 1. Start the Backend Server (FastAPI)
In your first terminal window, run the following commands to start the intelligence engine and connect to your database:

```bash
cd /Users/raadey/SEPM/Industry-Classification-System/backend
source .venv/bin/activate
uvicorn main:app --reload
```
You should see output indicating it is running on `http://127.0.0.1:8000`

### 2. Start the Frontend Server (Next.js)
In your second terminal window, run the following commands to start the React UI:

```bash
cd /Users/raadey/SEPM/Industry-Classification-System/frontend
npm run dev
```
You should see output indicating it is running on `http://localhost:3000`

---
Once both are running, open your web browser and go to `http://localhost:3000`.
