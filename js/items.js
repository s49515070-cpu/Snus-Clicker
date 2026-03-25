export const inventoryItems = [
    {
        id: "instant_capital",
        icon: "💰",
        unlockAchievementId: "lifetime_snus_tier_1",
        nameKey: "itemInstantCapitalName",
        descriptionKey: "itemInstantCapitalDescription",
        effectTextKey: "itemInstantCapitalEffect",
        effect: {
            type: "instant_cookie_bonus"
        }
    },
    {
        id: "upgrade_coupon",
        icon: "🧾",
        unlockAchievementId: "diamond_spender_tier_1",
        nameKey: "itemUpgradeCouponName",
        descriptionKey: "itemUpgradeCouponDescription",
        effectTextKey: "itemUpgradeCouponEffect",
        effect: {
            type: "upgrade_discount",
            durationMs: 60_000,
            cooldownMs: 180_000,
            discountPercent: 50
        }
    },
    {
        id: "income_rush",
        icon: "🚀",
        unlockAchievementId: "total_clicks_tier_2",
        nameKey: "itemIncomeRushName",
        descriptionKey: "itemIncomeRushDescription",
        effectTextKey: "itemIncomeRushEffect",
        effect: {
            type: "income_multiplier",
            durationMs: 30_000,
            cooldownMs: 120_000,
            multiplier: 2
        }
    },
    {
        id: "lucky_charm",
        icon: "🍀",
        unlockAchievementId: "max_click_combo_tier_1",
        nameKey: "itemLuckyCharmName",
        descriptionKey: "itemLuckyCharmDescription",
        effectTextKey: "itemLuckyCharmEffect",
        effect: {
            type: "crit_chance_bonus",
            durationMs: 45_000,
            cooldownMs: 150_000,
            critBonus: 0.08
        }
    },
    {
        id: "prestige_pass",
        icon: "🌠",
        unlockAchievementId: "prestige_level_tier_1",
        nameKey: "itemPrestigePassName",
        descriptionKey: "itemPrestigePassDescription",
        effectTextKey: "itemPrestigePassEffect",
        effect: {
            type: "prestige_cost_discount",
            durationMs: 45_000,
            cooldownMs: 180_000,
            discountPercent: 25
        }
    }
];

