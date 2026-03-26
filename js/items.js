export const inventoryItems = [
    {
        id: "instant_capital",
        icon: "🚬",
        unlockAchievementId: "lifetime_snus_tier_1",
        nameKey: "itemInstantCapitalName",
        descriptionKey: "itemInstantCapitalDescription",
        effectTextKey: "itemInstantCapitalEffect",
        effect: {
            type: "crit_chance_bonus",
            durationMs: 25_000,
            cooldownMs: 90_000,
            critBonus: 0.04
        }
    },
    {
        id: "upgrade_coupon",
        icon: "🥫",
        unlockAchievementId: "diamond_spender_tier_1",
        nameKey: "itemUpgradeCouponName",
        descriptionKey: "itemUpgradeCouponDescription",
        effectTextKey: "itemUpgradeCouponEffect",
        effect: {
            type: "instant_cookie_bonus"
        }
    },
    {
        id: "income_rush",
        icon: "💨",
        unlockAchievementId: "total_clicks_tier_1",
        nameKey: "itemIncomeRushName",
        descriptionKey: "itemIncomeRushDescription",
        effectTextKey: "itemIncomeRushEffect",
        effect: {
            type: "upgrade_discount",
            durationMs: 45_000,
            cooldownMs: 135_000,
            discountPercent: 30
        }
    },
    {
        id: "lucky_charm",
        icon: "🌿",
        unlockAchievementId: "max_click_combo_tier_1",
        nameKey: "itemLuckyCharmName",
        descriptionKey: "itemLuckyCharmDescription",
        effectTextKey: "itemLuckyCharmEffect",
        effect: {
            type: "income_multiplier",
            durationMs: 30_000,
            cooldownMs: 120_000,
            multiplier: 1.8
        }
    },
    {
        id: "prestige_pass",
        icon: "💊",
        unlockAchievementId: "prestige_level_tier_1",
        nameKey: "itemPrestigePassName",
        descriptionKey: "itemPrestigePassDescription",
        effectTextKey: "itemPrestigePassEffect",
        effect: {
            type: "crit_chance_bonus",
            durationMs: 50_000,
            cooldownMs: 150_000,
            critBonus: 0.12
        }
    },
    {
        id: "item_crack",
        icon: "🧨",
        unlockAchievementId: "max_total_buildings_tier_1",
        nameKey: "itemCrackName",
        descriptionKey: "itemCrackDescription",
        effectTextKey: "itemCrackEffect",
        effect: {
            type: "income_multiplier",
            durationMs: 35_000,
            cooldownMs: 140_000,
            multiplier: 2.5
        }
    },
    {
        id: "item_crystal_meth",
        icon: "💠",
        unlockAchievementId: "upgrade_levels_tier_1",
        nameKey: "itemCrystalMethName",
        descriptionKey: "itemCrystalMethDescription",
        effectTextKey: "itemCrystalMethEffect",
        effect: {
            type: "income_multiplier",
            durationMs: 45_000,
            cooldownMs: 150_000,
            multiplier: 3
        }
    },
    {
        id: "item_koks",
        icon: "⚪",
        unlockAchievementId: "unlocked_worlds_tier_1",
        nameKey: "itemKoksName",
        descriptionKey: "itemKoksDescription",
        effectTextKey: "itemKoksEffect",
        effect: {
            type: "upgrade_discount",
            durationMs: 55_000,
            cooldownMs: 170_000,
            discountPercent: 70
        }
    },
    {
        id: "item_heroin",
        icon: "💉",
        unlockAchievementId: "claimed_trophies_tier_1",
        nameKey: "itemHeroinName",
        descriptionKey: "itemHeroinDescription",
        effectTextKey: "itemHeroinEffect",
        effect: {
            type: "prestige_cost_discount",
            durationMs: 60_000,
            cooldownMs: 180_000,
            discountPercent: 55
        }
    }
];
