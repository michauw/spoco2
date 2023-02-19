type attrType = 'text' | 'checkbox' | 'select' | 'multiselect'    // supported types for positional attributes input fields
type sattrType = 'text' | 'number'
type queryPageDisplayMode = 'mono' | 'ribbon' | 'select' | 'boxes' // supported display modes for the multicorpora version
type resultsDisplayMode = 'plain' | 'kwic'
type corpusType = 'mono' | 'spoken' | 'parallel'
export interface Option {label: string, value: string}         // label - used for displaying, value - for cwb query

// structure of the positional attribute
export interface PAttribute {
    name: string,
    type: attrType,
    initValue: string | boolean,        // string for text types, boolean for checkboxes
    description: string,                // placeholders for text types and labels for checkboxex
    use?: boolean,                      // optional, as for now only ignoreDiacritics has use=false set by default
    valueTrue?: string,                 // only for checkboxes: map boolean true value to the corresponding string
    valueFalse?: string,                // as above, but for the false val
    options?: Option[],                 // for select and multiselect
    inResults?: boolean                 // whether to show the attribute value in a tooltip on the results page
}

export interface SAttribute {
    name: string,
    type: sattrType,
    inResults: boolean,
    context?: boolean
}

export interface ConfigObj {
    positionalAttributes: PAttribute[],
    modifiers: PAttribute[],
    structuralAttributes: SAttribute[],
    filters: Filters[],
    corpora: Corpus[];
}

export interface QueryRow {        // TODO: should be in its own file?
    [key: string]: {
        value: string,
        modifiers: {
            [key: string]: boolean
        },
        global?: boolean;
    }
}

export interface Filters {
    [key: string] : string;
}

export interface Corpus {
    name: string,
    id: string,
    corpus: string;
    primary: boolean;
}

export interface Word {
    word: string;           // basic positional attribute
    [key: string]: string;  // additional positional attributes
}

interface OutputLine {
    left_context: Word[], 
    match: Word[], 
    right_context: Word[], 
    id: string,
    meta: {[key: string]: string};
}
