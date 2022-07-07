type attrType = 'text' | 'checkbox' | 'select' | 'multiselect';    // supported types for positional attributes input fields

// structure of the positional attribute
export interface PAttribute {
    name: string,
    type: attrType,
    initValue: string | boolean,        // string for text types, boolean for checkboxes
    description: string,                // placeholders for text types and labels for checkboxex
    use?: boolean,                      // optional, as for now only ignoreDiacritics has use=false set by default
    valueTrue?: string,                 // only for checkboxes: map boolean true value to the corresponding string
    valueFalse?: string                 // as above, but for the false val
}

export interface ConfigObj {
    positionalAttributes: PAttribute[],
    modifiers: PAttribute[];
}