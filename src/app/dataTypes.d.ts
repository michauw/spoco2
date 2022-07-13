type attrType = 'text' | 'checkbox' | 'select' | 'multiselect'    // supported types for positional attributes input fields
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
    options?: Option[]                  // for select and multiselect
}

export interface ConfigObj {
    positionalAttributes: PAttribute[],
    modifiers: PAttribute[];
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