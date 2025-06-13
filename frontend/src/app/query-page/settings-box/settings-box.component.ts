import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

type fieldData = {
    type: 'select' | 'number' | 'multiselect',
    value?: string | number | string[],
    value_obj?: {[key: string]: boolean},
    description: string,
    options?: {name: string, label: string, initial_check?: boolean}[]
}

export interface DialogData {
    [key: string]: {
        header: string,
        fields: {[key: string]: fieldData}
    }
}

@Component({
    selector: 'spoco-settings-box',
    templateUrl: './settings-box.component.html',
    styleUrls: ['./settings-box.component.scss'],
    standalone: false
})
export class SettingsBoxComponent implements OnInit {

    settingsForm: UntypedFormGroup;

    constructor(
        public dialogRef: MatDialogRef<SettingsBoxComponent>,
            @Inject(MAT_DIALOG_DATA) public data: DialogData
    ) { }

    ngOnInit(): void {
        console.log ('data', this.data['collocations']);
        let controls: {[key: string]: UntypedFormControl} = {};
        for (let group_name in this.data) {
            for (let field_name in this.data[group_name].fields) {
                const field: fieldData = this.data[group_name]['fields'][field_name];
                if (field.type !== 'multiselect')
                    controls[`${group_name}--${field_name}`] = new UntypedFormControl (field.value);
                else {
                    // controls[`${group_name}--${field_name}`] = new UntypedFormControl (field.value_obj);
                    for (let option_checkbox of field.options!) {
                        controls[`${group_name}--${field_name}--${option_checkbox.name}`] = new UntypedFormControl (field.value_obj!.hasOwnProperty (option_checkbox.name));
                    }
                    const obj = this.data[group_name].fields[field_name].value_obj;
                    this.data[group_name].fields[field_name].value = Object.keys (obj!).filter (key => obj![key]);
                }
            }
        }
        
        this.settingsForm = new UntypedFormGroup (controls);
        this.settingsForm.valueChanges.subscribe (data => {
            for (let key in data) {
                const parts = key.split ('--');
                if (parts.length === 2 && this.data[parts[0]].fields[parts[1]] !== undefined)
                    this.data[parts[0]].fields[parts[1]].value = data[key];
                else {
                    if (this.data[parts[0]].fields[parts[1]].value_obj !== undefined)
                        this.data[parts[0]].fields[parts[1]].value_obj![parts[2]] = data[key];
                }
                if (this.data[parts[0]].fields[parts[1]].type === 'multiselect') {
                    const obj = this.data[parts[0]].fields[parts[1]].value_obj;
                    this.data[parts[0]].fields[parts[1]].value = Object.keys (obj!).filter (key => obj![key]);
                }
            }
        });
    }

    key_list (object: object) {
        return Object.keys (object);
    }

    onNoClick(): void {
        this.dialogRef.close();
    }
}
