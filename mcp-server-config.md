# MCP Server Configuration for Ongea Pesa

## Database Connection Setup

### Supabase MCP Server Configuration

```json
{
  "mcpServers": {
    "ongea-pesa-db": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-postgres",
        "postgresql://[username]:[password]@[host]:[port]/[database]"
      ],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## MCP Resources Available

### 1. Transaction Operations
- **Resource**: `transaction://create`
- **Resource**: `transaction://update/{id}`
- **Resource**: `transaction://get/{id}`
- **Resource**: `transaction://list/{user_id}`

### 2. User Management
- **Resource**: `user://profile/{user_id}`
- **Resource**: `user://balance/{user_id}`
- **Resource**: `user://limits/{user_id}`

### 3. Voice Session Tracking
- **Resource**: `voice-session://create`
- **Resource**: `voice-session://update/{session_id}`
- **Resource**: `voice-session://analytics/{user_id}`

### 4. AI Scan Results
- **Resource**: `scan-result://create`
- **Resource**: `scan-result://history/{user_id}`

## MCP Tools Available

### Transaction Tools

#### `create_transaction`
```json
{
  "name": "create_transaction",
  "description": "Create a new transaction in the database",
  "inputSchema": {
    "type": "object",
    "properties": {
      "user_id": {"type": "string", "format": "uuid"},
      "type": {"type": "string", "enum": ["send_phone", "buy_goods_pochi", "buy_goods_till", "paybill", "withdraw", "bank_to_mpesa", "bank_to_bank"]},
      "amount": {"type": "string"},
      "phone": {"type": "string"},
      "till": {"type": "string"},
      "paybill": {"type": "string"},
      "account": {"type": "string"},
      "agent": {"type": "string"},
      "store": {"type": "string"},
      "bank_code": {"type": "string"},
      "voice_verified": {"type": "boolean"},
      "confidence_score": {"type": "integer"},
      "voice_command_text": {"type": "string"}
    },
    "required": ["user_id", "type", "amount"]
  }
}
```

#### `update_transaction_status`
```json
{
  "name": "update_transaction_status",
  "description": "Update transaction status and external references",
  "inputSchema": {
    "type": "object",
    "properties": {
      "transaction_id": {"type": "string", "format": "uuid"},
      "status": {"type": "string", "enum": ["pending", "processing", "completed", "failed", "cancelled"]},
      "mpesa_transaction_id": {"type": "string"},
      "external_ref": {"type": "string"},
      "completed_at": {"type": "string", "format": "date-time"}
    },
    "required": ["transaction_id", "status"]
  }
}
```

#### `get_user_transactions`
```json
{
  "name": "get_user_transactions",
  "description": "Get user transaction history with filters",
  "inputSchema": {
    "type": "object",
    "properties": {
      "user_id": {"type": "string", "format": "uuid"},
      "type": {"type": "string"},
      "status": {"type": "string"},
      "limit": {"type": "integer", "default": 50},
      "offset": {"type": "integer", "default": 0},
      "date_from": {"type": "string", "format": "date"},
      "date_to": {"type": "string", "format": "date"}
    },
    "required": ["user_id"]
  }
}
```

### User Management Tools

#### `get_user_profile`
```json
{
  "name": "get_user_profile",
  "description": "Get user profile and balance information",
  "inputSchema": {
    "type": "object",
    "properties": {
      "user_id": {"type": "string", "format": "uuid"}
    },
    "required": ["user_id"]
  }
}
```

#### `update_user_balance`
```json
{
  "name": "update_user_balance",
  "description": "Update user balance after successful transaction",
  "inputSchema": {
    "type": "object",
    "properties": {
      "user_id": {"type": "string", "format": "uuid"},
      "amount_change": {"type": "string"},
      "transaction_id": {"type": "string", "format": "uuid"}
    },
    "required": ["user_id", "amount_change", "transaction_id"]
  }
}
```

