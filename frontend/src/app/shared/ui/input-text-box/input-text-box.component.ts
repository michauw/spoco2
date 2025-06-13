import { Component, Inject } from '@angular/core';
import { MatDialogModule, MatDialog, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule}  from '@angular/material/input';

@Component({
    selector: 'spoco-input-text-box',
    imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatButtonModule, MatInputModule],
    templateUrl: './input-text-box.component.html',
    styleUrl: './input-text-box.component.scss'
})
export class InputTextBoxComponent {

    constructor(
        public dialogRef: MatDialogRef<InputTextBoxComponent>,
            @Inject(MAT_DIALOG_DATA) public data: {field_name: string, initial_value: ''}
    ) { }

    valueControl = new FormControl(this.data.initial_value, [Validators.required]);
}
