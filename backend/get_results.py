from fastapi import FastAPI
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
    context: str
    to_show: List
    print_structures: List
    corpora: List

class ContextData (BaseModel):
    paths: Dict
    to_show: List
    window_size: int
    context: str
    print_structures: List

class CollocationData (Data):
    window_size: int
    frequency_filter: int
    # association_measure: str
    grouping_attribute: PAttribute
    pos: List

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
backend.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

 
@backend.get ('/')
async def root ():
    return {'message': 'Hello SpoCo'}

def get_command (data: Data, mode = 'concordance'):
    def itercqp (command):
        with sbp.Popen (command, stdout = sbp.PIPE, encoding = 'utf8') as pr:
            while True:
                line = pr.stdout.readline ()
                if not line:
                    break
                yield line

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
    if mode != 'frequency':
        CONTEXT = f'set Context {data.context}' if data.context else ''
    else:
        CONTEXT = f'set Context 0'
    to_show = data.to_show
    for corpus in data.corpora:
        if not corpus['primary']:
            to_show.append (corpus['cwb-corpus'])
    TO_SHOW = ' '.join (['+' + el for el in to_show])
    if TO_SHOW:
        TO_SHOW = 'show ' + TO_SHOW
    PRINT_STRUCTURES = ', '.join (data.print_structures)
    if PRINT_STRUCTURES:
        PRINT_STRUCTURES = f'set PrintStructures "{PRINT_STRUCTURES}"'
    PRINT_MODE = 'set pm html'

    SEPARATOR = 'set AttributeSeparator "\t"'
    MATCH_INDICATOR = 'set ld "<#"; set rd "#>"'

    if mode != 'frequency':
        cwb_query = f'{CORPUS_NAME}; {CONTEXT}; {TO_SHOW}; {SEPARATOR}; {MATCH_INDICATOR}; {PRINT_MODE}; {PRINT_STRUCTURES}; {query};'
    else:
        cwb_query = f'{CORPUS_NAME}; set Context 0; {PRINT_MODE}; q={query}; group q match {data.grouping_attribute.name};'
    print ('query:', cwb_query)
    command = [PATH, '-r', REGISTRY, cwb_query]
    print ('command:', command)

    return command

def prepare_response (data: Data):

    command = get_command (data)
    pr = sbp.Popen (command, stdout = sbp.PIPE, encoding = 'utf8')
    return pr.communicate ()[0].splitlines ()

def prepare_response_stream (data: Data, mode = 'concordance'):
    command = get_command (data, mode)
    pr = sbp.Popen (command, stdout = sbp.PIPE, encoding = 'utf8')
    results = pr.communicate ()[0].splitlines ()
    if mode == 'concordance':
        results.insert (0, str (len (results)))

    print ('mode:', mode, 'res:', len (results))
    return results
    
def stream_gen (data, batch_size = 100):
    for i in range (ceil (len (data) / batch_size)):
        yield '\n'.join (data[i * batch_size : (i + 1) * batch_size])

@backend.post ('/results')
async def get_concordance (data: Data):

    results = prepare_response_stream (data)
    results = results[:1000] + results[-1000:]
    stream = stream_gen (results)
    return StreamingResponse (stream, media_type = 'application/x-ndjson')

@backend.post ('/collocations')
async def get_collocations (data: CollocationData):

    response = prepare_response (data)
    lines = response[1:-2]  # in html mode first and two last lines should be discarded
    pname = data.grouping_attribute.name
    position = data.grouping_attribute.position
    window_size = data.window_size
    frequency_filter = data.frequency_filter
    pos = data.pos
    results = stats.get_collocations (lines, pattr_no = position, freq = freq[pname], window_size = window_size, frequency_threshold = frequency_filter, allowed_pos = pos)
    results = [f'{entry[0]}\t{entry[1]}\t{entry[2]}' for entry in results]
    stream = stream_gen (results)

    return StreamingResponse (stream, media_type = 'application/x-ndjson')

@backend.post ('/frequency')
async def get_frequency_list (data: FrequencyData):

    response = prepare_response_stream (data, mode = 'frequency')
    lines = response[2:]
    attribute = data.grouping_attribute.name
    frequency_filter = data.frequency_filter
    results = stats.get_frequency (lines, attribute = attribute, frequency_filter = frequency_filter)
    results = [f'{entry[0]}\t{entry[1]}' for entry in results]
    stream = stream_gen (results)
    
    return StreamingResponse (stream, media_type = 'application/x-ndjson')

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
        
    

