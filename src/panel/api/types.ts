import type { components } from './schema';

/** Restaurant contract types (restaurant/dokoon-restaurant-openapi.yaml, `npm run api:gen:panel`). */
type S = components['schemas'];

export type ApiErrorBody = S['ApiError'];
export type RestaurantAuth = S['RestaurantAuth'];
export type RestaurantStatus = NonNullable<RestaurantAuth['status']>;
export type RegistrationRequest = S['RegistrationRequest'];
export type RegistrationStatus = S['RegistrationStatus'];
export type DocType = S['DocType'];
export type RestaurantProfile = S['RestaurantProfile'];
export type DayHours = S['DayHours'];
export type RestaurantSettings = S['RestaurantSettings'];
export type OrderItem = S['OrderItem'];
export type Order = S['Order'];
export type OrderStatus = NonNullable<Order['status']>;
export type MenuCategory = S['MenuCategory'];
export type OptionItem = S['OptionItem'];
export type OptionGroup = S['OptionGroup'];
export type Food = S['Food'];
export type FoodInput = S['FoodInput'];
export type FoodDiscount = S['FoodDiscount'];
export type Report = S['Report'];
export type Settlement = S['Settlement'];
export type Notification = S['Notification'];
export interface RejectReason {
  id?: string;
  label?: string;
}
