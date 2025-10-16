import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';
import { GlossaryViewComponent } from './components/glossary-view/glossary-view.component';
import { ReviewDashboardComponent } from './components/review-dashboard/review-dashboard.component';
import { MyDraftsComponent } from './components/my-drafts/my-drafts.component';
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
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'entry/:entryId',
        component: EntryRouterComponent,
      },
      {
        path: 'entry/:entryId/edit',
        component: EntryRouterComponent,
      },
      {
        path: 'draft/:draftId',
        component: DraftRouterComponent,
      },
      {
        path: 'glossary',
        component: GlossaryViewComponent,
      },
      {
        path: 'review',
        component: ReviewDashboardComponent,
      },
      {
        path: 'my-drafts',
        component: MyDraftsComponent,
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
