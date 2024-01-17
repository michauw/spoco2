from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import subprocess as sbp
import time
from . import stats
import json

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


backend = FastAPI()
origins = ['http://localhost:4200']
backend.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FREQ_PATH = 'src/assets/freq.json'
try:
    with open (FREQ_PATH, encoding = 'utf8') as fjson:
        freq = json.load (fjson)
except FileNotFoundError:
    import os
    print (f'(get results) warning: frequency file not found ({FREQ_PATH})')
 
@backend.get ('/')
async def root ():
    return {'message': 'Hello SpoCo'}

def get_command (data: Data):
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
    CONTEXT = f'set Context {data.context}' if data.context else ''
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

    cwb_query = f'{CORPUS_NAME}; {CONTEXT}; {TO_SHOW}; {PRINT_STRUCTURES}; set pm html; {query};'
    print ('query:', cwb_query)
    command = [PATH, '-r', REGISTRY, cwb_query]
    print ('command:', command)

    return command

def prepare_response (data: Data):

    command = get_command (data)
    pr = sbp.Popen (command, stdout = sbp.PIPE, encoding = 'utf8')
    return pr.communicate ()[0]

@backend.post ('/results')
async def get_concordance (data: Data):

    resp = prepare_response (data).splitlines ()
    return resp

@backend.post ('/collocations')
async def get_collocations (data: CollocationData):

    response = prepare_response (data)
    lines = response.splitlines ()[1:-2]  # in html mode first and two last lines should be discarded
    pname = data.grouping_attribute.name
    position = data.grouping_attribute.position
    window_size = data.window_size
    frequency_filter = data.frequency_filter
    pos = data.pos

    return stats.get_collocations (lines, pattr_no = position, freq = freq[pname], window_size = window_size, frequency_threshold = frequency_filter, allowed_pos = pos)

@backend.post ('/frequency')
async def get_frequency_list (data: FrequencyData):

    response = prepare_response (data)
    lines = response.splitlines ()[1:-2]
    position = data.grouping_attribute.position
    frequency_filter = data.frequency_filter
    
    return stats.get_frequency (lines, pattr_no = position, frequency_filter = frequency_filter)

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
        
    

