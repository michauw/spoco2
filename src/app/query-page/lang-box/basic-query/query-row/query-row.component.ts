/**
* Component used for rendering single row (i.e. one token in the CQP query)
**/

import { Component, OnInit, Input, OnDestroy, ViewEncapsulation } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { QueryKeeperService } from '../../../../query-keeper.service';
import { PAttribute } from '../../../../dataTypes.d';
import { ConfigService } from 'src/app/config.service';
import { IDropdownSettings } from 'ng-multiselect-dropdown';

@Component({
    selector: 'spoco-query-row',
    templateUrl: './query-row.component.html',
    styleUrls: ['./query-row.component.scss'],
    encapsulation: ViewEncapsulation.None   // allows to change style of ng-multiselect-dropdown
})
export class QueryRowComponent implements OnInit, OnDestroy {

    private updateFormData (data: any) {    

        /*
            maps the form data to the values defined in the config file
            and adding the 'global' attribute (needed for handling multiword data)
            necessary for checkbox and (multi)select types
            checkboxes: true   -> valueTrue
                        false  -> valueFalse
                        global -> true
            select: global -> true
            multiselect: label  -> value
                         global -> true
        */
       
        let updatedData: {[key: string]: {value: string, modifiers: {[key: string]: boolean}, global: boolean}} = {};
        let value;
        let global: boolean;

        for (let key in data) {
            if (!data[key].value)
                continue;
            let correspondingPattr!: PAttribute;
            for (let pattr of this.positionalAttributes) {
                if (pattr.name === key) {
                    correspondingPattr = pattr;
                    break;
                }
            }
            if (correspondingPattr.type === 'checkbox') {
               value = data[key].value ? correspondingPattr.valueTrue : correspondingPattr.valueFalse; 
               global = true;
            }
            else if (correspondingPattr.type === 'select') {
                value = data[key].value;
                global = true;
            }
            else if (correspondingPattr.type === 'multiselect') {
                value = data[key].value.map ((obj: {label: string, value: string}) => { return obj.value }).join ('|');
                global = true;
            }
            else {
                value = data[key].value;
                global = false;
            }
            updatedData[key] = ({value: value, modifiers: data[key].modifiers, global: global});
        }

        return updatedData;
    }

    constructor(private queryKeeper: QueryKeeperService, private configService: ConfigService) { }

    ngOnInit(): void {
        let fields: { [key: string]: FormGroup } = {};
        this.positionalAttributes = this.configService.fetch ('positionalAttributes');
        this.modifiers = this.configService.fetch ('modifiers');
        this.positionalAttributes = this.positionalAttributes.filter (el => {return el.use === undefined || el.use});     // filter out fields with use=false
        this.modifiers = this.modifiers.filter (el => {return el.use === undefined || el.use});
        this.pattrClasses =  {
            lg: Math.max (Math.round (12 / this.positionalAttributes.filter (el => { return el.type === 'text' }).length), 3),
            xl: Math.max (Math.round (12 / this.positionalAttributes.filter (el => { return el.type === 'text' }).length), 2)
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
            if (elem.type === 'multiselect') {
                this.multiselectOptions[elem.name] = elem.options;
            }
        }
        this.queryRowForm = new FormGroup (fields);
        this.currentGroup = this.positionalAttributes[0].name;    // at the beginning the current group is the first one

        // subscription for tracking changes in the form

        this.queryRowForm.valueChanges.subscribe (data => {
            let updatedData = this.updateFormData (data);
            this.queryKeeper.setQueryRow (updatedData, this.queryRowIndex);
        });
        this.valueChanged = this.queryKeeper.valueChanged.subscribe ((changeType) => {
            if (changeType == 'clear')
                this.queryRowForm.reset ();
        });
    }

    ngOnDestroy(): void {
        this.valueChanged.unsubscribe ();
    }

    positionalAttributes: PAttribute[];
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
    multiselectOptions: any = {};   // TODO: fix type
    multiselectSettings: IDropdownSettings = {
        singleSelection: false,
        idField: 'value',
        textField: 'label',
        itemsShowLimit: 2,
        allowSearchFilter: false,
        enableCheckAll: false
      };

    filterByType (attrType: string): PAttribute[] { 
        if (attrType === 'selection')
            return this.positionalAttributes.filter ((attr) => { return attr.type == 'select' || attr.type === 'multiselect'});
        else     
            return this.positionalAttributes.filter (attr => { return attr.type === attrType});
    }
}
