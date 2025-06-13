import { Component, HostListener, OnInit } from '@angular/core';
import { Router, Data, ActivatedRoute } from '@angular/router';
import { ConfigService } from '../config.service';
import { QueryKeeperService } from '../query-keeper.service';
import { MatDialog } from '@angular/material/dialog';
import { Corpus, PAttribute, corpusType, queryPageDisplayMode } from '../dataTypes';
import { SettingsBoxComponent } from './settings-box/settings-box.component';
import { CorporaKeeperService } from '../corpora-keeper.service';
import { faSliders } from '@fortawesome/free-solid-svg-icons';


type collocationsSettings = {
    ams: string[], case: string, pattr: string, window_size: number, frequency_filter: number, pos?: string[]
};
type frequencySettings = {
    pattr: string, frequency_filter: number
};

@Component({
    selector: 'spoco-query-page',
    templateUrl: './query-page.component.html',
    styleUrls: ['./query-page.component.scss'],
    standalone: false
})
export class QueryPageComponent implements OnInit {

    collocation_settings: collocationsSettings;
    frequency_settings: frequencySettings;
    pattrs: PAttribute[];
    sliders = faSliders;
    displayMode: queryPageDisplayMode;
    
    constructor (
        private router: Router, 
        private route: ActivatedRoute,
        private queryKeeper: QueryKeeperService,
        private config: ConfigService,
        private corporaKeeper: CorporaKeeperService,
        public dialog: MatDialog
    ) { }
    
    ngOnInit(): void {
        this.route.data.subscribe (     // loading settings from settings/config.json and storing them in configService (shouldn't be in the query-page component?)
            (data: Data) => {  
                this.pattrs = data['config']['positionalAttributes'];
                let used_numbers: number[] = [];
                let layers: {name: string, position: number}[] = [];
                for (let ind = 0; ind < this.pattrs.length; ++ind) {
                    if (this.pattrs[ind].position === undefined) {
                        const pos = used_numbers.length ? Math.max.apply (Math, used_numbers) + 1 : 0;
                        this.pattrs[ind].position = pos;
                        used_numbers.push (pos);
                    }
                    else
                        used_numbers.push (this.pattrs[ind].position);
                    if (this.pattrs[ind].layer !== undefined) {
                        layers.push ({name: this.pattrs[ind].name, position: this.pattrs[ind].layer!});
                    }
                }
                layers.sort ((x, y) => x.position - y.position);
                if (!layers.length)
                    layers.push ({name: 'word', position: 0});
                if (!layers.map (el => el.name).includes ('word')) {
                    let min_position = layers[0].position;
                    if (min_position > 0)
                        layers.unshift ({name: 'word', position: 0});
                    else
                        layers.push ({name: 'word', position: -1});
                }
                this.config.store ('layers', layers.map (el => el.name));
                this.config.store ('positionalAttributes', this.pattrs);
                this.config.store ('modifiers', data['config']['modifiers']);
                this.config.store ('structuralAttributes', data['config']['structuralAttributes']);
                this.config.store ('filters', data['config']['filters']);
                this.config.store ('cwb', data['config']['cwb']);
                let corpora: Corpus[] = data['config']['corpora'];
                corpora = this.corporaKeeper.setCorpora (corpora);    // setCorpora changes corpora order (primary corpous goes first)
                let corpusType: corpusType;
                if (data['config']['audio'] !== undefined) {
                    this.config.store ('audio', data['config']['audio']);
                    corpusType = 'spoken';
                }
                else {
                    if (corpora.length == 1)
                        corpusType = 'mono';
                    else
                        corpusType = 'parallel';
                }
                this.config.store ('corpusType', corpusType);
                const storedProjectName = localStorage.getItem ('projectName');
                if (storedProjectName && storedProjectName !== data['config']['projectName']) {
                    console.log ('project changed, local storage cleared');
                    localStorage.clear ();
                }
                localStorage.setItem ('projectName', data['config']['projectName']);
            }
        );
        this.collocation_settings = this.config.fetch ('collocation_settings', true);
        if (!this.collocation_settings) {
            this.collocation_settings = {ams: ['pmi'], case: 'match', pattr: 'match', window_size: 3, frequency_filter: 5};
            this.config.store ('collocation_settings', this.collocation_settings, true);
        }
        this.frequency_settings = this.config.fetch ('frequency_settings', true);
        if (!this.frequency_settings) {
            this.frequency_settings = {pattr: 'match', frequency_filter: 5};
            this.config.store ('frequency_settings', this.frequency_settings, true);
        }
    }

