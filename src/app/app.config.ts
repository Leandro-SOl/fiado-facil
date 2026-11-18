import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { FIADO_REPOSITORY, LocalStorageFiadoRepository } from './data/fiado-repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: FIADO_REPOSITORY, useFactory: () => new LocalStorageFiadoRepository() },
  ],
};
