# convert_ifile.py
from lxml import etree
import json

# XMLParser mit recover=True überspringt (unwohlgeformte) Tokens
parser = etree.XMLParser(recover=True)
tree = etree.parse('informationTable.xml', parser)
root = tree.getroot()

ns = {'ns1': 'http://www.sec.gov/edgar/document/thirteenf/informationtable'}

data = {
    'date': '2025-03-31',
    'positions': []
}

for info in root.findall('ns1:infoTable', ns):
    name  = info.findtext('ns1:nameOfIssuer',    namespaces=ns)
    cusip = info.findtext('ns1:cusip',           namespaces=ns)
    # sshPrnamt ist der nominale Amount
    shares = int(info.find('ns1:shrsOrPrnAmt/ns1:sshPrnamt', namespaces=ns).text)
    value  = int(info.findtext('ns1:value',      namespaces=ns))

    data['positions'].append({
        'name':   name,
        'cusip':  cusip,
        'shares': shares,
        'value':  value
    })

with open('informationTable.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("fertig:", len(data['positions']), "Positionen in informationTable.json")