    clear () {
        this.queryKeeper.clear ();
      }
    
    search () {
        if (this.queryKeeper.getFinalQuery ())
            this.router.navigate (['/', 'results', 'concordance']);
    }

    collocations () {
        if (this.queryKeeper.getFinalQuery ())
            this.router.navigate (['/', 'results', 'collocations']);
    }

    frequency_list () {
        if (this.queryKeeper.getFinalQuery ())
            this.router.navigate (['/', 'results', 'frequency']);
    }

    @HostListener ('window:keyup.enter')
    onEnter () {
        this.search ();
    }

    @HostListener ('window:keyup.escape')
    onEscape () {
        this.clear ();
    }

    get_query () {
        return this.queryKeeper.getFinalQuery ();
    }

    set_stat_settings () {
        const dialogRef = this.dialog.open (SettingsBoxComponent, {
            data: {
                    collocations: {
                        header: 'Collocations',
                        fields: {
                            ams: {
                                description: 'Association measures', 
                                type: 'multiselect', 
                                value_obj: Object.fromEntries (this.collocation_settings.ams.map (am => [am, true])), 
                                options: [
                                    {name: 'pmi', label: 'Pointwise Mutual Information'},
                                    {name: 't_score', label: "Student's t"},
                                    {name: 'log_likelihood_ratio', label: 'Log-likelihodd ratio'},
                                    {name: 'dice', label: 'Dice coefficient'},
                                    {name: 'chi_square', label: 'Chi-square'}
                                ]},
                            window_size: {description: 'Window size', type: 'number', value: this.collocation_settings.window_size},
                            frequency_filter: {description: 'Frequency threshold', type: 'number', value: this.collocation_settings.frequency_filter},
                            pattr: {
                                description: 'Attribute', 
                                type: 'select', 
                                value: this.collocation_settings.pattr, 
                                options: [{name: 'match', label: 'Match query'}].concat (this.pattrs.map (el => { return {name: el.name, label: el.description}}))},
                            case: {
                                description: 'Case sensitive', 
                                type: 'select', 
                                value: this.collocation_settings.case, 
                                options: [
                                    {name: 'match', label: 'Match query'},
                                    {name: 'cs', label: 'Case sensitive'},
                                    {name: 'ci', label: 'Case insensitive'}
                                ]}
                        }
                    },
                    frequency: {
                        header: 'Frequency list',
                        fields: {
                            frequency_filter: {description: 'Frequency threshold', type: 'number', value: this.frequency_settings.frequency_filter},
                            pattr: {
                                description: 'Attribute', 
                                type: 'select', 
                                value: this.frequency_settings.pattr, 
                                options: [{name: 'match', label: 'Match query'}].concat (this.pattrs.map (el => { return {name: el.name, label: el.description}}))}
                        }
                    }
                },
                width: '700px'
        });
        dialogRef.afterClosed ().subscribe (data => {
            if (data !== undefined) {
                this.collocation_settings.pattr = data['collocations'].fields.pattr.value;
                this.collocation_settings.ams = data['collocations'].fields.ams.value;
                this.collocation_settings.window_size = data['collocations'].fields.window_size.value;
                this.collocation_settings.frequency_filter = data['collocations'].fields.frequency_filter.value;
                this.collocation_settings.case = data['collocations'].fields.case.value;
                this.config.store ('collocation_settings', this.collocation_settings, true);
                this.frequency_settings.pattr = data['frequency'].fields.pattr.value;
                this.frequency_settings.frequency_filter = data['frequency'].fields.frequency_filter.value;
                this.config.store ('frequency_settings', this.frequency_settings, true);
            }
        });
    }
}
