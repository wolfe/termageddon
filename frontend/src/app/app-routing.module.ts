import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DomainListComponent } from './components/domain-list/domain-list.component';
import { TermListComponent } from './components/term-list/term-list.component';
import { DefinitionListComponent } from './components/definition-list/definition-list.component';
import { DefinitionFormComponent } from './components/definition-form/definition-form.component';

const routes: Routes = [
  { path: '', redirectTo: '/definitions', pathMatch: 'full' },
  { path: 'domains', component: DomainListComponent },
  { path: 'terms', component: TermListComponent },
  { path: 'definitions', component: DefinitionListComponent },
  { path: 'definitions/propose', component: DefinitionFormComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
