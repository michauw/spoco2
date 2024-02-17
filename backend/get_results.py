import itertools
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import subprocess as sbp
from . import stats
import json
from math import ceil
import re

class PAttribute (BaseModel):
    name: str
    position: int

class Data (BaseModel):
    query: Dict
    paths: Dict
    corpora: List
    start: int = None

class ConcordanceData (Data):
    context: str
    to_show: List
    print_structures: List
    size_limit: int
    chunk_size: int
    end_chunk_size: int
    separator: str = None
    mode: str

class ContextData (ConcordanceData):
    pass

class CollocationData (Data):
    context: str
    to_show: List
    window_size: int
    frequency_filter: int
    grouping_attribute: PAttribute

class FrequencyData (Data):
    grouping_attribute: PAttribute
    frequency_filter: int

FREQ_PATH = 'src/assets/freq.json'
URL_PATH = 'src/environments/environment.ts'

try:
    with open (FREQ_PATH, encoding = 'utf8') as fjson:
        freq = json.load (fjson)
except FileNotFoundError:
    import os
    print (f'(get results) warning: frequency file not found ({FREQ_PATH})')

with open (URL_PATH) as fjson:
    pattern = r'\burl\s*:\s*["\'](.*?)["\']'
    host = re.search (pattern, fjson.read ()).group (1)
    origin = f'http://{host}:4200'

backend = FastAPI()
origins = [origin]
print ('origins:', origins)
backend.add_middleware(
    CORSMiddleware,
    allow_origins='*',
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

 
@backend.get ('/')
async def root ():
    return {'message': 'Hello SpoCo'}

def get_command (data: Data, category = 'concordance'):

    primary = data.query['primary']['query']
    if primary == 'mock':   # MOCK RESULTS
        with open ('mock_results_html.txt', encoding = 'utf8') as fin:
            results = fin.read ()
        return results
    query = primary
    for aligned_query in data.query['secondary']:
        query += f': {aligned_query["corpus"].upper ()} {aligned_query["query"]}'

    PATH = data.paths['cqp-path']
    REGISTRY = data.paths['registry-path']
    for corpus in data.corpora:
        if corpus['primary']:
            CORPUS_NAME = corpus['cwb-corpus'].upper ()
            break
    else:
        CORPUS_NAME = ''
    if category in ['concordance', 'collocations']:
        CONTEXT = f'set Context {data.context}' if data.context else ''
        to_show = data.to_show
        for corpus in data.corpora:
            if not corpus['primary']:
                to_show.append (corpus['cwb-corpus'])
        TO_SHOW = ' '.join (['+' + el for el in to_show])
        if TO_SHOW:
            TO_SHOW = 'show ' + TO_SHOW
    else:
        CONTEXT = 'set Context 0'
    if category == 'concordance':
        PRINT_STRUCTURES = ', '.join (data.print_structures)
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
        cwb_query = f'{CORPUS_NAME}; set Context 0; {PRINT_MODE}; q={query}; group q match {data.grouping_attribute.name};'
    print ('query:', cwb_query)
    command = [PATH, '-r', REGISTRY, cwb_query]
    print ('command:', command)

    return command

def check_error (process):
    return ''
    error_lines = process.stderr.readlines ()
    return ''.join (error_lines)

def valid_line (line):
    discard_patterns = [r'^<HR>', r'</UL>']
    
    return not re.search ('|'.join (discard_patterns), line)

def prepare_response (data: Data, category):

    command = get_command (data, category = category)
    pr = sbp.Popen (command, stdout = sbp.PIPE, encoding = 'utf8')
    return [line for line in pr.communicate ()[0].splitlines () if valid_line (line)]

def prepare_response_stream (data: Data, category = 'concordance'):
    command = get_command (data, category = category)
    langs_number = len (data.query['primary']) + len (data.query['secondary'])
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
        
@backend.post ('/concordance')
async def get_concordance (data: ConcordanceData):
    
    stream = prepare_response_stream (data)
    
    return StreamingResponse (stream, media_type = 'application/x-ndjson')

@backend.post ('/collocations')
async def get_collocations (data: CollocationData):

    response = prepare_response (data, category = 'collocations')
    pname = data.grouping_attribute.name
    position = data.grouping_attribute.position
    window_size = data.window_size
    frequency_filter = data.frequency_filter
    pos = [] # data.pos
    results = stats.get_collocations (response, pattr_no = position, freq = freq[pname], window_size = window_size, frequency_threshold = frequency_filter, allowed_pos = pos)

    return results;

@backend.post ('/frequency')
async def get_frequency_list (data: FrequencyData):

    response = prepare_response (data, category = 'frequency')
    attribute = data.grouping_attribute.name
    frequency_filter = data.frequency_filter
    results = stats.get_frequency (response, attribute = attribute, frequency_filter = frequency_filter)
        
    return results

@backend.post ('/context')
async def get_context (data: ContextData):
    
    output = []
    result_id = int (data.id)

    PATH = data.paths['cqp-path']
    REGISTRY = data.paths['registry-path']
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
        command = [PATH, '-r', REGISTRY, query]
        pr = sbp.Popen (command, stdout = sbp.PIPE, encoding = 'utf8')
        output.append (pr.communicate ()[0])
        
    

