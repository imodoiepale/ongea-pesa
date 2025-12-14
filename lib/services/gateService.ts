// Gate and Pocket Service for Chamas and Escrows
// Integrates with IndexPay API to create and manage gates/pockets

const INDEXPAY_BASE_URL = process.env.NEXT_PUBLIC_INDEXPAY_URL || "https://api.indexpay.co.ke"

interface GateCreateResponse {
  success: boolean
  gate_id?: string
  gate_name?: string
  error?: string
}

interface PocketCreateResponse {
  success: boolean
  pocket_id?: string
  pocket_name?: string
  error?: string
}

interface GateBalanceResponse {
  success: boolean
  balance?: number
  error?: string
}

// Generate a unique gate name for chama/escrow
export function generateGateName(entityType: 'chama' | 'escrow', name: string, id: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15).toLowerCase()
  const shortId = id.replace(/-/g, '').substring(0, 8)
  return `op_${entityType}_${sanitized}_${shortId}`
}

// Generate a pocket name
export function generatePocketName(entityType: 'chama' | 'escrow', name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20).toLowerCase()
  return `${entityType}_${sanitized}_main`
}

// Create a new Gate via IndexPay
export async function createGate(
  gateName: string,
  description: string,
  entityType: 'chama' | 'escrow'
): Promise<GateCreateResponse> {
  try {
    const formData = new FormData()
    formData.append("api_key", process.env.INDEXPAY_API_KEY || "")
    formData.append("gate_name", gateName)
    formData.append("gate_description", `Ongea Pesa ${entityType}: ${description}`)

    const response = await fetch(`${INDEXPAY_BASE_URL}/api/create_gate`, {
      method: "POST",
      body: formData,
    })

    const data = await response.json()
    
    if (data.status === "success" || data.gate_id) {
      return {
        success: true,
        gate_id: data.gate_id || data.id,
        gate_name: gateName,
      }
    }

    return {
      success: false,
      error: data.message || data.error || "Failed to create gate",
    }
  } catch (error) {
    console.error("Error creating gate:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create gate",
    }
  }
}

// Create a Pocket within a Gate
export async function createPocket(
  gateName: string,
  pocketName: string,
  description: string
): Promise<PocketCreateResponse> {
  try {
    const formData = new FormData()
    formData.append("api_key", process.env.INDEXPAY_API_KEY || "")
    formData.append("gate", gateName)
    formData.append("pocket_name", pocketName)
    formData.append("pocket_description", description)

    const response = await fetch(`${INDEXPAY_BASE_URL}/api/create_pocket`, {
      method: "POST",
      body: formData,
    })

    const data = await response.json()
    
    if (data.status === "success" || data.pocket_id) {
      return {
        success: true,
        pocket_id: data.pocket_id || data.id,
        pocket_name: pocketName,
      }
    }

    return {
      success: false,
      error: data.message || data.error || "Failed to create pocket",
    }
  } catch (error) {
    console.error("Error creating pocket:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create pocket",
    }
  }
}

// Get Gate Balance
export async function getGateBalance(gateName: string): Promise<GateBalanceResponse> {
  try {
    const formData = new FormData()
    formData.append("api_key", process.env.INDEXPAY_API_KEY || "")

    const response = await fetch(`${INDEXPAY_BASE_URL}/api/get_gates`, {
      method: "POST",
      body: formData,
    })

    const data = await response.json()
    
    if (Array.isArray(data)) {
      const gate = data.find((g: any) => g.gate_name === gateName)
      if (gate) {
        return {
          success: true,
          balance: parseFloat(gate.account_balance || "0"),
        }
      }
    } else if (data.response && Array.isArray(data.response)) {
      const gate = data.response.find((g: any) => g.gate_name === gateName)
      if (gate) {
        return {
          success: true,
          balance: parseFloat(gate.account_balance || "0"),
        }
      }
    }

    return {
      success: false,
      error: "Gate not found",
    }
  } catch (error) {
    console.error("Error getting gate balance:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get gate balance",
    }
  }
}

