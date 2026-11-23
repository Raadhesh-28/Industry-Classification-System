import re

# Valid industry categories supported by Strata
VALID_CATEGORIES = [
    "ACCOUNTANT",
    "BANKING",
    "BUSINESS-DEVELOPMENT",
    "CHEF",
    "CONSTRUCTION",
    "CONSULTANT",
    "DESIGNER",
    "DIGITAL-MEDIA",
    "ENGINEERING",
    "FINANCE",
    "HEALTHCARE",
    "HR",
    "INFORMATION-TECHNOLOGY",
    "PUBLIC-RELATIONS",
    "SALES",
]


class MLService:
    """Lightweight deterministic keyword classifier used as an offline fallback."""

    def predict_industry(self, resume_text: str) -> str:
        text = resume_text.lower()

        industry_keywords = {
            "ACCOUNTANT": ["tax", "audit", "accounting", "cpa", "ledger", "reconciliation", "gaap"],
            "BANKING": ["banking", "banker", "teller", "mortgage", "loan", "credit analyst", "retail banking"],
            "BUSINESS-DEVELOPMENT": ["business development", "bdr", "sdr", "lead generation", "cold calling", "strategic partnerships"],
            "CHEF": ["chef", "culinary", "kitchen", "cook", "pastry", "restaurant", "food preparation"],
            "CONSTRUCTION": ["construction", "superintendent", "project manager", "osha", "contractor", "blueprint", "site supervisor"],
            "CONSULTANT": ["consultant", "mckinsey", "bcg", "bain", "management consulting", "strategy", "advisory"],
            "DESIGNER": ["designer", "ux", "ui", "graphic design", "photoshop", "illustrator", "figma", "sketch"],
            "DIGITAL-MEDIA": ["seo", "sem", "digital marketing", "social media", "content creation", "copywriting", "campaign"],
            "ENGINEERING": ["engineer", "mechanical", "civil", "electrical", "autocad", "solidworks", "thermodynamics", "structural"],
            "FINANCE": ["finance", "investment banking", "financial analyst", "fp&a", "forecasting", "equities", "portfolio"],
            "HEALTHCARE": ["nurse", "rn", "doctor", "physician", "clinical", "patient care", "hospital", "healthcare"],
            "HR": ["hr", "human resources", "recruitment", "talent acquisition", "payroll", "onboarding", "employee relations"],
            "INFORMATION-TECHNOLOGY": ["software engineer", "developer", "python", "java", "c++", "react", "node", "aws", "docker", "kubernetes", "full stack"],
            "PUBLIC-RELATIONS": ["public relations", "pr", "media relations", "press release", "communications", "outreach"],
            "SALES": ["sales", "account executive", "b2b", "crm", "salesforce", "quota", "prospecting"],
        }

        scores = {category: 0 for category in VALID_CATEGORIES}

        for category, keywords in industry_keywords.items():
            for keyword in keywords:
                if re.search(r"\b" + re.escape(keyword) + r"\b", text):
                    scores[category] += 1

        best_category = max(scores, key=scores.get)
        if scores[best_category] == 0:
            return "INFORMATION-TECHNOLOGY"
        return best_category


ml_service = MLService()
