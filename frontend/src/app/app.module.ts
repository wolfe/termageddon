import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DomainListComponent } from './components/domain-list/domain-list.component';
import { TermListComponent } from './components/term-list/term-list.component';
import { DefinitionListComponent } from './components/definition-list/definition-list.component';
import { DefinitionFormComponent } from './components/definition-form/definition-form.component';

@NgModule({
  declarations: [
    AppComponent,
    DomainListComponent,
    TermListComponent,
    DefinitionListComponent,
    DefinitionFormComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
