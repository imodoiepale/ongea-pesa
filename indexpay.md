# IndexPay API Documentation

**Version:** 2.1.0

**Base URL:** `https://aps.co.ke/indexpay/api`

**Last Updated:** November 2025

---

## Table of Contents

1. [Overview](https://claude.ai/chat/197e42fb-0f71-4098-a365-894c2d8a4c56#overview)
2. [Authentication](https://claude.ai/chat/197e42fb-0f71-4098-a365-894c2d8a4c56#authentication)
3. [Common Headers](https://claude.ai/chat/197e42fb-0f71-4098-a365-894c2d8a4c56#common-headers)
4. [Error Handling](https://claude.ai/chat/197e42fb-0f71-4098-a365-894c2d8a4c56#error-handling)
5. [API Endpoints](https://claude.ai/chat/197e42fb-0f71-4098-a365-894c2d8a4c56#api-endpoints)
   * [User Authentication](https://claude.ai/chat/197e42fb-0f71-4098-a365-894c2d8a4c56#user-authentication)
   * [Balance Management](https://claude.ai/chat/197e42fb-0f71-4098-a365-894c2d8a4c56#balance-management)
   * [Transactions](https://claude.ai/chat/197e42fb-0f71-4098-a365-894c2d8a4c56#transactions)
   * [Gates &amp; Pockets](https://claude.ai/chat/197e42fb-0f71-4098-a365-894c2d8a4c56#gates--pockets)
   * [Payments](https://claude.ai/chat/197e42fb-0f71-4098-a365-894c2d8a4c56#payments)
6. [Response Codes](https://claude.ai/chat/197e42fb-0f71-4098-a365-894c2d8a4c56#response-codes)
7. [Examples](https://claude.ai/chat/197e42fb-0f71-4098-a365-894c2d8a4c56#examples)

---

## Overview

The IndexPay API provides a comprehensive payment and wallet management system. This RESTful API allows you to manage user authentication, process payments, track transactions, and manage payment gates and pockets.

### Key Features

* User authentication and session management
* Multi-currency wallet support
* Real-time balance tracking
* Transaction history and filtering
* Payment gate management
* Secure payment processing

---

## Authentication

### Session-Based Authentication

The API uses PHP session-based authentication. After successful login, a session ID is returned which should be included in subsequent requests.

**Session Management:**

* Sessions are managed via PHP's `PHPSESSID` cookie
* Session expires based on server configuration
* Always logout to properly terminate sessions

---

## Common Headers

All API endpoints accept the following headers:

```
Content-Type: multipart/form-data
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Access-Control-Allow-Headers, Content-Type, Access-Control-Allow-Methods, Authorization, X-Requested-With
```

---

## Error Handling

### Standard Error Response

```json
{
  "response": [
    {
      "code": 500,
      "message": "Error description"
    }
  ]
}
```

### Common HTTP Status Codes

| Code | Description           |
| ---- | --------------------- |
| 200  | Success               |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 404  | Not Found             |
| 500  | Internal Server Error |

---

## API Endpoints

### User Authentication

#### 1. Login User

Authenticate a user and create a session.

**Endpoint:** `POST /login.php`

**Parameters:**

| Parameter     | Type   | Required | Description          |
| ------------- | ------ | -------- | -------------------- |
| user_email    | string | Yes      | User's email address |
| user_password | string | Yes      | User's password      |

**Success Response (200):**

```json
{
  "response": [
    {
      "code": 200,
      "message": "Success"
    }
  ],
  "SessionID": "5pm2f9p1chhc13sfhn5nkjc21h"
}
```

**Error Response (200):**

```json
{
  "response": [
    {
      "code": 500,
      "message": "Invalid Username or Password"
    }
  ]
}
```

**Example Request:**

```bash
curl -X POST https://aps.co.ke/indexpay/api/login.php \
  -F "user_email=user@example.com" \
  -F "user_password=secure_password"
```

---

#### 2. Logout User

Terminate the current user session.

**Endpoint:** `POST /logout.php`

**Parameters:**

| Parameter  | Type   | Required | Description          |
| ---------- | ------ | -------- | -------------------- |
| user_email | string | Yes      | User's email address |

**Success Response (200):**

```json
[
  {
    "email": "user@example.com",
    "message": "logout_Success",
    "code": 200
  }
]
```

**Error Response (400):**

```json
[
  {
    "Error": "Invalid User Email",
    "code": 200
  }
]
```

---

### Balance Management

#### 3. Get Account Balance

Retrieve the account balance for a specific user.

**Endpoint:** `POST /get_account_balance.php`

**Parameters:**

| Parameter  | Type   | Required | Description          |
| ---------- | ------ | -------- | -------------------- |
| user_email | string | Yes      | User's email address |

**Success Response (200):**

```json
{
  "account_balance": "1101.00",
  "user_email": "user@example.com"
}
```

**Example Request:**

```bash
curl -X POST https://aps.co.ke/indexpay/api/get_account_balance.php \
  -F "user_email=user@example.com"
```

---

#### 4. Get Gate Balance

Retrieve the balance for a specific payment gate.

**Endpoint:** `POST /get_gate_balance.php`

**Parameters:**

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| gate_id   | string | Yes      | Unique gate identifier |

**Success Response (200):**

```json
{
  "account_balance": "2050.00",
  "gate_id": "1"
}
```

**Example Request:**

```bash
curl -X POST https://aps.co.ke/indexpay/api/get_gate_balance.php \
  -F "gate_id=10"
```

---

### Transactions

#### 5. Get Transactions

Retrieve transaction history with filtering options.

**Endpoint:** `POST /get_transactions_2.php`

**Parameters:**

| Parameter  | Type    | Required | Description                                         |
| ---------- | ------- | -------- | --------------------------------------------------- |
| request    | integer | Yes      | Request type: 1=All, 2=Payment, 3=Deposit, 4=Refund |
| user_email | string  | Yes      | User's email address                                |
| date_from  | string  | Yes      | Start date (YYYY-MM-DD)                             |
| date_to    | string  | Yes      | End date (YYYY-MM-DD)                               |

**Success Response (200):**

```json
{
  "transactions": [
    {
      "trx_ID": "ZdRej7rzMzq6sSs1uMlo",
      "Date": "2022-03-08",
      "Intent": "Deposit",
      "Amount": "1",
      "Customer_Id": null,
      "Customer_Ref": "",
      "Gate": "p15",
      "Status": "Pending"
    },
    {
      "trx_ID": "tYSpwQSNjzzGMqZ2YlAY",
      "Date": "2022-03-08",
      "Intent": "Deposit",
      "Amount": "1",
      "Customer_Id": null,
      "Customer_Ref": "",
      "Gate": "COOL GATE",
      "Status": "Success"
    }
  ],
  "email": "user@example.com",
  "date_from": "2021-01-01",
  "date_to": "2022-12-31"
}
```

**Transaction Status Values:**

* `Success` - Transaction completed successfully
* `Pending` - Transaction is being processed
* `cancelled` - Transaction was cancelled

**Transaction Intent Values:**

* `Deposit` - Money added to account
* `Payment` - Money paid from account
* `Refund` - Money returned to account

**Example Request:**

```bash
curl -X POST https://aps.co.ke/indexpay/api/get_transactions_2.php \
  -F "request=3" \
  -F "user_email=user@example.com" \
  -F "date_from=2021-01-01" \
  -F "date_to=2022-12-31"
```

---

#### 6. Get Wallet Balance (Extended)

Get wallet balance with goal information.

**Endpoint:** `POST /get_transactions_2.php`

**Parameters:**

| Parameter  | Type    | Required | Description                    |
| ---------- | ------- | -------- | ------------------------------ |
| request    | integer | Yes      | Request type: 5=Wallet Balance |
| user_email | string  | Yes      | User's email address           |

**Success Response (200):**

```json
{
  "status": true,
  "response": {
    "trx_date": "2023-01-01",
    "user_email": "user@example.com",
    "goal_code": "A",
    "goal_name": "New Car",
    "goal_target_amount": "2000000",
    "goal_start_date": "2023-01-02",
    "goal_contribution": "1500"
  }
}
```

---

### User Management

#### 7. Get User Details

Retrieve detailed information about a user.

**Endpoint:** `POST /get_user_details.php`

**Parameters:**

| Parameter  | Type   | Required | Description          |
| ---------- | ------ | -------- | -------------------- |
| user_email | string | Yes      | User's email address |

**Success Response (200):**

```json
[
  {
    "first_name": "John",
    "last_name": "Doe",
    "phone": "0723456789",
    "user_email": "user@example.com"
  }
]
```

**Example Request:**

```bash
curl -X POST https://aps.co.ke/indexpay/api/get_user_details.php \
  -F "user_email=user@example.com"
```

---

### Gates & Pockets

#### 8. Get Gates List

Retrieve all payment gates associated with a user.

**Endpoint:** `POST /get_gate_list.php`

**Parameters:**

| Parameter  | Type   | Required | Description          |
| ---------- | ------ | -------- | -------------------- |
| user_email | string | Yes      | User's email address |

**Success Response (200):**

```json
{
  "response": [
    {
      "gate_name": "New gate",
      "gate_api_key": "89e5b3-147ab4-fe1d41-31159a-148401"
    }
  ]
}
```

**Example Request:**

```bash
curl -X POST https://aps.co.ke/indexpay/api/get_gate_list.php \
  -F "user_email=user@example.com"
```

---

#### 9. Get Pockets List

Retrieve all payment pockets associated with a user.

**Endpoint:** `POST /get_pocket_list.php`

**Parameters:**

| Parameter  | Type   | Required | Description          |
| ---------- | ------ | -------- | -------------------- |
| user_email | string | Yes      | User's email address |

**Example Request:**

```bash
curl -X POST https://aps.co.ke/indexpay/api/get_pocket_list.php \
  -F "user_email=user@example.com"
```

---

### Payments

#### 10. Wallet Payment

Process a payment from wallet balance.

**Endpoint:** `POST /wallet_payment.php`

**Parameters:**

| Parameter          | Type    | Required | Description                               |
| ------------------ | ------- | -------- | ----------------------------------------- |
| user_email         | string  | Yes      | User's email address                      |
| user_password      | string  | Yes      | User's password for verification          |
| transaction_date   | string  | Yes      | Transaction date (YYYY-MM-DD)             |
| transaction_intent | string  | Yes      | Transaction type (Payment/Deposit/Refund) |
| amount             | decimal | Yes      | Transaction amount                        |
| currency           | string  | Yes      | Currency code (e.g., KES, USD)            |
| gate_id            | string  | Yes      | Payment gate identifier                   |
| payment_mode       | string  | Yes      | Payment method                            |

**Example Request:**

```bash
curl -X POST https://aps.co.ke/indexpay/api/wallet_payment.php \
  -F "user_email=user@example.com" \
  -F "user_password=secure_password" \
  -F "transaction_date=2025-11-06" \
  -F "transaction_intent=Payment" \
  -F "amount=100.00" \
  -F "currency=KES" \
  -F "gate_id=10" \
  -F "payment_mode=wallet"
```

---

## Response Codes

### Application-Level Response Codes

| Code | Meaning                                     |
| ---- | ------------------------------------------- |
| 200  | Success - Operation completed successfully  |
| 400  | Bad Request - Missing or invalid parameters |
| 500  | Error - Operation failed (see message)      |

---

## Examples

### Complete Authentication Flow

```javascript
// 1. Login
const loginResponse = await fetch('https://aps.co.ke/indexpay/api/login.php', {
  method: 'POST',
  body: new FormData({
    user_email: 'user@example.com',
    user_password: 'password123'
  })
});

const loginData = await loginResponse.json();
const sessionId = loginData.SessionID;

// 2. Get account balance
const balanceResponse = await fetch('https://aps.co.ke/indexpay/api/get_account_balance.php', {
  method: 'POST',
  body: new FormData({
    user_email: 'user@example.com'
  })
});

const balanceData = await balanceResponse.json();
console.log(`Balance: ${balanceData.account_balance}`);

// 3. Get transactions
const transactionsResponse = await fetch('https://aps.co.ke/indexpay/api/get_transactions_2.php', {
  method: 'POST',
  body: new FormData({
    request: '1', // All transactions
    user_email: 'user@example.com',
    date_from: '2025-01-01',
    date_to: '2025-12-31'
  })
});

const transactionsData = await transactionsResponse.json();
console.log(`Total transactions: ${transactionsData.transactions.length}`);

// 4. Logout
await fetch('https://aps.co.ke/indexpay/api/logout.php', {
  method: 'POST',
  body: new FormData({
    user_email: 'user@example.com'
  })
});
```

---

## Best Practices

### Security

1. **Always use HTTPS** - Never send credentials over unencrypted connections
2. **Password Storage** - Never store passwords in plain text or logs
3. **Session Management** - Always logout when done to invalidate sessions
4. **API Keys** - Keep gate API keys secure and never expose in client-side code

### Performance

1. **Date Ranges** - Use specific date ranges when querying transactions
2. **Caching** - Cache balance information appropriately (don't query on every page load)
3. **Error Handling** - Always implement proper error handling and retry logic

### Integration

1. **Request Validation** - Always validate request parameters before sending
2. **Response Parsing** - Check response codes before parsing data
3. **Idempotency** - Implement transaction ID tracking to prevent duplicate payments
4. **Testing** - Use test accounts and small amounts during integration testing

---

## Support

For additional support or questions about the IndexPay API:

* **API Endpoint:** https://aps.co.ke/indexpay/api
* **Documentation Version:** 2.1.0
* **Last Updated:** November 2025

---

## Changelog

### Version 2.1.0 (November 2025)

* Initial documentation release
* Comprehensive endpoint documentation
* Added examples and best practices

---

## Appendix

### Transaction Request Types

| Value | Description               |
| ----- | ------------------------- |
| 1     | All transactions          |
| 2     | Payment transactions only |
| 3     | Deposit transactions only |
| 4     | Refund transactions only  |
| 5     | Wallet balance with goals |

### Currency Codes

Common currency codes supported:

* `KES` - Kenyan Shilling
* `USD` - US Dollar
* `EUR` - Euro
* `GBP` - British Pound

### Payment Modes

Common payment modes:

* `wallet` - Direct wallet payment
* `mpesa` - M-Pesa mobile money
* `card` - Credit/Debit card
* `bank` - Bank transfer

---

*This documentation is subject to change. Always refer to the latest version for accurate API specifications.*
