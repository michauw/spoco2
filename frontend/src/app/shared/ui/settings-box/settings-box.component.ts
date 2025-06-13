import { Component, Inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { ConfirmationBoxComponent } from '../confirmation-box/confirmation-box.component';
import { MatButtonModule } from '@angular/material/button';

type fieldData = {
    type: 'select' | 'number' | 'multiselect' | 'action',
    value?: string | number | string[],
    value_obj?: {[key: string]: boolean},
    description: string,
    options?: {name: string, label: string, initial_check?: boolean}[],
    action?: {handler: () => void, confirm?: string}
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
    imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule]
})
export class SettingsBoxComponent implements OnInit {

    settingsForm: UntypedFormGroup;

    constructor(
        public dialogRef: MatDialogRef<SettingsBoxComponent>,
            @Inject(MAT_DIALOG_DATA) public data: DialogData,
            public dialog: MatDialog
    ) { }

    ngOnInit(): void {
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

    performAction (group: string, field: string) {
        const action = this.data[group].fields[field].action!;
        if (action.confirm) {
            const dialogRef = this.dialog.open (ConfirmationBoxComponent, {data: action.confirm});
            dialogRef.afterClosed ().subscribe (answer => {
                if (answer)
                    action.handler ();
            })
        }
        else action.handler ();
    }
}
