# Auth Sprint 1 — mobile notes (implementation Phase 2+)
#
# API contract (same as web API clients):
# - POST /auth/register|login → { accessToken, refreshToken, ... } in JSON body
# - Store accessToken in memory; store refreshToken in SecureStore (expo-secure-store)
#   NEVER AsyncStorage for tokens
# - POST /auth/refresh with body { refreshToken } (cookies are web-only)
# - On 401: refresh once, retry; if fail → login screen
# - POST /auth/logout with Bearer access + body refreshToken
#
# Biometrics (Phase 2):
# - After login, optionally gate app unlock with LocalAuthentication
# - Biometric unlock reveals refresh from SecureStore, then silent refresh
#
# Deep links (Phase 2):
# - cvstudio://reset-password?token=...
# - cvstudio://verify-email?token=...
# - OAuth redirect: cvstudio://oauth/google
