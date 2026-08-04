import { corsHeaders } from './cors.ts'

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function optionsResponse(): Response {
  return new Response('ok', { headers: corsHeaders })
}
