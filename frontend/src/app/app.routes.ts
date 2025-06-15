import { Routes } from '@angular/router';
import { TermListComponent } from './components/term-list/term-list.component';
import { TermDetailComponent } from './components/term-detail/term-detail.component';
import { LoginComponent } from './components/login/login.component';
import { ReviewDashboardComponent } from './components/review-dashboard/review-dashboard.component';

export const routes: Routes = [
    { path: '', component: TermListComponent },
    { path: 'term/:id', component: TermDetailComponent },
    { path: 'login', component: LoginComponent },
    { path: 'review', component: ReviewDashboardComponent },
    { path: '**', redirectTo: '' } // Redirect any other path to the home page
];
