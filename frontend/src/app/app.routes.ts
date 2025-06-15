import { Routes } from '@angular/router';
import { TermListComponent } from './components/term-list/term-list.component';
import { TermDetailComponent } from './components/term-detail/term-detail.component';
import { LoginComponent } from './components/login/login.component';
import { ReviewDashboardComponent } from './components/review-dashboard/review-dashboard.component';
import { authGuard } from './auth.guard';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: '', component: TermListComponent, pathMatch: 'full' },
            { path: 'term/:id', component: TermDetailComponent },
            { path: 'review', component: ReviewDashboardComponent },
        ]
    },
    { path: '**', redirectTo: '' } // Redirect any other path
];
