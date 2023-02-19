from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import subprocess as sbp
import time

class Data (BaseModel):
    query: Dict
    paths: Dict
    context: str
    to_show: List
    print_structures: List

class ContextData (BaseModel):
    paths: Dict
    to_show: List
    window_size: int
    context: str
    print_structures: List

backend = FastAPI()
origins = ['http://localhost:4200']
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

@backend.post ('/results')
async def get_results (data: Data):

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

    PATH = data.paths['cqp-path']
    REGISTRY = data.paths['registry-path']
    CORPUS_NAME = data.query['primary']['corpus'].upper ()
    CONTEXT = f'set Context {data.context}' if data.context else ''
    TO_SHOW = ' '.join (['+' + el for el in data.to_show])
    if TO_SHOW:
        TO_SHOW = 'show ' + TO_SHOW
    PRINT_STRUCTURES = ', '.join (data.print_structures)
    if PRINT_STRUCTURES:
        PRINT_STRUCTURES = f'set PrintStructures "{PRINT_STRUCTURES}"'

    cwb_query = f'{CORPUS_NAME}; {CONTEXT}; {TO_SHOW}; {PRINT_STRUCTURES}; set pm html; {primary};'
    command = [PATH, '-r', REGISTRY, cwb_query]

    # return StreamingResponse (itercqp (command), media_type = 'text/plain')
    pr = sbp.Popen (command, stdout = sbp.PIPE, encoding = 'utf8')
    return pr.communicate ()[0]

@backend.post ('/context')
async def get_context (data: ContextData):
    
    output = []
    result_id = int (data.id)

    PATH = data.paths['cqp-path']
    REGISTRY = data.paths['registry-path']
    CORPUS_NAME = data.query['primary']['corpus'].upper ()
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
        
    

