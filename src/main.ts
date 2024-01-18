import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { SpocoModule } from './app/spoco.module';
import { environment } from './environments/environment';
import { provideHttpClient } from '@angular/common/http';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(SpocoModule)
  .catch(err => console.error(err));
