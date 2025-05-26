import itertools
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
from pathlib import Path
import subprocess as sbp
import stats
import corpus_data
import json
import pickle
import shutil
import re
import os
import logging

class ResourceNotFound (Exception):
    pass

class Data (BaseModel):
    query: Dict
    corpora: List
    start: int = None

class ConcordanceData (Data):
    size_limit: int
    chunk_size: int
    end_chunk_size: int
    separator: str = None
    mode: str

class ContextData (ConcordanceData):
    pass

class CollocationData (Data):
    ams: List
    context: str
    window_size: int
    frequency_filter: int
    grouping_attribute: str
    case: str

class FrequencyData (Data):
    grouping_attribute: str
    frequency_filter: int
    case: str

def get_corpora ():
    corpora = {}
    for rfile in os.listdir (REGISTRY_PATH):
        corpora[rfile] = corpus_data.CorpusData (rfile, Path (REGISTRY_PATH), CWB_BIN_PATH)
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
    
def get_frequency (corpora, save_format = 'pickle'):
    freq_file_name = 'freq'
    freq = {}
    for name, corpus in corpora.items ():
        path = Path ('.').absolute ().parent / 'resources' / corpus.name
        if path.exists ():
            try:
                freq[corpus.name] = load_freq_from_file (path, freq_file_name)
                continue
            except:
                logging.warning (f"Couldn't load frequency data for corpus {corpus.name}, (re)creating")
                shutil.rmtree (path)
        os.makedirs (path)
        freq[corpus.name] = corpus.get_frequency ()
        if save_format == 'pickle':
            with open (path / f'{freq_file_name}.pkl', 'wb') as fpickle:
                pickle.dump (freq[corpus.name], fpickle)
        elif save_format == 'json':
            with open (path / f'{freq_file_name.json}', 'w', encoding = 'utf8') as fjson:
                json.dump (freq[corpus.name], ensure_ascii = False)
    
    return freq

CONFIG_PATH = Path (__file__).parent.parent / 'settings' / 'config.json'
PREF_PATH = Path (__file__).parent.parent / 'settings' / 'preferences.json'

with open (CONFIG_PATH, encoding = 'utf8') as fjson:
    config = json.load (fjson)
with open (PREF_PATH, encoding = 'utf8') as fjson:
    preferences = json.load (fjson)

REGISTRY_PATH = Path (config['cwb']['paths']['registry-path'])
CWB_BIN_PATH = Path (config['cwb']['paths']['bin'])
AUDIO_DIR = ''
if 'audio' in config:
    try:
        AUDIO_DIR = config['audio']['data-dir']
    except KeyError:
        logging.error ('config file: "audio" key defined, but no "data-dir" found')
DOCKER = True if os.environ.get ('DOCKER', '') == 'True' else False
if DOCKER:
    config['cwb']['paths'] = {'cqp-path': 'cqpcl', 'registry-path': '/internal'}
    if AUDIO_DIR:
        AUDIO_DIR = '/Corpus/Audio'

corpora = get_corpora ()
freq = get_frequency (corpora)

