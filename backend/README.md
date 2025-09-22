For activating:
First check out 'create.sh' for creating the environment.
It should run some commands to install the necessary packages.
Afterwards, just run 'source env/bin/activate'.
For running, run ``python -m flask --app flask_backend run --port 5001``

## Evnironment Variables (.env)
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

## Dev note for creating accounts
Accounts are created and managed with Supabase auth. This means that the account email has to be at least somewhat legitimate (e.g. not just test@gmail.com) or Supabase will automatically reject the email. Furthermore, this means that you will not be able to see each account's password so, for testing purposes, just make each account's password ``password``.