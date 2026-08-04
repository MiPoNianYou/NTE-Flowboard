import { adminClient } from './supabase.ts'

type DeliveryStatus = 'success' | 'retry' | 'permanent-failure'

export async function updateNotificationDelivery(
  id: string,
  status: DeliveryStatus,
  errorCode: string | null,
): Promise<void> {
  const { error } = await adminClient
    .from('notification_deliveries')
    .update({ status, error_code: errorCode, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
