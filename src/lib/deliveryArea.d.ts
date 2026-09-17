export interface DeliveryArea {id?:string;name:string;state?:string;is_active?:boolean;aliases?:string|string[];neighborhoods?:string|string[];municipality?:string;zip_start?:string;zip_end?:string;min_order_value?:number;delivery_fee_type?:string;delivery_fee_value?:number}
export interface DeliveryAddress {address?:string;city?:string;neighborhood?:string;region?:string;state?:string;zip?:string;deliveryMethod?:string}
export function normalizeLocation(value:unknown):string;
export function normalizePostalCode(value:unknown):string;
export function findDeliveryArea(areas:DeliveryArea[],address:DeliveryAddress,hasConfiguredAreas?:boolean):{allowed:boolean;area:DeliveryArea|null};
export function validateDeliveryAddress(areas:DeliveryArea[],address:DeliveryAddress,options?:{hasConfiguredAreas?:boolean;subtotal?:number}):{valid:boolean;area:DeliveryArea|null;error:string;reason?:string};
