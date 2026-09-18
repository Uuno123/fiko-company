// Tuotteiden valintaryhmät (koko, täytteet yms.) - ks. supabase/migrations/0022_create_menu_item_option_groups.sql.
// Kumppani määrittelee ryhmät/vaihtoehdot kojelaudalla; tämä moduuli laskee asiakkaan
// valintojen hinnan ja pätevyyden ostoskoriin lisättäessä.

export function getOptionGroups(item) {
  const groups = item?.menu_item_option_groups ?? []
  return [...groups]
    .sort((a, b) => a.display_order - b.display_order)
    .map((group) => ({
      ...group,
      menu_item_options: [...(group.menu_item_options ?? [])].sort((a, b) => a.display_order - b.display_order),
    }))
}

// Alkuvalinnat modaalin avautuessa: kumppanin merkitsemät oletusvaihtoehdot.
// Single-ryhmässä vain yksi (ensimmäinen oletus) voi olla valittuna kerrallaan.
export function getDefaultSelection(group) {
  const defaults = group.menu_item_options.filter((o) => o.is_default).map((o) => o.id)
  if (group.selection_type === 'single') return defaults.slice(0, 1)
  const max = group.max_selections ?? Infinity
  return defaults.slice(0, max)
}

export function isGroupValid(group, selectedIds) {
  const count = selectedIds.length
  const max = group.max_selections ?? Infinity
  return count >= group.min_selections && count <= max
}

export function areAllGroupsValid(groups, selectionsByGroupId) {
  return groups.every((group) => isGroupValid(group, selectionsByGroupId[group.id] ?? []))
}

// free_selections = kuinka moni valituista on ilmaisia. Asiakkaan eduksi vapautetaan
// hinnaltaan kalleimmat valinnat ensin, loput maksavat oman price_delta_cents:nsä.
export function computeGroupDeltaCents(group, selectedIds) {
  const selectedOptions = group.menu_item_options.filter((o) => selectedIds.includes(o.id))
  const sorted = [...selectedOptions].sort((a, b) => b.price_delta_cents - a.price_delta_cents)
  return sorted.reduce((sum, option, index) => (index < group.free_selections ? sum : sum + option.price_delta_cents), 0)
}

export function computeTotalDeltaCents(groups, selectionsByGroupId) {
  return groups.reduce((sum, group) => sum + computeGroupDeltaCents(group, selectionsByGroupId[group.id] ?? []), 0)
}

// Litteä lista valituista vaihtoehdoista ostoskoririville - price_delta_cents on jo
// ilmaiskiintiön jälkeinen lopullinen lisähinta per vaihtoehto (0 jos vapautettu).
export function buildSelectedOptionsPayload(groups, selectionsByGroupId) {
  const payload = []
  for (const group of groups) {
    const selectedIds = selectionsByGroupId[group.id] ?? []
    const selectedOptions = group.menu_item_options.filter((o) => selectedIds.includes(o.id))
    const sorted = [...selectedOptions].sort((a, b) => b.price_delta_cents - a.price_delta_cents)
    sorted.forEach((option, index) => {
      payload.push({
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        name: option.name,
        priceDeltaCents: index < group.free_selections ? 0 : option.price_delta_cents,
      })
    })
  }
  return payload
}

export function optionsKeyFromPayload(selectedOptions) {
  if (!selectedOptions?.length) return null
  return selectedOptions
    .map((o) => o.optionId)
    .sort()
    .join(',')
}
