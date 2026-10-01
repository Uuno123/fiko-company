import { createContext, useContext } from 'react'
import { supabase } from '../lib/supabaseClient.js'

// Kaikki kojelaudan kanta-operaatiot yhdessä paikassa. Oletuksena oikea Supabase;
// esikatselusivu (__PreviewDashboard) antaa kontekstin kautta valeversion, jolloin
// koko kojelautaa voi katsella ja kokeilla ilman kirjautumista.
export const DashboardApiContext = createContext(null)

function check({ data, error }) {
  if (error) throw error
  return data
}

export const supabaseApi = {
  async fetchOrders(restaurantId) {
    const data = check(
      await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(500),
    )
    return data ?? []
  },

  async fetchOrder(orderId) {
    return check(await supabase.from('orders').select('*, order_items(*)').eq('id', orderId).single())
  },

  subscribeOrders(restaurantId, { onInsert, onUpdate }) {
    const channel = supabase
      .channel(`pd-orders-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => onInsert(payload.new),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => onUpdate(payload.new),
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  },

  async updateOrder(orderId, fields) {
    check(await supabase.from('orders').update(fields).eq('id', orderId))
  },

  async updateRestaurant(restaurantId, fields) {
    check(await supabase.from('restaurants').update(fields).eq('id', restaurantId))
  },

  async fetchPlatformCategories() {
    const data = check(await supabase.from('restaurants').select('category'))
    return [...new Set((data ?? []).map((r) => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fi'))
  },

  async fetchMenu(restaurantId) {
    const data = check(
      await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('category', { ascending: true })
        .order('name', { ascending: true }),
    )
    return data ?? []
  },

  async createMenuItem(restaurantId, fields) {
    return check(
      await supabase
        .from('menu_items')
        .insert({ ...fields, restaurant_id: restaurantId })
        .select()
        .single(),
    )
  },

  async updateMenuItem(itemId, fields) {
    check(await supabase.from('menu_items').update(fields).eq('id', itemId))
  },

  async deleteMenuItem(itemId) {
    check(await supabase.from('menu_items').delete().eq('id', itemId))
  },

  async fetchOptionGroups(menuItemId) {
    const data = check(
      await supabase
        .from('menu_item_option_groups')
        .select('*, menu_item_options(*)')
        .eq('menu_item_id', menuItemId)
        .order('display_order', { ascending: true }),
    )
    return (data ?? []).map((group) => ({
      ...group,
      options: [...(group.menu_item_options ?? [])].sort((a, b) => a.display_order - b.display_order),
    }))
  },

  async createOptionGroup(menuItemId, group, options, displayOrder) {
    const row = check(
      await supabase
        .from('menu_item_option_groups')
        .insert({ ...group, menu_item_id: menuItemId, display_order: displayOrder })
        .select()
        .single(),
    )
    if (options.length > 0) {
      check(
        await supabase
          .from('menu_item_options')
          .insert(options.map((option, index) => ({ ...option, group_id: row.id, display_order: index }))),
      )
    }
  },

  // Tallentaa ryhmän asetukset ja synkronoi vaihtoehdot: poistetut poistetaan,
  // olemassa olevat päivitetään ja uudet lisätään.
  async saveOptionGroup(groupId, groupFields, options, previousOptionIds) {
    check(await supabase.from('menu_item_option_groups').update(groupFields).eq('id', groupId))
    const keptIds = options.filter((o) => o.id).map((o) => o.id)
    const removedIds = previousOptionIds.filter((id) => !keptIds.includes(id))
    if (removedIds.length > 0) {
      check(await supabase.from('menu_item_options').delete().in('id', removedIds))
    }
    for (const [index, option] of options.entries()) {
      const payload = {
        name: option.name.trim(),
        price_delta_cents: option.price_delta_cents,
        is_default: Boolean(option.is_default),
        display_order: index,
      }
      if (option.id) {
        check(await supabase.from('menu_item_options').update(payload).eq('id', option.id))
      } else {
        check(await supabase.from('menu_item_options').insert({ ...payload, group_id: groupId }))
      }
    }
  },

  async deleteOptionGroup(groupId) {
    check(await supabase.from('menu_item_option_groups').delete().eq('id', groupId))
  },
}

export function useDashboardApi() {
  return useContext(DashboardApiContext) ?? supabaseApi
}
