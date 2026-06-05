import json
import requests
from bs4 import BeautifulSoup
import time
import math

print("=== Fetching ALL Missing Data from TradingEconomics (Deep Scrape) ===")

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

INDICATOR_MAP = {
    'GDP Growth Rate': ('growth', 'gdp_growth'),
    'GDP Annual Growth Rate': ('growth', 'gdp_growth'),
    'Manufacturing PMI': ('growth', 'pmi'),
    'Services PMI': ('growth', 'pmi'),
    'Industrial Production Mom': ('growth', 'industrial_production'),
    'Industrial Production': ('growth', 'industrial_production'),
    'Retail Sales YoY': ('growth', 'retail_sales'),
    'Exports YoY': ('growth', 'exports'),
    'Imports YoY': ('external_balance', 'import_growth'),
    'Unemployment Rate': ('labor', 'unemployment'),
    'Wage Growth': ('labor', 'wage_growth'),
    'Wages': ('labor', 'wage_growth'),
    'Initial Jobless Claims': ('labor', 'jobless_claims'),
    'Inflation Rate': ('inflation', 'cpi_yoy'),
    'Core Inflation Rate': ('inflation', 'core_cpi'),
    'Core Consumer Prices': ('inflation', 'core_cpi'),
    'Producer Prices Change': ('inflation', 'ppi'),
    'Current Account to GDP': ('external_balance', 'current_account_pct_gdp'),
    'Balance of Trade': ('external_balance', 'trade_balance'),
    'Foreign Exchange Reserves': ('external_balance', 'fx_reserves'),
    'Government Budget': ('fiscal_debt', 'fiscal_balance_pct_gdp'),
    'Government Debt to GDP': ('fiscal_debt', 'govt_debt_pct_gdp'),
    'Interest Rate': ('credit_cycle', 'bank_lending'),
    'Bank Lending Rate': ('credit_cycle', 'bank_lending'),
    'Households Debt to GDP': ('credit_cycle', 'household_debt'),
    'Private Debt to GDP': ('credit_cycle', 'corporate_debt'),
}

dash_path = 'public/data/dashboard_data.json'
with open(dash_path, 'r') as f:
    dashboard = json.load(f)

def parse_val(s):
    try:
        s = s.replace(',', '').replace('%', '').strip()
        if 'K' in s: return float(s.replace('K','')) * 1000
        if 'M' in s: return float(s.replace('M','')) * 1000000
        if 'B' in s: return float(s.replace('B','')) * 1000000000
        if 'T' in s: return float(s.replace('T','')) * 1000000000000
        return float(s)
    except:
        return None

headers = {'User-Agent': 'Mozilla/5.0'}

for c in dashboard['countries']:
    code = c['code']
    slug = COUNTRY_MAP.get(code)
    if not slug: continue
    
    print(f"Deep scraping {code} ({slug})...")
    url = f"https://tradingeconomics.com/{slug}/indicators"
    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, 'html.parser')
            for row in soup.find_all('tr'):
                cols = row.find_all(['th', 'td'])
                if len(cols) >= 2:
                    name = cols[0].text.strip()
                    val_str = cols[1].text.strip()
                    
                    if name in INDICATOR_MAP:
                        cat_id, field_id = INDICATOR_MAP[name]
                        val = parse_val(val_str)
                        if val is not None:
                            if 'macro_panel' not in c:
                                c['macro_panel'] = {}
                            if cat_id not in c['macro_panel']:
                                c['macro_panel'][cat_id] = {}
                            existing = c['macro_panel'][cat_id].get(field_id, {})
                            # Fill if missing OR if it's currently False
                            if isinstance(existing, dict) and not existing.get('available'):
                                c['macro_panel'][cat_id][field_id] = {
                                    'value': val,
                                    'available': True,
                                    'z_score': 0.0,
                                    'percentile': 50.0,
                                    'source': 'TradingEconomics',
                                    'last_updated': dashboard['last_updated']
                                }
    except Exception as e:
        print(f"Error on {code}: {e}")
        
    time.sleep(0.5)

# Derive missing food_energy_pressure
for c in dashboard['countries']:
    if 'macro_panel' not in c:
        c['macro_panel'] = {}
    mp = c['macro_panel']
    cpi = mp.get('inflation', {}).get('cpi_yoy', {}).get('value')
    core = mp.get('inflation', {}).get('core_cpi', {}).get('value')
    if cpi is not None and core is not None:
        existing = mp.get('inflation', {}).get('food_energy_pressure', {})
        if not existing.get('available'):
            mp['inflation']['food_energy_pressure'] = {
                'value': round(cpi - core, 2),
                'available': True,
                'z_score': 0.0,
                'percentile': 50.0,
                'source': 'Derived',
                'last_updated': dashboard['last_updated']
            }

with open(dash_path, 'w') as f:
    json.dump(dashboard, f, indent=2)

print("=== Deep Scrape Complete ===")
