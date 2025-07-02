"use client"

import { useState } from "react"
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  Wallet,
  Store,
  Receipt,
  Star,
  Mic,
  Filter,
  MoreVertical,
  Edit,
} from "lucide-react"

type ContactType = "personal" | "bank" | "paybill" | "pochi" | "till" | "loan" | "all"

interface Contact {
  id: string
  name: string
  type: ContactType
  phone?: string
  email?: string
  accountNumber?: string
  paybillNumber?: string
  tillNumber?: string
  businessName?: string
  location?: string
  ownerName?: string
  branch?: string
  balance?: string
  loanLimit?: string
  currentBalance?: string
  status?: string
  provider?: string
  category?: string
  lastAmount?: string
  lastTransaction?: string
  transactionCount?: number
  isFavorite?: boolean
}

export default function DashboardContacts() {
  const [activeTab, setActiveTab] = useState<ContactType>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")

  const contacts: Contact[] = [
    // Personal Contacts
    {
      id: "p1",
      name: "John Kamau",
      type: "personal",
      phone: "0712345678",
      email: "john.kamau@gmail.com",
      lastTransaction: "KSh 500 - 2 days ago",
      transactionCount: 15,
      isFavorite: true,
    },
    {
      id: "p2",
      name: "Mary Wanjiku",
      type: "personal",
      phone: "0722987654",
      email: "mary.wanjiku@yahoo.com",
      lastTransaction: "KSh 2,500 - 1 week ago",
      transactionCount: 8,
      isFavorite: false,
    },
    {
      id: "p3",
      name: "Peter Mwangi",
      type: "personal",
      phone: "0733456789",
      lastTransaction: "KSh 1,200 - 3 days ago",
      transactionCount: 12,
      isFavorite: true,
    },

    // Bank Accounts
    {
      id: "b1",
      name: "KCB Bank - Savings",
      type: "bank",
      accountNumber: "1122334455",
      branch: "Westlands Branch",
      balance: "KSh 45,230.50",
      phone: "0711087000",
    },
    {
      id: "b2",
      name: "Equity Bank - Current",
      type: "bank",
      accountNumber: "9988776655",
      branch: "Upper Hill Branch",
      balance: "KSh 12,450.75",
      phone: "0763063000",
    },
    {
      id: "b3",
      name: "Co-operative Bank",
      type: "bank",
      accountNumber: "5544332211",
      branch: "CBD Branch",
      balance: "KSh 8,750.25",
      phone: "0711049000",
    },

    // Paybills
    {
      id: "pb1",
      name: "KPLC Prepaid",
      type: "paybill",
      paybillNumber: "888880",
      accountNumber: "123456789012",
      category: "Utilities",
      lastAmount: "KSh 2,500",
    },
    {
      id: "pb2",
      name: "Nairobi Water",
      type: "paybill",
      paybillNumber: "888880",
      accountNumber: "987654321098",
      category: "Utilities",
      lastAmount: "KSh 1,200",
    },
    {
      id: "pb3",
      name: "DSTV Kenya",
      type: "paybill",
      paybillNumber: "820820",
      accountNumber: "1234567890",
      category: "Entertainment",
      lastAmount: "KSh 1,500",
    },
    {
      id: "pb4",
      name: "Safaricom Postpaid",
      type: "paybill",
      paybillNumber: "100000",
      accountNumber: "0712345678",
      category: "Telecommunications",
      lastAmount: "KSh 2,800",
    },

    // Pochi la Biashara
    {
      id: "po1",
      name: "Mama Mboga Shop",
      type: "pochi",
      phone: "0722123456",
      businessName: "Fresh Vegetables",
      location: "Westlands Market",
      ownerName: "Grace Nyambura",
    },
    {
      id: "po2",
      name: "Kinyozi Barber Shop",
      type: "pochi",
      phone: "0733987654",
      businessName: "Modern Cuts",
      location: "Kasarani",
      ownerName: "Samuel Kiprotich",
    },
    {
      id: "po3",
      name: "Mama Fua Laundry",
      type: "pochi",
      phone: "0744567890",
      businessName: "Quick Clean Services",
      location: "Pipeline Estate",
      ownerName: "Jane Akinyi",
    },

    // Till Numbers (Buy Goods)
    {
      id: "t1",
      name: "Naivas Supermarket",
      type: "till",
      tillNumber: "832909",
      location: "Westgate Mall",
      lastTransaction: "KSh 2,450 - Yesterday",
    },
    {
      id: "t2",
      name: "Java House",
      type: "till",
      tillNumber: "967967",
      location: "Sarit Centre",
      lastTransaction: "KSh 850 - 3 days ago",
    },
    {
      id: "t3",
      name: "Carrefour",
      type: "till",
      tillNumber: "400200",
      location: "Junction Mall",
      lastTransaction: "KSh 3,200 - 1 week ago",
    },

    // Loans & Fuliza
    {
      id: "l1",
      name: "M-Shwari Loan",
      type: "loan",
      provider: "Safaricom & CBA",
      loanLimit: "KSh 50,000",
      currentBalance: "KSh 12,500",
      status: "Active",
    },
    {
      id: "l2",
      name: "KCB M-Pesa Loan",
      type: "loan",
      provider: "KCB Bank",
      loanLimit: "KSh 100,000",
      currentBalance: "KSh 0",
      status: "Available",
    },
    {
      id: "l3",
      name: "Fuliza M-Pesa",
      type: "loan",
      provider: "Safaricom",
      loanLimit: "KSh 5,000",
      currentBalance: "KSh 1,200",
      status: "Active",
    },
  ]

  const filteredContacts = contacts.filter((contact) => {
    const matchesTab = activeTab === "all" || contact.type === activeTab
    const matchesSearch =
      searchTerm === "" ||
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.businessName && contact.businessName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (contact.ownerName && contact.ownerName.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesTab && matchesSearch
  })

  const getContactIcon = (type: ContactType) => {
    switch (type) {
      case "personal":
        return <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
      case "bank":
        return <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
      case "paybill":
        return <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
      case "pochi":
        return <Store className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
      case "till":
        return <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600 dark:text-pink-400" />
      case "loan":
        return <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
      default:
        return <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const getTypeLabel = (type: ContactType) => {
    const labels = {
      personal: "Personal",
      bank: "Bank Account",
      paybill: "Paybill",
      pochi: "Pochi la Biashara",
      till: "Buy Goods",
      loan: "Loan/Fuliza",
      all: "All",
    }
    return labels[type]
  }

  const getTypeColor = (type: ContactType) => {
    const colors = {
      personal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      bank: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      paybill: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      pochi: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      till: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      loan: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      all: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    }
    return colors[type]
  }

  const contactCounts = {
    all: contacts.length,
    personal: contacts.filter((c) => c.type === "personal").length,
    bank: contacts.filter((c) => c.type === "bank").length,
    paybill: contacts.filter((c) => c.type === "paybill").length,
    pochi: contacts.filter((c) => c.type === "pochi").length,
    till: contacts.filter((c) => c.type === "till").length,
    loan: contacts.filter((c) => c.type === "loan").length,
  }

  const renderContactCard = (contact: Contact) => (
    <div
      key={contact.id}
      className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            {getContactIcon(contact.type)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                {contact.name}
              </h3>
              {contact.isFavorite && (
                <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-current flex-shrink-0" />
              )}
            </div>
            {contact.businessName && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{contact.businessName}</p>
            )}
            {contact.ownerName && (
              <p className="text-xs text-gray-500 dark:text-gray-500 truncate">Owner: {contact.ownerName}</p>
            )}
            {contact.provider && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{contact.provider}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(contact.type)}`}>
            {getTypeLabel(contact.type)}
          </span>
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <MoreVertical className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm mb-3">
        {contact.phone && (
          <div className="flex items-center space-x-2">
            <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-400 truncate">{contact.phone}</span>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center space-x-2">
            <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-400 truncate">{contact.email}</span>
          </div>
        )}
        {contact.location && (
          <div className="flex items-center space-x-2">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-400 truncate">{contact.location}</span>
          </div>
        )}
        {contact.accountNumber && (
          <div className="flex items-center space-x-2">
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-400 truncate">A/C: {contact.accountNumber}</span>
          </div>
        )}
        {contact.paybillNumber && (
          <div className="flex items-center space-x-2">
            <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-400 truncate">Paybill: {contact.paybillNumber}</span>
          </div>
        )}
        {contact.tillNumber && (
          <div className="flex items-center space-x-2">
            <Store className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-400 truncate">Till: {contact.tillNumber}</span>
          </div>
        )}
        {contact.branch && (
          <div className="flex items-center space-x-2">
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-400 truncate">{contact.branch}</span>
          </div>
        )}
      </div>

      {(contact.balance || contact.loanLimit || contact.lastTransaction || contact.lastAmount) && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {contact.balance && (
              <div>
                <p className="text-gray-500 dark:text-gray-500">Balance</p>
                <p className="font-semibold text-green-600 dark:text-green-400 truncate">{contact.balance}</p>
              </div>
            )}
            {contact.loanLimit && (
              <div>
                <p className="text-gray-500 dark:text-gray-500">Limit</p>
                <p className="font-semibold text-blue-600 dark:text-blue-400 truncate">{contact.loanLimit}</p>
              </div>
            )}
            {contact.currentBalance && (
              <div>
                <p className="text-gray-500 dark:text-gray-500">Outstanding</p>
                <p className="font-semibold text-red-600 dark:text-red-400 truncate">{contact.currentBalance}</p>
              </div>
            )}
            {contact.lastTransaction && (
              <div>
                <p className="text-gray-500 dark:text-gray-500">Last Transaction</p>
                <p className="font-semibold text-gray-900 dark:text-white truncate">{contact.lastTransaction}</p>
              </div>
            )}
            {contact.lastAmount && (
              <div>
                <p className="text-gray-500 dark:text-gray-500">Last Payment</p>
                <p className="font-semibold text-gray-900 dark:text-white truncate">{contact.lastAmount}</p>
              </div>
            )}
            {contact.transactionCount && (
              <div>
                <p className="text-gray-500 dark:text-gray-500">Transactions</p>
                <p className="font-semibold text-gray-900 dark:text-white">{contact.transactionCount} times</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex space-x-2 mt-3">
        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-xs sm:text-sm font-medium">
          Send Money
        </button>
        <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
          <Mic className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
          <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage your financial contacts and connections</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Mic className="h-4 w-4" />
            Voice Add
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Search and Voice Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm">
              <Mic className="h-4 w-4" />
              Voice Search
            </button>
            <button className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Contact Type Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex overflow-x-auto">
          {(["all", "personal", "bank", "paybill", "pochi", "till", "loan"] as ContactType[]).map((type) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                activeTab === type
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {getContactIcon(type)}
                <span className="hidden sm:inline">{getTypeLabel(type)}</span>
                <span className="sm:hidden">{type === "all" ? "All" : type.charAt(0).toUpperCase()}</span>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs">
                  {contactCounts[type]}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Contacts List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredContacts.map(renderContactCard)}
      </div>

      {filteredContacts.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No contacts found matching your search.</p>
        </div>
      )}
    </div>
  )
}
