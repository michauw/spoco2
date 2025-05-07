# SpoCo

SpoCo is a browser-based interface for different types of text corpora. The name is an abbreviation of **Spo**ken **Co**rpus, but it also refers to the Polish word "spoko", which in colloquial language means "okay", "easy" etc., which reflects its philosophy: the interface should be easy to use, but at the same time provide great possibilities for searching and analyzing the corpus.

## Types of corpora

The interface currently supports three types of corpora:

* Monolingual
* Spoken
* Parallel

## SpoCo in practice

Corpora using different variants of SpoCo:

* [Corpus of the Spisz dialect](https://spisz.ijp.pan.pl)
* [Diaspol Corpus (Polish-German)](http://www.diaspol.uw.edu.pl/polniem)
* [Rusyn Corpus](https://www.russinisch.uni-freiburg.de/corpus)
* [LangGener - spoken Polish-German](https://langgener.ijp.pan.pl)
* [LETRINT-Q: parallel corpus of legal texts](https://letrint.unige.ch/LETRINT-Q/)

## Backend

Currently, SpoCo works only with corpora in the [CWB](https://cwb.sourceforge.io/) format. To work properly, it requires CWB installed on the system.

### CWB - basic concepts

CWB is a set of standards and tools that allow for the creation and effective searching of text corpora. Below is a glossary of basic concepts:

* CQP/CQL - query language used to search a corpus, with a precise and powerful syntax
* positional attributes - annotation at the token (word) level such as lemma, grammatical tag etc.
* structural attributes - annotation at the structural level, includes a sequence of tokens - e.g. sentences, syntactic groups etc.
* VRT - text file format in which the corpus content is defined: tokens, positional and structural attributes

## Installation

At the moment, installing SpoCo is not quite *spoko*, because it requires a lot of manual configuration - but I'm working on it :)

### Requirements

- CWB 3 or newer
- Python 3.8 or newer with libraries:
    - FastAPI
    - uvicorn
    - gunicorn
- HTTP server (Apache / Nginx etc.) - for production environment
- Node 18.13 or newer () - for development environment

### Configuration

To work properly, it is necessary to properly prepare the *config.json* file, which is located in the *dist/settings* directory. The file has the following structure:

- projectName: project/corpus name

- corpora: list of corpora (in the CWB sense - it can be a single monolingual corpus, or more in the case of a parallel corpus). For each corpus, the following fields must be defined:

    - name: name of the given corpus - has meaning for parallel corpora
    - id: CWB corpus ID (defined in the registry file)
    - primary: 'true' for monolingual corpora or the parallel corpus which is the default main one

- positionalAttributes: list of positional attributes of the corpus
    -name: attribute name
    - type: can have four values:
        - text: the attribute will appear on the search page as a text field to fill in
        - select/multiselect: the attribute will appear on the search page as a selection field (single/multiple). For this type, it is necessary to define the "options" position
        - checkbox: the attribute will appear on the search page as a checkbox. In  this case, you need to define the "valueTrue" and "valueFalse" positions
        - none: the attribute will not appear on the search page, but is needed e.g. to change the display layer
    - description: attribute description, which will appear on the search page
    - initValue: initial (default) value of the attribute. Should be non-empty only in special cases
    - options: list of values that the attribute can take. Required field for select/multiselect type. Each value must have the following fields defined:
        - label: name of the value displayed to the user
        - value: actual value that goes to the query (can be the same as label)
    - valueTrue: required field for checkbox type - specifies the attribute value if the field is checked
    - valueFalse: as above, specifies the value of the unchecked field
    - layer: if present, informs that this attribute creates one of the display layers; the value is the position on the list of layers to display
    - inTooltip: if present and set to *true*, it will be displayed in the tooltip that appears when you hover over a word on the results page
- modifiers: list of predefined query modifiers appearing on the search page as checkboxes:
    - beginning: allows you to define only the beginning of the word
    - ending: end of the word
    - caseSensitive: case sensitivity
    - ignoreDiacritics: ignoring diacritics (e.g. ó/o, ł/l etc.)
- structuralAttributes: list of structural attributes of the corpus, which will appear in the *metadata* field on the results page
    - name: attribute name
    - description: attribute name displayed to the user
    - audio: if present and set to *true*, specifies the attribute that represents the audio segment associated with a particular audio file
- filters: list of groups containing structural attributes that can be used to filter results
    - name: group name. If only one group is defined, it is not displayed, if there are more groups, the names are displayed as tabs
    - fields: structural attributes belonging to a given group
        - name: attribute name
        - description: attribute name displayed to the user
        - type: text/select/multiselect - analogously to positional attributes
        - options: analogously to positional attributes
- cwb: defines CWB paths and settings
    - paths: paths necessary for configuration
        - bin: path to the directory containing CWB tools
        - registry-path: path to the directory where the corpus registry file(s) is located
    - context: structural attribute which provides the context for the match
- audio: if present, the corpus is treated as spoken
    - data-dir: path to the directory with audio files associated with segments in the corpus
    - attribute: structural attribute that represents the segment in the corpus
- system
    - host: name of the host/domain
    - port: port

### Running in developer mode

You will need two terminals, one to run the Node server responsible for the interface, and the other to run the uvicorn server that handles the backend (FastAPI/CWB). Both are launched from the main spoco directory:

1. Terminal 1
    - `npm install` (only needed the first time you run it)
    - `ng serve --port 4200`
2. Terminal 2
    - `uvicorn backend.get_results.backend --port 8000`
3. The *system* field in the config.json file should have the following values:
    - host: 'localhost'
    - port: 8000

The corpus should be available at http://localhost:4200

1. Copy the contents of the /dist directory to the main directory of your HTTP server (e.g. */var/www/html*).
2. Start the gunicorn server on port 8000.
3. Update the system field in the config.json file to match your server settings, e.g. host = 'korpus.domena.org/api', port = 8000.
4.In the configuration file of your HTTP server, create a redirect for requests to the address host:port (defined in the previous step) to the address where gunicorn is listening.


## Contact

Mail me: michauwww@gmail.com