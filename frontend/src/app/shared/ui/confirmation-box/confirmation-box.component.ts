import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'spoco-confirmation-box',
  imports: [MatDialogModule, MatFormFieldModule, MatButtonModule],
  templateUrl: './confirmation-box.component.html',
  styleUrl: './confirmation-box.component.scss'
})
export class ConfirmationBoxComponent {

  constructor(
        public dialogRef: MatDialogRef<ConfirmationBoxComponent>,
            @Inject(MAT_DIALOG_DATA) public data: string
    ) { }

}
