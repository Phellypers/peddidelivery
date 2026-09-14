export type ScheduledProduct = {
  availability_by_day?: Record<string,{enabled:boolean;start:string;end:string}>;
  available_days?: string[];
  availability_start?: string;
  availability_end?: string;
};
export function isProductAvailable(product:ScheduledProduct,date?:Date):boolean;
