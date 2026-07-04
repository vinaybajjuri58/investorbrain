# InvestorBrain — Design System (Cantor8-inspired)

## Inspiration
[Cantor8.io](https://www.cantor8.io/) — Enterprise infrastructure for Canton Network. Clean, editorial, institutional dark theme with electric blue accent.

## Design Tokens

### Surface Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-base` | `#060912` | Root background |
| `--color-panel` | `#0b0f1a` | Panel / sidebar background |
| `--color-card` | `#0f1424` | Card surfaces |
| `--color-raised` | `#151c30` | Raised / hover surfaces |

### Border Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-edge` | `#1a2340` | Subtle borders |
| `--color-edge-strong` | `#243050` | Stronger borders |

### Text Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-ink` | `#e8edf6` | Primary text |
| `--color-ink-dim` | `#7d8fa8` | Secondary text |
| `--color-ink-faint` | `#465670` | Tertiary / muted text |

### Accent — Electric Blue (institutional)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-accent` | `#3b82f6` | Primary CTA, active states, brand |
| `--color-accent-bright` | `#60a5fa` | Hover / bright accent |

### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-positive` | `#22c55e` | Success |
| `--color-negative` | `#ef4444` | Error / danger |
| `--color-warning` | `#f59e0b` | Warning / processing |

### Typography
- **Sans**: Geist (system default for Latin)
- **Mono**: Geist Mono (system default for code)
- **Brand/Display**: Space Grotesk (headings, labels, tabs)
- **Scale**: 10px—20px for UI chrome; headings proportional

### Spacing
- **Grid**: 4px base unit
- **Panel padding**: 16px (p-4)
- **Gaps**: 8px-16px (gap-2 → gap-4)

### Borders & Radius
- **Card border**: 1px solid edge color, double-bezel pattern
- **Radius**: lg (8px) for inputs, xl-2xl for cards, full for pills

### Patterns
- **Double-bezel cards**: Outer container with edge border + inner card surface
- **Active tabs**: Bottom border accent color, matching text
- **Inactive tabs**: muted text, transparent border
- **Buttons**: Solid accent for primary, outlined/hover-reveal for secondary
- **Result banners**: Tinted background with semi-transparent border
- **Inputs**: Dark background with edge-strong border, accent focus glow

### Motion
- **Hover transitions**: 150ms ease
- **Active state**: scale-[0.98] for buttons
- **Tab transitions**: 150ms color + border

### Iconography
- Simple geometric SVG icons
- Thin strokes (1.1–1.5px)
- Accent color for active/primary states