// Get Pocket Balance
export async function getPocketBalance(gateName: string, pocketName: string): Promise<GateBalanceResponse> {
  try {
    const formData = new FormData()
    formData.append("api_key", process.env.INDEXPAY_API_KEY || "")

    const response = await fetch(`${INDEXPAY_BASE_URL}/api/get_pockets`, {
      method: "POST",
      body: formData,
    })

    const data = await response.json()
    
    const pockets = Array.isArray(data) ? data : (data.response || [])
    const pocket = pockets.find((p: any) => p.gate === gateName && p.pocket_name === pocketName)
    
    if (pocket) {
      return {
        success: true,
        balance: parseFloat(pocket.acct_balance || "0"),
      }
    }

    return {
      success: false,
      error: "Pocket not found",
    }
  } catch (error) {
    console.error("Error getting pocket balance:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get pocket balance",
    }
  }
}

// Initiate STK Push to a Gate
export async function initiateGateSTKPush(
  gateName: string,
  phoneNumber: string,
  amount: number,
  reference: string
): Promise<{ success: boolean; checkout_request_id?: string; error?: string }> {
  try {
    const formData = new FormData()
    formData.append("api_key", process.env.INDEXPAY_API_KEY || "")
    formData.append("gate", gateName)
    formData.append("phone", phoneNumber)
    formData.append("amount", amount.toString())
    formData.append("reference", reference)

    const response = await fetch(`${INDEXPAY_BASE_URL}/api/stk_push`, {
      method: "POST",
      body: formData,
    })

    const data = await response.json()
    
    if (data.status === "success" || data.CheckoutRequestID) {
      return {
        success: true,
        checkout_request_id: data.CheckoutRequestID || data.checkout_request_id,
      }
    }

    return {
      success: false,
      error: data.message || data.error || "STK push failed",
    }
  } catch (error) {
    console.error("Error initiating STK push:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "STK push failed",
    }
  }
}

// Transfer from Gate to Phone (Payout)
export async function gateToPhone(
  gateName: string,
  phoneNumber: string,
  amount: number,
  reference: string
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  try {
    const formData = new FormData()
    formData.append("api_key", process.env.INDEXPAY_API_KEY || "")
    formData.append("gate", gateName)
    formData.append("phone", phoneNumber)
    formData.append("amount", amount.toString())
    formData.append("reference", reference)

    const response = await fetch(`${INDEXPAY_BASE_URL}/api/gate_to_phone`, {
      method: "POST",
      body: formData,
    })

    const data = await response.json()
    
    if (data.status === "success" || data.transaction_id) {
      return {
        success: true,
        transaction_id: data.transaction_id || data.id,
      }
    }

    return {
      success: false,
      error: data.message || data.error || "Transfer failed",
    }
  } catch (error) {
    console.error("Error transferring to phone:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transfer failed",
    }
  }
}

// Create Gate and Pocket for a new Chama or Escrow
export async function createEntityGateAndPocket(
  entityType: 'chama' | 'escrow',
  entityId: string,
  entityName: string,
  description: string
): Promise<{
  success: boolean
  gate_id?: string
  gate_name?: string
  pocket_id?: string
  pocket_name?: string
  error?: string
}> {
  const gateName = generateGateName(entityType, entityName, entityId)
  const pocketName = generatePocketName(entityType, entityName)

  // Create Gate
  const gateResult = await createGate(gateName, description, entityType)
  if (!gateResult.success) {
    return {
      success: false,
      error: `Failed to create gate: ${gateResult.error}`,
    }
  }

  // Create Pocket
  const pocketResult = await createPocket(gateName, pocketName, `Main pocket for ${entityName}`)
  if (!pocketResult.success) {
    return {
      success: false,
      gate_id: gateResult.gate_id,
      gate_name: gateResult.gate_name,
      error: `Gate created but pocket failed: ${pocketResult.error}`,
    }
  }

  return {
    success: true,
    gate_id: gateResult.gate_id,
    gate_name: gateResult.gate_name,
    pocket_id: pocketResult.pocket_id,
    pocket_name: pocketResult.pocket_name,
  }
}
