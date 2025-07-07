// src/components/CompanyProfileWithEmployees.tsx
'use client'

import React from 'react'
import EmployeeCount from './EmployeeCount'

interface CompanyProfileWithEmployeesProps {
  ticker: string
  isPremium?: boolean
  companyData?: any // Your existing company profile data
}

export default function CompanyProfileWithEmployees({ 
  ticker, 
  isPremium = false,
  companyData 
}: CompanyProfileWithEmployeesProps) {
  
  return (
    <div className="space-y-6">
      {/* ✅ EXISTING COMPANY PROFILE SECTION */}
      <div className="bg-theme-card rounded-lg p-6">
        <h2 className="text-xl font-semibold text-theme-primary mb-6">Company Profile</h2>
        
        {/* Your existing company profile content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-sm">
              <span className="text-theme-secondary">Sektor:</span>
              <span className="ml-2 text-theme-primary font-medium">
                {companyData?.sector || 'Technology'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-theme-secondary">Branche:</span>
              <span className="ml-2 text-theme-primary font-medium">
                {companyData?.industry || 'Consumer Electronics'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-theme-secondary">Land:</span>
              <span className="ml-2 text-theme-primary font-medium">
                {companyData?.country || 'US'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-theme-secondary">Mitarbeiter:</span>
              <span className="ml-2 text-theme-primary font-medium">
                {companyData?.fullTimeEmployees?.toLocaleString() || '164k'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-theme-secondary">IPO:</span>
              <span className="ml-2 text-theme-primary font-medium">
                {companyData?.ipoDate || '1980'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-theme-secondary">Website:</span>
              <a 
                href={companyData?.website || 'https://www.apple.com'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-green-400 hover:text-green-300 transition-colors"
              >
                {companyData?.website?.replace('https://', '').replace('http://', '') || 'www.apple.com'}
              </a>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="text-sm">
              <span className="text-theme-secondary">Marktkapitalisierung:</span>
              <span className="ml-2 text-theme-primary font-medium">
                {companyData?.mktCap ? `${(companyData.mktCap / 1e12).toFixed(1)}T` : '3.1T'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-theme-secondary">Börse:</span>
              <span className="ml-2 text-theme-primary font-medium">
                {companyData?.exchangeShortName || 'NASDAQ'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-theme-secondary">CEO:</span>
              <span className="ml-2 text-theme-primary font-medium">
                {companyData?.ceo || 'Tim Cook'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Company Description */}
        {companyData?.description && (
          <div className="mt-6 pt-6 border-t border-theme-border">
            <h3 className="text-sm font-semibold text-theme-primary mb-3">Über das Unternehmen</h3>
            <p className="text-sm text-theme-secondary leading-relaxed">
              {companyData.description}
            </p>
          </div>
        )}
      </div>
      
      {/* ✅ NEW EMPLOYEE COUNT SECTION */}
      <div className="bg-theme-card rounded-lg p-6">
        <h3 className="text-lg font-semibold text-theme-primary mb-4">Mitarbeiterentwicklung</h3>
        <EmployeeCount ticker={ticker} isPremium={isPremium} />
      </div>
    </div>
  )
}

