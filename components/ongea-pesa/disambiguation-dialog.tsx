"use client"
import { AlertTriangle, User, Phone, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Contact {
  id: string
  name: string
  phone: string
  type: "contact" | "paybill" | "pochi"
  avatar?: string
}

interface DisambiguationDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (contact: Contact) => void
  matches: Contact[]
  query: string
  voiceResponse: string
}

export default function DisambiguationDialog({
  isOpen,
  onClose,
  onSelect,
  matches,
  query,
  voiceResponse,
}: DisambiguationDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
            Multiple Matches Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Voice Response */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">AI: "{voiceResponse}"</p>
          </div>

          {/* Original Query */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">You said:</p>
            <p className="font-medium">"{query}"</p>
          </div>

          {/* Contact Options */}
          <div className="space-y-3 mb-4">
            {matches.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => onSelect(contact)}
              >
                <div className="flex-1 flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    {contact.type === "contact" && <User className="h-5 w-5 text-white" />}
                    {contact.type === "paybill" && <Building2 className="h-5 w-5 text-white" />}
                    {contact.type === "pochi" && <Phone className="h-5 w-5 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{contact.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{contact.phone}</p>
                  </div>
                  <Badge variant={contact.type === "contact" ? "default" : "secondary"}>{contact.type}</Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600"
              onClick={() => {
                // Voice correction option
                alert('Say: "Sio huyo, ni John mwingine" to clarify')
              }}
            >
              Voice Clarify
            </Button>
          </div>

          {/* Voice Correction Examples */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Voice Corrections:</p>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <p>• "Sio huyo, ni John mwingine"</p>
              <p>• "Futa hiyo" (Cancel)</p>
              <p>• "Rudia" (Repeat)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
