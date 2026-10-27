// Données de démo du mode offline (les mêmes que le standalone).
import type { Category, Plan } from './model'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const at = (n: number) => new Date(Date.UTC(2026, 0, 1, 12, n)).toISOString()

export const seedCategories = (): Category[] =>
  ['Outdoors', 'Food', 'Cozy', 'Games', 'Sport', 'Getaway', 'Culture', 'Creative', 'Learning']
    .map((label, i) => ({ id: uuid(100 + i), label }))

export const seedPlans = (): Plan[] => [
  { id: uuid(1), num: 1, titre: 'Picnic in the park', prix: 'free', duree: '1to3h', saisons: ['spring', 'summer'], lieu: 'town', cats: ['Outdoors', 'Food'], fait: true, createdAt: at(7) },
  { id: uuid(2), num: 2, titre: 'Cooking class for two', prix: '2', duree: '1to3h', saisons: ['all'], lieu: 'town', cats: ['Food', 'Learning'], fait: false, createdAt: at(6) },
  { id: uuid(3), num: 3, titre: 'Board game night', prix: 'free', duree: '1to3h', saisons: ['autumn', 'winter'], lieu: 'home', cats: ['Cozy', 'Games'], fait: false, createdAt: at(5) },
  { id: uuid(4), num: 4, titre: 'Sunrise hike', prix: 'free', duree: 'half', saisons: ['spring', 'summer', 'autumn'], lieu: 'nearby', cats: ['Outdoors', 'Sport'], fait: false, createdAt: at(4) },
  { id: uuid(5), num: 5, titre: 'Cabin weekend', prix: '3', duree: 'weekend', saisons: ['spring', 'autumn'], lieu: 'trip', cats: ['Getaway', 'Outdoors'], fait: false, createdAt: at(3) },
  { id: uuid(6), num: 6, titre: 'Museum & terrace drinks', prix: '2', duree: 'half', saisons: ['spring', 'summer'], lieu: 'town', cats: ['Culture', 'Food'], fait: true, createdAt: at(2) },
  { id: uuid(7), num: 7, titre: 'Pottery workshop', prix: '2', duree: '1to3h', saisons: ['all'], lieu: 'town', cats: ['Creative', 'Learning'], fait: false, createdAt: at(1) },
]
