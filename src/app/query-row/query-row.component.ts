/**
* Component used for rendering single row (i.e. one token in the CQP query)
**/

import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
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
export class QueryRowComponent implements OnInit, OnDestroy {

    constructor(private queryKeeper: QueryKeeperService) { }

    ngOnInit(): void {
      let fields: { [key: string]: FormGroup } = {};
      this.positionalAttributes = this.positionalAttributes.filter (el => {return el.use === undefined || el.use});     // filter out fields with use=false
      this.modifiers = this.modifiers.filter (el => {return el.use === undefined || el.use});
      for (let elem of this.positionalAttributes) {
          let modifiers: { [key: string]: FormControl } = {};
          for (let mod_elem of this.modifiers) {
              modifiers[mod_elem.name] = new FormControl (mod_elem.initValue);
          }
          fields[elem.name] = new FormGroup ({
              'value': new FormControl (elem.initValue),
              'modifiers': new FormGroup (modifiers)
          });
      }
      this.queryRowForm = new FormGroup (fields);
      this.currentGroup = this.positionalAttributes[0].name;    // at the beginning the current group is the first one

      // subscription for tracking changes in the form

      this.queryRowForm.valueChanges.subscribe (data => {
          this.queryKeeper.setValue (data, this.queryRowIndex);
      });
      this.clearSubscription = this.queryKeeper.clearData.subscribe (() => {
        this.queryRowForm.reset ();
      });
    }

    ngOnDestroy(): void {
        this.clearSubscription.unsubscribe ();
    }

    // TODO: this should be configurable and loaded from a json file

    positionalAttributes: PAttribute[] = [
      {name: 'word', type: 'text', initValue: '', description: 'Word form'},
      {name: 'lemma', type: 'text', initValue: '', description: 'Lemma'},
      {name: 'tag', type: 'text', initValue: '', description: 'Grammatic tag'}
    ];

    // TODO: ditto

    modifiers: PAttribute[] = [
      {name: 'beginning', type: 'checkbox', initValue: false, description: 'begins with'},
      {name: 'ending', type: 'checkbox', initValue: false, description: 'ends with'},
      {name: 'caseSensitive', type: 'checkbox', initValue: false, description: 'case sensitive'},
      {name: 'ignoreDiacritics', type: 'checkbox', initValue: false, description: 'ignore diacritics', use: false}
  ];

  // for proper division on the different size screens

    pattrClasses = {
      lg: Math.max (Math.round (12 / this.positionalAttributes.length), 3),
      xl: Math.max (Math.round (12 / this.positionalAttributes.length), 2)
    };

    queryRowForm: FormGroup;   // stores the form
    currentGroup: string;      // tracks latest focused-on group (needed for displaying the correct set of modifier checkboxes)
    @Input() queryRowIndex: number = 0;   // there can be multiple query rows, we need to know which one it is
    clearSubscription: Subscription;
}
