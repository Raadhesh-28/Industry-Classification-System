import re
import torch
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
import logging

logger = logging.getLogger(__name__)

# Valid categories matching the notebook's order
VALID_CATEGORIES = [
    'ACCOUNTANT', 'BANKING', 'BUSINESS-DEVELOPMENT', 'CHEF',
    'CONSTRUCTION', 'CONSULTANT', 'DESIGNER', 'DIGITAL-MEDIA', 'ENGINEERING',
    'FINANCE', 'HEALTHCARE', 'HR', 'INFORMATION-TECHNOLOGY',
    'PUBLIC-RELATIONS', 'SALES'
]

class MLService:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = None
        self.model = None
        self.is_loaded = False

    def load_model(self):
        try:
            logger.info("Loading DistilBERT base model...")
            self.tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')
            self.model = DistilBertForSequenceClassification.from_pretrained(
                'distilbert-base-uncased',
                num_labels=len(VALID_CATEGORIES)
            )
            self.model.to(self.device)
            self.model.eval()
            self.is_loaded = True
            logger.info("Model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load ML model: {e}")

    def clean_text_for_bert(self, text: str) -> str:
        text = re.sub(r'http\\S+', '', text)
        text = re.sub(r'[^a-zA-Z\\s]', '', text)
        text = re.sub(r'\\s+', ' ', text).strip()
        return text.lower()

    def predict_industry(self, resume_text: str) -> str:
        # Heuristic Keyword Scoring Engine to replace untrained model for MVP
        text = resume_text.lower()
        
        industry_keywords = {
            'ACCOUNTANT': ['tax', 'audit', 'accounting', 'cpa', 'ledger', 'reconciliation', 'gaap'],
            'BANKING': ['banking', 'banker', 'teller', 'mortgage', 'loan', 'credit analyst', 'retail banking'],
            'BUSINESS-DEVELOPMENT': ['business development', 'bdr', 'sdr', 'lead generation', 'cold calling', 'strategic partnerships'],
            'CHEF': ['chef', 'culinary', 'kitchen', 'cook', 'pastry', 'restaurant', 'food preparation'],
            'CONSTRUCTION': ['construction', 'superintendent', 'project manager', 'osha', 'contractor', 'blueprint', 'site supervisor'],
            'CONSULTANT': ['consultant', 'mckinsey', 'bcg', 'bain', 'management consulting', 'strategy', 'advisory'],
            'DESIGNER': ['designer', 'ux', 'ui', 'graphic design', 'photoshop', 'illustrator', 'figma', 'sketch'],
            'DIGITAL-MEDIA': ['seo', 'sem', 'digital marketing', 'social media', 'content creation', 'copywriting', 'campaign'],
            'ENGINEERING': ['engineer', 'mechanical', 'civil', 'electrical', 'autocad', 'solidworks', 'thermodynamics', 'structural'],
            'FINANCE': ['finance', 'investment banking', 'financial analyst', 'fp&a', 'forecasting', 'equities', 'portfolio'],
            'HEALTHCARE': ['nurse', 'rn', 'doctor', 'physician', 'clinical', 'patient care', 'hospital', 'healthcare'],
            'HR': ['hr', 'human resources', 'recruitment', 'talent acquisition', 'payroll', 'onboarding', 'employee relations'],
            'INFORMATION-TECHNOLOGY': ['software engineer', 'developer', 'python', 'java', 'c++', 'react', 'node', 'aws', 'docker', 'kubernetes', 'full stack'],
            'PUBLIC-RELATIONS': ['public relations', 'pr', 'media relations', 'press release', 'communications', 'outreach'],
            'SALES': ['sales', 'account executive', 'b2b', 'crm', 'salesforce', 'quota', 'prospecting']
        }
        
        scores = {category: 0 for category in VALID_CATEGORIES}
        
        for category, keywords in industry_keywords.items():
            for keyword in keywords:
                # Use word boundaries to avoid partial matches
                if re.search(r'\b' + re.escape(keyword) + r'\b', text):
                    scores[category] += 1
                    
        best_category = max(scores, key=scores.get)
        
        # Fallback if no keywords hit
        if scores[best_category] == 0:
            return "INFORMATION-TECHNOLOGY" # Default for MVP based on likely input
            
        return best_category

ml_service = MLService()