backend = FastAPI()
# origins = [origin]
# print ('origins:', origins)
backend.add_middleware(
    CORSMiddleware,
    allow_origins='*',
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if AUDIO_DIR:
    backend.mount ('/api/audio', StaticFiles (directory = AUDIO_DIR), name = 'audio')
    logging.info (f'mounting audio directory: {AUDIO_DIR}')

def get_command (data: Data, category = 'concordance', grouping_attr = None):

    primary = data.query['primary']['query']
    if primary == 'mock':   # MOCK RESULTS
        with open ('mock_results_html.txt', encoding = 'utf8') as fin:
            results = fin.read ()
        return results
    query = primary
    for aligned_query in data.query['secondary']:
        query += f': {aligned_query["corpus"].upper ()} {aligned_query["query"]}'

    CQPCL_PATH = CWB_BIN_PATH / 'cqpcl'
    # REGISTRY = config['cwb']['paths']['registry-path']
    CONTEXT_ATTR = config['cwb'].get ('context', '')
    for corpus in data.corpora:
        if corpus['primary']:
            CORPUS_NAME = corpus['id'].upper ()
            break
    else:
        CORPUS_NAME = ''
    hide_word = False
    if category == 'concordance' or not grouping_attr:
        to_show = [attr['name'] for attr in config['positionalAttributes'] if attr.get ('inResults', False)]
    else:
        if grouping_attr != 'word':
            to_show = [grouping_attr]
            hide_word = True
        else:
            to_show = []
    if category in ['concordance', 'collocations']:
        CONTEXT = f'set Context {CONTEXT_ATTR}'
        for corpus in data.corpora:
            if not corpus['primary']:
                to_show.append (corpus['id'])
    else:
        CONTEXT = 'set Context 0'
    TO_SHOW = ' '.join (['+' + el for el in to_show])
    if TO_SHOW:
        TO_SHOW = 'show ' + TO_SHOW
        if hide_word:
            TO_SHOW += ' -word'
    if category == 'concordance':
        s_attrs = [attr['name'] for attr in config['structuralAttributes'] if (attr.get ('inResults', False))]
        if CONTEXT_ATTR:
            s_attrs.append (CONTEXT_ATTR)
        if 'audio' in config:
            s_attrs.append (config['audio']['attribute'])
        s_attrs = list (set (s_attrs))
        PRINT_STRUCTURES = ', '.join (s_attrs)
        if PRINT_STRUCTURES:
            PRINT_STRUCTURES = f'set PrintStructures "{PRINT_STRUCTURES}"'
    PRINT_MODE = 'set pm html'

    SEPARATOR = 'set AttributeSeparator "\t"'
    MATCH_INDICATOR = 'set ld "<#"; set rd "#>"'

    if category == 'concordance':
        query = 'q=' + query
        if data.mode == 'full':
            query += '; size q'
        if data.start:
            query += f'; cat q {data.start} {data.start + data.chunk_size}'
        else:
            query += f'; cat q'
        cwb_query = f'{CORPUS_NAME}; {CONTEXT}; {TO_SHOW}; {SEPARATOR}; {MATCH_INDICATOR}; {PRINT_MODE}; {PRINT_STRUCTURES}; {query};'
    elif category == 'collocations':
        cwb_query =  f'{CORPUS_NAME}; {CONTEXT}; {TO_SHOW}; {SEPARATOR}; {MATCH_INDICATOR}; {PRINT_MODE}; {query};'
    else:
        cwb_query = f'{CORPUS_NAME}; set Context 0; {PRINT_MODE}; q={query}; group q match {grouping_attr};'
    print ('query:', cwb_query)
    command = [CQPCL_PATH, '-r', REGISTRY_PATH, cwb_query]
    print ('command:', command)

    return command

def check_error (process):
    return ''
    error_lines = process.stderr.readlines ()
    return ''.join (error_lines)

def valid_line (line):

    discard_patterns = [r'^<HR>', r'</UL>']
    
    return not re.search ('|'.join (discard_patterns), line)

def prepare_response (data: Data, category, grouping_attr = None):

    command = get_command (data, category = category, grouping_attr = grouping_attr)
    pr = sbp.Popen (command, stdout = sbp.PIPE, encoding = 'utf8')
    return [line for line in pr.communicate ()[0].splitlines () if valid_line (line)]

def prepare_response_stream (data: Data, category = 'concordance'):

    command = get_command (data, category = category)
    langs_number = len (data.query['secondary']) + 1
    pr = sbp.Popen (command, stdout = sbp.PIPE, stderr = sbp.PIPE, encoding = 'utf8')
    error = check_error (pr)
    if error:
        raise HTTPException (status_code = 400, detail = error)
    if category == 'concordance':
        if data.mode == 'full':
            query_size = int (pr.stdout.readline ())
        else:
            query_size = data.chunk_size
        stream_size = (str (s) + '\n' for s in [query_size])
        separator = data.separator
        if not separator.endswith ('\n'):
            separator += '\n'
        if query_size > max (data.size_limit / langs_number, 1000):     # minimal size of a first chunk set to 1000
            print ('LIMIT:', data.chunk_size * langs_number, data.chunk_size, langs_number)
            stream_first = stream_gen (pr, limit = data.chunk_size * langs_number)
            if data.mode == 'full':
                data.start = max (query_size - data.end_chunk_size, data.chunk_size)    # ensure that first and last chunk don't overlap
                data.mode = 'partial'
                command = get_command (data, category = category)
                pr_end = sbp.Popen (command, stdout = sbp.PIPE, encoding = 'utf8')
                stream_last = stream_gen (pr_end)
                stream = itertools.chain (stream_size, [separator], stream_first, [separator], stream_last)
            else:
                stream = stream_first
        else:
            if data.mode == 'full':
                stream = itertools.chain (stream_size, [separator], stream_gen (pr))
            else:
                stream = stream_gen (pr)
    else:
        stream = stream_gen (pr)
    return stream
      
def stream_gen (process, batch_size = 100, limit = 0, name = ''):
    ind = 0
    end = False
    while True:
        if limit and ind >= limit:
            break
        lines = []
        while len (lines) < batch_size:
            line = process.stdout.readline ()
            if not valid_line (line):
                continue
            if not line:
                end = True
                break
            lines.append (line)
        if end and not lines:
            break
        ind += len (lines)

        yield ''.join (lines)

# ENDPOINTS

@backend.get ('/api/')
async def root ():
    return {'message': 'Hello Spoco'}
        
@backend.post ('/api/concordance')
async def get_concordance (data: ConcordanceData):
    
    stream = prepare_response_stream (data)
    
    return StreamingResponse (stream, media_type = 'application/x-ndjson')

@backend.post ('/api/collocations')
async def get_collocations (data: CollocationData):

    response = prepare_response (data, category = 'collocations', grouping_attr = data.grouping_attribute)
    ams = data.ams
    window_size = data.window_size
    frequency_filter = data.frequency_filter
    corpus_name = data.query['primary']['corpus']
    fr = freq[corpus_name][data.grouping_attribute][data.case]
    corpus_size = corpora[corpus_name].size
    results = stats.get_collocations (response, freq = fr, N = corpus_size, case_sensitive = data.case == 'cs', assoc_measures = ams, window_size = window_size, frequency_threshold = frequency_filter)

    return results

@backend.post ('/api/frequency')
async def get_frequency_list (data: FrequencyData):

    response = prepare_response (data, category = 'frequency', grouping_attr = data.grouping_attribute)
    frequency_filter = data.frequency_filter
    results = stats.get_frequency (response, frequency_filter = frequency_filter)
        
    return results

@backend.post ('/api/context')
async def get_context (data: ContextData):
    
    output = []
    result_id = int (data.id)

    CQPCL_PATH = CWB_BIN_PATH / 'cqpcl'
    # REGISTRY = data.paths['registry-path']
    for corpus in data.corpora:
        if corpus['primary']:
            CORPUS_NAME = corpus['id'].upper ()
            break
    else:
        CORPUS_NAME = ''
    CONTEXT = data.context
    WINDOW_SIZE = data.window_size
    TO_SHOW = ' '.join (['+' + el for el in data.to_show])
    if TO_SHOW:
        TO_SHOW = 'show ' + TO_SHOW
    for i in range (max (1, result_id - WINDOW_SIZE), result_id + WINDOW_SIZE):
        query = f'{CORPUS_NAME}; {TO_SHOW}; <{CONTEXT}_id="{i}">[] expand to {CONTEXT};'
        command = [CQPCL_PATH, '-r', REGISTRY_PATH, query]
        pr = sbp.Popen (command, stdout = sbp.PIPE, encoding = 'utf8')
        output.append (pr.communicate ()[0])


@backend.get ('/api/config')
def get_config ():
    return config

@backend.get ('/api/corpora')
def get_corpora_info ():
    info = {}
    for corpus in corpora.values ():
        info[corpus.name] = {'size': corpus.size, 'pattrs': corpus.pattrs, 'satttrs': corpus.sattrs}
    return info


@backend.get ('/api/preferences')
def get_preferences ():
    return preferences

@backend.get ('/api/audio/{audio_file_path:path}')
async def get_audio_file (audio_file_path: str):
    return FileResponse (audio_file_path)
        
    

