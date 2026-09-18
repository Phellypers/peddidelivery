import { query } from '../../db/client.js';

export async function courierHasAccess(userId: string, storeId: string | null) {
  const result = await query(`SELECT c.id FROM couriers c JOIN users u ON u.id=c.user_id
    WHERE c.user_id=$1 AND c.store_id=$2 AND u.active=true AND u.role='courier'
      AND COALESCE(c.details->>'deleted','false')<>'true'
      AND COALESCE(c.details->>'is_active','true')<>'false'
      AND COALESCE(c.details->>'application_status','approved')='approved'`, [userId,storeId]);
  return Boolean(result.rowCount);
}
