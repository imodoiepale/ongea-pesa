# Phase 2: Complete cleanup of remaining files
Write-Host "Phase 2: Cleaning up remaining files..." -ForegroundColor Cyan
Write-Host ""

# Move remaining useful docs
Write-Host "Moving remaining useful docs..." -ForegroundColor Yellow

$moves = @{
    "EMAIL_TEMPLATES_SETUP.md" = "docs/integrations/EMAIL_TEMPLATES.md"
    "PRODUCTION_SETUP.md" = "docs/deployment/PRODUCTION.md"
    "README_VOICE_SETUP.md" = "docs/setup/VOICE_SETUP.md"
    "SETUP-GEMINI.md" = "docs/setup/GEMINI.md"
    "SETUP_GUIDE.md" = "docs/setup/SETUP_GUIDE.md"
    "elevenlabs-setup-guide.md" = "docs/config/elevenlabs-guide.md"
    "ui-design-brief.md" = "docs/architecture/UI_DESIGN.md"
    "voiceagent.md" = "docs/architecture/VOICE_AGENT.md"
    "voiceagenttools.md" = "docs/architecture/VOICE_TOOLS.md"
    "vapi-assistant-prompt.md" = "docs/config/vapi-prompt.md"
    "vapi-n8n-integration.md" = "docs/integrations/VAPI_N8N.md"
    "standard-transaction-json.md" = "docs/architecture/TRANSACTION_FORMAT.md"
    "mcp-server-config.md" = "docs/architecture/MCP_SERVER.md"
    "n8n-supabase-integration.json" = "docs/config/n8n-supabase.json"
}

foreach ($source in $moves.Keys) {
    if (Test-Path $source) {
        $dest = $moves[$source]
        Move-Item $source $dest -Force
        Write-Host "  Moved $source"
    }
}

# Move SQL files to docs/schema
Write-Host ""
Write-Host "Organizing SQL files..." -ForegroundColor Yellow

$sqlMoves = @{
    "AUTO_BALANCE_UPDATE_TRIGGER.sql" = "docs/schema/balance-trigger.sql"
    "AUTO_CREATE_PROFILE_TRIGGER.sql" = "docs/schema/profile-trigger.sql"
    "SYNC_BALANCE_FROM_TRANSACTIONS.sql" = "docs/schema/balance-sync.sql"
}

foreach ($source in $sqlMoves.Keys) {
    if (Test-Path $source) {
        Move-Item $source $sqlMoves[$source] -Force
        Write-Host "  Moved $source"
    }
}

# Delete all temporary/debug files
Write-Host ""
Write-Host "Deleting temporary files..." -ForegroundColor Red

$deleteFiles = @(
    # Fix/Debug guides
    "ADD_SERVICE_KEY.md",
    "CHANGES_SUMMARY.md",
    "COMPLETE_SETUP_CHECKLIST.md",
    "ELEVENLABS_ERROR_HANDLING.md",
    "FINAL_CHANGES_SUMMARY.md",
    "FINAL_SETUP_CHECKLIST.md",
    "FIX_N8N_RLS_ERROR.md",
    "FIX_N8N_STATUS_ERROR.md",
    "FIX_SEND_MONEY_ISSUES.md",
    "FIX_STEPS_NOW.md",
    "INTEGRATION_COMPLETE.md",
    "NO_SERVICE_KEY_NEEDED.md",
    "PAYLOAD_FLATTENED.md",
    "QUICK_FIX_CHECKLIST.md",
    "REALTIME_BALANCE_SETUP.md",
    "REALTIME_BALANCE_SYSTEM.md",
    "REALTIME_BALANCE_VALIDATION.md",
    "SIGNUP_REDIRECT_FIX.md",
    "STOP_TEST_MODE.md",
    "UPDATE_ELEVENLABS_URL.md",
    "USER_CONTEXT_FIXED.md",
    "VERCEL_DEPLOY_FIX.md",
    "VERCEL_DEPLOY_READY.md",
    
    # N8N duplicates
    "N8N_AUTH_SETUP.md",
    "N8N_BALANCE_CHECK_WORKFLOW.md",
    "N8N_CONFIGURATION.md",
    "N8N_EXISTING_DB_CONFIG.md",
    "N8N_SUPABASE_CONFIG.md",
    "N8N_TRANSACTION_FORMAT.md",
    "N8N_WEBHOOK_DEBUG.md",
    "N8N_WORKFLOW_FIX.md",
    
    # Backup files
    "README_OLD.md",
    "QUICK_START_OLD.md",
    "CLEANUP_PLAN.md",
    
    # Temporary SQL
    "DEBUG_BALANCE_ISSUE.sql",
    "DIAGNOSE_N8N_AMOUNT.sql",
    "DIAGNOSTIC_QUERIES.sql",
    "FIX_BALANCE_ZERO_ISSUE.sql",
    "FIX_PROFILES_SCHEMA.sql",
    "FIX_TRANSACTIONS_CONSTRAINT.sql",
    "INSTANT_FIX_BALANCE.sql",
    "RLS_POLICY_FIX.sql",
    "TRANSACTIONS_RLS_FIX.sql",
    "UPDATE_TRANSACTIONS_SCHEMA.sql",
    "URGENT_FIX_NOW.sql",
    "supabase-user-setup.sql"
)

$deleted = 0
foreach ($file in $deleteFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Deleted $file"
        $deleted++
    }
}

# Delete duplicate SQL/JSON files now in docs/
Write-Host ""
Write-Host "Removing root duplicates..." -ForegroundColor Red

if (Test-Path "docs/config/elevenlabs-config.json") {
    if (Test-Path "elevenlabs-config.json") {
        Remove-Item "elevenlabs-config.json" -Force
        Write-Host "  Deleted elevenlabs-config.json (moved to docs/)"
    }
}

if (Test-Path "docs/config/kenyan-dictionary.json") {
    if (Test-Path "elevenlabs-kenyan-dictionary.json") {
        Remove-Item "elevenlabs-kenyan-dictionary.json" -Force
        Write-Host "  Deleted elevenlabs-kenyan-dictionary.json"
    }
}

Write-Host ""
Write-Host "Phase 2 Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Moved $($moves.Count) docs to proper locations"
Write-Host "  Organized $($sqlMoves.Count) SQL files"
Write-Host "  Deleted $deleted temporary files"
Write-Host ""
Write-Host "Remaining in root:" -ForegroundColor Yellow
Write-Host "  README.md (main)"
Write-Host "  QUICK_START.md (quick start)"
Write-Host "  database-schema.sql (reference)"
Write-Host "  supabase-schema.sql (reference)"
Write-Host "  enhanced-mcp-server.js (server code)"
Write-Host "  cleanup.ps1 (this script - can be deleted)"
Write-Host ""
Write-Host "All documentation now in docs/ folder!"
Write-Host ""
