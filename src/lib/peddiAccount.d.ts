export const PEDDI_FEATURES: string[][];
export const PEDDI_SUPPORT_REQUEST_LIMIT: number;
export const PEDDI_SERVICES: {id:string;name:string;priceCents:number;durationDays?:number;description:string;benefit?:string}[];
export interface PeddiAccess {state:string;founderBadge:boolean;founderActive:boolean;demo:boolean;designer:boolean;enforcementEnabled:boolean;canMutateCommercial:boolean;founderDaysRemaining:number;features:{id:string;name:string;contracted:boolean;accessible:boolean}[]}
export function resolvePeddiAccess(input:{email?:string;founderSince?:string;founderExpiresAt?:string;entitlements?:{feature:string;expires_at?:string}[];enforce?:boolean;now?:number}):PeddiAccess;
export function canUsePeddiFeature(access:PeddiAccess,feature:string):boolean;
