import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface UIState {
  // Search & Filter State
  searchQuery: string
  statusFilter: string | null
  sortBy: 'name' | 'join_date' | 'status'
  sortOrder: 'asc' | 'desc'
  
  // Modal States
  isAddMemberModalOpen: boolean
  isEditMemberModalOpen: boolean
  selectedMemberId: string | null
  
  // Other UI States
  sidebarCollapsed: boolean
  
  // Actions for Search & Filters
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: string | null) => void
  setSortBy: (sortBy: 'name' | 'join_date' | 'status') => void
  setSortOrder: (order: 'asc' | 'desc') => void
  setSorting: (sortBy: 'name' | 'join_date' | 'status', order: 'asc' | 'desc') => void
  
  // Actions for Modals
  setAddMemberModalOpen: (open: boolean) => void
  setEditMemberModalOpen: (open: boolean) => void
  setSelectedMemberId: (id: string | null) => void
  
  // Actions for UI
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // Utility Actions
  resetFilters: () => void
  resetModals: () => void
  
  // Computed Getters
  getFilters: () => {
    search: string
    status: string | null
    sortBy: 'name' | 'join_date' | 'status'
    sortOrder: 'asc' | 'desc'
  }
}

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // Initial State
      searchQuery: '',
      statusFilter: null,
      sortBy: 'name',
      sortOrder: 'asc',
      
      isAddMemberModalOpen: false,
      isEditMemberModalOpen: false,
      selectedMemberId: null,
      
      sidebarCollapsed: false,
      
      // Search & Filter Actions
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setStatusFilter: (statusFilter) => set({ statusFilter }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
      
      // Modal Actions
      setAddMemberModalOpen: (isAddMemberModalOpen) => set({ isAddMemberModalOpen }),
      setEditMemberModalOpen: (isEditMemberModalOpen) => set({ isEditMemberModalOpen }),
      setSelectedMemberId: (selectedMemberId) => set({ selectedMemberId }),
      
      // UI Actions
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      
      // Utility Actions
      resetFilters: () => set({ 
        searchQuery: '', 
        statusFilter: null, 
        sortBy: 'name', 
        sortOrder: 'asc' 
      }),
      
      resetModals: () => set({ 
        isAddMemberModalOpen: false, 
        isEditMemberModalOpen: false, 
        selectedMemberId: null 
      }),
      
      // Computed Getters
      getFilters: () => {
        const state = get()
        return {
          search: state.searchQuery,
          status: state.statusFilter,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
        }
      },
    }),
    {
      name: 'ui-store',
    }
  )
)

// Note: Use useUIStore((state) => state.property) directly in components
// This is the recommended pattern for Zustand with React

// Export convenience actions
export const uiActions = {
  // Search & Filters
  setSearchQuery: (query: string) => useUIStore.getState().setSearchQuery(query),
  setStatusFilter: (status: string | null) => useUIStore.getState().setStatusFilter(status),
  setSorting: (sortBy: 'name' | 'join_date' | 'status', order: 'asc' | 'desc') => useUIStore.getState().setSorting(sortBy, order),
  
  // Modals
  openAddMemberModal: () => useUIStore.getState().setAddMemberModalOpen(true),
  closeAddMemberModal: () => useUIStore.getState().setAddMemberModalOpen(false),
  openEditMemberModal: (memberId: string) => {
    useUIStore.getState().setSelectedMemberId(memberId)
    useUIStore.getState().setEditMemberModalOpen(true)
  },
  closeEditMemberModal: () => {
    useUIStore.getState().setEditMemberModalOpen(false)
    useUIStore.getState().setSelectedMemberId(null)
  },
  
  // UI
  toggleSidebar: () => {
    const current = useUIStore.getState().sidebarCollapsed
    useUIStore.getState().setSidebarCollapsed(!current)
  },
  
  // Utilities
  resetFilters: () => useUIStore.getState().resetFilters(),
  resetModals: () => useUIStore.getState().resetModals(),
} 