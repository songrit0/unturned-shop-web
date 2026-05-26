import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClient, HttpClientModule, provideHttpClient, withInterceptors } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/login/login.component';
import { AuthCallbackComponent } from './pages/auth-callback/auth-callback.component';
import { HomeComponent } from './pages/home/home.component';
import { ShopComponent } from './pages/shop/shop.component';
import { BillsComponent } from './pages/bills/bills.component';
import { CoinsComponent } from './pages/coins/coins.component';
import { CodesComponent } from './pages/codes/codes.component';
import { HelpComponent } from './pages/help/help.component';
import { AdminMarketComponent } from './pages/admin-market/admin-market.component';
import { AdminCoinsComponent } from './pages/admin-coins/admin-coins.component';
import { HeaderComponent } from './components/header/header.component';
import { ItemCardComponent } from './components/item-card/item-card.component';
import { BasketDrawerComponent } from './components/basket-drawer/basket-drawer.component';
import { PagerComponent } from './components/pager/pager.component';
import { FooterComponent } from './components/footer/footer.component';

import { ApiUrlService } from './services/api-url.service';
import { authInterceptor } from './services/auth.interceptor';

export function initApiUrl(apiUrl: ApiUrlService) {
  return () => apiUrl.load();
}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    AuthCallbackComponent,
    HomeComponent,
    ShopComponent,
    BillsComponent,
    CoinsComponent,
    CodesComponent,
    HelpComponent,
    AdminMarketComponent,
    AdminCoinsComponent,
    HeaderComponent,
    ItemCardComponent,
    BasketDrawerComponent,
    PagerComponent,
    FooterComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule,
    TranslateModule.forRoot({
      defaultLanguage: 'th',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
  providers: [
    { provide: APP_INITIALIZER, useFactory: initApiUrl, deps: [ApiUrlService], multi: true },
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
