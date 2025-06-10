import os
import shutil
import re
import utils
from pathlib import Path

REGISTRY_PATH = Path ('/internal')

def update_registry ():

    if REGISTRY_PATH.exists ():
        shutil.rmtree (REGISTRY_PATH)
    os.makedirs (REGISTRY_PATH)
    for reg_file in os.listdir ('/Corpus/Registry/'):
        with open (f'/Corpus/Registry/{reg_file}', encoding = 'utf8') as fin:
            text = fin.read ()
        text = re.sub (r'^HOME "?.*[/\\]+([^"]*)"?',r'HOME /Corpus/Data/\1', text, flags = re.MULTILINE)
        save_path = REGISTRY_PATH / reg_file
        with open (save_path, 'w', encoding = 'utf8') as fout:
            fout.write (text)
    with open ('/settings/config.json') as fin:
        config = fin.read ()
    config = re.sub (r'"bin"\s*:\s*".*?"', '"bin":""', config)
    config = re.sub (r'"registry-path"\s*:\s*".*?"', '"registry-path":"/internal"', config)
    with open ('/settings/config.json', 'w') as fout:
        fout.write (config)

def prepare_frequency ():
    corpora = utils.get_corpora (REGISTRY_PATH, '')
    utils.get_frequency (corpora)

if __name__ == '__main__':
    update_registry ()
    prepare_frequency ()