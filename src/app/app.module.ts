import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClient, HttpClientModule, provideHttpClient, withInterceptors } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { QRCodeModule } from 'angularx-qrcode';

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
import { SellPricesComponent } from './pages/sell-prices/sell-prices.component';
import { AdminCoinsComponent } from './pages/admin-coins/admin-coins.component';
import { AdminVipComponent } from './pages/admin-vip/admin-vip.component';
import { VipComponent } from './pages/vip/vip.component';
import { KillMapComponent } from './pages/kill-map/kill-map.component';
import { AdminQuestsComponent } from './pages/admin-quests/admin-quests.component';
import { AdminItemTypesComponent } from './pages/admin-item-types/admin-item-types.component';
import { AdminItemsComponent } from './pages/admin-items/admin-items.component';
import { QuestsComponent } from './pages/quests/quests.component';
import { MarketDetailComponent } from './pages/market-detail/market-detail.component';
import { MarketHistoryComponent } from './pages/market-history/market-history.component';
import { HeaderComponent } from './components/header/header.component';
import { ItemCardComponent } from './components/item-card/item-card.component';
import { BasketDrawerComponent } from './components/basket-drawer/basket-drawer.component';
import { PagerComponent } from './components/pager/pager.component';
import { FooterComponent } from './components/footer/footer.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ListOnMarketModalComponent } from './components/list-on-market-modal/list-on-market-modal.component';
import { SuggestEditModalComponent } from './components/suggest-edit-modal/suggest-edit-modal.component';
import { QualityBarComponent } from './components/quality-bar/quality-bar.component';
import { GunChipsComponent } from './components/gun-chips/gun-chips.component';
import { VaultsComponent } from './pages/vaults/vaults.component';
import { P2pMarketComponent } from './pages/p2p-market/p2p-market.component';
import { P2pGarageMarketComponent } from './pages/p2p-garage-market/p2p-garage-market.component';
import { P2pGarageSellComponent } from './pages/p2p-garage-sell/p2p-garage-sell.component';
import { AdminVaultsComponent } from './pages/admin-vaults/admin-vaults.component';
import { MyListingsComponent } from './pages/my-listings/my-listings.component';
import { MySubmissionsComponent } from './pages/my-submissions/my-submissions.component';
import { AdminItemSubmissionsComponent } from './pages/admin-item-submissions/admin-item-submissions.component';
import { InventoryComponent } from './pages/inventory/inventory.component';
import { VehiclesComponent } from './pages/vehicles/vehicles.component';
import { AdminVehiclesComponent } from './pages/admin-vehicles/admin-vehicles.component';
import { AdminVehicleMarketComponent } from './pages/admin-vehicle-market/admin-vehicle-market.component';
import { AdminCodesComponent } from './pages/admin-codes/admin-codes.component';
import { AdminMeowcoinsComponent } from './pages/admin-meowcoins/admin-meowcoins.component';
import { TopupComponent } from './pages/topup/topup.component';
import { AdminDonateTiersComponent } from './pages/admin-donate-tiers/admin-donate-tiers.component';
import { DrawComponent } from './pages/draw/draw.component';
import { DailyComponent } from './pages/daily/daily.component';
import { AdminGachaComponent } from './pages/admin-gacha/admin-gacha.component';
import { AdminDailyComponent } from './pages/admin-daily/admin-daily.component';
import { AdminCodeBuilderComponent } from './pages/admin-code-builder/admin-code-builder.component';

import { ApiErrorComponent } from './pages/api-error/api-error.component';
import { ApiUrlService } from './services/api-url.service';
import { VersionService } from './services/version.service';
import { authInterceptor } from './services/auth.interceptor';
import pkg from '../../package.json';

// Resolve the API URL, then probe `/version` so connectivity is known before the first route
// renders. AppComponent redirects to /api-error when the probe fails. probe() never throws.
export function initApi(apiUrl: ApiUrlService, version: VersionService) {
  return async () => {
    await apiUrl.load();
    await version.probe();
  };
}

export function HttpLoaderFactory(http: HttpClient) {
  const v = (pkg as { version?: string }).version || '0';
  return new TranslateHttpLoader(http, './assets/i18n/', `.json?v=${v}`);
}

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    AuthCallbackComponent,
    HomeComponent,
    ShopComponent,
    SellPricesComponent,
    BillsComponent,
    CoinsComponent,
    CodesComponent,
    VipComponent,
    KillMapComponent,
    HelpComponent,
    AdminMarketComponent,
    AdminCoinsComponent,
    AdminVipComponent,
    AdminQuestsComponent,
    AdminItemTypesComponent,
    AdminItemsComponent,
    QuestsComponent,
    MarketDetailComponent,
    MarketHistoryComponent,
    HeaderComponent,
    ItemCardComponent,
    BasketDrawerComponent,
    PagerComponent,
    FooterComponent,
    SidebarComponent,
    ListOnMarketModalComponent,
    SuggestEditModalComponent,
    QualityBarComponent,
    GunChipsComponent,
    VaultsComponent,
    P2pMarketComponent,
    P2pGarageMarketComponent,
    P2pGarageSellComponent,
    AdminVaultsComponent,
    MyListingsComponent,
    MySubmissionsComponent,
    AdminItemSubmissionsComponent,
    InventoryComponent,
    VehiclesComponent,
    AdminVehiclesComponent,
    AdminVehicleMarketComponent,
    AdminCodesComponent,
    AdminMeowcoinsComponent,
    TopupComponent,
    AdminDonateTiersComponent,
    DrawComponent,
    DailyComponent,
    AdminGachaComponent,
    AdminDailyComponent,
    AdminCodeBuilderComponent,
    ApiErrorComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule,
    QRCodeModule,
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
    { provide: APP_INITIALIZER, useFactory: initApi, deps: [ApiUrlService, VersionService], multi: true },
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
