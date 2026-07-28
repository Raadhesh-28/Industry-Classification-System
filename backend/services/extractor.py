import re
import datetime

def get_experience_level(resume_text: str) -> str:
    text = resume_text.lower()
    
    # 1. Isolate the Experience section to avoid parsing non-work dates (Education, Certifications, etc)
    # We must match headers wrapped in newlines to avoid matching generic words in sentences
    pattern_start = r'\n\s*(?:work experience|experience|employment|work history|career history|professional background)\s*\n'
    start_match = re.search(pattern_start, '\n' + text + '\n') # Pad with newlines in case it's at the very top
    
    if start_match:
        exp_idx = start_match.end() - 1 # -1 for the padded newline
        # Find the end of the section (the next header)
        pattern_end = r'\n\s*(?:education|skills|certifications|projects|awards|publications|interests|volunteer|languages)\s*\n'
        end_match = re.search(pattern_end, text[exp_idx:])
        
        if end_match:
            end_idx = exp_idx + end_match.start()
            work_text = text[exp_idx:end_idx]
        else:
            work_text = text[exp_idx:]
    else:
        work_text = text
        
    # 2. Timeline parsing (Min-Max bounding)
    pattern = r'\b(19\d{2}|20\d{2})\b.{1,30}?\b(19\d{2}|20\d{2}|present|current)\b'
    matches = re.findall(pattern, work_text, re.IGNORECASE)
    
    years = []
    current_year = datetime.datetime.now().year
    
    if matches:
        for start, end in matches:
            try:
                years.append(int(start))
                if end.lower() in ['present', 'current']:
                    years.append(current_year)
                else:
                    years.append(int(end))
            except Exception:
                continue
                
    if years:
        total_years = max(years) - min(years)
        if total_years >= 10:
            return "Executive/Leadership (10+ years)"
        if 6 <= total_years < 10:
            return "Senior Level (6-10 years)"
        if 3 <= total_years < 6:
            return "Mid-Level (3-5 years)"
        if total_years < 3:
            return "Entry Level (0-2 years)"
            
    # 3. Fallbacks if timeline parsing fails (OCR degradation)
    if re.search(r'\bexecutive\b|\bvp\b|\bdirector\b|c-level|\bcto\b|\bceo\b', text):
        return "Executive/Leadership (10+ years)"
    if re.search(r'entry-level|entry level|recent graduate|intern', text):
        return "Entry Level (0-2 years)"
        
    pattern_explicit = r'(\b(?:[1-9]|1[0-9]|2[0-5])\b)\s*(?:\+|plus)?\s*year[s\']?'
    matches_explicit = re.findall(pattern_explicit, text)
    if matches_explicit:
        try:
            years_list = [int(m) for m in matches_explicit]
            max_years = max(years_list)
            if max_years >= 10:
                return "Executive/Leadership (10+ years)"
            if 6 <= max_years < 10:
                return "Senior Level (6-10 years)"
            if 3 <= max_years < 6:
                return "Mid-Level (3-5 years)"
            if max_years < 3:
                return "Entry Level (0-2 years)"
        except Exception:
            pass
            
    if re.search(r'\bsenior\b|\bsr\.|lead|manager|principal', text):
        return "Senior Level (6-10 years)"
    if re.search(r'\bjunior\b|\bjr\.', text):
        return "Entry Level (0-2 years)"
        
    return "Mid-Level (3-5 years)"


