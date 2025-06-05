import os
import shutil
import re

if os.path.exists ('/internal'):
    shutil.rmtree ('/internal')
os.makedirs ('/internal')
for reg_file in os.listdir ('/Corpus/Registry/'):
    with open (f'/Corpus/Registry/{reg_file}', encoding = 'utf8') as fin:
        text = fin.read ()
    text = re.sub (r'^HOME "?.*[/\\]+([^"]*)"?',r'HOME /Corpus/Data/\1', text, flags = re.MULTILINE)
    with open (f'/internal/{reg_file}', 'w', encoding = 'utf8') as fout:
        fout.write (text)