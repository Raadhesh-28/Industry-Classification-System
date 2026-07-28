# RMMM (Risk Mitigation, Monitoring, and Management) Plan
**Project:** Industry Classification System (Talent Intelligence Platform)

## Step 1: Forming a Risk Table

| RISK ID | RISKS | CATEGORY | PROBABILITY | IMPACT | RMMM |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | ML Classifier inaccurately categorizes niche edge-case resumes | TE | 60% | 2 | Add human-in-the-loop review, monitor confidence scores, retrain model frequently. |
| 2 | PDF text extractor fails on complex multi-column/custom layout structures | TE | 50% | 2 | Maintain reliable OCR fallback, allow manual user overrides for extracted skills. |
| 3 | DB connection pool exhaustion during concurrent batch uploads | PS | 40% | 2 | Optimize FastAPI dependency injection, configure PgBouncer pooling, load test DB. |
| 4 | Security/Privacy breach exposing Personally Identifiable Information (PII) | BU | 30% | 1 | Redact PII before persistence, secure endpoints with JWT, encrypt PostgreSQL volumes. |


## Step 2: Sort the risks in descending order based on probability of risk occurrence

| RISK ID | RISKS | CATEGORY | PROBABILITY | IMPACT | RMMM |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | ML Classifier inaccurately categorizes niche edge-case resumes | TE | 60% | 2 | Add human-in-the-loop review, monitor confidence scores, retrain model frequently. |
| 2 | PDF text extractor fails on complex multi-column/custom layout structures | TE | 50% | 2 | Maintain reliable OCR fallback, allow manual user overrides for extracted skills. |
| 3 | DB connection pool exhaustion during concurrent batch uploads | PS | 40% | 2 | Optimize FastAPI dependency injection, configure PgBouncer pooling, load test DB. |
| 4 | Security/Privacy breach exposing Personally Identifiable Information (PII) | BU | 30% | 1 | Redact PII before persistence, secure endpoints with JWT, encrypt PostgreSQL volumes. |

## Step 3: Form a Risk Information Sheet (RIS) for each Risk separately.

### Risk Information Sheet (RIS) for Risk ID: 1
| Risk ID: 1 | Date: 16/04/2026 | Probability: 60% | Impact: 2 |
| :--- | :--- | :--- | :--- |
| **Description** | ML logic misclassifies complex, niche, or newly-defined job roles. |
| **Refinement & Context** | **Sub condition 1:** Ambiguous candidate wording creates noise in feature extraction.<br>**Sub condition 2:** Training set under-represented certain modern tech industries. |
| **Mitigation & Monitoring Strategies** | 1. Monitor predictions with low confidence thresholds.<br>2. Build a dashboard for HR admins to manually override wrong classifications. |
| **Contingency Plan and Management** | 1. Rollback the active classification model to the previous stable checkpoint if anomaly rate spikes.<br>2. Manually patch data dictionaries for missing keywords. |
| **Trigger** | More than 10% of new resumes are manually reclassified by admins. |
| **Status** | Monitoring in progress |
| **Assigned To:** | ML Engineer | **Originator:** | Data Scientist |


### Risk Information Sheet (RIS) for Risk ID: 2
| Risk ID: 2 | Date: 16/04/2026 | Probability: 50% | Impact: 2 |
| :--- | :--- | :--- | :--- |
| **Description** | PDF parsing module crashes or scrambles text on complex, multi-column resume layouts. |
| **Refinement & Context** | **Sub condition 1:** Candidates use heavy graphical templates and non-standard fonts.<br>**Sub condition 2:** Extracted text strings lose spatial context and get merged. |
| **Mitigation & Monitoring Strategies** | 1. Implement a robust OCR fallback library beyond simple PDF text extraction.<br>2. Log all failed parse attempts.<br>3. Allow users to manually paste raw text as an alternative. |
| **Contingency Plan and Management** | 1. Automatically flag unparseable documents for human review and notify the applicant. |
| **Trigger** | Parsing exception/error rate exceeds 5% of daily uploads. |
| **Status** | Mitigation actions initiated |
| **Assigned To:** | Backend Developer | **Originator:** | QA Lead |


### Risk Information Sheet (RIS) for Risk ID: 3
| Risk ID: 3 | Date: 16/04/2026 | Probability: 40% | Impact: 2 |
| :--- | :--- | :--- | :--- |
| **Description** | PostgreSQL database connection pool exhaustion under high concurrent resume processing loads. |
| **Refinement & Context** | **Sub condition 1:** FastAPI background jobs or endpoints do not adequately close SQLAlchemy sessions.<br>**Sub condition 2:** Batch resume upload endpoint allows too many parallel requests. |
| **Mitigation & Monitoring Strategies** | 1. Refactor Dependency Injection to strictly use Context Managers (`yield` sessions correctly).<br>2. Monitor active DB connections via Prometheus/Grafana. |
| **Contingency Plan and Management** | 1. Install and configure PgBouncer to efficiently manage the connection pool limits.<br>2. Rate-limit the batch upload API endpoint. |
| **Trigger** | Backend generates "Too many clients" SQL errors or query latency spikes over 1000ms. |
| **Status** | Monitoring in progress |
| **Assigned To:** | DevOps Engineer | **Originator:** | Backend Tech Lead |


### Risk Information Sheet (RIS) for Risk ID: 4
| Risk ID: 4 | Date: 16/04/2026 | Probability: 30% | Impact: 1 |
| :--- | :--- | :--- | :--- |
| **Description** | Security/Privacy breach exposing Personally Identifiable Information (PII) of applicants. |
| **Refinement & Context** | **Sub condition 1:** Uploaded resumes containing contact details are saved unmodified in cloud buckets with public access policies.<br>**Sub condition 2:** Missing authentication checks on API endpoints expose resumes to scrapers. |
| **Mitigation & Monitoring Strategies** | 1. Implement Named Entity Recognition (NER) to redact sensitive PII before persistence.<br>2. Strictly require JWT authorization for all read-routes. |
| **Contingency Plan and Management** | 1. Immediate termination of exposed endpoints and buckets; run incident response protocols.<br>2. Utilize encryption-at-rest for the PostgreSQL database volume and storage buckets. |
| **Trigger** | Unauthorized access probe logged or internal audit failure regarding data storage compliance. |
| **Status** | Mitigation actions initiated |
| **Assigned To:** | Application Security Lead | **Originator:** | Product Manager |
