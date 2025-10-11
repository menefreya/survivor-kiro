# Badge Components

A comprehensive set of reusable badge components for the Survivor Fantasy League application. These components provide consistent styling and semantic meaning for various status indicators, rankings, and labels throughout the app.

## Components Overview

### Base Badge Component

The `Badge` component is the foundation for all other badge components. It provides the core styling and variant system.

```jsx
import { Badge } from './badges';

<Badge variant="primary" size="md">Custom Badge</Badge>
```

### Specialized Badge Components

#### StatusBadge
For contestant status indicators (active, eliminated, inactive).

```jsx
import { StatusBadge } from './badges';

<StatusBadge status="active" size="sm" />
<StatusBadge status="eliminated" size="sm" />
<StatusBadge status="inactive" size="sm" />
```

#### TribeBadge
For tribe affiliation indicators with proper colors.

```jsx
import { TribeBadge } from './badges';

<TribeBadge tribe="kele" size="sm" />
<TribeBadge tribe="hina" size="sm" showIcon={true} />
<TribeBadge tribe="uli" size="sm" />
```

#### RankBadge
For ranking positions with special styling for top 3 places.

```jsx
import { RankBadge } from './badges';

<RankBadge rank={1} size="lg" />  {/* Gold medal */}
<RankBadge rank={2} size="lg" />  {/* Silver medal */}
<RankBadge rank={3} size="lg" />  {/* Bronze medal */}
<RankBadge rank={4} size="lg" />  {/* Default styling */}
```

#### PredictionBadge
For prediction results and scoring.

```jsx
import { PredictionBadge } from './badges';

<PredictionBadge result={true} points={3} size="sm" />
<PredictionBadge result={false} size="sm" />
<PredictionBadge result="pending" size="sm" />
```

#### LockBadge
For submission and deadline status.

```jsx
import { LockBadge } from './badges';

<LockBadge status="open" size="sm" />
<LockBadge status="locked" size="sm" />
<LockBadge status="deadline" deadline="Wednesday 8PM" size="sm" />
```

## Props Reference

### Common Props (All Components)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Badge size |
| `className` | `string` | `''` | Additional CSS classes |
| `...props` | `object` | `{}` | Additional HTML attributes |

### Badge-Specific Props

#### StatusBadge
| Prop | Type | Description |
|------|------|-------------|
| `status` | `'active' \| 'eliminated' \| 'inactive' \| boolean` | Contestant status |

#### TribeBadge
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tribe` | `'kele' \| 'hina' \| 'uli' \| string` | - | Tribe name |
| `showIcon` | `boolean` | `false` | Show colored circle icon |

#### RankBadge
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rank` | `number \| string` | - | Ranking position |
| `showIcon` | `boolean` | `true` | Show medal icons for top 3 |

#### PredictionBadge
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `result` | `boolean \| 'correct' \| 'incorrect' \| 'pending' \| null` | - | Prediction result |
| `points` | `number \| null` | `null` | Points earned |
| `showPoints` | `boolean` | `true` | Display points in text |

#### LockBadge
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `'open' \| 'locked' \| 'deadline' \| boolean` | - | Lock status |
| `deadline` | `string \| null` | `null` | Deadline information |
| `showIcon` | `boolean` | `true` | Show status icons |

## Accessibility Features

All badge components include:

- **ARIA Labels**: Descriptive labels for screen readers
- **Role Attributes**: Appropriate semantic roles (`status`, `img`)
- **Title Attributes**: Hover tooltips with additional context
- **Color Independence**: Don't rely solely on color to convey meaning

## Styling System

Badges use the global design system with:

- **Consistent Colors**: Semantic color palette (success, danger, warning, etc.)
- **Tribe Colors**: Official Survivor season colors (Kele=Blue, Hina=Yellow, Uli=Red)
- **Size Scale**: Consistent sizing from xs (16px) to xl (48px)
- **Typography**: Proper font weights and sizes for readability

## Usage Examples

### In Contestant Lists
```jsx
<div className="contestant-info">
  <h3>John Smith</h3>
  <div className="badges">
    <StatusBadge status="active" />
    <TribeBadge tribe="kele" />
    <RankBadge rank={1} />
  </div>
</div>
```

### In Prediction Results
```jsx
<div className="prediction-result">
  <TribeBadge tribe="hina" showIcon={true} />
  <PredictionBadge result={true} points={3} />
</div>
```

### In Admin Interfaces
```jsx
<div className="admin-status">
  <LockBadge status="open" deadline="Wednesday 8PM EST" />
  <StatusBadge status="eliminated" />
</div>
```

## Migration from Legacy Badges

When migrating from old badge implementations:

1. **Replace manual badge classes** with component imports
2. **Update props** to use semantic names instead of CSS classes
3. **Remove custom styling** - components handle all styling
4. **Add accessibility props** if missing (aria-label, title)

### Before (Legacy)
```jsx
<span className="badge badge--tribe badge--tribe-kele">Kele</span>
<div className="badge badge--rank-gold">1</div>
```

### After (New Components)
```jsx
<TribeBadge tribe="kele" />
<RankBadge rank={1} />
```

## Best Practices

1. **Use semantic components** instead of the base Badge when possible
2. **Provide context** with aria-labels and titles
3. **Be consistent** with sizing across similar UI elements
4. **Consider mobile** - smaller badges may be more appropriate
5. **Test accessibility** with screen readers and keyboard navigation

## Future Enhancements

Potential additions to the badge system:

- **AnimatedBadge**: For notifications and updates
- **ScoreBadge**: For point displays and achievements
- **TeamBadge**: For fantasy team affiliations
- **EpisodeBadge**: For episode-specific indicators