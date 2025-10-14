# Final Cleanup Guide

## ✅ What's Been Done

1. Created `docs/` folder structure
2. Moved essential files:
   - `USERID_IMPLEMENTATION_STATUS.md` → `docs/integrations/USERID_IMPLEMENTATION.md`
   - `N8N_USERID_INTEGRATION.md` → `docs/integrations/N8N_INTEGRATION.md`
   - `ELEVENLABS_TOOL_CONFIG.md` → `docs/integrations/ELEVENLABS_SETUP.md`
   - `project-structure.md` → `docs/architecture/SYSTEM_DESIGN.md`
   - `api.md` → `docs/architecture/API_REFERENCE.md`
   - `LOCAL_TESTING_GUIDE.md` → `docs/setup/LOCAL_TESTING.md`
3. Updated README.md with comprehensive documentation
4. Updated QUICK_START.md

---

## 🎯 Next Steps (Run Phase 2)

### Option 1: Run the script
```powershell
powershell -ExecutionPolicy Bypass -File cleanup_phase2.ps1
```

### Option 2: Manual cleanup

#### Files to DELETE (temporary/debug):
```powershell
# Fix/Debug guides
Remove-Item ADD_SERVICE_KEY.md, CHANGES_SUMMARY.md, COMPLETE_SETUP_CHECKLIST.md
Remove-Item ELEVENLABS_ERROR_HANDLING.md, FINAL_CHANGES_SUMMARY.md, FINAL_SETUP_CHECKLIST.md
Remove-Item FIX_N8N_RLS_ERROR.md, FIX_N8N_STATUS_ERROR.md, FIX_SEND_MONEY_ISSUES.md
Remove-Item FIX_STEPS_NOW.md, INTEGRATION_COMPLETE.md, NO_SERVICE_KEY_NEEDED.md
Remove-Item PAYLOAD_FLATTENED.md, QUICK_FIX_CHECKLIST.md
Remove-Item REALTIME_BALANCE_SETUP.md, REALTIME_BALANCE_SYSTEM.md, REALTIME_BALANCE_VALIDATION.md
Remove-Item SIGNUP_REDIRECT_FIX.md, STOP_TEST_MODE.md, UPDATE_ELEVENLABS_URL.md
Remove-Item USER_CONTEXT_FIXED.md, VERCEL_DEPLOY_FIX.md, VERCEL_DEPLOY_READY.md

# N8N duplicates
Remove-Item N8N_AUTH_SETUP.md, N8N_BALANCE_CHECK_WORKFLOW.md, N8N_CONFIGURATION.md
Remove-Item N8N_EXISTING_DB_CONFIG.md, N8N_SUPABASE_CONFIG.md, N8N_TRANSACTION_FORMAT.md
Remove-Item N8N_WEBHOOK_DEBUG.md, N8N_WORKFLOW_FIX.md

# Backups
Remove-Item README_OLD.md, QUICK_START_OLD.md, CLEANUP_PLAN.md

# Temp SQL
Remove-Item DEBUG_BALANCE_ISSUE.sql, DIAGNOSE_N8N_AMOUNT.sql, DIAGNOSTIC_QUERIES.sql
Remove-Item FIX_BALANCE_ZERO_ISSUE.sql, FIX_PROFILES_SCHEMA.sql, FIX_TRANSACTIONS_CONSTRAINT.sql
Remove-Item INSTANT_FIX_BALANCE.sql, RLS_POLICY_FIX.sql, TRANSACTIONS_RLS_FIX.sql
Remove-Item UPDATE_TRANSACTIONS_SCHEMA.sql, URGENT_FIX_NOW.sql, supabase-user-setup.sql
```

#### Files to MOVE to docs/:

**Architecture:**
```powershell
Move-Item ui-design-brief.md docs/architecture/UI_DESIGN.md
Move-Item voiceagent.md docs/architecture/VOICE_AGENT.md
Move-Item voiceagenttools.md docs/architecture/VOICE_TOOLS.md
Move-Item standard-transaction-json.md docs/architecture/TRANSACTION_FORMAT.md
Move-Item mcp-server-config.md docs/architecture/MCP_SERVER.md
```

