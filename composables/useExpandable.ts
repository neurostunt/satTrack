/**
 * Expandable/Collapsible Composable
 * Shared logic for expandable/collapsible UI elements
 */

export const useExpandable = () => {
  const expandedItems = ref(new Set<string | number>())

  const toggleItem = (id: string | number) => {
    if (expandedItems.value.has(id)) {
      expandedItems.value.delete(id)
    } else {
      expandedItems.value.add(id)
    }
  }

  const isExpanded = (id: string | number): boolean => {
    return expandedItems.value.has(id)
  }

  const expandItem = (id: string | number) => {
    expandedItems.value.add(id)
  }

  const collapseItem = (id: string | number) => {
    expandedItems.value.delete(id)
  }

  const collapseAll = () => {
    expandedItems.value.clear()
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
      if (collapsedSections.value.has(key)) {
        collapsedSections.value.delete(key)
      } else {
        collapsedSections.value.set(key, true)
      }
    } else {
      if (expandedSections.value.has(key)) {
        expandedSections.value.delete(key)
      } else {
        expandedSections.value.set(key, true)
      }
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

