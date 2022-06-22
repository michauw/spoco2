import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

interface QueryRow {        // TODO: should be in its own file?
    [key: string]: {
        value: string,
        modifiers: {
            [key: string]: boolean
        }
    }
};

@Injectable({
    providedIn: 'root'
})
export class QueryKeeperService {

    constructor() { }

    queryRows: QueryRow[] = [];     // stores the data from all the query-row forms
    valueChanged = new Subject<boolean> ();

    // constructs CQP query for one query-row

    private getRowQuery (queryRow: QueryRow) {
        let elements: string[] = [];
        for (let pattr in queryRow) {
        let val = queryRow[pattr]['value'];
        if (val) {
            const modifiers = queryRow[pattr]['modifiers'];
            let flags: string = '';
            if (modifiers.hasOwnProperty ('beginning') && modifiers['beginning'])
                val += '.*';
            if (modifiers.hasOwnProperty ('ending') && modifiers['ending'])
                val =  '.*' + val;
            if (!(modifiers.hasOwnProperty ('caseSensitive') && modifiers['caseSensitive']))
                flags += 'c';
            if (modifiers.hasOwnProperty ('ignoreDiacritics') && modifiers['ignoreDiacritics'])
                flags += 'd';
            if (flags)
                flags = '%' + flags;
          elements.push (`${pattr}="${val}"${flags}`);
        }
      }
      return '[' + elements.join (' & ') + ']'
    }

    // constructs final CQP query

    getQuery () {
        let query: string = '';
        for (let queryRow of this.queryRows)
            query += this.getRowQuery (queryRow);

        return query;
    }

    setValue (data: QueryRow, index: number) {
        if (this.queryRows.length <= index)
            this.queryRows.push (data);
        else
            this.queryRows[index] = data;
        this.valueChanged.next (true);
    }
}
