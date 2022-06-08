import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class QueryKeeperService {

    constructor() { }

    queryRows: Object[] = [];
    valueChanged = new Subject<boolean> ();

    private getRowQuery (queryRow: any) {
        let elements: string[] = [];
        for (let pattr in queryRow) {
        let val = queryRow[pattr]['value'];
        if (val) {
            const modifiers = queryRow[pattr]['modifiers'];
            let flags: string = '';
            if (modifiers.hasOwnProperty ('beginning') & modifiers['beginning'])
                val += '.*';
            if (modifiers.hasOwnProperty ('ending') & modifiers['ending'])
                val =  '.*' + val;
            if (!(modifiers.hasOwnProperty ('caseSensitive') & modifiers['caseSensitive']))
                flags += 'c';
            if (modifiers.hasOwnProperty ('ignoreDiacritics') & modifiers['ignoreDiacritics'])
                flags += 'd';
            if (flags)
                flags = '%' + flags;
          elements.push (`${pattr}="${val}"${flags}`);
        }
      }
      return '[' + elements.join (' & ') + ']'
    }

    getQuery () {
        let query: string = '';
        for (let queryRow of this.queryRows)
            query += this.getRowQuery (queryRow);

        return query;
    }

    setValue (data: Object) {
        if (!this.queryRows.length)
            this.queryRows.push (data);
        else
            this.queryRows[0] = data;
        this.valueChanged.next (true);
    }

}
