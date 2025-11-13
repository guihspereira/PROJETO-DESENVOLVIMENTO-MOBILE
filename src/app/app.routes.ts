import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pagina/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./pagina/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'opcoes',
    loadComponent: () =>
      import('./pagina/opcoes/opcoes.page').then((m) => m.OpcoesPage),
  },
  {
    path: 'gastos',
    loadComponent: () =>
      import('./pagina/gastos/gastos.page').then((m) => m.GastosPage),
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./services/services.page').then((m) => m.ServicesPage),
  },
  {
    path: 'folder/:id',
    loadComponent: () =>
      import('./folder/folder.page').then((m) => m.FolderPage),
  },
];
