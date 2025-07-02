"use client"

import { Building2, Phone, Mail, MapPin, Users, Calendar, Star } from "lucide-react"

export default function DashboardOrganization() {
  const organizations = [
    {
      id: 1,
      name: "Safaricom PLC",
      type: "Telecommunications",
      relationship: "Service Provider",
      status: "Active",
      contact: {
        phone: "+254 722 000 000",
        email: "customer.care@safaricom.co.ke",
        address: "Safaricom House, Waiyaki Way, Nairobi",
      },
      services: ["M-Pesa", "Mobile Services", "Internet"],
      lastInteraction: "2024-01-15",
      rating: 4.5,
    },
    {
      id: 2,
      name: "Kenya Commercial Bank",
      type: "Financial Institution",
      relationship: "Banking Partner",
      status: "Active",
      contact: {
        phone: "+254 711 087 000",
        email: "customercare@kcbgroup.com",
        address: "KCB Centre, Upper Hill, Nairobi",
      },
      services: ["Banking", "Loans", "Investment"],
      lastInteraction: "2024-01-12",
      rating: 4.2,
    },
    {
      id: 3,
      name: "Kenya Power (KPLC)",
      type: "Utility Company",
      relationship: "Service Provider",
      status: "Active",
      contact: {
        phone: "+254 703 070 707",
        email: "info@kplc.co.ke",
        address: "Stima Plaza, Kolobot Road, Nairobi",
      },
      services: ["Electricity", "Prepaid Tokens"],
      lastInteraction: "2024-01-10",
      rating: 3.8,
    },
    {
      id: 4,
      name: "Nairobi Water Company",
      type: "Utility Company",
      relationship: "Service Provider",
      status: "Active",
      contact: {
        phone: "+254 020 557 7000",
        email: "info@nairobiwater.co.ke",
        address: "Kampala Road, Nairobi",
      },
      services: ["Water Supply", "Sewerage"],
      lastInteraction: "2024-01-08",
      rating: 3.5,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "inactive":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? "text-yellow-400 fill-current"
            : i < rating
              ? "text-yellow-400 fill-current opacity-50"
              : "text-gray-300 dark:text-gray-600"
        }`}
      />
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organization</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your business relationships and partnerships</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Add Organization
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Organizations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">4</p>
            </div>
            <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Partners</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">4</p>
            </div>
            <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Service Providers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">3</p>
            </div>
            <Phone className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Rating</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">4.0</p>
            </div>
            <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Organizations List */}
      <div className="space-y-4">
        {organizations.map((org) => (
          <div
            key={org.id}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{org.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{org.type}</p>
                  <div className="flex items-center mt-1">
                    {renderStars(org.rating)}
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({org.rating})</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(org.status)}`}>
                  {org.status}
                </span>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
                  {org.relationship}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{org.contact.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{org.contact.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Last contact: {org.lastInteraction}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{org.contact.address}</span>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Services:</p>
              <div className="flex flex-wrap gap-2">
                {org.services.map((service, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
