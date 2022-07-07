/**
* Component used for rendering single row (i.e. one token in the CQP query)
**/

import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { QueryKeeperService } from '../../../../query-keeper.service';
import { PAttribute } from '../../../../dataTypes.d';
import { ConfigService } from 'src/app/config.service';

@Component({
    selector: 'spoco-query-row',
    templateUrl: './query-row.component.html',
    styleUrls: ['./query-row.component.scss']
})
export class QueryRowComponent implements OnInit, OnDestroy {

    constructor(private queryKeeper: QueryKeeperService, private configService: ConfigService) { }

    ngOnInit(): void {
        let fields: { [key: string]: FormGroup } = {};
        this.positionalAttributes = this.configService.fetch ('positionalAttributes');
        this.modifiers = this.configService.fetch ('modifiers');
        this.positionalAttributes = this.positionalAttributes.filter (el => {return el.use === undefined || el.use});     // filter out fields with use=false
        this.modifiers = this.modifiers.filter (el => {return el.use === undefined || el.use});
        this.pattrClasses =  {
            lg: Math.max (Math.round (12 / this.positionalAttributes.length), 3),
            xl: Math.max (Math.round (12 / this.positionalAttributes.length), 2)
        };
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
            for (let key in data) {
                if (typeof data[key].value === 'boolean') {
                    let mappedValue: string | undefined = '';
                    for (let pkey of this.positionalAttributes) {
                        if (pkey.name === key) {
                            if (data[key].value)
                                mappedValue = pkey.valueTrue;
                            else
                                mappedValue = pkey.valueFalse;
                            break;
                        }
                    }
                    data[key].value = mappedValue;
                    data[key].global = true;
                }
                else data[key].global = false;
            }
            this.queryKeeper.setValue (data, this.queryRowIndex);
        });
        this.valueChanged = this.queryKeeper.valueChanged.subscribe ((changeType) => {
            if (changeType == 'clear')
                this.queryRowForm.reset ();
        });
    }

    ngOnDestroy(): void {
        this.valueChanged.unsubscribe ();
    }

    // TODO: this should be configurable and loaded from a json file

    positionalAttributes: PAttribute[];

    // TODO: ditto

    modifiers: PAttribute[];

  // for proper division on the different size screens

    pattrClasses: {
        lg: number,
        xl: number
    };

    queryRowForm: FormGroup;   // stores the form
    currentGroup: string;      // tracks latest focused-on group (needed for displaying the correct set of modifier checkboxes)
    @Input() queryRowIndex: number = 0;   // there can be multiple query rows, we need to know which one it is
    valueChanged: Subscription;   // needed for clearing the form

    filterByType (attrType: string): PAttribute[] {        
        return this.positionalAttributes.filter (attr => { return attr.type === attrType});
    }
}
