import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { MatTooltipModule } from '@angular/material/tooltip';

type Option = {name: string, value: boolean, disabled: boolean, prefix?: string, suffix?: string};
type Tooltip = {
    value: string, 
    position?: 'above' | 'below' | 'left' | 'right' | 'before' | 'after',
    delay?: string
};

@Component({
    selector: 'spoco-icon-multiselect',
    imports: [CommonModule, ReactiveFormsModule, SharedModule, MatTooltipModule],
    templateUrl: './icon-multiselect.component.html',
    styleUrl: './icon-multiselect.component.scss'
})
export class IconMultiselectComponent implements OnInit {

    @Input() options: Option[] = [];
    @Input() tooltip?: Tooltip;
    @Output() selectionChange = new EventEmitter<string[]> ();

    isOpen = false;

    ngOnInit(): void {
        this.tooltip = this.tooltip ?? {value: '', position: 'above', delay: '0'};
        this.tooltip.position = this.tooltip.position ?? 'above';
        this.tooltip.delay = this.tooltip.delay ?? '0';
        console.log (this.tooltip);
    }

    toggleOption (option: Option): void {
        option.value = !option.value;
        this.selectionChange.emit (this.options.filter (o => o.value).map (o => o.name));
    }
}
