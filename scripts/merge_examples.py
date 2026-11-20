"""data/vocab/examples.tsv의 예문을 src/data/all_rounds.json에 반영한다.

사용법: python3 scripts/merge_examples.py
- 예문을 고치려면 examples.tsv(탭 구분: en, ex, exKo)를 수정하고 다시 실행
- 예문이 없는 단어, 예문에 단어가 들어 있지 않은 경우를 알려 준다
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TSV = ROOT / 'data/vocab/examples.tsv'
DATA = ROOT / 'src/data/all_rounds.json'

with TSV.open(encoding='utf-8') as f:
    examples = {row['en']: row for row in csv.DictReader(f, delimiter='\t')}

rounds = json.loads(DATA.read_text(encoding='utf-8'))
missing, not_in_sentence = set(), set()

for r in rounds:
    for w in r['words']:
        row = examples.get(w['en'])
        if not row:
            missing.add(w['en'])
            w.pop('ex', None)
            w.pop('exKo', None)
            continue
        w['ex'], w['exKo'] = row['ex'].strip(), row['exKo'].strip()
        # 괄호 앞 핵심어(또는 / 앞 표현)가 예문에 있는지 대략 확인
        core = re.sub(r'\(.*?\)', '', w['en']).split('/')[0].strip().lower()
        if core and core not in w['ex'].lower():
            not_in_sentence.add(f"{w['en']} → {w['ex']}")

DATA.write_text(json.dumps(rounds, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
total = sum(len(r['words']) for r in rounds)
print(f'반영: {total - sum(1 for r in rounds for w in r["words"] if w["en"] in missing)}/{total}개 단어')
if missing:
    print('예문 없음:', ', '.join(sorted(missing)))
if not_in_sentence:
    print('예문에 단어 형태가 다름(확인 권장):')
    for s in sorted(not_in_sentence):
        print('  -', s)
unused = set(examples) - {w['en'] for r in rounds for w in r['words']}
if unused:
    print('데이터에 없는 예문:', ', '.join(sorted(unused)))
