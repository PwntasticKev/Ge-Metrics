// Curated from the OSRS Wiki on 2026-10-25 (incl. Sailing-era methods): processing methods with GE-tradeable
// inputs and outputs. Item ids verified against the prices API mapping by exact name.
// Each method links its wiki source. Refresh when fees or recipes change.
export default [
  {
    "key": "sawmill",
    "title": "Sawmill planks",
    "description": "Bring unnoted logs to a Sawmill operator (Varrock Lumber Yard, Woodcutting Guild, Auburnvale, Prifddinas) and pay a fee per plank.",
    "requirements": "Members (oak and above are members logs); logs must be unnoted; Woodcutting Guild sawmill needs 60 Woodcutting",
    "actionsPerHour": 3591,
    "source": "https://oldschool.runescape.wiki/w/Sawmill",
    "recipes": [
      {
        "id": "proc:sawmill:plank",
        "method": "sawmill",
        "name": "Plank",
        "inputs": [
          {
            "id": 1511,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 960,
            "qty": 1
          }
        ],
        "coinCost": 100
      },
      {
        "id": "proc:sawmill:oak-plank",
        "method": "sawmill",
        "name": "Oak plank",
        "inputs": [
          {
            "id": 1521,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8778,
            "qty": 1
          }
        ],
        "coinCost": 250
      },
      {
        "id": "proc:sawmill:teak-plank",
        "method": "sawmill",
        "name": "Teak plank",
        "inputs": [
          {
            "id": 6333,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8780,
            "qty": 1
          }
        ],
        "coinCost": 500
      },
      {
        "id": "proc:sawmill:mahogany-plank",
        "method": "sawmill",
        "name": "Mahogany plank",
        "inputs": [
          {
            "id": 6332,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8782,
            "qty": 1
          }
        ],
        "coinCost": 1500
      },
      {
        "id": "proc:sawmill:camphor-plank",
        "method": "sawmill",
        "name": "Camphor plank",
        "inputs": [
          {
            "id": 32904,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31432,
            "qty": 1
          }
        ],
        "coinCost": 2500
      },
      {
        "id": "proc:sawmill:ironwood-plank",
        "method": "sawmill",
        "name": "Ironwood plank",
        "inputs": [
          {
            "id": 32907,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31435,
            "qty": 1
          }
        ],
        "coinCost": 5000
      },
      {
        "id": "proc:sawmill:rosewood-plank",
        "method": "sawmill",
        "name": "Rosewood plank",
        "inputs": [
          {
            "id": 32910,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31438,
            "qty": 1
          }
        ],
        "coinCost": 7500
      }
    ]
  },
  {
    "key": "plank-make",
    "title": "Plank Make",
    "description": "Cast Plank Make (Lunar) on logs; each cast converts one log into a plank for 70% of the sawmill fee.",
    "requirements": "86 Magic, Lunar spellbook, Dream Mentor",
    "actionsPerHour": 960,
    "source": "https://oldschool.runescape.wiki/w/Plank_Make",
    "recipes": [
      {
        "id": "proc:plank-make:plank",
        "method": "plank-make",
        "name": "Plank",
        "inputs": [
          {
            "id": 1511,
            "qty": 1
          },
          {
            "id": 9075,
            "qty": 2
          },
          {
            "id": 561,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 15
          }
        ],
        "outputs": [
          {
            "id": 960,
            "qty": 1
          }
        ],
        "coinCost": 70,
        "notes": "Earth runes are usually supplied by an earth/mud/dust/lava staff (then only 2 astral + 1 nature are consumed)."
      },
      {
        "id": "proc:plank-make:oak-plank",
        "method": "plank-make",
        "name": "Oak plank",
        "inputs": [
          {
            "id": 1521,
            "qty": 1
          },
          {
            "id": 9075,
            "qty": 2
          },
          {
            "id": 561,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 15
          }
        ],
        "outputs": [
          {
            "id": 8778,
            "qty": 1
          }
        ],
        "coinCost": 175,
        "notes": "Earth runes are usually supplied by an earth/mud/dust/lava staff (then only 2 astral + 1 nature are consumed)."
      },
      {
        "id": "proc:plank-make:teak-plank",
        "method": "plank-make",
        "name": "Teak plank",
        "inputs": [
          {
            "id": 6333,
            "qty": 1
          },
          {
            "id": 9075,
            "qty": 2
          },
          {
            "id": 561,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 15
          }
        ],
        "outputs": [
          {
            "id": 8780,
            "qty": 1
          }
        ],
        "coinCost": 350,
        "notes": "Earth runes are usually supplied by an earth/mud/dust/lava staff (then only 2 astral + 1 nature are consumed)."
      },
      {
        "id": "proc:plank-make:mahogany-plank",
        "method": "plank-make",
        "name": "Mahogany plank",
        "inputs": [
          {
            "id": 6332,
            "qty": 1
          },
          {
            "id": 9075,
            "qty": 2
          },
          {
            "id": 561,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 15
          }
        ],
        "outputs": [
          {
            "id": 8782,
            "qty": 1
          }
        ],
        "coinCost": 1050,
        "notes": "Earth runes are usually supplied by an earth/mud/dust/lava staff (then only 2 astral + 1 nature are consumed)."
      },
      {
        "id": "proc:plank-make:camphor-plank",
        "method": "plank-make",
        "name": "Camphor plank",
        "inputs": [
          {
            "id": 32904,
            "qty": 1
          },
          {
            "id": 9075,
            "qty": 2
          },
          {
            "id": 561,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 15
          }
        ],
        "outputs": [
          {
            "id": 31432,
            "qty": 1
          }
        ],
        "coinCost": 1750,
        "notes": "Earth runes are usually supplied by an earth/mud/dust/lava staff (then only 2 astral + 1 nature are consumed)."
      },
      {
        "id": "proc:plank-make:ironwood-plank",
        "method": "plank-make",
        "name": "Ironwood plank",
        "inputs": [
          {
            "id": 32907,
            "qty": 1
          },
          {
            "id": 9075,
            "qty": 2
          },
          {
            "id": 561,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 15
          }
        ],
        "outputs": [
          {
            "id": 31435,
            "qty": 1
          }
        ],
        "coinCost": 3500,
        "notes": "Earth runes are usually supplied by an earth/mud/dust/lava staff (then only 2 astral + 1 nature are consumed)."
      },
      {
        "id": "proc:plank-make:rosewood-plank",
        "method": "plank-make",
        "name": "Rosewood plank",
        "inputs": [
          {
            "id": 32910,
            "qty": 1
          },
          {
            "id": 9075,
            "qty": 2
          },
          {
            "id": 561,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 15
          }
        ],
        "outputs": [
          {
            "id": 31438,
            "qty": 1
          }
        ],
        "coinCost": 5250,
        "notes": "Earth runes are usually supplied by an earth/mud/dust/lava staff (then only 2 astral + 1 nature are consumed)."
      }
    ]
  },
  {
    "key": "enchant-bolts",
    "title": "Enchant bolts",
    "description": "Cast Enchant Crossbow Bolt (standard spellbook) on gem-tipped bolts; each cast enchants 10 bolts.",
    "requirements": "4-87 Magic depending on bolt (see recipe notes), standard spellbook, members",
    "actionsPerHour": null,
    "source": "https://oldschool.runescape.wiki/w/Enchant_Crossbow_Bolt",
    "recipes": [
      {
        "id": "proc:enchant-bolts:opal-bolts-e",
        "method": "enchant-bolts",
        "name": "Opal bolts (e)",
        "inputs": [
          {
            "id": 879,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 9236,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "4 Magic"
      },
      {
        "id": "proc:enchant-bolts:opal-dragon-bolts-e",
        "method": "enchant-bolts",
        "name": "Opal dragon bolts (e)",
        "inputs": [
          {
            "id": 21955,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 21932,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "4 Magic"
      },
      {
        "id": "proc:enchant-bolts:sapphire-bolts-e",
        "method": "enchant-bolts",
        "name": "Sapphire bolts (e)",
        "inputs": [
          {
            "id": 9337,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 1
          },
          {
            "id": 558,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 9240,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "7 Magic"
      },
      {
        "id": "proc:enchant-bolts:sapphire-dragon-bolts-e",
        "method": "enchant-bolts",
        "name": "Sapphire dragon bolts (e)",
        "inputs": [
          {
            "id": 21963,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 1
          },
          {
            "id": 558,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21940,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "7 Magic"
      },
      {
        "id": "proc:enchant-bolts:jade-dragon-bolts-e",
        "method": "enchant-bolts",
        "name": "Jade dragon bolts (e)",
        "inputs": [
          {
            "id": 21957,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 21934,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "14 Magic"
      },
      {
        "id": "proc:enchant-bolts:pearl-bolts-e",
        "method": "enchant-bolts",
        "name": "Pearl bolts (e)",
        "inputs": [
          {
            "id": 880,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 9238,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "24 Magic"
      },
      {
        "id": "proc:enchant-bolts:pearl-dragon-bolts-e",
        "method": "enchant-bolts",
        "name": "Pearl dragon bolts (e)",
        "inputs": [
          {
            "id": 21959,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 21936,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "24 Magic"
      },
      {
        "id": "proc:enchant-bolts:emerald-bolts-e",
        "method": "enchant-bolts",
        "name": "Emerald bolts (e)",
        "inputs": [
          {
            "id": 9338,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 3
          },
          {
            "id": 561,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 9241,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "27 Magic"
      },
      {
        "id": "proc:enchant-bolts:emerald-dragon-bolts-e",
        "method": "enchant-bolts",
        "name": "Emerald dragon bolts (e)",
        "inputs": [
          {
            "id": 21965,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 3
          },
          {
            "id": 561,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21942,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "27 Magic"
      },
      {
        "id": "proc:enchant-bolts:topaz-bolts-e",
        "method": "enchant-bolts",
        "name": "Topaz bolts (e)",
        "inputs": [
          {
            "id": 9336,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 9239,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "29 Magic"
      },
      {
        "id": "proc:enchant-bolts:topaz-dragon-bolts-e",
        "method": "enchant-bolts",
        "name": "Topaz dragon bolts (e)",
        "inputs": [
          {
            "id": 21961,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 21938,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "29 Magic"
      },
      {
        "id": "proc:enchant-bolts:ruby-bolts-e",
        "method": "enchant-bolts",
        "name": "Ruby bolts (e)",
        "inputs": [
          {
            "id": 9339,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 5
          },
          {
            "id": 565,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 9242,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "49 Magic"
      },
      {
        "id": "proc:enchant-bolts:ruby-dragon-bolts-e",
        "method": "enchant-bolts",
        "name": "Ruby dragon bolts (e)",
        "inputs": [
          {
            "id": 21967,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 5
          },
          {
            "id": 565,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21944,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "49 Magic"
      },
      {
        "id": "proc:enchant-bolts:diamond-bolts-e",
        "method": "enchant-bolts",
        "name": "Diamond bolts (e)",
        "inputs": [
          {
            "id": 9340,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 10
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 9243,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "57 Magic"
      },
      {
        "id": "proc:enchant-bolts:diamond-dragon-bolts-e",
        "method": "enchant-bolts",
        "name": "Diamond dragon bolts (e)",
        "inputs": [
          {
            "id": 21969,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 10
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 21946,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "57 Magic"
      },
      {
        "id": "proc:enchant-bolts:diamond-ascension-bolts-e",
        "method": "enchant-bolts",
        "name": "Diamond ascension bolts (e)",
        "inputs": [
          {
            "id": 34690,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 10
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 34696,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "57 Magic"
      },
      {
        "id": "proc:enchant-bolts:dragonstone-bolts-e",
        "method": "enchant-bolts",
        "name": "Dragonstone bolts (e)",
        "inputs": [
          {
            "id": 9341,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 15
          },
          {
            "id": 566,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 9244,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "68 Magic"
      },
      {
        "id": "proc:enchant-bolts:dragonstone-dragon-bolts-e",
        "method": "enchant-bolts",
        "name": "Dragonstone dragon bolts (e)",
        "inputs": [
          {
            "id": 21971,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 15
          },
          {
            "id": 566,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21948,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "68 Magic"
      },
      {
        "id": "proc:enchant-bolts:onyx-bolts-e",
        "method": "enchant-bolts",
        "name": "Onyx bolts (e)",
        "inputs": [
          {
            "id": 9342,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 20
          },
          {
            "id": 560,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 9245,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "87 Magic"
      },
      {
        "id": "proc:enchant-bolts:onyx-dragon-bolts-e",
        "method": "enchant-bolts",
        "name": "Onyx dragon bolts (e)",
        "inputs": [
          {
            "id": 21973,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 20
          },
          {
            "id": 560,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21950,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "87 Magic"
      },
      {
        "id": "proc:enchant-bolts:onyx-ascension-bolts-e",
        "method": "enchant-bolts",
        "name": "Onyx ascension bolts (e)",
        "inputs": [
          {
            "id": 34702,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 20
          },
          {
            "id": 560,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 34708,
            "qty": 10
          }
        ],
        "coinCost": 0,
        "notes": "87 Magic"
      }
    ]
  },
  {
    "key": "enchant-jewellery",
    "title": "Enchant jewellery",
    "description": "Cast Lvl-1 to Lvl-7 Enchant (standard spellbook) on unenchanted gem jewellery; one item per cast.",
    "requirements": "7-93 Magic depending on level (see notes), standard spellbook; members for most items",
    "actionsPerHour": 1600,
    "source": "https://oldschool.runescape.wiki/w/Enchantment_spells",
    "recipes": [
      {
        "id": "proc:enchant-jewellery:ring-of-recoil",
        "method": "enchant-jewellery",
        "name": "Ring of recoil",
        "inputs": [
          {
            "id": 1637,
            "qty": 1
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 2550,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-1 Enchant, 7 Magic"
      },
      {
        "id": "proc:enchant-jewellery:bracelet-of-clay",
        "method": "enchant-jewellery",
        "name": "Bracelet of clay",
        "inputs": [
          {
            "id": 11072,
            "qty": 1
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 11074,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-1 Enchant, 7 Magic"
      },
      {
        "id": "proc:enchant-jewellery:games-necklace-8",
        "method": "enchant-jewellery",
        "name": "Games necklace(8)",
        "inputs": [
          {
            "id": 1656,
            "qty": 1
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 3853,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-1 Enchant, 7 Magic; GE item is \"Games necklace(8)\" (wiki output page: Games necklace)"
      },
      {
        "id": "proc:enchant-jewellery:amulet-of-magic",
        "method": "enchant-jewellery",
        "name": "Amulet of magic",
        "inputs": [
          {
            "id": 1694,
            "qty": 1
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1727,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-1 Enchant, 7 Magic"
      },
      {
        "id": "proc:enchant-jewellery:ring-of-pursuit",
        "method": "enchant-jewellery",
        "name": "Ring of pursuit",
        "inputs": [
          {
            "id": 21081,
            "qty": 1
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21126,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-1 Enchant, 7 Magic"
      },
      {
        "id": "proc:enchant-jewellery:expeditious-bracelet",
        "method": "enchant-jewellery",
        "name": "Expeditious bracelet",
        "inputs": [
          {
            "id": 21117,
            "qty": 1
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21177,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-1 Enchant, 7 Magic"
      },
      {
        "id": "proc:enchant-jewellery:dodgy-necklace",
        "method": "enchant-jewellery",
        "name": "Dodgy necklace",
        "inputs": [
          {
            "id": 21090,
            "qty": 1
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21143,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-1 Enchant, 7 Magic"
      },
      {
        "id": "proc:enchant-jewellery:amulet-of-bounty",
        "method": "enchant-jewellery",
        "name": "Amulet of bounty",
        "inputs": [
          {
            "id": 21108,
            "qty": 1
          },
          {
            "id": 564,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21160,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-1 Enchant, 7 Magic"
      },
      {
        "id": "proc:enchant-jewellery:ring-of-dueling-8",
        "method": "enchant-jewellery",
        "name": "Ring of dueling(8)",
        "inputs": [
          {
            "id": 1639,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 3
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 2552,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-2 Enchant, 27 Magic; GE item is \"Ring of dueling(8)\" (wiki output page: Ring of dueling)"
      },
      {
        "id": "proc:enchant-jewellery:binding-necklace",
        "method": "enchant-jewellery",
        "name": "Binding necklace",
        "inputs": [
          {
            "id": 1658,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 3
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 5521,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-2 Enchant, 27 Magic"
      },
      {
        "id": "proc:enchant-jewellery:castle-wars-bracelet-3",
        "method": "enchant-jewellery",
        "name": "Castle wars bracelet(3)",
        "inputs": [
          {
            "id": 11076,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 3
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 11079,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-2 Enchant, 27 Magic; GE item is \"Castle wars bracelet(3)\" (wiki output page: Castle wars bracelet)"
      },
      {
        "id": "proc:enchant-jewellery:amulet-of-defence",
        "method": "enchant-jewellery",
        "name": "Amulet of defence",
        "inputs": [
          {
            "id": 1696,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 3
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1729,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-2 Enchant, 27 Magic"
      },
      {
        "id": "proc:enchant-jewellery:ring-of-returning-5",
        "method": "enchant-jewellery",
        "name": "Ring of returning(5)",
        "inputs": [
          {
            "id": 21084,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 3
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21129,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-2 Enchant, 27 Magic; GE item is \"Ring of returning(5)\" (wiki output page: Ring of returning)"
      },
      {
        "id": "proc:enchant-jewellery:flamtaer-bracelet",
        "method": "enchant-jewellery",
        "name": "Flamtaer bracelet",
        "inputs": [
          {
            "id": 21120,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 3
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21180,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-2 Enchant, 27 Magic"
      },
      {
        "id": "proc:enchant-jewellery:necklace-of-passage-5",
        "method": "enchant-jewellery",
        "name": "Necklace of passage(5)",
        "inputs": [
          {
            "id": 21093,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 3
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21146,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-2 Enchant, 27 Magic; GE item is \"Necklace of passage(5)\" (wiki output page: Necklace of passage)"
      },
      {
        "id": "proc:enchant-jewellery:amulet-of-chemistry",
        "method": "enchant-jewellery",
        "name": "Amulet of chemistry",
        "inputs": [
          {
            "id": 21111,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 3
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21163,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-2 Enchant, 27 Magic"
      },
      {
        "id": "proc:enchant-jewellery:ring-of-forging",
        "method": "enchant-jewellery",
        "name": "Ring of forging",
        "inputs": [
          {
            "id": 1641,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 5
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 2568,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-3 Enchant, 49 Magic"
      },
      {
        "id": "proc:enchant-jewellery:inoculation-bracelet",
        "method": "enchant-jewellery",
        "name": "Inoculation bracelet",
        "inputs": [
          {
            "id": 11085,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 5
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 11088,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-3 Enchant, 49 Magic"
      },
      {
        "id": "proc:enchant-jewellery:amulet-of-strength",
        "method": "enchant-jewellery",
        "name": "Amulet of strength",
        "inputs": [
          {
            "id": 1698,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 5
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1725,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-3 Enchant, 49 Magic"
      },
      {
        "id": "proc:enchant-jewellery:efaritay-s-aid",
        "method": "enchant-jewellery",
        "name": "Efaritay's aid",
        "inputs": [
          {
            "id": 21087,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 5
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21140,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-3 Enchant, 49 Magic"
      },
      {
        "id": "proc:enchant-jewellery:bracelet-of-slaughter",
        "method": "enchant-jewellery",
        "name": "Bracelet of slaughter",
        "inputs": [
          {
            "id": 21123,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 5
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21183,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-3 Enchant, 49 Magic"
      },
      {
        "id": "proc:enchant-jewellery:necklace-of-faith",
        "method": "enchant-jewellery",
        "name": "Necklace of faith",
        "inputs": [
          {
            "id": 21096,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 5
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21157,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-3 Enchant, 49 Magic"
      },
      {
        "id": "proc:enchant-jewellery:burning-amulet-5",
        "method": "enchant-jewellery",
        "name": "Burning amulet(5)",
        "inputs": [
          {
            "id": 21114,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 5
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 21166,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-3 Enchant, 49 Magic; GE item is \"Burning amulet(5)\" (wiki output page: Burning amulet)"
      },
      {
        "id": "proc:enchant-jewellery:ring-of-life",
        "method": "enchant-jewellery",
        "name": "Ring of life",
        "inputs": [
          {
            "id": 1643,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 2570,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-4 Enchant, 57 Magic"
      },
      {
        "id": "proc:enchant-jewellery:phoenix-necklace",
        "method": "enchant-jewellery",
        "name": "Phoenix necklace",
        "inputs": [
          {
            "id": 1662,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 11090,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-4 Enchant, 57 Magic"
      },
      {
        "id": "proc:enchant-jewellery:abyssal-bracelet-5",
        "method": "enchant-jewellery",
        "name": "Abyssal bracelet(5)",
        "inputs": [
          {
            "id": 11092,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 11095,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-4 Enchant, 57 Magic; GE item is \"Abyssal bracelet(5)\" (wiki output page: Abyssal bracelet)"
      },
      {
        "id": "proc:enchant-jewellery:amulet-of-power",
        "method": "enchant-jewellery",
        "name": "Amulet of power",
        "inputs": [
          {
            "id": 1700,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1731,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-4 Enchant, 57 Magic"
      },
      {
        "id": "proc:enchant-jewellery:ring-of-wealth",
        "method": "enchant-jewellery",
        "name": "Ring of wealth",
        "inputs": [
          {
            "id": 1645,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 15
          },
          {
            "id": 555,
            "qty": 15
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 2572,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-5 Enchant, 68 Magic; GE item is \"Ring of wealth\" (wiki output page: Ring of wealth (uncharged))"
      },
      {
        "id": "proc:enchant-jewellery:skills-necklace",
        "method": "enchant-jewellery",
        "name": "Skills necklace",
        "inputs": [
          {
            "id": 1664,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 15
          },
          {
            "id": 555,
            "qty": 15
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 11113,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-5 Enchant, 68 Magic; GE item is \"Skills necklace\" (wiki output page: Skills necklace (uncharged))"
      },
      {
        "id": "proc:enchant-jewellery:combat-bracelet",
        "method": "enchant-jewellery",
        "name": "Combat bracelet",
        "inputs": [
          {
            "id": 11115,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 15
          },
          {
            "id": 555,
            "qty": 15
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 11126,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-5 Enchant, 68 Magic; GE item is \"Combat bracelet\" (wiki output page: Combat bracelet (uncharged))"
      },
      {
        "id": "proc:enchant-jewellery:amulet-of-glory",
        "method": "enchant-jewellery",
        "name": "Amulet of glory",
        "inputs": [
          {
            "id": 1702,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 15
          },
          {
            "id": 555,
            "qty": 15
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1704,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-5 Enchant, 68 Magic; GE item is \"Amulet of glory\" (wiki output page: Amulet of glory (uncharged))"
      },
      {
        "id": "proc:enchant-jewellery:ring-of-stone",
        "method": "enchant-jewellery",
        "name": "Ring of stone",
        "inputs": [
          {
            "id": 6575,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 20
          },
          {
            "id": 554,
            "qty": 20
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 6583,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-6 Enchant, 87 Magic"
      },
      {
        "id": "proc:enchant-jewellery:berserker-necklace",
        "method": "enchant-jewellery",
        "name": "Berserker necklace",
        "inputs": [
          {
            "id": 6577,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 20
          },
          {
            "id": 554,
            "qty": 20
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 11128,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-6 Enchant, 87 Magic"
      },
      {
        "id": "proc:enchant-jewellery:regen-bracelet",
        "method": "enchant-jewellery",
        "name": "Regen bracelet",
        "inputs": [
          {
            "id": 11130,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 20
          },
          {
            "id": 554,
            "qty": 20
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 11133,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-6 Enchant, 87 Magic"
      },
      {
        "id": "proc:enchant-jewellery:amulet-of-fury",
        "method": "enchant-jewellery",
        "name": "Amulet of fury",
        "inputs": [
          {
            "id": 6581,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 20
          },
          {
            "id": 554,
            "qty": 20
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 6585,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-6 Enchant, 87 Magic"
      },
      {
        "id": "proc:enchant-jewellery:ring-of-suffering",
        "method": "enchant-jewellery",
        "name": "Ring of suffering",
        "inputs": [
          {
            "id": 19538,
            "qty": 1
          },
          {
            "id": 565,
            "qty": 20
          },
          {
            "id": 566,
            "qty": 20
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 19550,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-7 Enchant, 93 Magic"
      },
      {
        "id": "proc:enchant-jewellery:necklace-of-anguish",
        "method": "enchant-jewellery",
        "name": "Necklace of anguish",
        "inputs": [
          {
            "id": 19535,
            "qty": 1
          },
          {
            "id": 565,
            "qty": 20
          },
          {
            "id": 566,
            "qty": 20
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 19547,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-7 Enchant, 93 Magic"
      },
      {
        "id": "proc:enchant-jewellery:tormented-bracelet",
        "method": "enchant-jewellery",
        "name": "Tormented bracelet",
        "inputs": [
          {
            "id": 19532,
            "qty": 1
          },
          {
            "id": 565,
            "qty": 20
          },
          {
            "id": 566,
            "qty": 20
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 19544,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-7 Enchant, 93 Magic"
      },
      {
        "id": "proc:enchant-jewellery:amulet-of-torture",
        "method": "enchant-jewellery",
        "name": "Amulet of torture",
        "inputs": [
          {
            "id": 19541,
            "qty": 1
          },
          {
            "id": 565,
            "qty": 20
          },
          {
            "id": 566,
            "qty": 20
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 19553,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Lvl-7 Enchant, 93 Magic"
      }
    ]
  },
  {
    "key": "magic-tablets",
    "title": "Magic tablets",
    "description": "Make teleport/enchant/bones-to tablets at a lectern in your player-owned house study using soft clay plus the spell runes.",
    "requirements": "Lectern in POH study (Oak lectern 40 Construction up to Marble lectern 77; see notes), Magic level of the spell, standard spellbook (Marble lectern works from any spellbook)",
    "actionsPerHour": 1100,
    "source": "https://oldschool.runescape.wiki/w/Magic_tablet",
    "recipes": [
      {
        "id": "proc:magic-tablets:varrock-teleport-tablet",
        "method": "magic-tablets",
        "name": "Varrock teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 3
          },
          {
            "id": 554,
            "qty": 1
          },
          {
            "id": 563,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8007,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "25 Magic; lowest lectern: Oak lectern (40 Construction); also at: Oak lectern, Eagle lectern, Teak eagle lectern, Mahogany eagle lectern, Demon lectern, Teak demon lectern, Mahogany demon lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:lumbridge-teleport-tablet",
        "method": "magic-tablets",
        "name": "Lumbridge teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 3
          },
          {
            "id": 557,
            "qty": 1
          },
          {
            "id": 563,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8008,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "31 Magic; lowest lectern: Eagle lectern (47 Construction); also at: Eagle lectern, Teak eagle lectern, Mahogany eagle lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:falador-teleport-tablet",
        "method": "magic-tablets",
        "name": "Falador teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 3
          },
          {
            "id": 555,
            "qty": 1
          },
          {
            "id": 563,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8009,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "37 Magic; lowest lectern: Eagle lectern (47 Construction); also at: Eagle lectern, Teak eagle lectern, Mahogany eagle lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:camelot-teleport-tablet",
        "method": "magic-tablets",
        "name": "Camelot teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 5
          },
          {
            "id": 563,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8010,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "45 Magic; lowest lectern: Teak eagle lectern (57 Construction); also at: Teak eagle lectern, Mahogany eagle lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:kourend-castle-teleport-tablet",
        "method": "magic-tablets",
        "name": "Kourend castle teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 1
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 28790,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "48 Magic; lowest lectern: Teak eagle lectern (57 Construction); also at: Teak eagle lectern, Mahogany eagle lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:ardougne-teleport-tablet",
        "method": "magic-tablets",
        "name": "Ardougne teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 2
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 8011,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "51 Magic; lowest lectern: Teak eagle lectern (57 Construction); also at: Teak eagle lectern, Mahogany eagle lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:civitas-illa-fortis-teleport",
        "method": "magic-tablets",
        "name": "Civitas illa fortis teleport",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 1
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 28824,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "54 Magic; lowest lectern: Mahogany eagle lectern (67 Construction); also at: Mahogany eagle lectern, Marble lectern; GE name \"Civitas illa fortis teleport\" (wiki page \"Civitas illa fortis teleport (tablet)\")"
      },
      {
        "id": "proc:magic-tablets:watchtower-teleport-tablet",
        "method": "magic-tablets",
        "name": "Watchtower teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 2
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 8012,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "58 Magic; lowest lectern: Mahogany eagle lectern (67 Construction); also at: Mahogany eagle lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:teleport-to-house-tablet",
        "method": "magic-tablets",
        "name": "Teleport to house (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 1
          },
          {
            "id": 563,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8013,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "40 Magic; lowest lectern: Mahogany eagle lectern (67 Construction); also at: Mahogany eagle lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:summon-boat",
        "method": "magic-tablets",
        "name": "Summon boat",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 563,
            "qty": 2
          },
          {
            "id": 557,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31441,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "56 Magic; lowest lectern: Mahogany eagle lectern (67 Construction); also at: Mahogany eagle lectern, Marble lectern; GE name \"Summon boat\" (wiki page \"Summon boat (tablet)\")"
      },
      {
        "id": "proc:magic-tablets:teleport-to-boat",
        "method": "magic-tablets",
        "name": "Teleport to boat",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 563,
            "qty": 2
          },
          {
            "id": 557,
            "qty": 2
          },
          {
            "id": 555,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 31443,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "67 Magic; lowest lectern: Mahogany eagle lectern (67 Construction); also at: Mahogany eagle lectern, Marble lectern; GE name \"Teleport to boat\" (wiki page \"Teleport to boat (tablet)\")"
      },
      {
        "id": "proc:magic-tablets:enchant-sapphire-or-opal",
        "method": "magic-tablets",
        "name": "Enchant sapphire or opal",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 1
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8016,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "7 Magic; lowest lectern: Oak lectern (40 Construction); also at: Oak lectern, Eagle lectern, Teak eagle lectern, Mahogany eagle lectern, Demon lectern, Teak demon lectern, Mahogany demon lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:enchant-emerald-or-jade",
        "method": "magic-tablets",
        "name": "Enchant emerald or jade",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 3
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8017,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "27 Magic; lowest lectern: Demon lectern (47 Construction); also at: Demon lectern, Teak demon lectern, Mahogany demon lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:enchant-ruby-or-topaz",
        "method": "magic-tablets",
        "name": "Enchant ruby or topaz",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 5
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8018,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "49 Magic; lowest lectern: Teak demon lectern (57 Construction); also at: Teak demon lectern, Mahogany demon lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:enchant-diamond",
        "method": "magic-tablets",
        "name": "Enchant diamond",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 10
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8019,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "57 Magic; lowest lectern: Teak demon lectern (57 Construction); also at: Teak demon lectern, Mahogany demon lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:enchant-dragonstone",
        "method": "magic-tablets",
        "name": "Enchant dragonstone",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 15
          },
          {
            "id": 555,
            "qty": 15
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8020,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "68 Magic; lowest lectern: Mahogany demon lectern (67 Construction); also at: Mahogany demon lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:enchant-onyx",
        "method": "magic-tablets",
        "name": "Enchant onyx",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 20
          },
          {
            "id": 554,
            "qty": 20
          },
          {
            "id": 564,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8021,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "87 Magic; lowest lectern: Mahogany demon lectern (67 Construction); also at: Mahogany demon lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:bones-to-bananas-tablet",
        "method": "magic-tablets",
        "name": "Bones to bananas (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 2
          },
          {
            "id": 555,
            "qty": 2
          },
          {
            "id": 561,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 8014,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "15 Magic; lowest lectern: Demon lectern (47 Construction); also at: Demon lectern, Teak demon lectern, Mahogany demon lectern, Marble lectern"
      },
      {
        "id": "proc:magic-tablets:bones-to-peaches-tablet",
        "method": "magic-tablets",
        "name": "Bones to peaches (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 4
          },
          {
            "id": 555,
            "qty": 4
          },
          {
            "id": 561,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 8015,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "60 Magic; lowest lectern: Mahogany demon lectern (67 Construction); also at: Mahogany demon lectern, Marble lectern"
      }
    ]
  },
  {
    "key": "lunar-tablets",
    "title": "Lunar tablets",
    "description": "Make Lunar teleport tablets at the lectern in the ceremonial building on Lunar Isle using soft clay plus the spell runes.",
    "requirements": "69-89 Magic, Lunar spellbook, Lunar Diplomacy (Dream Mentor for some)",
    "actionsPerHour": 1100,
    "source": "https://oldschool.runescape.wiki/w/Lectern_(Lunar)",
    "recipes": [
      {
        "id": "proc:lunar-tablets:moonclan-teleport-tablet",
        "method": "lunar-tablets",
        "name": "Moonclan teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 2
          },
          {
            "id": 9075,
            "qty": 2
          },
          {
            "id": 563,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 24949,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "69 Magic"
      },
      {
        "id": "proc:lunar-tablets:ourania-teleport-tablet",
        "method": "lunar-tablets",
        "name": "Ourania teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 6
          },
          {
            "id": 9075,
            "qty": 2
          },
          {
            "id": 563,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 24951,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "71 Magic"
      },
      {
        "id": "proc:lunar-tablets:waterbirth-teleport-tablet",
        "method": "lunar-tablets",
        "name": "Waterbirth teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 1
          },
          {
            "id": 9075,
            "qty": 2
          },
          {
            "id": 563,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 24953,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "72 Magic"
      },
      {
        "id": "proc:lunar-tablets:barbarian-teleport-tablet",
        "method": "lunar-tablets",
        "name": "Barbarian teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 3
          },
          {
            "id": 9075,
            "qty": 2
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 24955,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "75 Magic"
      },
      {
        "id": "proc:lunar-tablets:khazard-teleport-tablet",
        "method": "lunar-tablets",
        "name": "Khazard teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 4
          },
          {
            "id": 9075,
            "qty": 2
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 24957,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "78 Magic"
      },
      {
        "id": "proc:lunar-tablets:fishing-guild-teleport-tablet",
        "method": "lunar-tablets",
        "name": "Fishing guild teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 10
          },
          {
            "id": 9075,
            "qty": 3
          },
          {
            "id": 563,
            "qty": 3
          }
        ],
        "outputs": [
          {
            "id": 24959,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "85 Magic"
      },
      {
        "id": "proc:lunar-tablets:catherby-teleport-tablet",
        "method": "lunar-tablets",
        "name": "Catherby teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 10
          },
          {
            "id": 9075,
            "qty": 3
          },
          {
            "id": 563,
            "qty": 3
          }
        ],
        "outputs": [
          {
            "id": 24961,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "87 Magic"
      },
      {
        "id": "proc:lunar-tablets:ice-plateau-teleport-tablet",
        "method": "lunar-tablets",
        "name": "Ice plateau teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 8
          },
          {
            "id": 9075,
            "qty": 3
          },
          {
            "id": 563,
            "qty": 3
          }
        ],
        "outputs": [
          {
            "id": 24963,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "89 Magic"
      }
    ]
  },
  {
    "key": "ancient-tablets",
    "title": "Ancient tablets",
    "description": "Make Ancient Magicks teleport tablets at the lectern by the altar in the Ancient Pyramid using soft clay plus the spell runes.",
    "requirements": "54-96 Magic, Ancient Magicks spellbook (Desert Treasure I)",
    "actionsPerHour": null,
    "source": "https://oldschool.runescape.wiki/w/Lectern_(Ancient)",
    "recipes": [
      {
        "id": "proc:ancient-tablets:paddewwa-teleport-tablet",
        "method": "ancient-tablets",
        "name": "Paddewwa teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 1
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 12781,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "54 Magic"
      },
      {
        "id": "proc:ancient-tablets:senntisten-teleport-tablet",
        "method": "ancient-tablets",
        "name": "Senntisten teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 566,
            "qty": 1
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 12782,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "60 Magic"
      },
      {
        "id": "proc:ancient-tablets:kharyrll-teleport-tablet",
        "method": "ancient-tablets",
        "name": "Kharyrll teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 565,
            "qty": 1
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 12779,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "66 Magic"
      },
      {
        "id": "proc:ancient-tablets:lassar-teleport-tablet",
        "method": "ancient-tablets",
        "name": "Lassar teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 4
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 12780,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "72 Magic"
      },
      {
        "id": "proc:ancient-tablets:dareeyak-teleport-tablet",
        "method": "ancient-tablets",
        "name": "Dareeyak teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 2
          },
          {
            "id": 554,
            "qty": 3
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 12777,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "78 Magic"
      },
      {
        "id": "proc:ancient-tablets:carrallanger-teleport-tablet",
        "method": "ancient-tablets",
        "name": "Carrallanger teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 566,
            "qty": 2
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 12776,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "84 Magic"
      },
      {
        "id": "proc:ancient-tablets:annakarl-teleport-tablet",
        "method": "ancient-tablets",
        "name": "Annakarl teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 565,
            "qty": 2
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 12775,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "90 Magic"
      },
      {
        "id": "proc:ancient-tablets:ghorrock-teleport-tablet",
        "method": "ancient-tablets",
        "name": "Ghorrock teleport (tablet)",
        "inputs": [
          {
            "id": 1761,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 8
          },
          {
            "id": 563,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 12778,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "96 Magic"
      }
    ]
  },
  {
    "key": "tanning",
    "title": "Tanning hides",
    "description": "Pay a tanner (e.g. Ellis in Al Kharid) a per-hide fee to turn unnoted hides into leather.",
    "requirements": "None (dragonhides members); Crafting Guild tanner needs 40 Crafting",
    "actionsPerHour": 3500,
    "source": "https://oldschool.runescape.wiki/w/Tanner",
    "recipes": [
      {
        "id": "proc:tanning:leather",
        "method": "tanning",
        "name": "Leather",
        "inputs": [
          {
            "id": 1739,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1741,
            "qty": 1
          }
        ],
        "coinCost": 1,
        "notes": "Standard tanner fee (Ellis/Al Kharid, Crafting Guild, Ranging Guild, etc.); Sbott/Chouani charge 2; Eodan 2 gp (diary-reduced)."
      },
      {
        "id": "proc:tanning:hard-leather",
        "method": "tanning",
        "name": "Hard leather",
        "inputs": [
          {
            "id": 1739,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1743,
            "qty": 1
          }
        ],
        "coinCost": 3,
        "notes": "Standard tanner fee (Ellis/Al Kharid, Crafting Guild, Ranging Guild, etc.); Sbott/Chouani charge 5; Eodan 6 gp (diary-reduced)."
      },
      {
        "id": "proc:tanning:snakeskin:6287",
        "method": "tanning",
        "name": "Snakeskin",
        "inputs": [
          {
            "id": 6287,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 6289,
            "qty": 1
          }
        ],
        "coinCost": 15,
        "notes": "Standard tanner fee (Ellis/Al Kharid, Crafting Guild, Ranging Guild, etc.); Sbott/Chouani charge 25; Eodan 30 gp (diary-reduced)."
      },
      {
        "id": "proc:tanning:snakeskin:7801",
        "method": "tanning",
        "name": "Snakeskin",
        "inputs": [
          {
            "id": 7801,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 6289,
            "qty": 1
          }
        ],
        "coinCost": 20,
        "notes": "Standard tanner fee (Ellis/Al Kharid, Crafting Guild, Ranging Guild, etc.); Sbott/Chouani charge 45; Eodan 40 gp (diary-reduced)."
      },
      {
        "id": "proc:tanning:green-dragon-leather",
        "method": "tanning",
        "name": "Green dragon leather",
        "inputs": [
          {
            "id": 1753,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1745,
            "qty": 1
          }
        ],
        "coinCost": 20,
        "notes": "Standard tanner fee (Ellis/Al Kharid, Crafting Guild, Ranging Guild, etc.); Sbott/Chouani charge 45; Eodan 40 gp (diary-reduced)."
      },
      {
        "id": "proc:tanning:blue-dragon-leather",
        "method": "tanning",
        "name": "Blue dragon leather",
        "inputs": [
          {
            "id": 1751,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 2505,
            "qty": 1
          }
        ],
        "coinCost": 20,
        "notes": "Standard tanner fee (Ellis/Al Kharid, Crafting Guild, Ranging Guild, etc.); Sbott/Chouani charge 45; Eodan 40 gp (diary-reduced)."
      },
      {
        "id": "proc:tanning:red-dragon-leather",
        "method": "tanning",
        "name": "Red dragon leather",
        "inputs": [
          {
            "id": 1749,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 2507,
            "qty": 1
          }
        ],
        "coinCost": 20,
        "notes": "Standard tanner fee (Ellis/Al Kharid, Crafting Guild, Ranging Guild, etc.); Sbott/Chouani charge 45; Eodan 40 gp (diary-reduced)."
      },
      {
        "id": "proc:tanning:black-dragon-leather",
        "method": "tanning",
        "name": "Black dragon leather",
        "inputs": [
          {
            "id": 1747,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 2509,
            "qty": 1
          }
        ],
        "coinCost": 20,
        "notes": "Standard tanner fee (Ellis/Al Kharid, Crafting Guild, Ranging Guild, etc.); Sbott/Chouani charge 45; Eodan 40 gp (diary-reduced)."
      }
    ]
  },
  {
    "key": "string-bows",
    "title": "Stringing bows",
    "description": "Use bow strings on unstrung (u) bows anywhere (no tools needed).",
    "requirements": "5-85 Fletching depending on bow; members",
    "actionsPerHour": 2400,
    "source": "https://oldschool.runescape.wiki/w/Bow_string",
    "recipes": [
      {
        "id": "proc:string-bows:shortbow",
        "method": "string-bows",
        "name": "Shortbow",
        "inputs": [
          {
            "id": 50,
            "qty": 1
          },
          {
            "id": 1777,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 841,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "5 Fletching"
      },
      {
        "id": "proc:string-bows:longbow",
        "method": "string-bows",
        "name": "Longbow",
        "inputs": [
          {
            "id": 48,
            "qty": 1
          },
          {
            "id": 1777,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 839,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "10 Fletching"
      },
      {
        "id": "proc:string-bows:oak-shortbow",
        "method": "string-bows",
        "name": "Oak shortbow",
        "inputs": [
          {
            "id": 54,
            "qty": 1
          },
          {
            "id": 1777,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 843,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "20 Fletching"
      },
      {
        "id": "proc:string-bows:oak-longbow",
        "method": "string-bows",
        "name": "Oak longbow",
        "inputs": [
          {
            "id": 56,
            "qty": 1
          },
          {
            "id": 1777,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 845,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "25 Fletching"
      },
      {
        "id": "proc:string-bows:willow-shortbow",
        "method": "string-bows",
        "name": "Willow shortbow",
        "inputs": [
          {
            "id": 60,
            "qty": 1
          },
          {
            "id": 1777,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 849,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "35 Fletching"
      },
      {
        "id": "proc:string-bows:willow-longbow",
        "method": "string-bows",
        "name": "Willow longbow",
        "inputs": [
          {
            "id": 58,
            "qty": 1
          },
          {
            "id": 1777,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 847,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "40 Fletching"
      },
      {
        "id": "proc:string-bows:maple-shortbow",
        "method": "string-bows",
        "name": "Maple shortbow",
        "inputs": [
          {
            "id": 64,
            "qty": 1
          },
          {
            "id": 1777,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 853,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "50 Fletching"
      },
      {
        "id": "proc:string-bows:maple-longbow",
        "method": "string-bows",
        "name": "Maple longbow",
        "inputs": [
          {
            "id": 62,
            "qty": 1
          },
          {
            "id": 1777,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 851,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "55 Fletching"
      },
      {
        "id": "proc:string-bows:yew-shortbow",
        "method": "string-bows",
        "name": "Yew shortbow",
        "inputs": [
          {
            "id": 68,
            "qty": 1
          },
          {
            "id": 1777,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 857,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "65 Fletching"
      },
      {
        "id": "proc:string-bows:yew-longbow",
        "method": "string-bows",
        "name": "Yew longbow",
        "inputs": [
          {
            "id": 66,
            "qty": 1
          },
          {
            "id": 1777,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 855,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "70 Fletching"
      },
      {
        "id": "proc:string-bows:magic-shortbow",
        "method": "string-bows",
        "name": "Magic shortbow",
        "inputs": [
          {
            "id": 72,
            "qty": 1
          },
          {
            "id": 1777,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 861,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "80 Fletching"
      },
      {
        "id": "proc:string-bows:magic-longbow",
        "method": "string-bows",
        "name": "Magic longbow",
        "inputs": [
          {
            "id": 70,
            "qty": 1
          },
          {
            "id": 1777,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 859,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "85 Fletching"
      }
    ]
  },
  {
    "key": "cut-gems",
    "title": "Cutting gems",
    "description": "Use a chisel on uncut gems anywhere.",
    "requirements": "1-89 Crafting depending on gem; most gems members",
    "actionsPerHour": 2780,
    "source": "https://oldschool.runescape.wiki/w/Crafting_training#Gem_cutting",
    "recipes": [
      {
        "id": "proc:cut-gems:opal",
        "method": "cut-gems",
        "name": "Opal",
        "inputs": [
          {
            "id": 1625,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1609,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "1 Crafting; chisel required (not consumed); semi-precious gems have a chance to be crushed into Crushed gem when cut below a certain level"
      },
      {
        "id": "proc:cut-gems:jade",
        "method": "cut-gems",
        "name": "Jade",
        "inputs": [
          {
            "id": 1627,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1611,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "13 Crafting; chisel required (not consumed); semi-precious gems have a chance to be crushed into Crushed gem when cut below a certain level"
      },
      {
        "id": "proc:cut-gems:red-topaz",
        "method": "cut-gems",
        "name": "Red topaz",
        "inputs": [
          {
            "id": 1629,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1613,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "16 Crafting; chisel required (not consumed); semi-precious gems have a chance to be crushed into Crushed gem when cut below a certain level"
      },
      {
        "id": "proc:cut-gems:sapphire",
        "method": "cut-gems",
        "name": "Sapphire",
        "inputs": [
          {
            "id": 1623,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1607,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "20 Crafting; chisel required (not consumed)"
      },
      {
        "id": "proc:cut-gems:emerald",
        "method": "cut-gems",
        "name": "Emerald",
        "inputs": [
          {
            "id": 1621,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1605,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "27 Crafting; chisel required (not consumed)"
      },
      {
        "id": "proc:cut-gems:ruby",
        "method": "cut-gems",
        "name": "Ruby",
        "inputs": [
          {
            "id": 1619,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1603,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "34 Crafting; chisel required (not consumed)"
      },
      {
        "id": "proc:cut-gems:diamond",
        "method": "cut-gems",
        "name": "Diamond",
        "inputs": [
          {
            "id": 1617,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1601,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "43 Crafting; chisel required (not consumed)"
      },
      {
        "id": "proc:cut-gems:dragonstone",
        "method": "cut-gems",
        "name": "Dragonstone",
        "inputs": [
          {
            "id": 1631,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1615,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "55 Crafting; chisel required (not consumed)"
      },
      {
        "id": "proc:cut-gems:onyx",
        "method": "cut-gems",
        "name": "Onyx",
        "inputs": [
          {
            "id": 6571,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 6573,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "67 Crafting; chisel required (not consumed)"
      },
      {
        "id": "proc:cut-gems:zenyte",
        "method": "cut-gems",
        "name": "Zenyte",
        "inputs": [
          {
            "id": 19496,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 19493,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "89 Crafting; chisel required (not consumed)"
      }
    ]
  },
  {
    "key": "battlestaves",
    "title": "Battlestaves",
    "description": "Attach an elemental orb to a battlestaff anywhere.",
    "requirements": "54-66 Crafting depending on element; members",
    "actionsPerHour": 2450,
    "source": "https://oldschool.runescape.wiki/w/Battlestaff",
    "recipes": [
      {
        "id": "proc:battlestaves:water-battlestaff",
        "method": "battlestaves",
        "name": "Water battlestaff",
        "inputs": [
          {
            "id": 571,
            "qty": 1
          },
          {
            "id": 1391,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1395,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "54 Crafting"
      },
      {
        "id": "proc:battlestaves:earth-battlestaff",
        "method": "battlestaves",
        "name": "Earth battlestaff",
        "inputs": [
          {
            "id": 575,
            "qty": 1
          },
          {
            "id": 1391,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1399,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "58 Crafting"
      },
      {
        "id": "proc:battlestaves:fire-battlestaff",
        "method": "battlestaves",
        "name": "Fire battlestaff",
        "inputs": [
          {
            "id": 569,
            "qty": 1
          },
          {
            "id": 1391,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1393,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "62 Crafting"
      },
      {
        "id": "proc:battlestaves:air-battlestaff",
        "method": "battlestaves",
        "name": "Air battlestaff",
        "inputs": [
          {
            "id": 573,
            "qty": 1
          },
          {
            "id": 1391,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1397,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "66 Crafting"
      }
    ]
  },
  {
    "key": "mystic-staves",
    "title": "Mystic staves",
    "description": "Pay Thormac (Sorcerer's Tower, south of Seers' Village) to upgrade an elemental battlestaff into a mystic staff.",
    "requirements": "Scorpion Catcher; members",
    "actionsPerHour": null,
    "source": "https://oldschool.runescape.wiki/w/Thormac",
    "recipes": [
      {
        "id": "proc:mystic-staves:mystic-water-staff",
        "method": "mystic-staves",
        "name": "Mystic water staff",
        "inputs": [
          {
            "id": 1395,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1403,
            "qty": 1
          }
        ],
        "coinCost": 40000,
        "notes": "Fee without diary; reduced fees: 30000 (Hard Kandarin Diary), 20000 (Elite Kandarin Diary)"
      },
      {
        "id": "proc:mystic-staves:mystic-earth-staff",
        "method": "mystic-staves",
        "name": "Mystic earth staff",
        "inputs": [
          {
            "id": 1399,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1407,
            "qty": 1
          }
        ],
        "coinCost": 40000,
        "notes": "Fee without diary; reduced fees: 30000 (Hard Kandarin Diary), 20000 (Elite Kandarin Diary)"
      },
      {
        "id": "proc:mystic-staves:mystic-fire-staff",
        "method": "mystic-staves",
        "name": "Mystic fire staff",
        "inputs": [
          {
            "id": 1393,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1401,
            "qty": 1
          }
        ],
        "coinCost": 40000,
        "notes": "Fee without diary; reduced fees: 30000 (Hard Kandarin Diary), 20000 (Elite Kandarin Diary)"
      },
      {
        "id": "proc:mystic-staves:mystic-air-staff",
        "method": "mystic-staves",
        "name": "Mystic air staff",
        "inputs": [
          {
            "id": 1397,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1405,
            "qty": 1
          }
        ],
        "coinCost": 40000,
        "notes": "Fee without diary; reduced fees: 30000 (Hard Kandarin Diary), 20000 (Elite Kandarin Diary)"
      }
    ]
  },
  {
    "key": "smelting",
    "title": "Smelting bars",
    "description": "Smelt ores (plus coal where needed) into bars at any furnace.",
    "requirements": "1-85 Smithing depending on bar; most bars members",
    "actionsPerHour": null,
    "source": "https://oldschool.runescape.wiki/w/Furnace",
    "recipes": [
      {
        "id": "proc:smelting:bronze-bar",
        "method": "smelting",
        "name": "Bronze bar",
        "inputs": [
          {
            "id": 436,
            "qty": 1
          },
          {
            "id": 438,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 2349,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "1 Smithing; any furnace; wiki MMG rate 800 bars/hr"
      },
      {
        "id": "proc:smelting:iron-bar",
        "method": "smelting",
        "name": "Iron bar",
        "inputs": [
          {
            "id": 440,
            "qty": 1
          },
          {
            "id": 2568,
            "qty": 0.007143
          }
        ],
        "outputs": [
          {
            "id": 2351,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "15 Smithing; any furnace; 50% success without a Ring of forging (ring guarantees success, 140 charges) - modelled as 1/140 ring per bar; wiki MMG rate 980 bars/hr"
      },
      {
        "id": "proc:smelting:silver-bar",
        "method": "smelting",
        "name": "Silver bar",
        "inputs": [
          {
            "id": 442,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 2355,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "20 Smithing; any furnace; wiki MMG rate 980 bars/hr"
      },
      {
        "id": "proc:smelting:steel-bar",
        "method": "smelting",
        "name": "Steel bar",
        "inputs": [
          {
            "id": 440,
            "qty": 1
          },
          {
            "id": 453,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 2353,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "30 Smithing; any furnace; wiki MMG rate 775 bars/hr"
      },
      {
        "id": "proc:smelting:gold-bar",
        "method": "smelting",
        "name": "Gold bar",
        "inputs": [
          {
            "id": 444,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 2357,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "40 Smithing; any furnace; Goldsmith gauntlets only affect XP"
      },
      {
        "id": "proc:smelting:mithril-bar",
        "method": "smelting",
        "name": "Mithril bar",
        "inputs": [
          {
            "id": 447,
            "qty": 1
          },
          {
            "id": 453,
            "qty": 4
          }
        ],
        "outputs": [
          {
            "id": 2359,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "50 Smithing; any furnace"
      },
      {
        "id": "proc:smelting:adamantite-bar",
        "method": "smelting",
        "name": "Adamantite bar",
        "inputs": [
          {
            "id": 449,
            "qty": 1
          },
          {
            "id": 453,
            "qty": 6
          }
        ],
        "outputs": [
          {
            "id": 2361,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "70 Smithing; any furnace"
      },
      {
        "id": "proc:smelting:runite-bar",
        "method": "smelting",
        "name": "Runite bar",
        "inputs": [
          {
            "id": 451,
            "qty": 1
          },
          {
            "id": 453,
            "qty": 8
          }
        ],
        "outputs": [
          {
            "id": 2363,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "85 Smithing; any furnace; wiki MMG rate 400 bars/hr"
      },
      {
        "id": "proc:smelting:lead-bar",
        "method": "smelting",
        "name": "Lead bar",
        "inputs": [
          {
            "id": 31716,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 32889,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "25 Smithing; any furnace; added with Sailing (Nov 2025)"
      },
      {
        "id": "proc:smelting:cupronickel-bar",
        "method": "smelting",
        "name": "Cupronickel bar",
        "inputs": [
          {
            "id": 436,
            "qty": 2
          },
          {
            "id": 31719,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 32892,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "74 Smithing; any furnace; added with Sailing (Nov 2025)"
      }
    ]
  },
  {
    "key": "dhide-armour",
    "title": "D'hide armour",
    "description": "Use a needle and thread on dragon leather to craft d'hide vambraces, chaps and bodies.",
    "requirements": "57-84 Crafting depending on piece; members",
    "actionsPerHour": 1685,
    "source": "https://oldschool.runescape.wiki/w/Crafting_training#Dragonhide",
    "recipes": [
      {
        "id": "proc:dhide-armour:green-d-hide-vambraces",
        "method": "dhide-armour",
        "name": "Green d'hide vambraces",
        "inputs": [
          {
            "id": 1745,
            "qty": 1
          },
          {
            "id": 1734,
            "qty": 0.2
          }
        ],
        "outputs": [
          {
            "id": 1065,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "57 Crafting; needle (not consumed); thread has 5 uses so 0.2 thread per item; a Costume needle (Death on the Isle) removes thread"
      },
      {
        "id": "proc:dhide-armour:green-d-hide-chaps",
        "method": "dhide-armour",
        "name": "Green d'hide chaps",
        "inputs": [
          {
            "id": 1745,
            "qty": 2
          },
          {
            "id": 1734,
            "qty": 0.2
          }
        ],
        "outputs": [
          {
            "id": 1099,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "60 Crafting; needle (not consumed); thread has 5 uses so 0.2 thread per item; a Costume needle (Death on the Isle) removes thread"
      },
      {
        "id": "proc:dhide-armour:green-d-hide-body",
        "method": "dhide-armour",
        "name": "Green d'hide body",
        "inputs": [
          {
            "id": 1745,
            "qty": 3
          },
          {
            "id": 1734,
            "qty": 0.2
          }
        ],
        "outputs": [
          {
            "id": 1135,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "63 Crafting; needle (not consumed); thread has 5 uses so 0.2 thread per item; a Costume needle (Death on the Isle) removes thread"
      },
      {
        "id": "proc:dhide-armour:blue-d-hide-vambraces",
        "method": "dhide-armour",
        "name": "Blue d'hide vambraces",
        "inputs": [
          {
            "id": 2505,
            "qty": 1
          },
          {
            "id": 1734,
            "qty": 0.2
          }
        ],
        "outputs": [
          {
            "id": 2487,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "66 Crafting; needle (not consumed); thread has 5 uses so 0.2 thread per item; a Costume needle (Death on the Isle) removes thread"
      },
      {
        "id": "proc:dhide-armour:blue-d-hide-chaps",
        "method": "dhide-armour",
        "name": "Blue d'hide chaps",
        "inputs": [
          {
            "id": 2505,
            "qty": 2
          },
          {
            "id": 1734,
            "qty": 0.2
          }
        ],
        "outputs": [
          {
            "id": 2493,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "68 Crafting; needle (not consumed); thread has 5 uses so 0.2 thread per item; a Costume needle (Death on the Isle) removes thread"
      },
      {
        "id": "proc:dhide-armour:blue-d-hide-body",
        "method": "dhide-armour",
        "name": "Blue d'hide body",
        "inputs": [
          {
            "id": 2505,
            "qty": 3
          },
          {
            "id": 1734,
            "qty": 0.2
          }
        ],
        "outputs": [
          {
            "id": 2499,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "71 Crafting; needle (not consumed); thread has 5 uses so 0.2 thread per item; a Costume needle (Death on the Isle) removes thread"
      },
      {
        "id": "proc:dhide-armour:red-d-hide-vambraces",
        "method": "dhide-armour",
        "name": "Red d'hide vambraces",
        "inputs": [
          {
            "id": 2507,
            "qty": 1
          },
          {
            "id": 1734,
            "qty": 0.2
          }
        ],
        "outputs": [
          {
            "id": 2489,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "73 Crafting; needle (not consumed); thread has 5 uses so 0.2 thread per item; a Costume needle (Death on the Isle) removes thread"
      },
      {
        "id": "proc:dhide-armour:red-d-hide-chaps",
        "method": "dhide-armour",
        "name": "Red d'hide chaps",
        "inputs": [
          {
            "id": 2507,
            "qty": 2
          },
          {
            "id": 1734,
            "qty": 0.2
          }
        ],
        "outputs": [
          {
            "id": 2495,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "75 Crafting; needle (not consumed); thread has 5 uses so 0.2 thread per item; a Costume needle (Death on the Isle) removes thread"
      },
      {
        "id": "proc:dhide-armour:red-d-hide-body",
        "method": "dhide-armour",
        "name": "Red d'hide body",
        "inputs": [
          {
            "id": 2507,
            "qty": 3
          },
          {
            "id": 1734,
            "qty": 0.2
          }
        ],
        "outputs": [
          {
            "id": 2501,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "77 Crafting; needle (not consumed); thread has 5 uses so 0.2 thread per item; a Costume needle (Death on the Isle) removes thread"
      },
      {
        "id": "proc:dhide-armour:black-d-hide-vambraces",
        "method": "dhide-armour",
        "name": "Black d'hide vambraces",
        "inputs": [
          {
            "id": 2509,
            "qty": 1
          },
          {
            "id": 1734,
            "qty": 0.2
          }
        ],
        "outputs": [
          {
            "id": 2491,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "79 Crafting; needle (not consumed); thread has 5 uses so 0.2 thread per item; a Costume needle (Death on the Isle) removes thread"
      },
      {
        "id": "proc:dhide-armour:black-d-hide-chaps",
        "method": "dhide-armour",
        "name": "Black d'hide chaps",
        "inputs": [
          {
            "id": 2509,
            "qty": 2
          },
          {
            "id": 1734,
            "qty": 0.2
          }
        ],
        "outputs": [
          {
            "id": 2497,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "82 Crafting; needle (not consumed); thread has 5 uses so 0.2 thread per item; a Costume needle (Death on the Isle) removes thread"
      },
      {
        "id": "proc:dhide-armour:black-d-hide-body",
        "method": "dhide-armour",
        "name": "Black d'hide body",
        "inputs": [
          {
            "id": 2509,
            "qty": 3
          },
          {
            "id": 1734,
            "qty": 0.2
          }
        ],
        "outputs": [
          {
            "id": 2503,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "84 Crafting; needle (not consumed); thread has 5 uses so 0.2 thread per item; a Costume needle (Death on the Isle) removes thread"
      }
    ]
  },
  {
    "key": "repair-kits",
    "title": "Boat repair kits",
    "description": "Build boat repair kits at a Shipwrights' Workbench from planks, nails and swamp paste (basic kits can be made anywhere). Oak through camphor make 2 kits from 2 planks; ironwood and rosewood make 3 kits from 1 plank.",
    "requirements": "Members; Construction 1/19/30/47/66/80/92 by tier; hammer and saw; Shipwrights' Workbench for oak and above (closest bank: Red Rock, 52 Sailing; Port Khazard, 30 Sailing)",
    "actionsPerHour": null,
    "source": "https://oldschool.runescape.wiki/w/Repair_kits",
    "recipes": [
      {
        "id": "proc:repair-kits:repair-kit",
        "method": "repair-kits",
        "name": "Repair kit",
        "inputs": [
          {
            "id": 960,
            "qty": 2
          },
          {
            "id": 4819,
            "qty": 10
          },
          {
            "id": 1941,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 31964,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "1 Construction; tools: Hammer, Saw; 4 ticks/action; no workbench needed (use items together), 2 kits only after Pandemonium"
      },
      {
        "id": "proc:repair-kits:oak-repair-kit",
        "method": "repair-kits",
        "name": "Oak repair kit",
        "inputs": [
          {
            "id": 8778,
            "qty": 2
          },
          {
            "id": 4820,
            "qty": 10
          },
          {
            "id": 1941,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 31967,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "19 Construction; at Shipwrights' Workbench; tools: Hammer, Saw; 4 ticks/action"
      },
      {
        "id": "proc:repair-kits:teak-repair-kit",
        "method": "repair-kits",
        "name": "Teak repair kit",
        "inputs": [
          {
            "id": 8780,
            "qty": 2
          },
          {
            "id": 1539,
            "qty": 10
          },
          {
            "id": 1941,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 31970,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "30 Construction; at Shipwrights' Workbench; tools: Hammer, Saw; 4 ticks/action"
      },
      {
        "id": "proc:repair-kits:mahogany-repair-kit",
        "method": "repair-kits",
        "name": "Mahogany repair kit",
        "inputs": [
          {
            "id": 8782,
            "qty": 2
          },
          {
            "id": 4822,
            "qty": 10
          },
          {
            "id": 1941,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 31973,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "47 Construction; at Shipwrights' Workbench; tools: Hammer, Saw; 4 ticks/action"
      },
      {
        "id": "proc:repair-kits:camphor-repair-kit",
        "method": "repair-kits",
        "name": "Camphor repair kit",
        "inputs": [
          {
            "id": 31432,
            "qty": 2
          },
          {
            "id": 4823,
            "qty": 10
          },
          {
            "id": 1941,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 31976,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "66 Construction; at Shipwrights' Workbench; tools: Hammer, Saw; 4 ticks/action"
      },
      {
        "id": "proc:repair-kits:ironwood-repair-kit",
        "method": "repair-kits",
        "name": "Ironwood repair kit",
        "inputs": [
          {
            "id": 31435,
            "qty": 1
          },
          {
            "id": 4824,
            "qty": 10
          },
          {
            "id": 1941,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 31979,
            "qty": 3
          }
        ],
        "coinCost": 0,
        "notes": "80 Construction; at Shipwrights' Workbench; tools: Hammer, Saw; 4 ticks/action"
      },
      {
        "id": "proc:repair-kits:rosewood-repair-kit",
        "method": "repair-kits",
        "name": "Rosewood repair kit",
        "inputs": [
          {
            "id": 31438,
            "qty": 1
          },
          {
            "id": 31406,
            "qty": 5
          },
          {
            "id": 1941,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 31982,
            "qty": 3
          }
        ],
        "coinCost": 0,
        "notes": "92 Construction; at Shipwrights' Workbench; tools: Hammer, Saw; 4 ticks/action"
      }
    ]
  },
  {
    "key": "hull-parts",
    "title": "Hull and keel parts",
    "description": "Shipbuilding components for Sailing. Hull parts: 5 planks at a Shipwrights' Workbench; large hull parts: 5 hull parts. Keel parts: 5 metal bars at an anvil; large keel parts: 5 keel parts. Dragon keel parts use 2 dragon metal sheets at the Dragon forge (large: 2 dragon keel parts).",
    "requirements": "Members; Construction 1-84 (hull) or Smithing 10-94 (keel); hammer (and saw for hull parts); keel parts require Pandemonium, dragon keel parts also Dragon Slayer II",
    "actionsPerHour": null,
    "source": "https://oldschool.runescape.wiki/w/Hull_parts",
    "recipes": [
      {
        "id": "proc:hull-parts:wooden-hull-parts",
        "method": "hull-parts",
        "name": "Wooden hull parts",
        "inputs": [
          {
            "id": 960,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32041,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "1 Construction; at Shipwrights' Workbench; tools: Saw, Hammer; 4 ticks/action"
      },
      {
        "id": "proc:hull-parts:large-wooden-hull-parts",
        "method": "hull-parts",
        "name": "Large wooden hull parts",
        "inputs": [
          {
            "id": 32041,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32062,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "1 Construction; at Shipwrights' Workbench; tools: Saw, Hammer; 5 ticks/action"
      },
      {
        "id": "proc:hull-parts:oak-hull-parts",
        "method": "hull-parts",
        "name": "Oak hull parts",
        "inputs": [
          {
            "id": 8778,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32044,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "8 Construction; at Shipwrights' Workbench; tools: Saw, Hammer; 4 ticks/action"
      },
      {
        "id": "proc:hull-parts:large-oak-hull-parts",
        "method": "hull-parts",
        "name": "Large oak hull parts",
        "inputs": [
          {
            "id": 32044,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32065,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "8 Construction; at Shipwrights' Workbench; tools: Saw, Hammer; 5 ticks/action"
      },
      {
        "id": "proc:hull-parts:teak-hull-parts",
        "method": "hull-parts",
        "name": "Teak hull parts",
        "inputs": [
          {
            "id": 8780,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32047,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "23 Construction; at Shipwrights' Workbench; tools: Saw, Hammer; 4 ticks/action"
      },
      {
        "id": "proc:hull-parts:large-teak-hull-parts",
        "method": "hull-parts",
        "name": "Large teak hull parts",
        "inputs": [
          {
            "id": 32047,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32068,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "23 Construction; at Shipwright's Workbench; tools: Saw, Hammer; 5 ticks/action"
      },
      {
        "id": "proc:hull-parts:mahogany-hull-parts",
        "method": "hull-parts",
        "name": "Mahogany hull parts",
        "inputs": [
          {
            "id": 8782,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32050,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "41 Construction; at Shipwrights' Workbench; tools: Saw, Hammer; 4 ticks/action"
      },
      {
        "id": "proc:hull-parts:large-mahogany-hull-parts",
        "method": "hull-parts",
        "name": "Large mahogany hull parts",
        "inputs": [
          {
            "id": 32050,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32071,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "41 Construction; at Shipwrights' Workbench; tools: Saw, Hammer; 5 ticks/action"
      },
      {
        "id": "proc:hull-parts:camphor-hull-parts",
        "method": "hull-parts",
        "name": "Camphor hull parts",
        "inputs": [
          {
            "id": 31432,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32053,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "53 Construction; at Shipwrights' Workbench; tools: Saw, Hammer; 4 ticks/action"
      },
      {
        "id": "proc:hull-parts:large-camphor-hull-parts",
        "method": "hull-parts",
        "name": "Large camphor hull parts",
        "inputs": [
          {
            "id": 32053,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32074,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "53 Construction; at Shipwrights' Workbench; tools: Saw, Hammer; 5 ticks/action"
      },
      {
        "id": "proc:hull-parts:ironwood-hull-parts",
        "method": "hull-parts",
        "name": "Ironwood hull parts",
        "inputs": [
          {
            "id": 31435,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32056,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "75 Construction; at Shipwrights' Workbench; tools: Saw, Hammer; 4 ticks/action"
      },
      {
        "id": "proc:hull-parts:large-ironwood-hull-parts",
        "method": "hull-parts",
        "name": "Large ironwood hull parts",
        "inputs": [
          {
            "id": 32056,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32077,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "75 Construction; at Shipwrights' Workbench; tools: Saw, Hammer; 5 ticks/action"
      },
      {
        "id": "proc:hull-parts:rosewood-hull-parts",
        "method": "hull-parts",
        "name": "Rosewood hull parts",
        "inputs": [
          {
            "id": 31438,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32059,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "84 Construction; at Shipwrights' Workbench; tools: Saw, Hammer; 4 ticks/action"
      },
      {
        "id": "proc:hull-parts:large-rosewood-hull-parts",
        "method": "hull-parts",
        "name": "Large rosewood hull parts",
        "inputs": [
          {
            "id": 32059,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32080,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "84 Construction; at Shipwrights' Workbench; tools: Saw, Hammer; 5 ticks/action"
      },
      {
        "id": "proc:hull-parts:bronze-keel-parts",
        "method": "hull-parts",
        "name": "Bronze keel parts",
        "inputs": [
          {
            "id": 2349,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 31999,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "10 Smithing; at Anvil; tools: Hammer; 5 ticks/action; requires completion of Pandemonium"
      },
      {
        "id": "proc:hull-parts:large-bronze-keel-parts",
        "method": "hull-parts",
        "name": "Large bronze keel parts",
        "inputs": [
          {
            "id": 31999,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32020,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "10 Smithing; at Anvil; tools: Hammer; 5 ticks/action; requires completion of Pandemonium"
      },
      {
        "id": "proc:hull-parts:iron-keel-parts",
        "method": "hull-parts",
        "name": "Iron keel parts",
        "inputs": [
          {
            "id": 2351,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32002,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "22 Smithing; at Anvil; tools: Hammer; 5 ticks/action; requires completion of Pandemonium"
      },
      {
        "id": "proc:hull-parts:large-iron-keel-parts",
        "method": "hull-parts",
        "name": "Large iron keel parts",
        "inputs": [
          {
            "id": 32002,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32023,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "22 Smithing; at Anvil; tools: Hammer; 5 ticks/action; requires completion of Pandemonium"
      },
      {
        "id": "proc:hull-parts:steel-keel-parts",
        "method": "hull-parts",
        "name": "Steel keel parts",
        "inputs": [
          {
            "id": 2353,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32005,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "38 Smithing; at Anvil; tools: Hammer; 5 ticks/action; requires completion of Pandemonium"
      },
      {
        "id": "proc:hull-parts:large-steel-keel-parts",
        "method": "hull-parts",
        "name": "Large steel keel parts",
        "inputs": [
          {
            "id": 32005,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32026,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "38 Smithing; at Anvil; tools: Hammer; 5 ticks/action; requires completion of Pandemonium"
      },
      {
        "id": "proc:hull-parts:mithril-keel-parts",
        "method": "hull-parts",
        "name": "Mithril keel parts",
        "inputs": [
          {
            "id": 2359,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32008,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "56 Smithing; at Anvil; tools: Hammer; 5 ticks/action; requires completion of Pandemonium"
      },
      {
        "id": "proc:hull-parts:large-mithril-keel-parts",
        "method": "hull-parts",
        "name": "Large mithril keel parts",
        "inputs": [
          {
            "id": 32008,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32029,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "56 Smithing; at Anvil; tools: Hammer; 5 ticks/action; requires completion of Pandemonium"
      },
      {
        "id": "proc:hull-parts:adamant-keel-parts",
        "method": "hull-parts",
        "name": "Adamant keel parts",
        "inputs": [
          {
            "id": 2361,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32011,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "74 Smithing; at Anvil; tools: Hammer; 5 ticks/action; requires completion of Pandemonium"
      },
      {
        "id": "proc:hull-parts:large-adamant-keel-parts",
        "method": "hull-parts",
        "name": "Large adamant keel parts",
        "inputs": [
          {
            "id": 32011,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32032,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "74 Smithing; at Anvil; tools: Hammer; 5 ticks/action; requires completion of Pandemonium"
      },
      {
        "id": "proc:hull-parts:rune-keel-parts",
        "method": "hull-parts",
        "name": "Rune keel parts",
        "inputs": [
          {
            "id": 2363,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32014,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "86 Smithing; at Anvil; tools: Hammer; 5 ticks/action; requires completion of Pandemonium"
      },
      {
        "id": "proc:hull-parts:large-rune-keel-parts",
        "method": "hull-parts",
        "name": "Large rune keel parts",
        "inputs": [
          {
            "id": 32014,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 32035,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "86 Smithing; at Anvil; tools: Hammer; 5 ticks/action; requires completion of Pandemonium"
      },
      {
        "id": "proc:hull-parts:dragon-keel-parts",
        "method": "hull-parts",
        "name": "Dragon keel parts",
        "inputs": [
          {
            "id": 31996,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 32017,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "94 Smithing; at Dragon forge; tools: Hammer; 4 ticks/action; requires completion of Pandemonium and Dragon Slayer II"
      },
      {
        "id": "proc:hull-parts:large-dragon-keel-parts",
        "method": "hull-parts",
        "name": "Large dragon keel parts",
        "inputs": [
          {
            "id": 32017,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 32038,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "94 Smithing; at Dragon forge; tools: Hammer; 4 ticks/action; requires completion of Pandemonium and Dragon Slayer II"
      }
    ]
  },
  {
    "key": "cannonballs",
    "title": "Cannonballs",
    "description": "Smelt bars into cannonballs at a furnace with an ammo mould (4 per bar), then optionally combine 2 cannonballs with a chain or 10 rubium splinters at an anvil for 2 chainshot or 2 incendiary cannonballs.",
    "requirements": "Members; Dwarf Cannon (partial) for cannonballs; Pandemonium for chainshot/incendiary; Smithing 5/20/35/55/75/90 for bronze/iron/steel/mithril/adamant/rune",
    "actionsPerHour": 600,
    "source": "https://oldschool.runescape.wiki/w/Cannonball",
    "recipes": [
      {
        "id": "proc:cannonballs:bronze-cannonball",
        "method": "cannonballs",
        "name": "Bronze cannonball",
        "inputs": [
          {
            "id": 2349,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31906,
            "qty": 4
          }
        ],
        "coinCost": 0,
        "notes": "5 Smithing; furnace with ammo mould: 1 bar -> 4 cannonballs (8 ticks). Double ammo mould (Giants' Foundry, Sleeping Giants): 2 bars -> 8 in the same time. Ancient Furnace (Grimstone, 87 Sailing) is twice as fast; Isles unnotes bars for 100 gp each."
      },
      {
        "id": "proc:cannonballs:iron-cannonball",
        "method": "cannonballs",
        "name": "Iron cannonball",
        "inputs": [
          {
            "id": 2351,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31908,
            "qty": 4
          }
        ],
        "coinCost": 0,
        "notes": "20 Smithing; furnace with ammo mould: 1 bar -> 4 cannonballs (8 ticks). Double ammo mould (Giants' Foundry, Sleeping Giants): 2 bars -> 8 in the same time. Ancient Furnace (Grimstone, 87 Sailing) is twice as fast; Isles unnotes bars for 100 gp each."
      },
      {
        "id": "proc:cannonballs:steel-cannonball",
        "method": "cannonballs",
        "name": "Steel cannonball",
        "inputs": [
          {
            "id": 2353,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 2,
            "qty": 4
          }
        ],
        "coinCost": 0,
        "notes": "35 Smithing; furnace with ammo mould: 1 bar -> 4 cannonballs (8 ticks). Double ammo mould (Giants' Foundry, Sleeping Giants): 2 bars -> 8 in the same time. Ancient Furnace (Grimstone, 87 Sailing) is twice as fast; Isles unnotes bars for 100 gp each."
      },
      {
        "id": "proc:cannonballs:mithril-cannonball",
        "method": "cannonballs",
        "name": "Mithril cannonball",
        "inputs": [
          {
            "id": 2359,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31910,
            "qty": 4
          }
        ],
        "coinCost": 0,
        "notes": "55 Smithing; furnace with ammo mould: 1 bar -> 4 cannonballs (8 ticks). Double ammo mould (Giants' Foundry, Sleeping Giants): 2 bars -> 8 in the same time. Ancient Furnace (Grimstone, 87 Sailing) is twice as fast; Isles unnotes bars for 100 gp each."
      },
      {
        "id": "proc:cannonballs:adamant-cannonball",
        "method": "cannonballs",
        "name": "Adamant cannonball",
        "inputs": [
          {
            "id": 2361,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31912,
            "qty": 4
          }
        ],
        "coinCost": 0,
        "notes": "75 Smithing; furnace with ammo mould: 1 bar -> 4 cannonballs (8 ticks). Double ammo mould (Giants' Foundry, Sleeping Giants): 2 bars -> 8 in the same time. Ancient Furnace (Grimstone, 87 Sailing) is twice as fast; Isles unnotes bars for 100 gp each."
      },
      {
        "id": "proc:cannonballs:rune-cannonball",
        "method": "cannonballs",
        "name": "Rune cannonball",
        "inputs": [
          {
            "id": 2363,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31914,
            "qty": 4
          }
        ],
        "coinCost": 0,
        "notes": "90 Smithing; furnace with ammo mould: 1 bar -> 4 cannonballs (8 ticks). Double ammo mould (Giants' Foundry, Sleeping Giants): 2 bars -> 8 in the same time. Ancient Furnace (Grimstone, 87 Sailing) is twice as fast; Isles unnotes bars for 100 gp each."
      },
      {
        "id": "proc:cannonballs:bronze-chainshot-cannonball",
        "method": "cannonballs",
        "name": "Bronze chainshot cannonball",
        "inputs": [
          {
            "id": 31906,
            "qty": 2
          },
          {
            "id": 32886,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31918,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "5 Smithing; at Anvil; tools: Hammer; 3 ticks/action; requires Pandemonium"
      },
      {
        "id": "proc:cannonballs:bronze-incendiary-cannonball",
        "method": "cannonballs",
        "name": "Bronze incendiary cannonball",
        "inputs": [
          {
            "id": 31906,
            "qty": 2
          },
          {
            "id": 31722,
            "qty": 10
          }
        ],
        "outputs": [
          {
            "id": 31932,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "5 Smithing; at Anvil; tools: Hammer; 3 ticks/action; requires Pandemonium"
      },
      {
        "id": "proc:cannonballs:iron-chainshot-cannonball",
        "method": "cannonballs",
        "name": "Iron chainshot cannonball",
        "inputs": [
          {
            "id": 31908,
            "qty": 2
          },
          {
            "id": 32886,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31920,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "20 Smithing; at Anvil; tools: Hammer; 3 ticks/action; requires Pandemonium"
      },
      {
        "id": "proc:cannonballs:iron-incendiary-cannonball",
        "method": "cannonballs",
        "name": "Iron incendiary cannonball",
        "inputs": [
          {
            "id": 31908,
            "qty": 2
          },
          {
            "id": 31722,
            "qty": 10
          }
        ],
        "outputs": [
          {
            "id": 31934,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "20 Smithing; at Anvil; tools: Hammer; 3 ticks/action; requires Pandemonium"
      },
      {
        "id": "proc:cannonballs:steel-chainshot-cannonball",
        "method": "cannonballs",
        "name": "Steel chainshot cannonball",
        "inputs": [
          {
            "id": 2,
            "qty": 2
          },
          {
            "id": 32886,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31922,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "35 Smithing; at Anvil; tools: Hammer; 3 ticks/action; requires Pandemonium"
      },
      {
        "id": "proc:cannonballs:steel-incendiary-cannonball",
        "method": "cannonballs",
        "name": "Steel incendiary cannonball",
        "inputs": [
          {
            "id": 2,
            "qty": 2
          },
          {
            "id": 31722,
            "qty": 10
          }
        ],
        "outputs": [
          {
            "id": 31936,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "35 Smithing; at Anvil; tools: Hammer; 3 ticks/action; requires Pandemonium"
      },
      {
        "id": "proc:cannonballs:mithril-chainshot-cannonball",
        "method": "cannonballs",
        "name": "Mithril chainshot cannonball",
        "inputs": [
          {
            "id": 31910,
            "qty": 2
          },
          {
            "id": 32886,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31924,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "55 Smithing; at Anvil; tools: Hammer; 3 ticks/action; requires Pandemonium"
      },
      {
        "id": "proc:cannonballs:mithril-incendiary-cannonball",
        "method": "cannonballs",
        "name": "Mithril incendiary cannonball",
        "inputs": [
          {
            "id": 31910,
            "qty": 2
          },
          {
            "id": 31722,
            "qty": 10
          }
        ],
        "outputs": [
          {
            "id": 31938,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "55 Smithing; at Anvil; tools: Hammer; 3 ticks/action; requires Pandemonium"
      },
      {
        "id": "proc:cannonballs:adamant-chainshot-cannonball",
        "method": "cannonballs",
        "name": "Adamant chainshot cannonball",
        "inputs": [
          {
            "id": 31912,
            "qty": 2
          },
          {
            "id": 32886,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31926,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "75 Smithing; at Anvil; tools: Hammer; 3 ticks/action; requires Pandemonium"
      },
      {
        "id": "proc:cannonballs:adamant-incendiary-cannonball",
        "method": "cannonballs",
        "name": "Adamant incendiary cannonball",
        "inputs": [
          {
            "id": 31912,
            "qty": 2
          },
          {
            "id": 31722,
            "qty": 10
          }
        ],
        "outputs": [
          {
            "id": 31940,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "75 Smithing; at Anvil; tools: Hammer; 3 ticks/action; requires Pandemonium"
      },
      {
        "id": "proc:cannonballs:rune-chainshot-cannonball",
        "method": "cannonballs",
        "name": "Rune chainshot cannonball",
        "inputs": [
          {
            "id": 31914,
            "qty": 2
          },
          {
            "id": 32886,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31928,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "90 Smithing; at Anvil; tools: Hammer; 3 ticks/action; requires Pandemonium"
      },
      {
        "id": "proc:cannonballs:rune-incendiary-cannonball",
        "method": "cannonballs",
        "name": "Rune incendiary cannonball",
        "inputs": [
          {
            "id": 31914,
            "qty": 2
          },
          {
            "id": 31722,
            "qty": 10
          }
        ],
        "outputs": [
          {
            "id": 31942,
            "qty": 2
          }
        ],
        "coinCost": 0,
        "notes": "90 Smithing; at Anvil; tools: Hammer; 3 ticks/action; requires Pandemonium; wiki MMG: 1,850 sets/hr"
      },
      {
        "id": "proc:cannonballs:chain",
        "method": "cannonballs",
        "name": "Chain",
        "inputs": [
          {
            "id": 2353,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 32886,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "34 Smithing; at Anvil; tools: Hammer; 5 ticks/action (chain is the chainshot ingredient)"
      }
    ]
  },
  {
    "key": "cloth",
    "title": "Yarn and cloth",
    "description": "Spin flax, hemp or cotton bolls into yarn at a spinning wheel, then weave 2 yarn into a bolt of linen, canvas or cotton at a loom.",
    "requirements": "Members; Crafting 12 (linen), 39 (canvas/hemp), 73 (cotton)",
    "actionsPerHour": null,
    "source": "https://oldschool.runescape.wiki/w/Bolt_of_canvas",
    "recipes": [
      {
        "id": "proc:cloth:linen-yarn",
        "method": "cloth",
        "name": "Linen yarn",
        "inputs": [
          {
            "id": 1779,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31463,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "12 Crafting; at Spinning wheel; 3 ticks/action; wiki MMG rate ~2,000/hr at a spinning wheel (Spinning flax to bow strings)"
      },
      {
        "id": "proc:cloth:hemp-yarn",
        "method": "cloth",
        "name": "Hemp yarn",
        "inputs": [
          {
            "id": 31457,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31466,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "39 Crafting; at Spinning wheel; 3 ticks/action; wiki MMG rate ~2,000/hr at a spinning wheel (Spinning flax to bow strings)"
      },
      {
        "id": "proc:cloth:cotton-yarn",
        "method": "cloth",
        "name": "Cotton yarn",
        "inputs": [
          {
            "id": 31460,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31469,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "73 Crafting; at Spinning wheel; 3 ticks/action; wiki MMG rate ~2,000/hr at a spinning wheel (Spinning flax to bow strings)"
      },
      {
        "id": "proc:cloth:bolt-of-linen",
        "method": "cloth",
        "name": "Bolt of linen",
        "inputs": [
          {
            "id": 31463,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 31472,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "12 Crafting; at Loom; 3 ticks/action; wiki MMG rate ~1,100 bolts/hr (Crafting bolts of canvas, Fossil Island loom)"
      },
      {
        "id": "proc:cloth:bolt-of-canvas",
        "method": "cloth",
        "name": "Bolt of canvas",
        "inputs": [
          {
            "id": 31466,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 31475,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "39 Crafting; at Loom; 3 ticks/action; wiki MMG rate ~1,100 bolts/hr (Crafting bolts of canvas, Fossil Island loom)"
      },
      {
        "id": "proc:cloth:bolt-of-cotton",
        "method": "cloth",
        "name": "Bolt of cotton",
        "inputs": [
          {
            "id": 31469,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 31478,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "73 Crafting; at Loom; 3 ticks/action; wiki MMG rate ~1,100 bolts/hr (Crafting bolts of canvas, Fossil Island loom)"
      }
    ]
  },
  {
    "key": "fish-cutting",
    "title": "Fish cutting",
    "description": "Cut raw fish with a knife. High-level fish give fine fish offcuts (trawling/crab bait); raw yellowfin and raw marlin also give 3 yellow fin / marlin scales (Herblore secondaries); raw haddock gives a haddock eye.",
    "requirements": "Members; knife; Cooking 1 (wiki MMG recommends 90+ for marlin); chum station/spreader on a boat for faster processing",
    "actionsPerHour": 11000,
    "source": "https://oldschool.runescape.wiki/w/Fine_fish_offcuts",
    "recipes": [
      {
        "id": "proc:fish-cutting:fine-fish-offcuts-raw-shark",
        "method": "fish-cutting",
        "name": "Fine fish offcuts (raw shark)",
        "inputs": [
          {
            "id": 383,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 32307,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Knife; 3 ticks/fish when cutting by hand; chum station 2/tick, chum spreader 4/tick"
      },
      {
        "id": "proc:fish-cutting:fine-fish-offcuts-raw-sea-turtle",
        "method": "fish-cutting",
        "name": "Fine fish offcuts (raw sea turtle)",
        "inputs": [
          {
            "id": 395,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 32307,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Knife; 3 ticks/fish when cutting by hand; chum station 2/tick, chum spreader 4/tick"
      },
      {
        "id": "proc:fish-cutting:fine-fish-offcuts-raw-anglerfish",
        "method": "fish-cutting",
        "name": "Fine fish offcuts (raw anglerfish)",
        "inputs": [
          {
            "id": 13439,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 32307,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Knife; 3 ticks/fish when cutting by hand; chum station 2/tick, chum spreader 4/tick"
      },
      {
        "id": "proc:fish-cutting:fine-fish-offcuts-raw-dark-crab",
        "method": "fish-cutting",
        "name": "Fine fish offcuts (raw dark crab)",
        "inputs": [
          {
            "id": 11934,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 32307,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Knife; 3 ticks/fish when cutting by hand; chum station 2/tick, chum spreader 4/tick"
      },
      {
        "id": "proc:fish-cutting:fine-fish-offcuts-raw-manta-ray",
        "method": "fish-cutting",
        "name": "Fine fish offcuts (raw manta ray)",
        "inputs": [
          {
            "id": 389,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 32307,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Knife; 3 ticks/fish when cutting by hand; chum station 2/tick, chum spreader 4/tick"
      },
      {
        "id": "proc:fish-cutting:fine-fish-offcuts-raw-halibut",
        "method": "fish-cutting",
        "name": "Fine fish offcuts (raw halibut)",
        "inputs": [
          {
            "id": 32333,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 32307,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Knife; 3 ticks/fish when cutting by hand; chum station 2/tick, chum spreader 4/tick"
      },
      {
        "id": "proc:fish-cutting:fine-fish-offcuts-raw-bluefin",
        "method": "fish-cutting",
        "name": "Fine fish offcuts (raw bluefin)",
        "inputs": [
          {
            "id": 32341,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 32307,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Knife; 3 ticks/fish when cutting by hand; chum station 2/tick, chum spreader 4/tick"
      },
      {
        "id": "proc:fish-cutting:fine-fish-offcuts-raw-jumbo-squid",
        "method": "fish-cutting",
        "name": "Fine fish offcuts (raw jumbo squid)",
        "inputs": [
          {
            "id": 31561,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 32307,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Knife; 3 ticks/fish when cutting by hand; chum station 2/tick, chum spreader 4/tick"
      },
      {
        "id": "proc:fish-cutting:yellow-fin-raw-yellowfin",
        "method": "fish-cutting",
        "name": "Yellow fin (raw yellowfin)",
        "inputs": [
          {
            "id": 32325,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 32360,
            "qty": 3
          },
          {
            "id": 32307,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Knife; 3 Yellow fin + 1 Fine fish offcuts per fish; wiki MMG 11,000/hr with a chum spreader"
      },
      {
        "id": "proc:fish-cutting:marlin-scales-raw-marlin",
        "method": "fish-cutting",
        "name": "Marlin scales (raw marlin)",
        "inputs": [
          {
            "id": 32349,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 32362,
            "qty": 3
          },
          {
            "id": 32307,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Knife; 3 Marlin scales + 1 Fine fish offcuts per fish; wiki MMG 11,000/hr with a chum spreader (90+ Cooking recommended)"
      },
      {
        "id": "proc:fish-cutting:haddock-eye-raw-haddock",
        "method": "fish-cutting",
        "name": "Haddock eye (raw haddock)",
        "inputs": [
          {
            "id": 32317,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 32357,
            "qty": 1
          },
          {
            "id": 11334,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Knife; 1 Haddock eye + 1 Fish offcuts per fish"
      }
    ]
  },
  {
    "key": "sailing-potions",
    "title": "Sailing potions",
    "description": "Make coral unfinished potions (coral + vial of water), then finish them: Umbral (unf) + rainbow crab paste -> Armadyl brew(3); Pillar (unf) + haddock eye -> Super fishing(3); Pillar (unf) + crab paste -> Super hunter(3); Elkhorn (unf) + squid paste -> Haemostatic poultice, + cotton yarn -> Haemostatic dressing (3). Also stamina + marlin scales -> Extended stamina, super energy + yellow fin -> Extreme energy, and anti-odour salt.",
    "requirements": "Members; Herblore 56 (Elkhorn/Haemostatic), 62 (Pillar/Super fishing), 66 (Extreme energy), 67 (Super hunter), 85 (Extended stamina), 89 (Umbral/Armadyl brew); Pandemonium for Armadyl brews",
    "actionsPerHour": 2100,
    "source": "https://oldschool.runescape.wiki/w/Armadyl_brew",
    "recipes": [
      {
        "id": "proc:sailing-potions:elkhorn-potion-unf",
        "method": "sailing-potions",
        "name": "Elkhorn potion (unf)",
        "inputs": [
          {
            "id": 227,
            "qty": 1
          },
          {
            "id": 31481,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31662,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "56 Herblore; 1 ticks/action"
      },
      {
        "id": "proc:sailing-potions:pillar-potion-unf",
        "method": "sailing-potions",
        "name": "Pillar potion (unf)",
        "inputs": [
          {
            "id": 227,
            "qty": 1
          },
          {
            "id": 31484,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31665,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "62 Herblore; 1 ticks/action"
      },
      {
        "id": "proc:sailing-potions:umbral-potion-unf",
        "method": "sailing-potions",
        "name": "Umbral potion (unf)",
        "inputs": [
          {
            "id": 227,
            "qty": 1
          },
          {
            "id": 31487,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31668,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "89 Herblore; 1 ticks/action"
      },
      {
        "id": "proc:sailing-potions:armadyl-brew-3",
        "method": "sailing-potions",
        "name": "Armadyl brew(3)",
        "inputs": [
          {
            "id": 31668,
            "qty": 1
          },
          {
            "id": 31710,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31653,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "89 Herblore; 2 ticks/action; wiki MMG 2,100/hr; alchemist's amulet gives 4-dose output"
      },
      {
        "id": "proc:sailing-potions:super-fishing-potion-3",
        "method": "sailing-potions",
        "name": "Super fishing potion(3)",
        "inputs": [
          {
            "id": 31665,
            "qty": 1
          },
          {
            "id": 32357,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31605,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "62 Herblore; 2 ticks/action"
      },
      {
        "id": "proc:sailing-potions:super-hunter-potion-3",
        "method": "sailing-potions",
        "name": "Super hunter potion(3)",
        "inputs": [
          {
            "id": 31665,
            "qty": 1
          },
          {
            "id": 31708,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31629,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "67 Herblore; 2 ticks/action"
      },
      {
        "id": "proc:sailing-potions:haemostatic-poultice",
        "method": "sailing-potions",
        "name": "Haemostatic poultice",
        "inputs": [
          {
            "id": 31662,
            "qty": 1
          },
          {
            "id": 31569,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31587,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "56 Herblore; 2 ticks/action"
      },
      {
        "id": "proc:sailing-potions:haemostatic-dressing-3",
        "method": "sailing-potions",
        "name": "Haemostatic dressing (3)",
        "inputs": [
          {
            "id": 31587,
            "qty": 1
          },
          {
            "id": 31469,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31593,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "56 Herblore; 2 ticks/action"
      },
      {
        "id": "proc:sailing-potions:extended-stamina-potion-1",
        "method": "sailing-potions",
        "name": "Extended stamina potion(1)",
        "inputs": [
          {
            "id": 12631,
            "qty": 1
          },
          {
            "id": 32362,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31647,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "85 Herblore; 2 ticks/action; one secondary per dose"
      },
      {
        "id": "proc:sailing-potions:extended-stamina-potion-2",
        "method": "sailing-potions",
        "name": "Extended stamina potion(2)",
        "inputs": [
          {
            "id": 12629,
            "qty": 1
          },
          {
            "id": 32362,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 31644,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "85 Herblore; 2 ticks/action; one secondary per dose"
      },
      {
        "id": "proc:sailing-potions:extended-stamina-potion-3",
        "method": "sailing-potions",
        "name": "Extended stamina potion(3)",
        "inputs": [
          {
            "id": 12627,
            "qty": 1
          },
          {
            "id": 32362,
            "qty": 3
          }
        ],
        "outputs": [
          {
            "id": 31641,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "85 Herblore; 2 ticks/action; one secondary per dose"
      },
      {
        "id": "proc:sailing-potions:extended-stamina-potion-4",
        "method": "sailing-potions",
        "name": "Extended stamina potion(4)",
        "inputs": [
          {
            "id": 12625,
            "qty": 1
          },
          {
            "id": 32362,
            "qty": 4
          }
        ],
        "outputs": [
          {
            "id": 31638,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "85 Herblore; 2 ticks/action; one secondary per dose"
      },
      {
        "id": "proc:sailing-potions:extreme-energy-potion-1",
        "method": "sailing-potions",
        "name": "Extreme energy potion(1)",
        "inputs": [
          {
            "id": 3022,
            "qty": 1
          },
          {
            "id": 32360,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31623,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "66 Herblore; 2 ticks/action; one secondary per dose"
      },
      {
        "id": "proc:sailing-potions:extreme-energy-potion-2",
        "method": "sailing-potions",
        "name": "Extreme energy potion(2)",
        "inputs": [
          {
            "id": 3020,
            "qty": 1
          },
          {
            "id": 32360,
            "qty": 2
          }
        ],
        "outputs": [
          {
            "id": 31620,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "66 Herblore; 2 ticks/action; one secondary per dose"
      },
      {
        "id": "proc:sailing-potions:extreme-energy-potion-3",
        "method": "sailing-potions",
        "name": "Extreme energy potion(3)",
        "inputs": [
          {
            "id": 3018,
            "qty": 1
          },
          {
            "id": 32360,
            "qty": 3
          }
        ],
        "outputs": [
          {
            "id": 31617,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "66 Herblore; 2 ticks/action; one secondary per dose"
      },
      {
        "id": "proc:sailing-potions:extreme-energy-potion-4",
        "method": "sailing-potions",
        "name": "Extreme energy potion(4)",
        "inputs": [
          {
            "id": 3016,
            "qty": 1
          },
          {
            "id": 32360,
            "qty": 4
          }
        ],
        "outputs": [
          {
            "id": 31614,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "66 Herblore; 2 ticks/action; one secondary per dose"
      },
      {
        "id": "proc:sailing-potions:anti-odour-salt",
        "method": "sailing-potions",
        "name": "Anti-odour salt",
        "inputs": [
          {
            "id": 31481,
            "qty": 1
          },
          {
            "id": 31708,
            "qty": 5
          }
        ],
        "outputs": [
          {
            "id": 31712,
            "qty": 15
          }
        ],
        "coinCost": 0,
        "notes": "49 Herblore; tools: Pestle and mortar; 1 ticks/action"
      }
    ]
  },
  {
    "key": "pastes",
    "title": "Crab and squid paste",
    "description": "Grind raw squid or crabs with a pestle and mortar into Herblore secondaries (squid paste, crab paste, rainbow crab paste). Auto-processes every 3 ticks.",
    "requirements": "Members; pestle and mortar; no level requirement",
    "actionsPerHour": 2000,
    "source": "https://oldschool.runescape.wiki/w/Squid_paste",
    "recipes": [
      {
        "id": "proc:pastes:squid-paste-raw-swordtip-squid",
        "method": "pastes",
        "name": "Squid paste (raw swordtip squid)",
        "inputs": [
          {
            "id": 31553,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31569,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "tools: Pestle and mortar; 3 ticks/action"
      },
      {
        "id": "proc:pastes:squid-paste-raw-jumbo-squid",
        "method": "pastes",
        "name": "Squid paste (raw jumbo squid)",
        "inputs": [
          {
            "id": 31561,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31569,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "tools: Pestle and mortar; 3 ticks/action"
      },
      {
        "id": "proc:pastes:crab-paste-red-crab",
        "method": "pastes",
        "name": "Crab paste (red crab)",
        "inputs": [
          {
            "id": 31671,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31708,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "tools: Pestle and mortar"
      },
      {
        "id": "proc:pastes:crab-paste-blue-crab",
        "method": "pastes",
        "name": "Crab paste (blue crab)",
        "inputs": [
          {
            "id": 31674,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31708,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "tools: Pestle and mortar"
      },
      {
        "id": "proc:pastes:rainbow-crab-paste-type-1",
        "method": "pastes",
        "name": "Rainbow crab paste (type 1)",
        "inputs": [
          {
            "id": 31677,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31710,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Pestle and mortar; any of the three rainbow crab variants (GE names Rainbow crab (1)/(2)/(3)) gives 1 paste; 3 ticks when auto-processing"
      },
      {
        "id": "proc:pastes:rainbow-crab-paste-type-2",
        "method": "pastes",
        "name": "Rainbow crab paste (type 2)",
        "inputs": [
          {
            "id": 31680,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31710,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Pestle and mortar; any of the three rainbow crab variants (GE names Rainbow crab (1)/(2)/(3)) gives 1 paste; 3 ticks when auto-processing"
      },
      {
        "id": "proc:pastes:rainbow-crab-paste-type-3",
        "method": "pastes",
        "name": "Rainbow crab paste (type 3)",
        "inputs": [
          {
            "id": 31683,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31710,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "Pestle and mortar; any of the three rainbow crab variants (GE names Rainbow crab (1)/(2)/(3)) gives 1 paste; 3 ticks when auto-processing"
      }
    ]
  },
  {
    "key": "sailing-smithing",
    "title": "Nails",
    "description": "Smith bars into 15 nails at an anvil (dragon nails: 1 dragon metal sheet -> 15 at the Dragon forge). Nails feed repair kits.",
    "requirements": "Members; Smithing 4-89 by metal (92 for dragon nails); hammer",
    "actionsPerHour": null,
    "source": "https://oldschool.runescape.wiki/w/Nails",
    "recipes": [
      {
        "id": "proc:sailing-smithing:bronze-nails",
        "method": "sailing-smithing",
        "name": "Bronze nails",
        "inputs": [
          {
            "id": 2349,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 4819,
            "qty": 15
          }
        ],
        "coinCost": 0,
        "notes": "4 Smithing; at Anvil; tools: Hammer; 5 ticks/action"
      },
      {
        "id": "proc:sailing-smithing:iron-nails",
        "method": "sailing-smithing",
        "name": "Iron nails",
        "inputs": [
          {
            "id": 2351,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 4820,
            "qty": 15
          }
        ],
        "coinCost": 0,
        "notes": "19 Smithing; at Anvil; tools: Hammer; 5 ticks/action"
      },
      {
        "id": "proc:sailing-smithing:steel-nails",
        "method": "sailing-smithing",
        "name": "Steel nails",
        "inputs": [
          {
            "id": 2353,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 1539,
            "qty": 15
          }
        ],
        "coinCost": 0,
        "notes": "34 Smithing; at Anvil; tools: Hammer; 5 ticks/action"
      },
      {
        "id": "proc:sailing-smithing:mithril-nails",
        "method": "sailing-smithing",
        "name": "Mithril nails",
        "inputs": [
          {
            "id": 2359,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 4822,
            "qty": 15
          }
        ],
        "coinCost": 0,
        "notes": "54 Smithing; at Anvil; tools: Hammer; 5 ticks/action"
      },
      {
        "id": "proc:sailing-smithing:adamantite-nails",
        "method": "sailing-smithing",
        "name": "Adamantite nails",
        "inputs": [
          {
            "id": 2361,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 4823,
            "qty": 15
          }
        ],
        "coinCost": 0,
        "notes": "74 Smithing; at Anvil; tools: Hammer; 5 ticks/action"
      },
      {
        "id": "proc:sailing-smithing:rune-nails",
        "method": "sailing-smithing",
        "name": "Rune nails",
        "inputs": [
          {
            "id": 2363,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 4824,
            "qty": 15
          }
        ],
        "coinCost": 0,
        "notes": "89 Smithing; at Anvil; tools: Hammer; 5 ticks/action"
      },
      {
        "id": "proc:sailing-smithing:dragon-nails",
        "method": "sailing-smithing",
        "name": "Dragon nails",
        "inputs": [
          {
            "id": 31996,
            "qty": 1
          }
        ],
        "outputs": [
          {
            "id": 31406,
            "qty": 15
          }
        ],
        "coinCost": 0,
        "notes": "92 Smithing; at Dragon forge; tools: Hammer; 4 ticks/action; requires Dragon Slayer II and Pandemonium"
      }
    ]
  },
  {
    "key": "elemental-amulets",
    "title": "Elemental amulets",
    "description": "Summer Sweep-Up 2026: use an amulet of magic, the matching elemental gem and 100 runes on the Air/Water/Earth/Fire Altar; combine all four amulets with 500 of each elemental rune at the Runic Altar for an Elemental amulet.",
    "requirements": "Members; Runecraft 18/19/20/21, 30 for Elemental amulet; access to the altars",
    "actionsPerHour": null,
    "source": "https://oldschool.runescape.wiki/w/Elemental_amulet",
    "recipes": [
      {
        "id": "proc:elemental-amulets:amulet-of-air",
        "method": "elemental-amulets",
        "name": "Amulet of air",
        "inputs": [
          {
            "id": 1727,
            "qty": 1
          },
          {
            "id": 34404,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 100
          }
        ],
        "outputs": [
          {
            "id": 34407,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "18 Runecraft; at Air Altar; 3 ticks/action"
      },
      {
        "id": "proc:elemental-amulets:amulet-of-water",
        "method": "elemental-amulets",
        "name": "Amulet of water",
        "inputs": [
          {
            "id": 1727,
            "qty": 1
          },
          {
            "id": 34410,
            "qty": 1
          },
          {
            "id": 555,
            "qty": 100
          }
        ],
        "outputs": [
          {
            "id": 34413,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "19 Runecraft; at Water Altar; 3 ticks/action"
      },
      {
        "id": "proc:elemental-amulets:amulet-of-earth",
        "method": "elemental-amulets",
        "name": "Amulet of earth",
        "inputs": [
          {
            "id": 1727,
            "qty": 1
          },
          {
            "id": 34416,
            "qty": 1
          },
          {
            "id": 557,
            "qty": 100
          }
        ],
        "outputs": [
          {
            "id": 34419,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "20 Runecraft; at Earth Altar; 3 ticks/action"
      },
      {
        "id": "proc:elemental-amulets:amulet-of-fire",
        "method": "elemental-amulets",
        "name": "Amulet of fire",
        "inputs": [
          {
            "id": 1727,
            "qty": 1
          },
          {
            "id": 34422,
            "qty": 1
          },
          {
            "id": 554,
            "qty": 100
          }
        ],
        "outputs": [
          {
            "id": 34425,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "21 Runecraft; at Fire Altar; 3 ticks/action"
      },
      {
        "id": "proc:elemental-amulets:elemental-amulet",
        "method": "elemental-amulets",
        "name": "Elemental amulet",
        "inputs": [
          {
            "id": 34407,
            "qty": 1
          },
          {
            "id": 34425,
            "qty": 1
          },
          {
            "id": 34419,
            "qty": 1
          },
          {
            "id": 34413,
            "qty": 1
          },
          {
            "id": 556,
            "qty": 500
          },
          {
            "id": 554,
            "qty": 500
          },
          {
            "id": 557,
            "qty": 500
          },
          {
            "id": 555,
            "qty": 500
          }
        ],
        "outputs": [
          {
            "id": 34428,
            "qty": 1
          }
        ],
        "coinCost": 0,
        "notes": "30 Runecraft; at Runic Altar; 3 ticks/action"
      }
    ]
  }
]
