import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Data } from '@angular/router';
import { ConfigService } from '../config.service';
import { PreferencesObj } from '../dataTypes';
import { MatDialog } from '@angular/material/dialog';
import { SettingsBoxComponent } from '../shared/ui/settings-box/settings-box.component';

@Component({
    selector: 'spoco-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    standalone: false
})
export class HeaderComponent implements OnInit {
    
    name: string;
    preferences: PreferencesObj;

    constructor (private route: ActivatedRoute, private config: ConfigService, public dialog: MatDialog) { }

    ngOnInit(): void {
        this.route.data.subscribe (     // loading settings from settings/config.json and storing them in configService (shouldn't be in the query-page component?)
            (data: Data) => { 
                this.name = this.config.fetch ('projectName');
                if (!this.property_set (this.name)) {
                    this.name = data['config']['projectName'];
                    this.config.store ('projectName', this.name);
                }
                // this.preferences = this.config.fetch ('preferences');
                // if (!this.property_set (this.preferences)) {
                //     this.preferences = data['preferences'];
                //     this.config.store ('preferences', this.preferences, true);
                // }
            });
        const default_preferences: PreferencesObj = {
            results_per_page: 20, 
            results_format: 'tsv', 
            font_size: 16,
            filename: 'default'
        };
        this.preferences = this.config.fetch ('preferences', true) ?? default_preferences;
        this.config.store ('preferences', this.preferences, true);
        document.documentElement.style.fontSize = `${this.preferences.font_size}px`;
    }

    openPreferences () {
        const dialogRef = this.dialog.open (SettingsBoxComponent, {data: {
            general: {
                header: 'General preferences',
                fields: {
                    'font-size': {description: 'Text size', type: 'number', value: this.preferences.font_size}
                }
            },
            results: {
                header: 'Results',
                fields: {
                    'per-page': {description: 'Number of results on page', type: 'number', value: this.preferences.results_per_page},
                    'format': {
                        description: 'Format of the export file', 
                        type: 'select', 
                        value: this.preferences.results_format, 
                        options: [{'name': 'tsv', 'label': 'TSV'}, {'name': 'xlsx', 'label': 'XLSX'}]
                    },
                    'name': {
                        description: 'Export file name',
                        type: 'select',
                        value: this.preferences.filename,
                        options: [{'name': 'default', 'label': 'Default: results'}, {'name': 'choose', 'label': 'Let me choose'}]
                    }
                }
            },
            other: {
                header: '',
                fields: {
                    'reset': {
                        description: 'Reset settings to default', 
                        type: 'action', 
                        action: {
                            handler: () => { localStorage.clear (); window.location.reload () }, 
                            confirm: 'Are you sure?'
                        }
                    }
                }
            }
        }});
        dialogRef.afterClosed ().subscribe (data => {
            this.preferences.font_size = data.general.fields['font-size'].value;
            this.preferences.results_format = data.results.fields.format.value;
            this.preferences.results_per_page = data.results.fields['per-page'].value;
            this.preferences.filename = data.results.fields.name.value;
            document.documentElement.style.fontSize = `${this.preferences.font_size}px`;
            this.config.store ('preferences', this.preferences, true);
        })
    }

    private property_set (element: any) {
        if (Array.isArray (element))
            return element.length > 0;
        return Boolean (element);
    }
}
