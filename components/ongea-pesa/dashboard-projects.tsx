"use client"

import { Folder, Target, Calendar, TrendingUp, CheckCircle, Clock, AlertCircle } from "lucide-react"

export default function DashboardProjects() {
  const projects = [
    {
      id: 1,
      name: "Emergency Fund",
      description: "Build a 6-month emergency fund for financial security",
      category: "Savings",
      target: 150000,
      current: 87500,
      deadline: "2024-06-30",
      status: "In Progress",
      priority: "High",
      lastUpdate: "2024-01-15",
    },
    {
      id: 2,
      name: "Investment Portfolio",
      description: "Diversify investments across stocks, bonds, and real estate",
      category: "Investment",
      target: 500000,
      current: 125000,
      deadline: "2024-12-31",
      status: "In Progress",
      priority: "Medium",
      lastUpdate: "2024-01-12",
    },
    {
      id: 3,
      name: "Debt Payoff Plan",
      description: "Pay off all credit card and personal loan debts",
      category: "Debt Management",
      target: 85000,
      current: 65000,
      deadline: "2024-08-31",
      status: "In Progress",
      priority: "High",
      lastUpdate: "2024-01-10",
    },
    {
      id: 4,
      name: "Home Down Payment",
      description: "Save for a 20% down payment on a new home",
      category: "Savings",
      target: 800000,
      current: 240000,
      deadline: "2025-03-31",
      status: "In Progress",
      priority: "Medium",
      lastUpdate: "2024-01-08",
    },
    {
      id: 5,
      name: "Vacation Fund",
      description: "Save for a family vacation to Dubai",
      category: "Lifestyle",
      target: 120000,
      current: 120000,
      deadline: "2024-02-28",
      status: "Completed",
      priority: "Low",
      lastUpdate: "2024-01-05",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "in progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "on hold":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      case "in progress":
        return <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      case "overdue":
        return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
      default:
        return <Folder className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your financial goals and milestones</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Target className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{projects.length}</p>
            </div>
            <Folder className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {projects.filter((p) => p.status === "In Progress").length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {projects.filter((p) => p.status === "Completed").length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Target</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(projects.reduce((sum, p) => sum + p.target, 0))}
              </p>
            </div>
            <Target className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {projects.map((project) => {
          const progress = calculateProgress(project.current, project.target)
          const isOverdue = new Date(project.deadline) < new Date() && project.status !== "Completed"

          return (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    {getStatusIcon(project.status)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{project.description}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Category: {project.category}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                    {project.priority}
                  </span>
                  {isOverdue && (
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs font-medium">
                      Overdue
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Progress</p>
                  <div className="mt-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-900 dark:text-white">{formatCurrency(project.current)}</span>
                      <span className="text-gray-600 dark:text-gray-400">{formatCurrency(project.target)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          project.status === "Completed"
                            ? "bg-green-500"
                            : progress >= 75
                              ? "bg-blue-500"
                              : progress >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{progress.toFixed(1)}% complete</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Deadline</p>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <span
                      className={`text-sm ${isOverdue ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}
                    >
                      {formatDate(project.deadline)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Update</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900 dark:text-white">{formatDate(project.lastUpdate)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Remaining: {formatCurrency(Math.max(0, project.target - project.current))}
                </div>
                <div className="flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">
                    Update Progress
                  </button>
                  <button className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
