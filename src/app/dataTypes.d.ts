type attrType = 'text' | 'checkbox' | 'select' | 'multiselect' | 'none';    // supported types for positional attributes input fields
type sattrType = 'text' | 'number';
type queryPageDisplayMode = 'mono' | 'ribbon' | 'select' | 'boxes'; // supported display modes for the multicorpora version
type resultsDisplayMode = 'plain' | 'kwic';
type corpusType = 'mono' | 'spoken' | 'parallel';
type metaObj = {[key: string]: {value: string, description: string, show: boolean}};

interface Option {label: string, value: string}         // label - used for displaying, value - for cwb query

// structure of the positional attribute
export interface PAttribute {
    name: string;
    type: attrType;
    initValue: string | boolean;        // string for text types, boolean for checkboxes
    description: string;                // placeholders for text types and labels for checkboxex
    position: number;                   // position of the attribute in a CWB output
    use?: boolean;                      // optional, as for now only ignoreDiacritics has use=false set by default
    valueTrue?: string;                 // only for checkboxes: map boolean true value to the corresponding string
    valueFalse?: string;                // as above, but for the false val
    options?: Option[];                 // for select and multiselect
    inTooltip?: boolean;                 // whether to show the attribute value in a tooltip on the results page
    layer?: number;
}

interface SAttribute {
    name: string;
    description: string;
    type: sattrType;
    inResults: boolean;
    context?: boolean;
    audio?: boolean;
}

interface ConfigObj {
    positionalAttributes: PAttribute[];
    modifiers: PAttribute[];
    structuralAttributes: SAttribute[];
    filters: Filters[];
    corpora: Corpus[];
    position: number;
}

interface PreferencesObj {
    results_per_page: number;
}

interface QueryRow {        // TODO: should be in its own file?
    [key: string]: {
        value: string;
        modifiers: {
            [key: string]: boolean
        };
        global?: boolean;
    }
}

interface Filters {
    [key: string] : string;
}

interface Corpus {
    name: string;
    id: string;
    'cwb-corpus': string;
    primary: boolean;
}

interface Word {
    word: string;           // basic positional attribute
    [key: string]: string;  // additional positional attributes
}

interface GenericEntry {
    meta: metaObj;
    selected: boolean;
}

interface ConcordanceEntry extends GenericEntry {
    left_context: Word[] ;
    match: Word[] ;
    right_context: Word[];
    id: string;
    aligned: {corpus_name: string, content: Word[]}[];
}

export interface TableEntry extends GenericEntry {
    values: any[];
}

interface Query {
    primary: {'corpus': string, 'query': string};
    secondary: {'corpus': string, 'query': string}[];
}


