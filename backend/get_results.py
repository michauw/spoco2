from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess as sbp

class Query (BaseModel):
    query: str

app = FastAPI()
origins = ['http://localhost:4200']
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get ('/')
async def root ():
    return {'message': 'Hello SpoCo'}

@app.post ('/results')
async def get_results (query: Query):
    PATH = 'D:/Praca/narzedzia/cwb/cwb3.4/bin/cqpcl'
    REGISTRY = 'D:/Praca/zasoby/korpusy/boy/Registry'
    CORPUS_NAME = 'BOY'
    cwb_query = f'{CORPUS_NAME}; {query.query};'
    command = [PATH, '-r', REGISTRY, cwb_query]

    proc = sbp.Popen (command, stdout = sbp.PIPE, encoding = 'utf8')
    output = proc.communicate ()[0]

    return output

