import { Bike, Car, Scooter, Zap } from 'lucide-react-native'

// Kulkuneuvojen kuvakkeet (lib/courier.js VEHICLES) asetuksiin ja profiiliin.
export const VEHICLE_ICONS = { bike: Bike, ebike: Zap, scooter: Scooter, car: Car }

export function vehicleIcon(key) {
  return VEHICLE_ICONS[key] ?? Bike
}
