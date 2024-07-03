/**
* Component used for rendering single row (i.e. one token in the CQP query)
**/

import { Component, OnInit, Input, OnDestroy, ViewEncapsulation } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { QueryKeeperService } from '../../../../query-keeper.service';
import { Corpus, PAttribute } from '../../../../dataTypes';
import { ConfigService } from 'src/app/config.service';
import { IDropdownSettings } from 'ng-multiselect-dropdown';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';

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

    private adjustFields () {

        // on corpus switch (in the 'ribbon' mode): updates all the form fields
        // according to the queryRow state in the queryKeeper

        //TODO: doesn't work with select and multi-select fields; number of queryRows is not connected to the corpus

        let qrData: any = {};
        try {
            qrData = this.queryKeeper.corpusQueryRows[this.corpus.id][this.queryRowIndex];
        } catch (error) {};
        for (let pa of this.positionalAttributes) {
            let controlValue = {};
            if (qrData[pa.name] !== undefined) {
                let value = qrData[pa.name].value;
                let modifiers: {[key: string]: string | boolean} = {};
                for (let mod of this.modifiers) {
                    let mod_val = qrData[pa.name].modifiers[mod.name]
                    if (mod_val !== undefined)
                        modifiers[mod.name] = mod_val;
                    else
                        modifiers[mod.name] = mod.initValue;
                }
                controlValue = {value: value, modifiers: modifiers};
            }
            else {
                let modifiers: {[key: string]: string | boolean} = {};
                for (let mod of this.modifiers)
                    modifiers[mod.name] = mod.initValue;
                controlValue = {value: pa.initValue, modifiers: modifiers};
            }
            this.adjusted = true;
            this.queryRowForm.controls[pa.name].setValue (controlValue);
        }
    }

    constructor(private queryKeeper: QueryKeeperService, private configService: ConfigService, private corporaKeeper: CorporaKeeperService) { }

    ngOnInit(): void {
        let fields: { [key: string]: UntypedFormGroup } = {};
        this.positionalAttributes = this.configService.fetch ('positionalAttributes');
        this.modifiers = this.configService.fetch ('modifiers');
        this.positionalAttributes = this.positionalAttributes.filter (el => {return el.use === undefined || el.use});     // filter out fields with use=false
        this.modifiers = this.modifiers.filter (el => {return el.use === undefined || el.use});
        this.pattrClasses =  {
            lg: Math.max (Math.round (12 / this.positionalAttributes.filter (el => { return el.type === 'text' }).length), 3),
            xl: Math.max (Math.round (12 / this.positionalAttributes.filter (el => { return el.type === 'text' }).length), 2)
        };
        for (let elem of this.positionalAttributes) {
            let modifiers: { [key: string]: UntypedFormControl } = {};
            for (let mod_elem of this.modifiers) {
                modifiers[mod_elem.name] = new UntypedFormControl (mod_elem.initValue);
            }
            fields[elem.name] = new UntypedFormGroup ({
                'value': new UntypedFormControl (elem.initValue),
                'modifiers': new UntypedFormGroup (modifiers) 
            });
            if (elem.type === 'multiselect') {
                this.multiselectOptions[elem.name] = elem.options;
            }
        }
        this.queryRowForm = new UntypedFormGroup (fields);
        this.currentGroup = this.positionalAttributes[0].name;    // at the beginning the current group is the first one
        this.corpus = this.corporaKeeper.getCurrent ();
        this.adjusted = false;

        // subscription for tracking changes in the form

        this.queryRowForm.valueChanges.subscribe (data => {
            if (this.adjusted)
                this.adjusted = false;
            else {
                let updatedData = this.updateFormData (data);
                this.queryKeeper.setQueryRow (updatedData, this.queryRowIndex, this.corpus.id);
            }
        });
        this.valueChanged = this.queryKeeper.valueChanged.subscribe ((changeType) => {
            if (changeType == 'clear')
                this.queryRowForm.reset ();
        });
        this.corpusChanged = this.corporaKeeper.currentChange.subscribe (corpus => {
            this.corpus = corpus;
            this.adjustFields ();
        })
    }

    ngOnDestroy(): void {
        this.valueChanged.unsubscribe ();
        this.corpusChanged.unsubscribe ();
    }

    positionalAttributes: PAttribute[];
    modifiers: PAttribute[];
    corpus: Corpus;

  // for proper division on the different size screens

    pattrClasses: {
        lg: number,
        xl: number
    };

    queryRowForm: UntypedFormGroup;   // stores the form
    currentGroup: string;      // tracks latest focused-on group (needed for displaying the correct set of modifier checkboxes)
    @Input() queryRowIndex: number = 0;   // there can be multiple query rows, we need to know which one it is
    valueChanged: Subscription;   // needed for clearing the form
    corpusChanged: Subscription;    // watches for current corpus
    multiselectOptions: any = {};   // TODO: fix type
    multiselectSettings: IDropdownSettings = {
        singleSelection: false,
        idField: 'value',
        textField: 'label',
        itemsShowLimit: 2,
        allowSearchFilter: false,
        enableCheckAll: false
      };
      adjusted: Boolean;

    filterByType (attrType: string): PAttribute[] { 
        if (attrType === 'selection')
            return this.positionalAttributes.filter ((attr) => { return attr.type == 'select' || attr.type === 'multiselect'});
        else     
            return this.positionalAttributes.filter (attr => { return attr.type === attrType});
    }
}