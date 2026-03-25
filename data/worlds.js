export const worlds = [
  {
    id: 1,
    name: "Golden Paradise",
    unlockCost: 0,
    multiplier: 1,
    theme: "gold",
    cookieImage: "assets/cookies/world1.png"
  },
  {
    id: 2,
    name: "Rainbow Heaven",
    unlockCost: 5000,
    requirements: {
    lifetimeCookies: 60000,
    totalBuildings: 30,
    prestigeCookies: 1
    },
    multiplier: 1.08,
    theme: "rainbow",
    cookieImage: "assets/cookies/world2.png"
  },
  {
    id: 3,
    name: "Divine Realm",
    unlockCost: 90000,
    requirements: {
    lifetimeCookies: 1200000,
    totalBuildings: 90,
    prestigeCookies: 4
    },
    multiplier: 1.2,
    theme: "divine",
    cookieImage: "assets/cookies/world3.png"
  }
]
