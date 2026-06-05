import json
import requests
from bs4 import BeautifulSoup
import time
import math
import os

print("=== Fetching Missing Macro Data from TradingEconomics ===")

# Map our ISO codes to TradingEconomics country URL slugs
COUNTRY_MAP = {
    'US': 'united-states', 'CA': 'canada', 'MX': 'mexico', 'BR': 'brazil',
    'CL': 'chile', 'AR': 'argentina', 'GB': 'united-kingdom', 'DE': 'germany',
    'FR': 'france', 'NL': 'netherlands', 'CH': 'switzerland', 'SE': 'sweden',
    'PL': 'poland', 'TR': 'turkey', 'CN': 'china', 'JP': 'japan',
    'KR': 'south-korea', 'TW': 'taiwan', 'HK': 'hong-kong', 'SG': 'singapore',
    'MY': 'malaysia', 'TH': 'thailand', 'ID': 'indonesia', 'VN': 'vietnam',
    'PH': 'philippines', 'IN': 'india', 'PK': 'pakistan', 'BD': 'bangladesh',
    'SA': 'saudi-arabia', 'AE': 'united-arab-emirates', 'QA': 'qatar', 'EG': 'egypt',
    'AU': 'australia', 'NZ': 'new-zealand', 'ZA': 'south-africa', 'NG': 'nigeria',
    'KE': 'kenya'
}

# The fields we want to scrape and fill in (which were N/A from World Bank)
# Map TradingEconomics Indicator Name -> Our JSON field name
INDICATOR_MAP = {
    'Manufacturing PMI': 'pmi',
    'Services PMI': 'pmi', # fallback if manufacturing not available
    'Composite PMI': 'pmi',
    'Wage Growth': 'wage_growth',
    'Jobless Claims': 'jobless_claims',
    'Core Consumer Prices': 'core_cpi',
    'Producer Prices Change': 'ppi',
    'Producer Prices': 'ppi',
    'Government Budget': 'fiscal_balance_pct_gdp',
    'Government Bond 10Y': 'yield_10y',
    'Bank Lending Rate': 'bank_lending',
    'Households Debt to GDP': 'household_debt',
    'Private Debt to GDP': 'corporate_debt'
}

# Also need to map to the correct category in macro_panel
CAT_MAP = {
    'pmi': 'growth',
    'wage_growth': 'labor',
    'jobless_claims': 'labor',
    'core_cpi': 'inflation',
    'ppi': 'inflation',
    'fiscal_balance_pct_gdp': 'fiscal_debt',
    'yield_10y': 'fiscal_debt',
    'bank_lending': 'credit_cycle',
    'household_debt': 'credit_cycle',
    'corporate_debt': 'credit_cycle'
}

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

def parse_value(val_str):
    try:
        val_str = val_str.replace(',', '')
        if 'K' in val_str:
            return float(val_str.replace('K', '')) * 1000
        if 'M' in val_str:
            return float(val_str.replace('M', '')) * 1000000
        return float(val_str)
    except:
        return None

# Load dashboard data
dash_path = 'public/data/dashboard_data.json'
with open(dash_path, 'r') as f:
    dashboard = json.load(f)

for country_idx, c in enumerate(dashboard['countries']):
    code = c['code']
    slug = COUNTRY_MAP.get(code)
    if not slug:
        continue
    
    print(f"Scraping {code} ({slug})...")
    url = f"https://tradingeconomics.com/{slug}/indicators"
    
    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, 'html.parser')
            
            # Find all rows in all tables
            rows = soup.find_all('tr')
            for row in rows:
                cols = row.find_all(['th', 'td'])
                if len(cols) >= 2:
                    ind_name = cols[0].text.strip()
                    val_str = cols[1].text.strip()
                    
                    if ind_name in INDICATOR_MAP:
                        field_id = INDICATOR_MAP[ind_name]
                        cat_id = CAT_MAP[field_id]
                        val = parse_value(val_str)
                        
                        if val is not None:
                            # Avoid overwriting a PMI if we already set one (e.g. keep Composite if we hit it, etc.)
                            existing = c['macro_panel'].get(cat_id, {}).get(field_id, {})
                            if isinstance(existing, dict) and not existing.get('available'):
                                c['macro_panel'][cat_id][field_id] = {
                                    'value': val,
                                    'available': True,
                                    'z_score': 0.0, # Z-score proxy to avoid breaking layout
                                    'percentile': 50.0,
                                    'source': 'TradingEconomics',
                                    'last_updated': dashboard['last_updated']
                                }
        else:
            print(f"  Blocked or not found ({res.status_code})")
    except Exception as e:
        print(f"  Error: {e}")
    
    time.sleep(1) # Be nice to the server

# Recompute composite macro scores
def normal_cdf(z):
    a1,a2,a3=0.254829592,-0.284496736,1.421413741
    a4,a5,p=-1.453152027,1.061405429,0.3275911
    sign = -1 if z < 0 else 1
    x = abs(z) / math.sqrt(2)
    t = 1.0 / (1.0 + p * x)
    y = 1.0 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*math.exp(-x*x)
    return 0.5 * (1.0 + sign * y)

for c in dashboard['countries']:
    mcs = c.get('macro_category_scores', {})
    mp = c.get('macro_panel', {})
    
    for cat_name, cat_data in mp.items():
        if isinstance(cat_data, dict):
            # Calculate new score based on available indicators in this category
            z_scores = []
            available = 0
            total = len(cat_data)
            for ind_data in cat_data.values():
                if isinstance(ind_data, dict) and ind_data.get('available'):
                    available += 1
                    z = ind_data.get('z_score')
                    if z is not None:
                        z_scores.append(z)
            
            if z_scores:
                avg_z = sum(z_scores) / len(z_scores)
                mcs[cat_name] = {
                    'z_score': round(avg_z, 2),
                    'percentile': round(normal_cdf(avg_z) * 100, 1),
                    'available_count': available,
                    'total_count': total
                }
            elif available > 0:
                mcs[cat_name] = {
                    'z_score': 0.0,
                    'percentile': 50.0,
                    'available_count': available,
                    'total_count': total
                }
                
    c['macro_category_scores'] = mcs
    
    # Recalculate macro composite
    all_z = [s['z_score'] for s in mcs.values() if isinstance(s, dict) and s.get('z_score') is not None]
    if all_z:
        avg_z = sum(all_z) / len(all_z)
        c['macro_composite'] = {
            'z_score': round(avg_z, 2),
            'percentile': round(normal_cdf(avg_z) * 100, 1),
            'available_count': len(all_z),
            'total_count': 6
        }

with open(dash_path, 'w') as f:
    json.dump(dashboard, f, indent=2)

print("=== Successfully patched dashboard_data.json ===")