def get_secondary_industry(resume_text: str, primary_industry: str) -> str:
    text = resume_text.lower()
    scores = {}
    keywords = {}

    if primary_industry == "INFORMATION-TECHNOLOGY":
        scores = {"Software Development": 0, "Data Science/Analytics": 0, "Cybersecurity": 0, "DevOps/Infrastructure": 0, "Product Management": 0}
        keywords = {
            "Software Development": ['java', 'python', 'c#', '.net', 'javascript', 'react', 'angular', 'node.js', 'software engineer', 'developer', 'coding', 'programming'],
            "Data Science/Analytics": ['sql', 'tableau', 'power bi', 'pandas', 'numpy', 'scipy', 'machine learning', 'data analyst', 'data scientist', 'analytics', 'visualization', 'r', 'stata'],
            "Cybersecurity": ['cybersecurity', 'security', 'firewall', 'penetration testing', 'iam', 'siem', 'infosec', 'encryption', 'cissp', 'malware analysis'],
            "DevOps/Infrastructure": ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible', 'devops', 'ci/cd', 'infrastructure', 'sysadmin', 'network'],
            "Product Management": ['product manager', 'product owner', 'agile', 'scrum', 'user stories', 'product roadmap', 'market research', 'ux', 'ui']
        }
    elif primary_industry == "FINANCE":
        scores = {"Investment Banking": 0, "Corporate Finance": 0, "Quantitative Finance": 0}
        keywords = {
            "Investment Banking": ['investment banking', 'm&a', 'mergers', 'acquisitions', 'capital markets', 'due diligence'],
            "Corporate Finance": ['financial planning', 'fp&a', 'budgeting', 'forecasting', 'corporate finance'],
            "Quantitative Finance": ['quantitative', 'quant', 'stochastic', 'derivatives', 'financial modeling', 'c++']
        }
    elif primary_industry == "ENGINEERING":
        scores = {"Mechanical": 0, "Civil": 0, "Electrical": 0, "Software": 0}
        keywords = {
            "Mechanical": ['mechanical', 'solidworks', 'autocad', 'fea', 'thermodynamics', 'hvac'],
            "Civil": ['civil engineer', 'structural', 'geotechnical', 'autocad civil 3d', 'concrete', 'steel'],
            "Electrical": ['electrical', 'pcb', 'circuit', 'power systems', 'vlsi', 'matlab'],
            "Software": ['software engineer', 'developer', 'coding', 'programming', 'c++', 'python', 'java']
        }
    elif primary_industry == "ACCOUNTANT":
        scores = {"Tax": 0, "Audit": 0, "General Ledger": 0}
        keywords = {
            "Tax": ['tax', 'taxation', 'tax compliance', 'tax preparation', 'irs'],
            "Audit": ['audit', 'auditor', 'internal audit', 'sox', 'gaap', 'ifrs'],
            "General Ledger": ['general ledger', 'bookkeeping', 'accounts payable', 'accounts receivable', 'reconciliation']
        }
    elif primary_industry == "BANKING":
        scores = {"Retail Banking": 0, "Commercial Banking": 0, "Risk/Compliance": 0}
        keywords = {
            "Retail Banking": ['retail banking', 'branch manager', 'personal banker', 'teller', 'mortgage', 'loans'],
            "Commercial Banking": ['commercial banking', 'business banking', 'underwriting', 'credit analyst'],
            "Risk/Compliance": ['risk management', 'compliance', 'aml', 'kyc', 'anti-money laundering', 'bds']
        }
    elif primary_industry == "BUSINESS-DEVELOPMENT":
        scores = {"Lead Generation": 0, "Strategic Partnerships": 0, "Market Analysis": 0}
        keywords = {
            "Lead Generation": ['lead generation', 'cold calling', 'salesforce', 'crm', 'prospecting'],
            "Strategic Partnerships": ['partnerships', 'strategic alliances', 'channel partners', 'business development'],
            "Market Analysis": ['market research', 'market analysis', 'new markets', 'competitor analysis']
        }
    elif primary_industry == "CHEF":
        scores = {"Pastry": 0, "Kitchen Management": 0, "Cuisine Specialty": 0}
        keywords = {
            "Pastry": ['pastry', 'baking', 'baker', 'patisserie', 'dessert'],
            "Kitchen Management": ['executive chef', 'sous chef', 'kitchen manager', 'inventory', 'cost control', 'staff training'],
            "Cuisine Specialty": ['italian', 'french', 'asian', 'fusion', 'fine dining', 'catering']
        }
    elif primary_industry == "CONSTRUCTION":
        scores = {"Project Management": 0, "Site Supervision": 0, "Estimating": 0}
        keywords = {
            "Project Management": ['project manager', 'pmp', 'construction management', 'scheduling', 'budgeting'],
            "Site Supervision": ['site supervisor', 'superintendent', 'foreman', 'safety', 'osha'],
            "Estimating": ['estimator', 'cost estimation', 'bidding', 'take-offs']
        }
    elif primary_industry == "CONSULTANT":
        scores = {"Management": 0, "Technical": 0, "Strategy": 0}
        keywords = {
            "Management": ['management consultant', 'business process', 'optimization', 'operations', 'change management'],
            "Technical": ['it consultant', 'technical consultant', 'sap', 'oracle', 'salesforce', 'implementation'],
            "Strategy": ['strategy consultant', 'mckinsey', 'bcg', 'bain', 'corporate strategy', 'market entry']
        }
    elif primary_industry == "DESIGNER":
        scores = {"Graphic/Visual": 0, "UX/UI": 0, "Industrial/Product": 0}
        keywords = {
            "Graphic/Visual": ['graphic design', 'photoshop', 'illustrator', 'indesign', 'typography', 'branding'],
            "UX/UI": ['ux', 'ui', 'user experience', 'user interface', 'figma', 'sketch', 'wireframing', 'prototyping'],
            "Industrial/Product": ['industrial design', 'product design', 'solidworks', 'rhino', '3d modeling', 'manufacturing']
        }
    elif primary_industry == "DIGITAL-MEDIA":
        scores = {"SEO/SEM": 0, "Social Media": 0, "Content Creation": 0}
        keywords = {
            "SEO/SEM": ['seo', 'sem', 'search engine optimization', 'google analytics', 'ppc', 'adwords'],
            "Social Media": ['social media', 'community manager', 'facebook', 'instagram', 'twitter', 'content strategy'],
            "Content Creation": ['content creator', 'copywriting', 'video production', 'blogging', 'editing']
        }
    elif primary_industry == "HEALTHCARE":
        scores = {"Clinical": 0, "Administration": 0, "Research/Pharma": 0}
        keywords = {
            "Clinical": ['nurse', 'rn', 'doctor', 'physician', 'patient care', 'lpn', 'clinical', 'medical assistant'],
            "Administration": ['healthcare administration', 'hospital administrator', 'patient records', 'hipaa', 'medical billing'],
            "Research/Pharma": ['pharmaceutical', 'clinical research', 'biotech', 'fda', 'lab', 'scientist']
        }
    elif primary_industry == "HR":
        scores = {"Recruitment": 0, "Compensation/Benefits": 0, "Generalist": 0}
        keywords = {
            "Recruitment": ['recruiter', 'recruiting', 'talent acquisition', 'sourcing', 'ats', 'interviewing'],
            "Compensation/Benefits": ['compensation', 'benefits', 'payroll', 'comp & ben', 'hris'],
            "Generalist": ['hr generalist', 'hrbp', 'human resources business partner', 'employee relations', 'onboarding']
        }
    elif primary_industry == "PUBLIC-RELATIONS":
        scores = {"Media Relations": 0, "Corporate Communications": 0, "Event Management": 0}
        keywords = {
            "Media Relations": ['media relations', 'press release', 'public relations', 'pr', 'pitching', 'media outreach'],
            "Corporate Communications": ['corporate communications', 'internal communications', 'employee communications'],
            "Event Management": ['event management', 'event planning', 'trade show', 'logistics']
        }
    elif primary_industry == "SALES":
        scores = {"Tech Sales": 0, "B2B": 0, "Account Management": 0}
        keywords = {
            "Tech Sales": ['saas', 'software sales', 'tech sales', 'solution architect', 'pre-sales'],
            "B2B": ['b2b', 'business-to-business', 'enterprise sales', 'salesforce', 'crm'],
            "Account Management": ['account manager', 'key account', 'customer success', 'relationship manager']
        }
    else:
        return f"General {primary_industry}"

    for category, klist in keywords.items():
        for keyword in klist:
            if re.search(r'\b' + re.escape(keyword) + r'\b', text):
                scores[category] += 1

    if not scores:
        return f"General {primary_industry}"

    best_category = max(scores, key=scores.get)
    if scores[best_category] > 0:
        return best_category
    else:
        return f"General {primary_industry}"

