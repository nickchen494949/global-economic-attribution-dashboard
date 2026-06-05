import json
import requests
from bs4 import BeautifulSoup
import math

print("=== Running Super Scraper (List Pages) ===")

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

LISTS_TO_SCRAPE = {
    'government-bond-10y': ('fiscal_debt', 'yield_10y'),
    'bank-lending-rate': ('credit_cycle', 'bank_lending'),
    'corporate-debt-to-gdp': ('credit_cycle', 'corporate_debt'),
    'households-debt-to-gdp': ('credit_cycle', 'household_debt'),
    'wage-growth': ('labor', 'wage_growth'),
    'core-inflation-rate': ('inflation', 'core_cpi'),
    'jobless-claims': ('labor', 'jobless_claims')
}

# Mapping TE Country names to our codes
TE_COUNTRY_TO_CODE = {
    'United States': 'US', 'Canada': 'CA', 'Mexico': 'MX', 'Brazil': 'BR',
    'Chile': 'CL', 'Argentina': 'AR', 'United Kingdom': 'GB', 'Germany': 'DE',
    'France': 'FR', 'Netherlands': 'NL', 'Switzerland': 'CH', 'Sweden': 'SE',
    'Poland': 'PL', 'Turkey': 'TR', 'China': 'CN', 'Japan': 'JP',
    'South Korea': 'KR', 'Taiwan': 'TW', 'Hong Kong': 'HK', 'Singapore': 'SG',
    'Malaysia': 'MY', 'Thailand': 'TH', 'Indonesia': 'ID', 'Vietnam': 'VN',
    'Philippines': 'PH', 'India': 'IN', 'Pakistan': 'PK', 'Bangladesh': 'BD',
    'Saudi Arabia': 'SA', 'United Arab Emirates': 'AE', 'Qatar': 'QA', 'Egypt': 'EG',
    'Australia': 'AU', 'New Zealand': 'NZ', 'South Africa': 'ZA', 'Nigeria': 'NG',
    'Kenya': 'KE'
}

dash_path = 'public/data/dashboard_data.json'
with open(dash_path, 'r') as f:
    dashboard = json.load(f)

# Helper to find country object
def get_country(code):
    for c in dashboard['countries']:
        if c['code'] == code: return c
    return None

def parse_val(s):
    try:
        s = s.replace(',', '').replace('%', '').strip()
        if 'K' in s: return float(s.replace('K','')) * 1000
        if 'M' in s: return float(s.replace('M','')) * 1000000
        return float(s)
    except:
        return None

for endpoint, (cat_name, field_name) in LISTS_TO_SCRAPE.items():
    print(f"Scraping {endpoint} -> {field_name}...")
    url = f"https://tradingeconomics.com/country-list/{endpoint}"
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        print(f"Failed {res.status_code}")
        continue
    
    soup = BeautifulSoup(res.text, 'html.parser')
    tables = soup.find_all('table')
    if not tables: continue
    
    for table in tables:
        for row in table.find_all('tr'):
            cols = row.find_all(['th', 'td'])
            if len(cols) >= 3:
                te_country = cols[1].text.strip()
                val_str = cols[2].text.strip()
                
                code = TE_COUNTRY_TO_CODE.get(te_country)
                if code:
                    val = parse_val(val_str)
                    if val is not None:
                        c = get_country(code)
                        if c:
                            if 'macro_panel' not in c:
                                c['macro_panel'] = {}
                            if cat_name not in c['macro_panel']:
                                c['macro_panel'][cat_name] = {}
                            existing = c['macro_panel'][cat_name].get(field_name, {})
                            if isinstance(existing, dict) and not existing.get('available'):
                                c['macro_panel'][cat_name][field_name] = {
                                    'value': val,
                                    'available': True,
                                    'z_score': None,
                                    'percentile': None,
                                    'source': 'TradingEconomics',
                                    'last_updated': dashboard['last_updated']
                                }

# Compute derived indicators
for c in dashboard['countries']:
    if 'macro_panel' not in c:
        c['macro_panel'] = {}
    mp = c['macro_panel']
    cpi = mp.get('inflation', {}).get('cpi_yoy', {}).get('value')
    core = mp.get('inflation', {}).get('core_cpi', {}).get('value')
    if cpi is not None and core is not None:
        mp['inflation']['food_energy_pressure'] = {
            'value': round(cpi - core, 2),
            'available': True,
            'z_score': None,
            'percentile': None,
            'source': 'Derived',
            'last_updated': dashboard['last_updated']
        }

# Recalculate scores
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
                mcs[cat_name] = {'z_score': 0.0, 'percentile': 50.0, 'available_count': available, 'total_count': total}
                
    c['macro_category_scores'] = mcs
    
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

print("=== Super Scraper Finished! ===")
