import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';
import { EntryRouterComponent } from './components/entry-router/entry-router.component';
import { DraftRouterComponent } from './components/draft-router/draft-router.component';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [loginGuard],
  },
  {
    path: 'callback',
    component: MainLayoutComponent,
    // No guard - Okta callback will be handled in MainLayoutComponent
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'entry/new',
        component: EntryRouterComponent,
      },
      {
        path: 'entry/:entryId/edit',
        component: EntryRouterComponent,
      },
      {
        path: 'entry/:entryId',
        component: EntryRouterComponent,
      },
      {
        path: 'draft/:draftId',
        component: DraftRouterComponent,
      },
      {
        path: 'glossary',
        loadComponent: () =>
          import('./components/glossary-view/glossary-view.component').then(
            (m) => m.GlossaryViewComponent
          ),
      },
      {
        path: 'review',
        loadComponent: () =>
          import('./components/review-dashboard/review-dashboard.component').then(
            (m) => m.ReviewDashboardComponent
          ),
      },
      {
        path: 'my-drafts',
        loadComponent: () =>
          import('./components/my-drafts/my-drafts.component').then(
            (m) => m.MyDraftsComponent
          ),
      },
      {
        path: '',
        redirectTo: '/glossary',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];
