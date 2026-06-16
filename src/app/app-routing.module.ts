import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { AuthCallbackComponent } from './pages/auth-callback/auth-callback.component';
import { HomeComponent } from './pages/home/home.component';
import { ShopComponent } from './pages/shop/shop.component';
import { SellPricesComponent } from './pages/sell-prices/sell-prices.component';
import { BillsComponent } from './pages/bills/bills.component';
import { CoinsComponent } from './pages/coins/coins.component';
import { CodesComponent } from './pages/codes/codes.component';
import { HelpComponent } from './pages/help/help.component';
import { AdminMarketComponent } from './pages/admin-market/admin-market.component';
import { AdminCoinsComponent } from './pages/admin-coins/admin-coins.component';
import { AdminNotificationsComponent } from './pages/admin-notifications/admin-notifications.component';
import { AdminHelpComponent } from './pages/admin-help/admin-help.component';
import { AdminVipComponent } from './pages/admin-vip/admin-vip.component';
import { VipComponent } from './pages/vip/vip.component';
import { AdminQuestsComponent } from './pages/admin-quests/admin-quests.component';
import { AdminItemTypesComponent } from './pages/admin-item-types/admin-item-types.component';
import { AdminItemsComponent } from './pages/admin-items/admin-items.component';
import { QuestsComponent } from './pages/quests/quests.component';
import { MarketDetailComponent } from './pages/market-detail/market-detail.component';
import { MarketHistoryComponent } from './pages/market-history/market-history.component';
import { VaultsComponent } from './pages/vaults/vaults.component';
import { P2pMarketComponent } from './pages/p2p-market/p2p-market.component';
import { P2pGarageMarketComponent } from './pages/p2p-garage-market/p2p-garage-market.component';
import { P2pGarageSellComponent } from './pages/p2p-garage-sell/p2p-garage-sell.component';
import { MyListingsComponent } from './pages/my-listings/my-listings.component';
import { AdminVaultsComponent } from './pages/admin-vaults/admin-vaults.component';
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
import { ApiErrorComponent } from './pages/api-error/api-error.component';
import { DrawComponent } from './pages/draw/draw.component';
import { DailyComponent } from './pages/daily/daily.component';
import { AdminGachaComponent } from './pages/admin-gacha/admin-gacha.component';
import { AdminDailyComponent } from './pages/admin-daily/admin-daily.component';
import { AdminCodeBuilderComponent } from './pages/admin-code-builder/admin-code-builder.component';
import { adminGuard } from './guards/admin.guard';
import { topupGuard } from './guards/topup.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'api-error', component: ApiErrorComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'shop', component: ShopComponent, canActivate: [authGuard] },
  { path: 'vehicles', component: VehiclesComponent, canActivate: [authGuard] },
  { path: 'sell-prices', component: SellPricesComponent, canActivate: [authGuard] },
  { path: 'bills', component: BillsComponent, canActivate: [authGuard] },
  { path: 'coins', component: CoinsComponent, canActivate: [authGuard] },
  { path: 'codes', component: CodesComponent, canActivate: [authGuard] },
  { path: 'topup', component: TopupComponent, canActivate: [authGuard, topupGuard] },
  { path: 'vip', component: VipComponent, canActivate: [authGuard] },
  { path: 'help', component: HelpComponent },
  { path: 'quests', component: QuestsComponent, canActivate: [authGuard] },
  { path: 'draw', component: DrawComponent, canActivate: [authGuard] },
  { path: 'daily', component: DailyComponent, canActivate: [authGuard] },
  { path: 'admin/market', component: AdminMarketComponent, canActivate: [adminGuard] },
  { path: 'admin/coins', component: AdminCoinsComponent, canActivate: [adminGuard] },
  { path: 'admin/notifications', component: AdminNotificationsComponent, canActivate: [adminGuard] },
  { path: 'admin/help', component: AdminHelpComponent, canActivate: [adminGuard] },
  { path: 'admin/meowcoins', component: AdminMeowcoinsComponent, canActivate: [adminGuard] },
  { path: 'admin/vip', component: AdminVipComponent, canActivate: [adminGuard] },
  { path: 'admin/quests', component: AdminQuestsComponent, canActivate: [adminGuard] },
  { path: 'admin/item-types', component: AdminItemTypesComponent, canActivate: [adminGuard] },
  { path: 'admin/items', component: AdminItemsComponent, canActivate: [adminGuard] },
  { path: 'admin/vehicles', component: AdminVehiclesComponent, canActivate: [adminGuard] },
  { path: 'admin/vehicle-market', component: AdminVehicleMarketComponent, canActivate: [adminGuard] },
  { path: 'admin/codes', component: AdminCodesComponent, canActivate: [adminGuard] },
  { path: 'admin/codes/new', component: AdminCodeBuilderComponent, canActivate: [adminGuard] },
  { path: 'admin/donate-tiers', component: AdminDonateTiersComponent, canActivate: [adminGuard] },
  { path: 'admin/gacha', component: AdminGachaComponent, canActivate: [adminGuard] },
  { path: 'admin/daily', component: AdminDailyComponent, canActivate: [adminGuard] },
  { path: 'market/history', component: MarketHistoryComponent, canActivate: [authGuard] },
  { path: 'market/:id', component: MarketDetailComponent, canActivate: [authGuard] },
  { path: 'vaults', component: VaultsComponent, canActivate: [authGuard] },
  { path: 'p2p-market', component: P2pMarketComponent, canActivate: [authGuard] },
  { path: 'p2p-garage', component: P2pGarageMarketComponent, canActivate: [authGuard] },
  { path: 'p2p-garage/sell', component: P2pGarageSellComponent, canActivate: [authGuard] },
  { path: 'my-listings', component: MyListingsComponent, canActivate: [authGuard] },
  { path: 'admin/vaults', component: AdminVaultsComponent, canActivate: [adminGuard] },
  { path: 'my-submissions', component: MySubmissionsComponent, canActivate: [authGuard] },
  { path: 'admin/submissions', component: AdminItemSubmissionsComponent, canActivate: [adminGuard] },
  { path: 'inventory', component: InventoryComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
