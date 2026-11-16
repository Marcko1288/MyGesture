import type { IconType } from 'react-icons'
import {
  FiBell,
  FiBookOpen,
  FiBriefcase,
  FiCloud,
  FiCoffee,
  FiCreditCard,
  FiDollarSign,
  FiFilm,
  FiGift,
  FiHeart,
  FiHome,
  FiMoreHorizontal,
  FiMusic,
  FiShoppingBag,
  FiSmartphone,
  FiTool,
  FiTruck,
  FiTv,
  FiUmbrella,
  FiWifi,
} from 'react-icons/fi'

/** Icone delle spese (campo Buy.icon, 0–9), come nell'app storica. */
export const buyIcons: { id: number; label: string; icon: IconType }[] = [
  { id: 0, label: 'Amazon e acquisti', icon: FiShoppingBag },
  { id: 1, label: 'Casa', icon: FiHome },
  { id: 2, label: 'Carta e prestiti', icon: FiCreditCard },
  { id: 3, label: 'Trasporti', icon: FiTruck },
  { id: 4, label: 'Cibo e bar', icon: FiCoffee },
  { id: 5, label: 'Salute', icon: FiHeart },
  { id: 6, label: 'Regali', icon: FiGift },
  { id: 7, label: 'Libri e formazione', icon: FiBookOpen },
  { id: 8, label: 'Denaro', icon: FiDollarSign },
  { id: 9, label: 'Altro', icon: FiMoreHorizontal },
]

/** Icone dei gruppi (campo Group.icon, 0–9), come nell'app storica. */
export const groupIcons: { id: number; label: string; icon: IconType }[] = [
  { id: 0, label: 'Acquisti', icon: FiShoppingBag },
  { id: 1, label: 'Casa', icon: FiHome },
  { id: 2, label: 'Prestiti e carte', icon: FiCreditCard },
  { id: 3, label: 'Viaggi e auto', icon: FiTruck },
  { id: 4, label: 'Cibo', icon: FiCoffee },
  { id: 5, label: 'Lavoro', icon: FiBriefcase },
  { id: 6, label: 'Servizi', icon: FiTool },
  { id: 7, label: 'Assicurazioni', icon: FiUmbrella },
  { id: 8, label: 'Denaro', icon: FiDollarSign },
  { id: 9, label: 'Altro', icon: FiMoreHorizontal },
]

export function buyIcon(index: unknown): IconType {
  return buyIcons[Number(index)]?.icon ?? FiMoreHorizontal
}

export function groupIcon(index: unknown): IconType {
  return groupIcons[Number(index)]?.icon ?? FiMoreHorizontal
}

/** Icona dell'abbonamento dedotta dal nome (regole storiche). */
export function subscriptionIcon(name = ''): IconType {
  const normalized = String(name).toLocaleLowerCase('it-IT')
  if (/(netflix|disney|prime video|amazon prime|now tv|sky|streaming|cinema)/.test(normalized)) return FiTv
  if (/(spotify|apple music|musica|music|tidal|audible)/.test(normalized)) return FiMusic
  if (/(icloud|google drive|dropbox|onedrive|cloud|storage)/.test(normalized)) return FiCloud
  if (/(telefono|mobile|sim|vodafone|tim |wind|iliad|ho\.|fastweb mobile)/.test(normalized)) return FiSmartphone
  if (/(internet|fibra|wifi|wi-fi|adsl)/.test(normalized)) return FiWifi
  if (/(libro|book|kindle|giornale|rivista|corso|udemy)/.test(normalized)) return FiBookOpen
  if (/(amazon|shop|acquisto|shopping)/.test(normalized)) return FiShoppingBag
  if (/(carta|card|paypal|banca|bank)/.test(normalized)) return FiCreditCard
  if (/(film|video|youtube)/.test(normalized)) return FiFilm
  return FiBell
}
