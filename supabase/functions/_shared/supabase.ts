import { createClient, type User } from 'npm:@supabase/supabase-js@2.107.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

export const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export async function requireUser(request: Request): Promise<User> {
  const authorization = request.headers.get('Authorization')
  if (!authorization) throw new Error('AUTH_REQUIRED')

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data.user) throw new Error('AUTH_REQUIRED')
  return data.user
}