**Setup:**
```powershell
Move-Item README_VOICE_SETUP.md docs/setup/VOICE_SETUP.md
Move-Item SETUP-GEMINI.md docs/setup/GEMINI.md
Move-Item SETUP_GUIDE.md docs/setup/SETUP_GUIDE.md
```

**Deployment:**
```powershell
Move-Item PRODUCTION_SETUP.md docs/deployment/PRODUCTION.md
```

**Integrations:**
```powershell
Move-Item EMAIL_TEMPLATES_SETUP.md docs/integrations/EMAIL_TEMPLATES.md
Move-Item vapi-n8n-integration.md docs/integrations/VAPI_N8N.md
```

**Config:**
```powershell
Move-Item elevenlabs-setup-guide.md docs/config/elevenlabs-guide.md
Move-Item vapi-assistant-prompt.md docs/config/vapi-prompt.md
Move-Item n8n-supabase-integration.json docs/config/n8n-supabase.json
Move-Item elevenlabs-kenyan-sheng-dictionary.txt docs/config/sheng-dictionary.txt
```

**Schema:**
```powershell
Move-Item AUTO_BALANCE_UPDATE_TRIGGER.sql docs/schema/balance-trigger.sql
Move-Item AUTO_CREATE_PROFILE_TRIGGER.sql docs/schema/profile-trigger.sql
Move-Item SYNC_BALANCE_FROM_TRANSACTIONS.sql docs/schema/balance-sync.sql
Move-Item supabase-setup.sql docs/schema/supabase-setup.sql
```

---

## 📁 Final Project Root Structure

After cleanup, your root should only have:

```
ongea-pesa/
├── README.md                    # Main documentation
├── QUICK_START.md               # Quick start guide
├── .env.local                   # Environment variables
├── .gitignore                   # Git ignore file
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── next.config.mjs              # Next.js config
├── tailwind.config.js           # Tailwind config
├── components.json              # Shadcn config
├── middleware.ts                # Next.js middleware
├── enhanced-mcp-server.js       # MCP server (if using)
├── database-schema.sql          # Quick reference
├── supabase-schema.sql          # Quick reference
├── app/                         # Next.js app
├── components/                  # React components
├── contexts/                    # React contexts
├── hooks/                       # Custom hooks
├── lib/                         # Utilities
├── docs/                        # Documentation
│   ├── setup/                   # Setup guides
│   ├── deployment/              # Deployment guides
│   ├── architecture/            # Architecture docs
│   ├── integrations/            # Integration guides
│   ├── schema/                  # SQL schemas
│   └── config/                  # Config files
├── public/                      # Static assets
└── node_modules/                # Dependencies
```

---

## 🗑️ Files Safe to Delete After Review

Once you've reviewed the cleanup:
- `cleanup.ps1`
- `cleanup_phase2.ps1`
- `FINAL_CLEANUP_GUIDE.md` (this file)
- `SUPABASE_EMAIL_TEMPLATE.html` (move to docs/config/ if needed)

---

## 📊 Summary

**Before cleanup:** 60+ MD files in root  
**After cleanup:** 2 MD files in root (README + QUICK_START)  
**Organized docs:** Everything in `docs/` folder

---

## ✅ Verification

After cleanup, verify with:

```powershell
# Should show only 2-3 MD files
Get-ChildItem -Path . -Filter '*.md' -File | Select-Object Name

# Should show organized structure
Get-ChildItem -Path docs -Directory
```

---

## 🎉 Benefits

1. **Clean root directory** - Easy to navigate
2. **Organized documentation** - Everything in `docs/`
3. **Better git history** - Less clutter in commits
4. **Professional structure** - Industry standard
5. **Easy onboarding** - New devs find things easily

---

Run `cleanup_phase2.ps1` to complete the cleanup automatically!
