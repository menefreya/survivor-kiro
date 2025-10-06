
# Survivor Fantasy League - Frontend

React application for the Survivor Fantasy League, built with Vite and featuring a modern CSS architecture.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Technology Stack

- **React 18** with functional components and hooks
- **Vite** for fast development and building
- **React Router** for client-side routing
- **Axios** for API communication
- **CSS Architecture** with design tokens and BEM naming

## CSS Architecture

This project uses a modern, maintainable CSS architecture:

### File Structure
```
src/styles/
├── 01-reset.css              # CSS reset and normalize
├── 02-tokens.css             # Design tokens (CSS variables)
├── 03-base.css               # Base element styles
├── 04-layout.css             # Layout utilities and grid
├── 05-components/            # Component-specific styles
├── 06-features/              # Feature-specific styles
├── 07-pages/                 # Page-specific styles
├── 08-utilities.css          # Utility classes
└── 09-legacy.css             # Temporary legacy overrides
```

### Key Principles

- **Cascade-first**: Strict import order in `App.css`
- **Design tokens**: All values use CSS custom properties
- **BEM naming**: `block__element--modifier` convention
- **Utility classes**: Prefixed with `u-` for common patterns
- **Low specificity**: Maximum 3 classes per selector

### Development Guidelines

```css
/* ✅ Good - Use design tokens */
.my-component {
  color: var(--color-text-primary);
  padding: var(--spacing-4);
  font-size: var(--font-size-lg);
}

/* ❌ Bad - Hardcoded values */
.my-component {
  color: #333;
  padding: 16px;
  font-size: 18px;
}
```

```jsx
{/* ✅ Good - Use utility classes */}
<div className="u-flex u-items-center u-p-4">

{/* ❌ Bad - Inline styles */}
<div style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
```

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### CSS Tools
- `npm run lint:css` - Lint CSS files (required before commit)
- `npm run format:css` - Format CSS files
- `npm run test:visual` - Run visual regression tests
- `npm run analyze:css` - Analyze CSS bundle size

### Testing
- `npm run test` - Run unit tests
- `npm run test:coverage` - Run tests with coverage

## Component Development

### Creating a New Component

1. **Create the component file**: `src/components/MyComponent.jsx`
2. **Create the CSS file**: `src/styles/05-components/MyComponent.css`
3. **Add CSS import to App.css**:

```css
/* Layer 5: Component Styles */
@import './styles/05-components/MyComponent.css';
```

### Component CSS Template

```css
/**
 * MyComponent Styles
 * 
 * Brief description of the component.
 */

/* Component root */
.my-component {
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-4);
}

/* Component elements */
.my-component__header {
  margin-bottom: var(--spacing-3);
}

.my-component__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

/* Component modifiers */
.my-component--primary {
  border-left: 4px solid var(--color-primary);
}

/* Responsive design */
@media (max-width: 768px) {
  .my-component {
    padding: var(--spacing-3);
  }
}
```

## Code Quality

### Pre-commit Checks
- ESLint must pass
- CSS linting must pass (`npm run lint:css`)
- No TypeScript errors
- Tests must pass

### CSS Review Checklist
- [ ] Uses design tokens (no hardcoded values)
- [ ] Follows BEM naming convention
- [ ] Specificity under 0,0,3,0 (max 3 classes)
- [ ] Mobile responsive
- [ ] Accessibility compliant
- [ ] No inline styles in JSX

## Documentation

### For New Developers
- `src/styles/DEVELOPER_ONBOARDING.md` - Complete onboarding guide
- `src/styles/CODE_REVIEW_CHECKLIST.md` - Code review guidelines
- `.kiro/steering/css-best-practices.md` - Comprehensive CSS guidelines

### CSS Reference
- `src/styles/UTILITY_CLASS_GUIDE.md` - Utility class patterns
- `src/styles/COMPONENT_CSS_TEMPLATES.md` - Component templates
- `src/styles/EMERGENCY_OVERRIDE_PROCEDURES.md` - Quick fix procedures

## Project Structure

```
src/
├── components/           # React components
├── context/             # React Context providers
├── services/            # API service functions
├── styles/              # CSS architecture
│   ├── 01-reset.css
│   ├── 02-tokens.css
│   ├── 05-components/
│   └── ...
├── App.jsx              # Root component
└── main.jsx             # Application entry point
```

## API Integration

The frontend communicates with the Express backend via Axios:

```javascript
// Example API call
import api from '../services/api';

const fetchPlayers = async () => {
  try {
    const response = await api.get('/players');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch players:', error);
    throw error;
  }
};
```

## Environment Variables

Create a `.env` file in the frontend directory:

```
VITE_API_BASE_URL=http://localhost:3001/api
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Code splitting with React.lazy()
- CSS bundle optimization
- Image optimization
- Responsive images

## Accessibility

- WCAG AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Reduced motion preferences

## Troubleshooting

### Common Issues

**CSS not updating**: Check that the CSS file is imported in `App.css` in the correct order.

**Styles not applying**: Verify class names match between JSX and CSS files.

**Build failing**: Run `npm run lint:css` to check for CSS issues.

**Visual regressions**: Run `npm run test:visual` to check for layout changes.

### Getting Help

1. Check the documentation in `src/styles/`
2. Review existing components for patterns
3. Ask the team for guidance
4. Create an issue for bugs or feature requests
