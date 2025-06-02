import { AfterContentChecked, AfterContentInit, AfterViewChecked, AfterViewInit, Component, OnInit } from '@angular/core';
import { faC, faClose } from '@fortawesome/free-solid-svg-icons';
import { ActivatedRoute, Data, Params } from '@angular/router';
import { ConfigService } from '../config.service';
import { CorporaKeeperService } from '../corpora-keeper.service';

export type modules = 'concordance' | 'collocations' | 'frequency';

@Component({
    selector: 'spoco-results-page',
    templateUrl: './results-page.component.html',
    styleUrls: ['./results-page.component.scss'],
    standalone: false
})
export class ResultsPageComponent implements OnInit, AfterViewInit {

    tabs: {name: string, number_of_results: number, module: modules, query: string, error: string, results_fetched: boolean}[] = [];
    tab_module_names: {[key: string]: string} = {concordance: 'concordance', collocations: 'collocations', frequency: 'frequency list'}
    current_tab: number = 0;
    wp_scale: {label: 'B' | 'M' | 'T', scale: number};
    close = {'icon': faClose};
    
    constructor(private route: ActivatedRoute, private config: ConfigService, private corporaKeeper: CorporaKeeperService) { }

    ngOnInit(): void {
        const primary = this.corporaKeeper.getPrimary ();
        this.route.params.subscribe ((params: Params) => {
            const module = params['module'];
            this.add_tab (module);
        });
        this.route.data.subscribe ((data: Data) => {
            const size = data['corpus_data'][primary.id].size;
            if (size > 10000000000)
                this.wp_scale = {label: 'B', scale: 1000000000};
            else if (size > 10000000)
                this.wp_scale = {label: 'M', scale: 1000000}
            else
                this.wp_scale = {label: 'T', scale: 1000};
        })
        // this.header_visibility (this.header_visible);
    }

    ngAfterViewInit(): void {
        this.header_visibility ();
    }

    get_tab_name (index: number) {
        let name = this.tabs[index].name;
        name = name.charAt (0).toUpperCase () + name.substring (1).toLowerCase();
        return `(${index + 1}) ${name}`;
    }

    add_tab (module: modules) {
        this.tabs.push ({name: this.tab_module_names[module], number_of_results: -1, module: module, query: '...', error: '', results_fetched: false});
        this.current_tab = this.tabs.length - 1;
        this.header_visibility ();
    }

    get_collocation_columns () {
        const ams: string[] = this.config.fetch ('collocations_settings').ams;
        const names = {'pmi': 'PMI', 't_score': 'T-score', 'log_likelihood_ratio': 'LLR', 'dice': 'Dice', 'chi_square': 'Chi-square'};
        const am_columns = ams.map ((am) => ({name: names[am as keyof typeof names], format: '1.2-2'}));
        let columns = [{name: 'Collocate', format: ''}].concat (am_columns).concat ([{name: 'Frequency', format: '1.0-0'}]);
        if (this.wp_scale !== undefined) {
            columns.push ({name: `WP${this.wp_scale.label}`, format: '1.2-2'});
        }
        return columns;
    }

    get_frequency_columns () {
        let columns = [{'name': 'Token', format: ''}, {'name': 'Frequency', 'format': '1.0-0'}];
        if (this.wp_scale !== undefined) {
            columns.push ({name: `WP${this.wp_scale.label}`, format: '1.2-2'});
        }
        
        return columns;
    }

    results_fetched (results_data: {query: string, number_of_results: number}, index: number) {
        this.tabs[index].results_fetched = true;
        this.tabs[index].number_of_results = results_data.number_of_results;
        this.tabs[index].query = results_data.query;
        this.header_visibility ();
    }

    tabChanged (event: any) {
        this.current_tab = event.index;
    }

    update_tab_results (res_number: number) {
        this.tabs[this.current_tab].number_of_results = res_number;
    }

    private header_visibility () {
        let header = document.getElementsByTagName ('mat-tab-header')[0] as HTMLElement;
        if (header !== undefined) {
            this.tabs.length > 1 ? header.style.display = 'flex' : header.style.display = 'none';
        }
    }
}
