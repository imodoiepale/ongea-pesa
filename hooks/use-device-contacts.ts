"use client"

import { useState, useCallback } from 'react'

export interface DeviceContact {
  name: string
  phone: string
  email?: string
}

interface ContactsPickerContact {
  name?: string[]
  tel?: string[]
  email?: string[]
}

interface ContactsManager {
  select: (
    properties: string[],
    options?: { multiple?: boolean }
  ) => Promise<ContactsPickerContact[]>
  getProperties: () => Promise<string[]>
}

/**
 * Hook to access device contacts via the Contact Picker API (PWA)
 * Works on Chrome Android 80+, Edge Android, Opera Android
 */
export function useDeviceContacts() {
  const [contacts, setContacts] = useState<DeviceContact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState<boolean | null>(null)

  /**
   * Check if Contact Picker API is supported
   */
  const checkSupport = useCallback(() => {
    const supported = 'contacts' in navigator && 'ContactsManager' in window
    setIsSupported(supported)
    return supported
  }, [])

  /**
   * Request access to device contacts and pick contacts
   * @param multiple - Allow selecting multiple contacts (default: true)
   */
  const pickContacts = useCallback(async (multiple = true): Promise<DeviceContact[]> => {
    setLoading(true)
    setError(null)

    try {
      // Check if API is supported
      if (!('contacts' in navigator)) {
        throw new Error('Contact Picker API not supported on this device/browser')
      }

      const contactsManager = navigator.contacts as ContactsManager

      // Get available properties
      const supportedProperties = await contactsManager.getProperties()
      console.log('📱 Supported contact properties:', supportedProperties)

      // Request properties we need
      const properties = ['name', 'tel']
      if (supportedProperties.includes('email')) {
        properties.push('email')
      }

      // Open contact picker
      const selectedContacts = await contactsManager.select(properties, { multiple })

      // Transform to our format
      const deviceContacts: DeviceContact[] = selectedContacts
        .filter(contact => contact.tel && contact.tel.length > 0)
        .map(contact => ({
          name: contact.name?.[0] || 'Unknown',
          phone: normalizePhoneNumber(contact.tel?.[0] || ''),
          email: contact.email?.[0],
        }))

      console.log('📱 Selected contacts:', deviceContacts.length)
      setContacts(deviceContacts)
      return deviceContacts

    } catch (err: any) {
      console.error('❌ Contact picker error:', err)
      
      // Handle user cancellation gracefully
      if (err.name === 'InvalidStateError' || err.message?.includes('cancel')) {
        setError('Contact selection cancelled')
      } else {
        setError(err.message || 'Failed to access contacts')
      }
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Pick a single contact for sending money
   */
  const pickSingleContact = useCallback(async (): Promise<DeviceContact | null> => {
    const selected = await pickContacts(false)
    return selected[0] || null
  }, [pickContacts])

  /**
   * Search through previously picked contacts by name
   */
  const searchContacts = useCallback((query: string): DeviceContact[] => {
    if (!query || query.length < 2) return contacts

    const lowerQuery = query.toLowerCase()
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(lowerQuery) ||
      contact.phone.includes(query.replace(/\D/g, ''))
    )
  }, [contacts])

  return {
    contacts,
    loading,
    error,
    isSupported,
    checkSupport,
    pickContacts,
    pickSingleContact,
    searchContacts,
  }
}

/**
 * Normalize phone number to Kenyan format
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')
  
  // Handle different formats
  if (cleaned.startsWith('254')) {
    // Already in international format: 254712345678
    cleaned = '0' + cleaned.slice(3)
  } else if (cleaned.startsWith('+254')) {
    cleaned = '0' + cleaned.slice(4)
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    // Missing leading 0: 712345678
    cleaned = '0' + cleaned
  }
  
  // Validate Kenyan mobile format (07XX or 01XX)
  if (/^0[17]\d{8}$/.test(cleaned)) {
    return cleaned
  }
  
  // Return original if can't normalize
  return phone
}

/**
 * Calculate similarity between contact name and search query
 */
export function calculateContactSimilarity(name: string, query: string): number {
  const s1 = name.toLowerCase().trim()
  const s2 = query.toLowerCase().trim()
  
  if (s1 === s2) return 1
  if (s1.includes(s2) || s2.includes(s1)) return 0.9
  
  // Check word matches
  const words1 = s1.split(/\s+/)
  const words2 = s2.split(/\s+/)
  
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 && w1.length > 2) return 0.85
      if (w1.startsWith(w2) || w2.startsWith(w1)) return 0.7
    }
  }
  
  // First letter match with similar length
  if (s1[0] === s2[0] && Math.abs(s1.length - s2.length) <= 3) {
    return 0.5
  }
  
  return 0
}
