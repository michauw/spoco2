import { Injectable } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { Filters, Corpus, QueryRow, Query } from './dataTypes';
import { CorporaKeeperService } from './corpora-keeper.service';

@Injectable({
    providedIn: 'root'
})
export class QueryKeeperService {

    filters: Filters;
    corpusQueryRows: {[corpus: string]: QueryRow[]} = {};   // stores the query row data for each corpus box
    corpusQuery: {[corpus: string]: string} = {};   // stores the cqp query for each corpus
    finalQuery: string;
    valueChanged = new Subject<string> (); 
    cqpQueryChanged = new Subject<boolean> (); 
    corporaChanged: Subscription = this.corporaKeeper.corporaChange.subscribe (change => {
        this.finalQuery = this.getFinalQuery ();
        this.valueChanged.next ('order');
    });

    constructor (private corporaKeeper: CorporaKeeperService) { }

    private getRowQuery (queryRow: QueryRow): string {

        /*  Each row can store one or more tokens (separated by space).
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
            if (this.filters[key])
                filtersArray.push (`match.${key}="${this.filters[key]}"`);
        }
        if (filtersArray.length) {
            queryFilters += '::' + filtersArray.join (' & ');
        }

        return queryFilters;
    }

    clear () {
        for (let corpusName in this.corpusQueryRows) {
            this.corpusQueryRows[corpusName] = [];
            this.corpusQuery[corpusName] = '';
        }
        this.filters = {};
        // this.finalQuery = '';
        this.cqpQueryChanged.next (false);
        this.valueChanged.next ('clear');
    }

    getBasicQuery (corpus: string) {

        // construct a final CQP query

        let corpusQueryRows = this.corpusQueryRows[corpus];
        let query: string = '';

        if (corpusQueryRows === undefined) 
            return '';
        else if (corpusQueryRows === undefined)
            corpusQueryRows = [];
        for (let queryRow of corpusQueryRows)
            query += this.getRowQuery (queryRow);
        
        return query;
    }

    getFinalQuery () {
        const primary = this.corporaKeeper.getPrimary ();
        const secondary = this.corporaKeeper.getSecondary ();
        const filters: string = this.getFilters ();
        let query = this.getBasicQuery (primary.id);
        for (let corp of secondary) {
            let lang_query = this.getBasicQuery (corp.id);
            if (lang_query) {
                if (!query)
                    query = '[]';
                query += `:${corp.id.toUpperCase ()} ${lang_query}`;
            }
        }
        if (!query && filters)
            query = '[]';

        return query + filters;   
    }

    getCorpusQueries (): Query {

        // return all the pairs of type corpus,query, separately for the primary and secondary corpora

        const primary = this.corporaKeeper.getPrimary ();
        let secondary: {'corpus': string, 'query': string}[] = [];
        for (let corpus of this.corporaKeeper.getSecondary ()) {
            if (corpus.id === primary.id)
                continue;
            const aligned_query = this.corpusQuery[corpus.id];
            if (aligned_query !== '' && aligned_query !== undefined)
                secondary.push ({'corpus': corpus.id, 'query': this.corpusQuery[corpus.id]});
        }
        return {
            'primary': {'corpus': primary.id, 'query': this.corpusQuery[primary.id]},
            'secondary': secondary
        };
    }

    getCQPQueryChanged () {
        return this.cqpQueryChanged;
    }

    getQuery (corpus: string) {
        return this.corpusQuery[corpus];
    }

    getNumberOfRows (corpus_id: string) {
        try {
            return Math.max (this.corpusQueryRows[corpus_id].length, 1);
        } catch {
            return 1;
        }
    }

    pop (corpus: string) {
        this.corpusQueryRows[corpus].pop ();
        this.corpusQuery[corpus] = this.getBasicQuery (corpus);
        this.finalQuery = this.getFinalQuery ();
        this.valueChanged.next ('pop');
    }

    queryEmpty () {
        return Object.keys (this.corpusQuery).length === 0;
    }

    setCQPQueryChanged (value: boolean) {
        this.cqpQueryChanged.next (value);
    }

    setQueryRow (data: QueryRow, index: number, corpus: string) {
        if (!this.corpusQueryRows.hasOwnProperty (corpus))
            this.corpusQueryRows[corpus] = [];
        let corpusQueryRows = this.corpusQueryRows[corpus];
        if (corpusQueryRows.length <= index)
            corpusQueryRows.push (data);
        else
            corpusQueryRows[index] = data;
        this.corpusQuery[corpus] = this.getBasicQuery (corpus);
        this.finalQuery = this.getFinalQuery ();
        this.valueChanged.next ('set');
    }

    setFilters (data: Filters, corpus: string) {
        this.filters = data;
        this.corpusQuery[corpus] = this.getBasicQuery (corpus);
        this.finalQuery = this.getFinalQuery ();
        this.valueChanged.next ('set');
    }

    setQuery (query: string, corpus: string) {
        this.corpusQuery[corpus] = query;
    }

    setFinalQuery (query: string) {
        this.finalQuery = query;
    }
}
