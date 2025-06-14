import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DomainListComponent } from './components/domain-list/domain-list.component';
import { TermListComponent } from './components/term-list/term-list.component';
import { DefinitionListComponent } from './components/definition-list/definition-list.component';

@NgModule({
  declarations: [
    AppComponent,
    DomainListComponent,
    TermListComponent,
    DefinitionListComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
