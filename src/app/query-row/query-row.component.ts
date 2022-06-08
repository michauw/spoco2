/**
* Component used for rendering single row (i.e. one token in the CQP query)
**/

import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { QueryKeeperService } from '../query-keeper.service';

type attrType = 'text' | 'checkbox';    // supported types for positional attributes input fields

// structure of the positional attribute
interface PAttribute {
    name: string,
    type: attrType,
    initValue: string | boolean,        // string for text types, boolean for checkboxes
    description: string,                // placeholders for text types and labels for checkboxex
    use?: boolean                       // optional, as for now only ignoreDiacritics has use=false set by default
};

@Component({
    selector: 'spoco-query-row',
    templateUrl: './query-row.component.html',
    styleUrls: ['./query-row.component.scss']
})
export class QueryRowComponent implements OnInit {

    constructor(private queryKeeper: QueryKeeperService) { }

    ngOnInit(): void {
      let fields: { [key: string]: FormControl | FormGroup } = {};
      this.positional_attributes = this.positional_attributes.filter (el => {return el.use === undefined || el.use});     // filter out fields with use=false
      this.modifiers = this.modifiers.filter (el => {return el.use === undefined || el.use});
      for (let elem of this.positional_attributes) {
          let modifiers: { [key: string]: FormControl } = {};
          for (let elem of this.modifiers) {
              modifiers[elem.name] = new FormControl (elem.initValue);
          }
          fields[elem.name] = new FormGroup ({
              'value': new FormControl (elem.initValue),
              'modifiers': new FormGroup (modifiers)
          });
      }
      this.queryRowForm = new FormGroup (fields);
      this.currentGroup = this.positional_attributes[0].name;
      this.queryRowForm.valueChanges.subscribe (data => {
          this.queryKeeper.setValue (data);
      });
    }

    positional_attributes: PAttribute[] = [
      {name: 'word', type: 'text', initValue: '', description: 'Word form'},
      {name: 'lemma', type: 'text', initValue: '', description: 'Lemma'},
      {name: 'tag', type: 'text', initValue: '', description: 'Grammatic tag'}
    ];

    modifiers: PAttribute[] = [
      {name: 'beginning', type: 'checkbox', initValue: false, description: 'begins with'},
      {name: 'ending', type: 'checkbox', initValue: false, description: 'ends with'},
      {name: 'caseSensitive', type: 'checkbox', initValue: false, description: 'case sensitive'},
      {name: 'ignoreDiacritics', type: 'checkbox', initValue: false, description: 'ignore diacritics', use: false}
    ]

    pattrClasses = {
      lg: Math.max (Math.round (12 / this.positional_attributes.length), 3),
      xl: Math.max (Math.round (12 / this.positional_attributes.length), 2)
    };

    queryRowForm!: FormGroup;
    currentGroup!: string;
}
