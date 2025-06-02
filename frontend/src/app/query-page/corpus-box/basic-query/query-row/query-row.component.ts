/**
* Component used for rendering single row (i.e. one token in the CQP query)
**/

import { Component, OnInit, Input, OnDestroy, ViewEncapsulation, OnChanges, SimpleChange, SimpleChanges } from '@angular/core';
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
    encapsulation: ViewEncapsulation.None // allows to change style of ng-multiselect-dropdown
    ,
    standalone: false
})
export class QueryRowComponent implements OnInit, OnDestroy {

    @Input() queryRowIndex: number = 0;   // there can be multiple query rows, we need to know which one it is
    @Input() corpus: Corpus;

    positionalAttributes: PAttribute[];
    modifiers: PAttribute[];

  // for proper division on the different size screens

    pattrClasses: {
        lg: number,
        xl: number
    };

    queryRowForm: UntypedFormGroup;   // stores the form
    currentGroup: string;      // tracks latest focused-on group (needed for displaying the correct set of modifier checkboxes)
    valueChanged: Subscription;   // needed for clearing the form
    currentCorpusChanged: Subscription;    // watches for current corpus
    corporaChanged: Subscription; 
    multiselectOptions: any = {};   // TODO: fix type
    multiselectSettings: IDropdownSettings = {
        singleSelection: false,
        idField: 'value',
        textField: 'label',
        itemsShowLimit: 2,
        allowSearchFilter: false,
        enableCheckAll: false
    };

    constructor(private queryKeeper: QueryKeeperService, private configService: ConfigService, private corporaKeeper: CorporaKeeperService) { }

    ngOnInit(): void {
        this.positionalAttributes = this.configService.fetch ('positionalAttributes');
        this.modifiers = this.configService.fetch ('modifiers');
        this.positionalAttributes = this.positionalAttributes.filter (el => {return el.use === undefined || el.use});     // filter out fields with use=false
        this.modifiers = this.modifiers.filter (el => {return el.use === undefined || el.use});
        this.pattrClasses =  {
            lg: Math.max (Math.round (12 / this.positionalAttributes.filter (el => { return el.type === 'text' }).length), 3),
            xl: Math.max (Math.round (12 / this.positionalAttributes.filter (el => { return el.type === 'text' }).length), 2)
        };
        
        this.queryRowForm = this.createForm ();
        this.currentGroup = this.positionalAttributes[0].name;    // at the beginning the current group is the first one
        if (this.corpus === undefined)  // 'one box' parallel view doesn't pass the corpus down to the queryRow component, it uses the corporaKeeper mechanism instead
            this.corpus = this.corporaKeeper.getCurrent ();

        this.queryRowForm.valueChanges.subscribe (data => {
            let updatedData = this.updatedToQueryRow (data);
            if (Object.keys (updatedData).length !== 0 || this.queryRowIndex === 0) {
                this.queryKeeper.setQueryRow (updatedData, this.queryRowIndex, this.corpus.id);
            }
        });
        this.valueChanged = this.queryKeeper.valueChanged.subscribe ((changeType) => {
            if (changeType == 'clear')
                this.queryRowForm.reset ();
        });
    }

    ngOnDestroy(): void {
        this.valueChanged.unsubscribe ();
    }

    filterByType (attrType: string): PAttribute[] { 
        if (attrType === 'selection')
            return this.positionalAttributes.filter ((attr) => { return attr.type == 'select' || attr.type === 'multiselect'});
        else     
            return this.positionalAttributes.filter (attr => { return attr.type === attrType});
    }

    private updatedToQueryRow (data: any) {    

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

    private createForm () {

        // creates a new empty form and populates it with existing data (if present)

        let fields: { [key: string]: UntypedFormGroup } = {};
        let qrData = this.queryKeeper.corpusQueryRows[this.corpus.id]?.[this.queryRowIndex];
        for (let elem of this.positionalAttributes) {
            const current_value = qrData?.[elem.name]?.value;
            let modifiers: { [key: string]: UntypedFormControl } = {};
            for (let mod_elem of this.modifiers) {
                const current_mod_value = qrData?.[elem.name]?.modifiers[mod_elem.name];
                modifiers[mod_elem.name] = new UntypedFormControl (current_mod_value ?? mod_elem.initValue);
            }
            fields[elem.name] = new UntypedFormGroup ({
                'value': new UntypedFormControl (current_value ?? elem.initValue),
                'modifiers': new UntypedFormGroup (modifiers) 
            });
            if (elem.type === 'multiselect') {
                this.multiselectOptions[elem.name] = elem.options;
            }
        }
        return new UntypedFormGroup (fields);
    }

    private updateForm () { // not used right now
        this.queryRowForm.reset ();
        let qrData = this.queryKeeper.corpusQueryRows[this.corpus.id]?.[this.queryRowIndex];
        for (let pattr in qrData) {
            let value: {value: any, modifiers: {[key: string]: boolean | string }}= {value: qrData[pattr].value, modifiers: {}};
            for (let mod in qrData[pattr].modifiers)
                value.modifiers[mod] = qrData[pattr].modifiers[mod];
            this.queryRowForm.controls[pattr].setValue (value);
        }
    }
}