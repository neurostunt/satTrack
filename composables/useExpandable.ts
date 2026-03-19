/**
 * Expandable/Collapsible Composable
 * Shared logic for expandable/collapsible UI elements
 */

export const useExpandable = () => {
  const expandedItems = ref(new Set<string | number>())

  const toggleItem = (id: string | number) => {
    const next = new Set(expandedItems.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    expandedItems.value = next
  }

  const isExpanded = (id: string | number): boolean => {
    return expandedItems.value.has(id)
  }

  const expandItem = (id: string | number) => {
    const next = new Set(expandedItems.value)
    next.add(id)
    expandedItems.value = next
  }

  const collapseItem = (id: string | number) => {
    const next = new Set(expandedItems.value)
    next.delete(id)
    expandedItems.value = next
  }

  const collapseAll = () => {
    expandedItems.value = new Set()
  }

  return {
    expandedItems,
    toggleItem,
    isExpanded,
    expandItem,
    collapseItem,
    collapseAll
  }
}

/**
 * Expandable Sections Composable
 * For managing multiple expandable sections within a single item
 */
export const useExpandableSections = () => {
  const expandedSections = ref(new Map<string, boolean>())
  const collapsedSections = ref(new Map<string, boolean>())

  const toggleSection = (itemId: string | number, section: string, defaultExpanded: boolean = false) => {
    const key = `${itemId}-${section}`
    
    if (defaultExpanded) {
      const next = new Map(collapsedSections.value)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.set(key, true)
      }
      collapsedSections.value = next
    } else {
      const next = new Map(expandedSections.value)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.set(key, true)
      }
      expandedSections.value = next
    }
  }

  const isSectionExpanded = (itemId: string | number, section: string, defaultExpanded: boolean = false): boolean => {
    const key = `${itemId}-${section}`
    
    if (defaultExpanded) {
      return !collapsedSections.value.has(key)
    }
    
    return expandedSections.value.has(key)
  }

  return {
    expandedSections,
    collapsedSections,
    toggleSection,
    isSectionExpanded
  }
}

