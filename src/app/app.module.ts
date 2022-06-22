import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { QueryRowComponent } from './query-row/query-row.component';
import { CqpQueryComponent } from './cqp-query/cqp-query.component';
import { LangBoxComponent } from './lang-box/lang-box.component';

@NgModule({
    declarations: [
        AppComponent,
        QueryRowComponent,
        CqpQueryComponent,
        LangBoxComponent
  ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
