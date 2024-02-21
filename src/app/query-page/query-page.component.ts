import { Component, HostListener, OnInit } from '@angular/core';
import { Router, Data, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../config.service';
import { QueryKeeperService } from '../query-keeper.service';
import { MatDialog } from '@angular/material/dialog';
import { Corpus, PAttribute, SAttribute, corpusType } from '../dataTypes';
import { SettingsBoxComponent } from './settings-box/settings-box.component';
import { CorporaKeeperService } from '../corpora-keeper.service';
import { faSliders } from '@fortawesome/free-solid-svg-icons';


type collocationsSettings = {pattr: string, window_size: number, frequency_filter: number, pos: string[]};
type frequencySettings = {pattr: string, frequency_filter: number};

@Component({
    selector: 'spoco-query-page',
    templateUrl: './query-page.component.html',
    styleUrls: ['./query-page.component.scss']
})
export class QueryPageComponent implements OnInit {

    collocations_settings: collocationsSettings;
    frequency_settings: frequencySettings;
    pattrs: PAttribute[];
    sliders = faSliders;
    
    constructor (
        private router: Router, 
        private route: ActivatedRoute,
        private queryKeeper: QueryKeeperService,
        private configService: ConfigService,
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
                if (!layers.map (el => el.name).includes ('word')) {
                    let min_position = layers[0].position;
                    if (min_position > 0)
                        layers.unshift ({name: 'word', position: 0});
                    else
                        layers.push ({name: 'word', position: -1});
                }
                this.configService.store ('layers', layers.map (el => el.name));
                this.configService.store ('positionalAttributes', this.pattrs);
                this.configService.store ('modifiers', data['config']['modifiers']);
                this.configService.store ('structuralAttributes', data['config']['structuralAttributes']);
                this.configService.store ('filters', data['config']['filters']);
                this.configService.store ('cwb', data['config']['cwb']);
                let corpora: Corpus[] = data['config']['corpora'];
                corpora = this.corporaKeeper.setCorpora (corpora);    // setCorpora changes corpora order (primary corpous goes first)
                let corpusType: corpusType;
                if (data['config']['audio'] !== undefined) {
                    this.configService.store ('audio', data['config']['audio']);
                    corpusType = 'spoken';
                }
                else {
                    if (corpora.length == 1)
                        corpusType = 'mono';
                    else
                        corpusType = 'parallel';
                }
                this.configService.store ('corpusType', corpusType);
            }
        );
        const default_pattr = this.pattrs.map ((el: PAttribute) => el.name).includes ('lemma') ? 'lemma' : this.pattrs[0].name;
        this.collocations_settings = {pattr: default_pattr, window_size: 3, frequency_filter: 5, pos: ['noun', 'verb', 'adj']};
        this.frequency_settings = {pattr: default_pattr, frequency_filter: 5};
        this.configService.store ('collocations_settings', this.collocations_settings)
        this.configService.store ('frequency_settings', this.frequency_settings)
    }

    clear () {
        this.queryKeeper.clear ();
      }
    
    search () {
        this.router.navigate (['/', 'results', 'concordance']);
    }

    collocations () {
        this.router.navigate (['/', 'results', 'collocations']);
    }

    frequency_list () {
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

    set_stat_settings () {
        const dialogRef = this.dialog.open (SettingsBoxComponent, {
            data: {
                    collocations: {
                        header: 'Kolokacje',
                        fields: {
                            pattr: {description: 'Atrybut', type: 'select', value: this.collocations_settings.pattr, options: this.pattrs.map (el => { return {name: el.name, label: el.description}})},
                            window_size: {description: 'Przedział', type: 'number', value: this.collocations_settings.window_size},
                            frequency_filter: {description: 'Pomiń kolokacje rzadsze niż', type: 'number', value: this.collocations_settings.frequency_filter},
                            pos: {
                                description: 'Części mowy', 
                                type: 'multiselect', 
                                value_obj: {},
                                options: [
                                    {name: 'noun', label: 'rzeczownik', initial_check: true}, 
                                    {name: 'verb', label: 'czasownik', initial_check: true}, 
                                    {name: 'adjective', label: 'przymiotnik', initial_check: true}, 
                                    {name: 'rest', label: 'pozostałe', initial_check: false}
                                ]
                            }
                        }
                    },
                    frequency: {
                        header: 'Lista frekwencyjna',
                        fields: {
                            pattr: {description: 'Atrybut', type: 'select', value: this.frequency_settings.pattr, options: this.pattrs.map (el => { return {name: el.name, label: el.description}})},
                            frequency_filter: {description: 'Pomiń pozycje rzadsze niż', type: 'number', value: this.frequency_settings.frequency_filter},
                        }
                    }
                },
                width: '700px'
        });
        dialogRef.afterClosed ().subscribe (data => {
            this.collocations_settings.pattr = data['collocations'].fields.pattr.value;
            this.collocations_settings.window_size = data['collocations'].fields.window_size.value;
            this.collocations_settings.frequency_filter = data['collocations'].fields.frequency_filter.value;
            this.collocations_settings.pos = Object.keys (data['collocations'].fields.pos.value_obj).filter ((el) => {return data['collocations'].fields.pos.value_obj[el]});
            this.configService.store ('collocations_settings', this.collocations_settings);

            this.frequency_settings.pattr = data['frequency'].fields.pattr.value;
            this.frequency_settings.frequency_filter = data['frequency'].fields.frequency_filter.value;
            this.configService.store ('frequency_settings', this.frequency_settings);
        });
    }

    private is_spoken (sattributes: SAttribute[]) {
        for (let sattr of sattributes) {
            if (sattr.audio !== undefined)
                return sattr;
        }
        return null;
    }

}
