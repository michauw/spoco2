import corpus_data
import pickle
import json
import shutil
import os
import logging
from pathlib import Path

class ResourceNotFound (Exception):
    pass

def get_corpora (registry_path, cwb_bin_path):
    corpora = {}
    for rfile in os.listdir (registry_path):
        corpora[rfile] = corpus_data.CorpusData (rfile, Path (registry_path), cwb_bin_path)
    return corpora

def load_freq_from_file (path, name = 'freq'):
    for ending in ['json', 'pkl']:
        freq_path = os.path.join (path, f'{name}.{ending}')
        if os.path.exists (freq_path):
            break
    else:
        raise ResourceNotFound ('Frequency data could not be find')
    if freq_path.endswith ('.json'):
        with open (freq_path, encoding = 'utf8') as fjson:
            freq = json.load (fjson)
    elif freq_path.endswith ('.pkl'):
        with open (freq_path, 'rb') as fpkl:
            freq = pickle.load (fpkl)
    
    return freq

def prepare_frequency (corpora, save_format = 'pickle', freq_file_name = 'freq'):
    freq_file_name = 'freq'
    for name, corpus in corpora.items ():
        path = Path ('.').absolute ().parent / 'resources' / corpus.name
        if not path.exists ():
            print (f'creating corpus: {path}')
            freq = corpus.get_frequency ()
            os.makedirs (path)
            if save_format == 'pickle':
                with open (path / f'{freq_file_name}.pkl', 'wb') as fpickle:
                    pickle.dump (freq, fpickle)
            elif save_format == 'json':
                with open (path / f'{freq_file_name.json}', 'w', encoding = 'utf8') as fjson:
                    json.dump (freq[corpus.name], ensure_ascii = False)

    
def get_frequency (corpora, save_format = 'pickle', freq_file_name = 'freq'):
    
    freq = {}
    for name, corpus in corpora.items ():
        path = Path ('.').absolute ().parent / 'resources' / corpus.name
        print (f'loading corpus from: {path}')
        try:
            freq[corpus.name] = load_freq_from_file (path, freq_file_name)
        except:
            logging.warning (f"Couldn't load frequency data for corpus *{corpus.name}*, (re)creating")
            if path.exists ():
                shutil.rmtree (path)
            prepare_frequency ({name: corpus}, save_format, freq_file_name)
            freq[corpus.name] = load_freq_from_file (path, freq_file_name)
    
    return freq
    