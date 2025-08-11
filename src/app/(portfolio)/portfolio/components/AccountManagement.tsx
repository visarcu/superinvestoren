'use client'

import React, { useState, useEffect } from 'react'
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BanknotesIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline'
import { Account } from '../types/portfolio'

interface AccountManagementProps {
  onClose: () => void
}

export default function AccountManagement({ onClose }: AccountManagementProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    bank: '',
    type: 'CHECKING' as Account['type'],
    balance: ''
  })

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = () => {
    const saved = localStorage.getItem('portfolio_accounts')
    if (saved) {
      setAccounts(JSON.parse(saved))
    }
  }

  const saveAccounts = (newAccounts: Account[]) => {
    setAccounts(newAccounts)
    localStorage.setItem('portfolio_accounts', JSON.stringify(newAccounts))
  }

  const handleSubmit = () => {
    if (!formData.name || !formData.bank) {
      alert('Bitte fülle Name und Bank aus.')
      return
    }

    const account: Account = {
      id: editingAccount?.id || Date.now().toString(),
      name: formData.name,
      bank: formData.bank,
      type: formData.type,
      balance: formData.balance ? parseFloat(formData.balance) : undefined
    }

    let newAccounts
    if (editingAccount) {
      newAccounts = accounts.map(a => a.id === editingAccount.id ? account : a)
    } else {
      newAccounts = [...accounts, account]
    }

    saveAccounts(newAccounts)
    resetForm()
  }

  const deleteAccount = (id: string) => {
    if (confirm('Konto wirklich löschen? Dies kann Auswirkungen auf bestehende Transaktionen haben.')) {
      const newAccounts = accounts.filter(a => a.id !== id)
      saveAccounts(newAccounts)
    }
  }

  const editAccount = (account: Account) => {
    setEditingAccount(account)
    setFormData({
      name: account.name,
      bank: account.bank,
      type: account.type,
      balance: account.balance?.toString() || ''
    })
    setShowAddForm(true)
  }

  const resetForm = () => {
    setFormData({ name: '', bank: '', type: 'CHECKING', balance: '' })
    setEditingAccount(null)
    setShowAddForm(false)
  }

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'CHECKING': return '💳'
      case 'SAVINGS': return '💰'
      case 'BUSINESS': return '🏢'
      case 'INVESTMENT': return '📈'
      default: return '🏦'
    }
  }

  const getAccountLabel = (type: Account['type']) => {
    switch (type) {
      case 'CHECKING': return 'Girokonto'
      case 'SAVINGS': return 'Sparkonto'
      case 'BUSINESS': return 'Geschäftskonto'
      case 'INVESTMENT': return 'Depot'
      case 'OTHER': return 'Sonstiges'
      default: return 'Unbekannt'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-theme-card rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-theme-hover">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-theme-primary">
                Konten & Depots verwalten
              </h2>
              <p className="text-theme-secondary text-sm mt-1">
                Verwalte deine Bankkonten und Depots
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition"
              >
                <PlusIcon className="w-4 h-4" />
                Konto hinzufügen
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-theme-tertiary hover:bg-theme-hover text-theme-secondary rounded-lg transition"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          
          {/* Account List */}
          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <BuildingLibraryIcon className="w-16 h-16 text-theme-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-theme-primary mb-2">
                Keine Konten vorhanden
              </h3>
              <p className="text-theme-muted mb-4">
                Füge dein erstes Konto hinzu um zu beginnen.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition"
              >
                Erstes Konto hinzufügen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {accounts.map(account => (
                <div key={account.id} className="bg-theme-tertiary rounded-lg p-4 hover:bg-theme-hover transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getAccountIcon(account.type)}</span>
                      <div>
                        <h3 className="font-semibold text-theme-primary">{account.name}</h3>
                        <p className="text-sm text-theme-secondary">{account.bank}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => editAccount(account)}
                        className="p-2 text-theme-muted hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteAccount(account.id)}
                        className="p-2 text-theme-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-theme-muted bg-theme-card px-2 py-1 rounded">
                      {getAccountLabel(account.type)}
                    </span>
                    {account.balance !== undefined && (
                      <span className="text-sm font-medium text-theme-primary">
                        {formatCurrency(account.balance)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="bg-theme-secondary rounded-xl p-6">
              <h3 className="text-lg font-semibold text-theme-primary mb-4">
                {editingAccount ? 'Konto bearbeiten' : 'Neues Konto hinzufügen'}
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Kontoname *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="z.B. Hauptkonto, Sparkonto"
                      className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none transition"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Bank *
                    </label>
                    <input
                      type="text"
                      value={formData.bank}
                      onChange={(e) => setFormData(prev => ({ ...prev, bank: e.target.value }))}
                      placeholder="z.B. Sparkasse, ING, DKB"
                      className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Kontotyp
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Account['type'] }))}
                      className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary focus:border-green-500 focus:outline-none transition"
                    >
                      <option value="CHECKING">💳 Girokonto</option>
                      <option value="SAVINGS">💰 Sparkonto</option>
                      <option value="BUSINESS">🏢 Geschäftskonto</option>
                      <option value="INVESTMENT">📈 Depot</option>
                      <option value="OTHER">🏦 Sonstiges</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Aktueller Kontostand (optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.balance}
                      onChange={(e) => setFormData(prev => ({ ...prev, balance: e.target.value }))}
                      placeholder="1500.00"
                      className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none transition"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-3 bg-theme-tertiary hover:bg-theme-hover text-theme-secondary font-medium rounded-lg transition"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition"
                  >
                    {editingAccount ? 'Speichern' : 'Hinzufügen'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}