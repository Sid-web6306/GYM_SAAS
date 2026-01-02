/**
 * Member CSV Export/Import Utilities
 * Handles bulk export and import of member data using papaparse
 */

import Papa from 'papaparse'
import { type Member } from '@/types/member.types'
import { type CreateMemberData } from '@/services/members/member-management.service'

// CSV export fields and headers
export const CSV_HEADERS = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  phone_number: 'Phone Number',
  status: 'Status',
  join_date: 'Join Date',
} as const

export type CSVMemberData = {
  'First Name': string
  'Last Name': string
  'Email': string
  'Phone Number': string
  'Status': string
  'Join Date': string
}

export interface ValidationError {
  row: number
  field: string
  message: string
  value?: string
}

export interface ImportResult {
  success: boolean
  validMembers: CreateMemberData[]
  errors: ValidationError[]
  totalRows: number
}

/**
 * Export members to CSV
 */
export function exportMembersToCSV(members: Member[], filename: string = 'members.csv'): void {
  // Transform members to CSV format
  const csvData: CSVMemberData[] = members.map(member => ({
    'First Name': member.first_name || '',
    'Last Name': member.last_name || '',
    'Email': member.email || '',
    'Phone Number': member.phone_number || '',
    'Status': member.status || 'active',
    'Join Date': member.join_date ? new Date(member.join_date).toISOString().split('T')[0] : '',
  }))

  // Generate CSV
  const csv = Papa.unparse(csvData, {
    quotes: true,
    header: true,
  })

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Get CSV template with headers only
 */
export function downloadCSVTemplate(): void {
  const templateData: CSVMemberData[] = [
    {
      'First Name': 'John',
      'Last Name': 'Doe',
      'Email': 'john.doe@example.com',
      'Phone Number': '+911234567890',
      'Status': 'active',
      'Join Date': '2025-01-01',
    },
  ]

  const csv = Papa.unparse(templateData, {
    quotes: true,
    header: true,
  })

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', 'member_template.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number format (basic validation)
 */
function isValidPhoneNumber(phone: string): boolean {
  // Allow empty phone numbers
  if (!phone || phone.trim() === '') return true
  
  // Basic phone validation: at least 10 digits, can contain +, -, (, ), spaces
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/
  return phoneRegex.test(phone)
}

/**
 * Validate status value
 */
function isValidStatus(status: string): boolean {
  const validStatuses = ['active', 'inactive', 'pending']
  return validStatuses.includes(status.toLowerCase())
}

/**
 * Validate date format
 */
function isValidDate(dateString: string): boolean {
  // Allow empty dates
  if (!dateString || dateString.trim() === '') return true
  
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * Parse and validate CSV file
 */
export function parseCSVFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    Papa.parse<CSVMemberData>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validMembers: CreateMemberData[] = []
        const errors: ValidationError[] = []

        results.data.forEach((row, index) => {
          const rowNumber = index + 2 // +2 because index is 0-based and we skip header row
          const rowErrors: ValidationError[] = []

          // Validate required fields
          if (!row['First Name']?.trim()) {
            rowErrors.push({
              row: rowNumber,
              field: 'First Name',
              message: 'First name is required',
              value: row['First Name'],
            })
          }

          if (!row['Last Name']?.trim()) {
            rowErrors.push({
              row: rowNumber,
              field: 'Last Name',
              message: 'Last name is required',
              value: row['Last Name'],
            })
          }

          // Validate email (optional but must be valid if provided)
          const email = row['Email']?.trim()
          if (email && !isValidEmail(email)) {
            rowErrors.push({
              row: rowNumber,
              field: 'Email',
              message: 'Invalid email format',
              value: email,
            })
          }

          // Validate phone number
          const phoneNumber = row['Phone Number']?.trim()
          if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
            rowErrors.push({
              row: rowNumber,
              field: 'Phone Number',
              message: 'Invalid phone number format',
              value: phoneNumber,
            })
          }

          // Validate status
          const status = row['Status']?.trim().toLowerCase() || 'active'
          if (!isValidStatus(status)) {
            rowErrors.push({
              row: rowNumber,
              field: 'Status',
              message: 'Invalid status. Must be: active, inactive, or pending',
              value: row['Status'],
            })
          }

          // Validate join date
          const joinDate = row['Join Date']?.trim()
          if (joinDate && !isValidDate(joinDate)) {
            rowErrors.push({
              row: rowNumber,
              field: 'Join Date',
              message: 'Invalid date format',
              value: joinDate,
            })
          }

          // If no errors, add to valid members
          if (rowErrors.length === 0) {
            validMembers.push({
              first_name: row['First Name'].trim(),
              last_name: row['Last Name'].trim(),
              email: email || null,
              phone_number: phoneNumber || null,
              status: status as 'active' | 'inactive' | 'pending',
              join_date: joinDate || new Date().toISOString(),
              gym_id: '', // Will be set when creating members
            })
          } else {
            errors.push(...rowErrors)
          }
        })

        resolve({
          success: errors.length === 0,
          validMembers,
          errors,
          totalRows: results.data.length,
        })
      },
      error: (error) => {
        resolve({
          success: false,
          validMembers: [],
          errors: [
            {
              row: 0,
              field: 'file',
              message: `Failed to parse CSV: ${error.message}`,
            },
          ],
          totalRows: 0,
        })
      },
    })
  })
}