def get_work_type(resume_text: str) -> str:
    text = resume_text.lower()
    has_remote = re.search(r'\bremote\b|work from home|wfh', text)
    has_hybrid = re.search(r'\bhybrid\b', text)
    has_onsite = re.search(r'\bon-site\b|on site|in-office', text)
    if has_hybrid:
        return "Hybrid"
    if has_remote and not has_onsite:
        return "Remote"
    if has_onsite and not has_remote:
        return "On-site"
    return "On-site (Assumed)"

def get_employment_type(resume_text: str) -> str:
    text = resume_text.lower()
    if re.search(r'\bintern\b|\binternship\b', text):
        return "Internship"
    if re.search(r'\bcontract\b|\bcontractor\b|\bfreelance\b', text):
        return "Contract"
    if re.search(r'\bpart-time\b|part time', text):
        return "Part-time"
    return "Full-time"

def extract_all_metadata(resume_text: str, primary_industry: str) -> dict:
    return {
        "experience_level": get_experience_level(resume_text),
        "secondary_industry": get_secondary_industry(resume_text, primary_industry),
        "work_mode": get_work_type(resume_text)
    }

def extract_skills_naive(resume_text: str) -> list[str]:
    # Placeholder for naive skill extraction
    common_skills = ['python', 'java', 'sql', 'aws', 'docker', 'kubernetes', 'react', 'node.js', 'autocad', 'excel', 'tableau', 'seo', 'agile', 'scrum']
    text = resume_text.lower()
    found_skills = []
    for skill in common_skills:
        if re.search(r'\b' + re.escape(skill) + r'\b', text):
            # capitalizes skill if we want or just keep lowercase
            found_skills.append(skill.upper() if len(skill) <= 3 else skill.title())
    return found_skills

def extract_candidate_name(resume_text: str, filename: str) -> str:
    # Look at the first 5 lines of the resume text
    lines = resume_text.split('\n')[:5]
    for line in lines:
        clean_line = line.strip()
        # Skip empty lines
        if not clean_line:
            continue
        # Skip lines that look like generic headers
        lower_line = clean_line.lower()
        if any(bad_word in lower_line for bad_word in ['resume', 'curriculum vitae', 'cv', 'page']):
            continue
        # Skip lines containing email or phone numbers
        if '@' in clean_line or re.search(r'\d{3}[-\.\s]??\d{3}[-\.\s]??\d{4}', clean_line):
            continue
            
        # A name usually consists of 2 to 4 words
        words = clean_line.split()
        if 1 < len(words) <= 4:
            return clean_line.title()
            
    # Fallback to formatting the filename if no name was cleanly extracted
    base_name = filename.rsplit('.', 1)[0]
    # Remove common filler words from filename
    for filler in ['resume', 'template', 'cv', 'document', 'updated']:
        base_name = re.sub(rf'\b{filler}\b', '', base_name, flags=re.IGNORECASE)
    
    clean_name = base_name.replace('-', ' ').replace('_', ' ').strip()
    if clean_name:
        return clean_name.title()
        
    return "Unknown Candidate"
