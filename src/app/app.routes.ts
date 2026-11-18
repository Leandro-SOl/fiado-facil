import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio),
    title: 'Fiado Fácil',
  },
  {
    path: 'clientes/novo',
    loadComponent: () => import('./pages/cliente-novo/cliente-novo').then((m) => m.ClienteNovo),
    title: 'Novo cliente – Fiado Fácil',
  },
  {
    path: 'clientes/:id',
    loadComponent: () => import('./pages/cliente-ficha/cliente-ficha').then((m) => m.ClienteFicha),
    title: 'Ficha do cliente – Fiado Fácil',
  },
  {
    path: 'compras/nova',
    loadComponent: () => import('./pages/compra-nova/compra-nova').then((m) => m.CompraNova),
    title: 'Nova compra – Fiado Fácil',
  },
  { path: '**', redirectTo: '' },
];
