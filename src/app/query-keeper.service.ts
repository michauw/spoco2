import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Filters, QueryRow } from './dataTypes';




@Injectable({
    providedIn: 'root'
})
export class QueryKeeperService {

    constructor() { }
    filters: Filters;
    queryRows: QueryRow[] = [];     // stores the data from all the query-row forms
    valueChanged = new Subject<string> ();
    // clearData = new Subject<void> ();

    // constructs CQP query for one query-row

    private getRowQuery (queryRow: QueryRow): string {

        /*  Each row can store one or more values (separated by space).
            These values are stored in the matrix of shape m x n, 
            where m is a number of values (i.e. separate tokens), 
            and n is a number of positional attributes
        */

        let queryRowMatrix = [];
        let globals: number[] = [];
        const pattrs = Object.keys (queryRow);

        // build the matrix

        for (let pattr_i = 0; pattr_i <pattrs.length; ++pattr_i) {
            if (queryRow[pattrs[pattr_i]].global) {
                globals.push (pattr_i);
                continue;
            }
            const values = queryRow[pattrs[pattr_i]]['value'].trimEnd ().split (' ');
            const modifiers = queryRow[pattrs[pattr_i]].modifiers;
            let flags: string = '';
            if (!(modifiers.hasOwnProperty ('caseSensitive') && modifiers['caseSensitive']))
                    flags += 'c';
            if (modifiers.hasOwnProperty ('ignoreDiacritics') && modifiers['ignoreDiacritics'])
                flags += 'd';
            if (flags)
                flags = '%' + flags;
            for (let val_i = 0; val_i < values.length; ++val_i) {
                let value = values[val_i];
                if (value === '')
                    continue;
                if (modifiers.hasOwnProperty ('beginning') && modifiers['beginning'])
                    value += '.*';
                if (modifiers.hasOwnProperty ('ending') && modifiers['ending'])
                    value =  '.*' + value;
                if (queryRowMatrix.length <= val_i)
                    queryRowMatrix.push (Array (pattrs.length));
                queryRowMatrix[val_i][pattr_i] = [value, flags];
            }
        }

        for (let glob_i of globals) {
            if (!queryRowMatrix.length)
                queryRowMatrix.push (Array (pattrs.length));
            for (let row_i = 0; row_i < queryRowMatrix.length; ++row_i)
                if (queryRow[pattrs[glob_i]].value)
                    queryRowMatrix[row_i][glob_i] = [queryRow[pattrs[glob_i]].value, ''];
        }

        // build the actual query from the matrix

        let query = '';
        for (let row of queryRowMatrix) {
            let query_elements = [];
            for (let pattr_i = 0; pattr_i < pattrs.length; ++pattr_i) {
                if (row[pattr_i] !== undefined)
                    query_elements.push (`${pattrs[pattr_i]}="${row[pattr_i][0]}"${row[pattr_i][1]}`)
            }
            if (query_elements.length) {
                query += '[' + query_elements.join (' & ') + ']';
            }
        }
        
        return query;
    }

    private getFilters (): string {
        let queryFilters: string = '';
        let filtersArray: string[] = [];
        for (let key in this.filters) {
            filtersArray.push (`match.${key}="${this.filters[key]}"`);
        }
        if (filtersArray.length) {
            queryFilters += '::' + filtersArray.join (' & ');
        }

        return queryFilters;
    }

    clear () {
        this.queryRows = [];
        this.valueChanged.next ('clear');
        // this.clearData.next ();
    }

    // constructs final CQP query

    getQuery () {
        let query: string = '';
        for (let queryRow of this.queryRows)
            query += this.getRowQuery (queryRow);

        let filtersPart: string = this.getFilters ();
        if (query === '' && filtersPart !== '')
            query = '[]';
        query += filtersPart;
        
        return query;
    }

    pop () {
        this.queryRows.pop ();
        this.valueChanged.next ('pop');
    }

    setValue (data: QueryRow, index: number) {
        if (this.queryRows.length <= index)
            this.queryRows.push (data);
        else
            this.queryRows[index] = data;
        this.valueChanged.next ('set');
    }

    setFilters (data: Filters) {
        this.filters = data;
        this.valueChanged.next ('set');
    }
}
