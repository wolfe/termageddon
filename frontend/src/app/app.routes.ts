import { Routes } from '@angular/router';
import { TermListComponent } from './components/term-list/term-list.component';
import { TermDetailComponent } from './components/term-detail/term-detail.component';

export const routes: Routes = [
    { path: '', component: TermListComponent },
    { path: 'term/:id', component: TermDetailComponent },
    { path: '**', redirectTo: '' } // Redirect any other path to the home page
];
