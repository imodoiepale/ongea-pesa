# Ongea Pesa Project Cleanup Script
# This script will organize documentation and remove temporary files

Write-Host "🧹 Starting Ongea Pesa Project Cleanup..." -ForegroundColor Cyan
Write-Host ""

# Create docs directory structure
Write-Host "📁 Creating docs directory structure..." -ForegroundColor Yellow
$docsDirs = @(
    "docs",
    "docs/setup",
    "docs/deployment",
    "docs/api",
    "docs/integrations",
    "docs/architecture",
    "docs/schema",
    "docs/config"
)

foreach ($dir in $docsDirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✅ Created $dir"
    }
}

Write-Host ""
Write-Host "📦 Moving essential files to docs/..." -ForegroundColor Yellow

# Move essential documentation
$moves = @{
    # Integrations
    "USERID_IMPLEMENTATION_STATUS.md" = "docs/integrations/USERID_IMPLEMENTATION.md"
    "N8N_USERID_INTEGRATION.md" = "docs/integrations/N8N_INTEGRATION.md"
    "ELEVENLABS_TOOL_CONFIG.md" = "docs/integrations/ELEVENLABS_SETUP.md"
    "EMAIL_TEMPLATES_SETUP.md" = "docs/integrations/EMAIL_TEMPLATES.md"
    
    # Architecture
    "project-structure.md" = "docs/architecture/SYSTEM_DESIGN.md"
    "api.md" = "docs/architecture/API_REFERENCE.md"
    "voiceagent.md" = "docs/architecture/VOICE_AGENT.md"
    "voiceagenttools.md" = "docs/architecture/VOICE_TOOLS.md"
    "ui-design-brief.md" = "docs/architecture/UI_DESIGN.md"
    
    # Setup
    "LOCAL_TESTING_GUIDE.md" = "docs/setup/LOCAL_TESTING.md"
    "PRODUCTION_SETUP.md" = "docs/deployment/PRODUCTION.md"
    "README_VOICE_SETUP.md" = "docs/setup/VOICE_SETUP.md"
    "SETUP-GEMINI.md" = "docs/setup/GEMINI_SETUP.md"
    
    # Schema
    "database-schema.sql" = "docs/schema/database-schema.sql"
    "supabase-schema.sql" = "docs/schema/supabase-schema.sql"
    "supabase-setup.sql" = "docs/schema/supabase-setup.sql"
    "AUTO_BALANCE_UPDATE_TRIGGER.sql" = "docs/schema/triggers.sql"
    "AUTO_CREATE_PROFILE_TRIGGER.sql" = "docs/schema/profile-trigger.sql"
    "SYNC_BALANCE_FROM_TRANSACTIONS.sql" = "docs/schema/balance-sync.sql"
    
    # Config
    "elevenlabs-config.json" = "docs/config/elevenlabs-config.json"
    "elevenlabs-kenyan-dictionary.json" = "docs/config/kenyan-dictionary.json"
    "elevenlabs-kenyan-sheng-dictionary.txt" = "docs/config/sheng-dictionary.txt"
    "elevenlabs-setup-guide.md" = "docs/config/elevenlabs-guide.md"
    "n8n-supabase-integration.json" = "docs/config/n8n-config.json"
}

foreach ($source in $moves.Keys) {
    $dest = $moves[$source]
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $dest -Force
        Write-Host "  ✅ $source → $dest"
    }
}

Write-Host ""
Write-Host "🗑️  Deleting temporary/debug files..." -ForegroundColor Red

# Files to delete
$deleteFiles = @(
    # Balance/Fix guides
    "ADD_BALANCE_MANUALLY.md",
    "ADD_SERVICE_KEY.md",
    "BALANCE_CHECK_QUICK_GUIDE.md",
    "BALANCE_SYSTEM_COMPLETE.md",
    "BALANCE_ZERO_FIX_GUIDE.md",
    "CHANGES_SUMMARY.md",
    "COMPLETE_FIX_GUIDE.md",
    "COMPLETE_SETUP_CHECKLIST.md",
    "DEBUG_NOW.md",
    "FINAL_CHANGES_SUMMARY.md",
    "FINAL_SETUP_CHECKLIST.md",
    
    # Fix guides
    "FIX_403_ERROR.md",
    "FIX_N8N_RLS_ERROR.md",
    "FIX_N8N_STATUS_ERROR.md",
    "FIX_SEND_MONEY_ISSUES.md",
    "FIX_STEPS_NOW.md",
    "FIX_ZERO_BALANCE.md",
    "IMMEDIATE_FIX_STEPS.md",
    "INTEGRATION_COMPLETE.md",
    "NO_SERVICE_KEY_NEEDED.md",
    "PAYLOAD_FLATTENED.md",
    "QUICK_FIX_CARD.md",
    "QUICK_FIX_CHECKLIST.md",
    "READY_TO_TEST.md",
    "REALTIME_BALANCE_SETUP.md",
    "REALTIME_BALANCE_SYSTEM.md",
    "REALTIME_BALANCE_VALIDATION.md",
    "RESTART_INSTRUCTIONS.md",
    "SIGNUP_REDIRECT_FIX.md",
    "SOLUTION_APPLIED.md",
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
    "supabase-user-setup.sql",
    
    # Misc
    "mcp-server-config.md",
    "standard-transaction-json.md",
    "vapi-assistant-prompt.md",
    "vapi-n8n-integration.md",
    "ELEVENLABS_ERROR_HANDLING.md",
    "SETUP_GUIDE.md"
)

$deletedCount = 0
foreach ($file in $deleteFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  ❌ Deleted $file"
        $deletedCount++
    }
}

Write-Host ""
Write-Host "📝 Replacing README.md..." -ForegroundColor Yellow

# Backup old README
if (Test-Path "README.md") {
    Move-Item -Path "README.md" -Destination "README_OLD.md" -Force
    Write-Host "  📦 Backed up old README to README_OLD.md"
}

# Move new README
if (Test-Path "README_NEW.md") {
    Move-Item -Path "README_NEW.md" -Destination "README.md" -Force
    Write-Host "  ✅ New README.md is now active"
}

Write-Host ""
Write-Host "✨ Cleanup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  📁 Created organized docs/ structure"
Write-Host "  📦 Moved $($moves.Count) essential files"
Write-Host "  ❌ Deleted $deletedCount temporary files"
Write-Host "  📝 Updated README.md"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review docs/ folder structure"
Write-Host "  2. Check new README.md"
Write-Host "  3. Update QUICK_START.md if needed"
Write-Host "  4. Commit changes: git add . ; git commit -m 'Clean up project documentation'"
Write-Host ""
Write-Host "You can delete CLEANUP_PLAN.md and README_OLD.md when satisfied."
Write-Host ""