#### `check_transaction_limits`
```json
{
  "name": "check_transaction_limits",
  "description": "Check if transaction is within user limits",
  "inputSchema": {
    "type": "object",
    "properties": {
      "user_id": {"type": "string", "format": "uuid"},
      "transaction_type": {"type": "string"},
      "amount": {"type": "string"}
    },
    "required": ["user_id", "transaction_type", "amount"]
  }
}
```

### Voice Session Tools

#### `create_voice_session`
```json
{
  "name": "create_voice_session",
  "description": "Start a new voice session",
  "inputSchema": {
    "type": "object",
    "properties": {
      "user_id": {"type": "string", "format": "uuid"},
      "session_id": {"type": "string"},
      "audio_quality_score": {"type": "integer"},
      "voice_match_score": {"type": "integer"}
    },
    "required": ["user_id", "session_id"]
  }
}
```

#### `end_voice_session`
```json
{
  "name": "end_voice_session",
  "description": "End voice session with summary",
  "inputSchema": {
    "type": "object",
    "properties": {
      "session_id": {"type": "string"},
      "transactions_completed": {"type": "integer"},
      "total_amount_transacted": {"type": "string"},
      "session_status": {"type": "string", "enum": ["completed", "timeout", "error"]}
    },
    "required": ["session_id"]
  }
}
```

### AI Scan Tools

#### `save_scan_result`
```json
{
  "name": "save_scan_result",
  "description": "Save AI scan result to database",
  "inputSchema": {
    "type": "object",
    "properties": {
      "user_id": {"type": "string", "format": "uuid"},
      "transaction_id": {"type": "string", "format": "uuid"},
      "scan_type": {"type": "string"},
      "image_url": {"type": "string"},
      "extracted_data": {"type": "object"},
      "confidence_score": {"type": "integer"},
      "processing_time_ms": {"type": "integer"},
      "model_used": {"type": "string", "default": "gemini-2.5-pro"}
    },
    "required": ["user_id", "scan_type", "extracted_data", "confidence_score"]
  }
}
```

## Database Query Examples

### Common Queries via MCP

#### Get Recent Transactions
```sql
SELECT t.*, u.phone as user_phone, u.name as user_name
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE t.user_id = $1
ORDER BY t.created_at DESC
LIMIT 20;
```

#### Get Transaction Summary
```sql
SELECT 
  type,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(confidence_score) as avg_confidence
FROM transactions 
WHERE user_id = $1 
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY type
ORDER BY total_amount DESC;
```

#### Check Daily Spending
```sql
SELECT 
  DATE(created_at) as transaction_date,
  SUM(amount) as daily_total,
  COUNT(*) as transaction_count
FROM transactions
WHERE user_id = $1
  AND created_at >= NOW() - INTERVAL '7 days'
  AND status = 'completed'
GROUP BY DATE(created_at)
ORDER BY transaction_date DESC;
```

## Integration with VAPI

### Transaction Flow
1. **VAPI receives voice command**
2. **Extract transaction details**
3. **Call MCP `check_transaction_limits`**
4. **Call MCP `create_transaction`** with status 'pending'
5. **Process with M-Pesa API**
6. **Call MCP `update_transaction_status`** with result
7. **Call MCP `update_user_balance`** if successful

### Voice Session Tracking
1. **VAPI session starts** → Call MCP `create_voice_session`
2. **During session** → Track transactions via `create_transaction`
3. **Session ends** → Call MCP `end_voice_session` with summary

### Error Handling
- **Database errors** → Return structured error response
- **Limit exceeded** → Return specific limit violation message
- **Insufficient balance** → Return balance information
- **Invalid transaction** → Return validation errors

## Security Considerations

### Row Level Security
- Users can only access their own data
- Service role key required for admin operations
- Audit logging for all changes

### API Rate Limiting
- Implement rate limiting on MCP server
- Track API usage per user
- Prevent abuse with transaction limits

### Data Encryption
- Sensitive fields encrypted at rest
- Voice profile data encrypted
- PIN hash using bcrypt
