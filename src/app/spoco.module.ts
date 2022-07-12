import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';


import { SpocoRoutingModule } from './spoco-routing.module';
import { SpocoComponent } from './spoco.component';
import { QueryPageComponent } from './query-page/query-page.component';
import { LangBoxComponent } from './query-page/lang-box/lang-box.component';
import { CqpQueryComponent } from './query-page/lang-box/cqp-query/cqp-query.component';
import { BasicQueryComponent } from './query-page/lang-box/basic-query/basic-query.component';
import { QueryRowComponent } from './query-page/lang-box/basic-query/query-row/query-row.component';
import { ConfigResolver } from './config-resolver.service';
import { CommonModule } from '@angular/common';
import { FiltersComponent } from './query-page/lang-box/basic-query/filters/filters.component';

@NgModule({
    declarations: [
        SpocoComponent,
        QueryRowComponent,
        CqpQueryComponent,
        LangBoxComponent,
        BasicQueryComponent,
        QueryPageComponent,
        FiltersComponent
  ],
    imports: [
        BrowserModule,
        SpocoRoutingModule,
        ReactiveFormsModule,
        HttpClientModule,
        NgMultiSelectDropDownModule.forRoot()
  ],
  providers: [ConfigResolver],
  bootstrap: [SpocoComponent]
})
export class SpocoModule { }
