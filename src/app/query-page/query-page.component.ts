import { Component, HostListener, OnInit } from '@angular/core';
import { Router, Data } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../config.service';
import { QueryKeeperService } from '../query-keeper.service';

@Component({
    selector: 'spoco-query-page',
    templateUrl: './query-page.component.html',
    styleUrls: ['./query-page.component.scss']
})
export class QueryPageComponent implements OnInit {

    constructor (
        private router: Router, 
        private http: HttpClient,
        private queryKeeper: QueryKeeperService,
        private configService: ConfigService
    ) { }
    
    ngOnInit(): void {
    }

    clear () {
        this.queryKeeper.clear ();
      }
    
    search () {
        this.router.navigate (['/', 'results']);
    }

    @HostListener ('window:keyup.enter')
    onEnter () {
        this.search ();
    }

    @HostListener ('window:keyup.escape')
    onEscape () {
        this.clear ();
    }

}
