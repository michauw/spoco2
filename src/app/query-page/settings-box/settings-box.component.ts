import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface DialogData {
    [key: string]: {
        type: 'select' | 'number' | 'multiselect',
        value?: string | number,
        value_obj?: {[key: string]: boolean},
        description: string,
        options?: {name: string, label: string, initial_check?: boolean}[]
    }
}

@Component({
    selector: 'spoco-settings-box',
    templateUrl: './settings-box.component.html',
    styleUrls: ['./settings-box.component.scss'],
})
export class SettingsBoxComponent implements OnInit {

    settingsForm: FormGroup;

    constructor(
        public dialogRef: MatDialogRef<SettingsBoxComponent>,
            @Inject(MAT_DIALOG_DATA) public data: DialogData
    ) { }

    ngOnInit(): void {
        let controls: {[key: string]: FormControl} = {};
        for (let field_name in this.data) {
            if (this.data[field_name].type !== 'multiselect')
                controls[field_name] = new FormControl (this.data[field_name].value);
            else {
                for (let option_checkbox of this.data[field_name].options!) {
                    controls[`${field_name}_${option_checkbox.name}`] = new FormControl (option_checkbox.initial_check);
                }
            }
        }
        this.settingsForm = new FormGroup (controls);
        this.settingsForm.valueChanges.subscribe (data => {
            for (let key in data) {
                if (this.data[key] !== undefined)
                    this.data[key].value = data[key];
                else {
                    const parts = key.split ('_');
                    if (this.data[parts[0]].value_obj !== undefined)
                        this.data[parts[0]].value_obj![parts[1]] = data[key];
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
