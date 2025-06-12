import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';

@Component ({
    selector: 'app-warning-dialog',
    templateUrl: './warning-dialog.component.html',
    standalone: false
})
export class WarningDialogComponent {
    dontShowAgain = new FormControl (false);
    decision: boolean;

    constructor (
        public dialogRef: MatDialogRef<WarningDialogComponent>,
        @Inject (MAT_DIALOG_DATA) public data: { message: string }
    ) {}

    onClick (decision: boolean): void {
        this.dialogRef.close ({decision: decision, remember: this.dontShowAgain.value});
    }
}
