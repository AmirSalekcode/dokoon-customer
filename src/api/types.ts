import type { components } from './schema';

type S = components['schemas'];

export type ApiErrorBody = S['Error'];
export type AppConfig = S['AppConfig'];
export type City = S['City'];
export type LatLng = S['LatLng'];
export type AuthResult = S['AuthResult'];
export type User = S['User'];
export type Settings = S['Settings'];
export type AddressInput = S['AddressInput'];
export type Address = S['Address'];
export type Home = S['Home'];
export type RestaurantCard = S['RestaurantCard'];
export type Restaurant = S['Restaurant'];
export type RestaurantPage = S['RestaurantPage'];
/**
 * Per-food discount / festival (D-131). PROPOSAL in docs/contract-notes.md §39, not yet in
 * contract/dokoon-openapi.yaml: typed locally until the backend agrees, then replaced by the generated type.
 * While a discount runs, `Food.price` is what the customer pays and `Food.oldPrice` is the base price.
 */
export interface FoodDiscount {
  /** Whole percent off, rounded down (1..90). */
  percent: number;
  label: 'special' | 'festival';
  endsAt: string | null;
}
export type Food = S['Food'] & { discount?: FoodDiscount | null };
export type MenuCategory = Omit<S['MenuCategory'], 'foods'> & { foods?: Food[] };
export type FoodHit = Omit<S['FoodHit'], 'food'> & { food?: Food };
export type OptionGroup = S['OptionGroup'];
export type Review = S['Review'];
export type ReviewPage = S['ReviewPage'];
export type Campaign = S['Campaign'];
export type Promo = S['Promo'];
export type OrderDraft = S['OrderDraft'];
export type Quote = S['Quote'];
export type PaymentInit = S['PaymentInit'];
export type CreateOrderResult = S['CreateOrderResult'];
export type OrderStatus = S['OrderStatus'];
export type Order = S['Order'];
export type OrderPage = S['OrderPage'];
export type NotificationPage = S['NotificationPage'];
