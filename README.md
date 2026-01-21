
  # Shahirizada Meat Market

  This is a code bundle for Shahirizada Meat Market. The original project is available at https://www.figma.com/design/Bg1I4gqRbeBAJ1nW0VnmTM/Shahirizada-Meat-Market.

  ## Running the code

Run `npm i` to install the dependencies.

To run the full stack locally (frontend + Supabase Edge Function logs in the same terminal):

1. Copy `supabase/.env.local.example` to `supabase/.env.local` and fill in your real Supabase/Stripe/Uber credentials.
2. Run `npm run dev`.

This command now starts `vite` and `supabase functions serve market-server` together via `concurrently`, so you can see browser logs and server logs side-by-side in the VS Code terminal.
  
