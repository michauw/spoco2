import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';


import { SpocoRoutingModule } from './spoco-routing.module';
import { SpocoComponent } from './spoco.component';
import { QueryRowComponent } from './query-row/query-row.component';
import { CqpQueryComponent } from './cqp-query/cqp-query.component';
import { LangBoxComponent } from './lang-box/lang-box.component';
import { BasicQueryComponent } from './basic-query/basic-query.component';

@NgModule({
    declarations: [
        SpocoComponent,
        QueryRowComponent,
        CqpQueryComponent,
        LangBoxComponent,
        BasicQueryComponent
  ],
    imports: [
        BrowserModule,
        SpocoRoutingModule,
        ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [SpocoComponent]
})
export class SpocoModule { }
