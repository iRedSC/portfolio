---
title: "Building React Islands in Astro: The Best of Both Worlds"
description: "Learn how to seamlessly integrate React components into your Astro applications using the island architecture pattern."
pubDate: 2024-01-28
heroImage: "/images/react-astro.jpg"
tags: ["react", "astro", "javascript", "frontend", "performance"]
draft: false
---

# Building React Islands in Astro

The combination of React and Astro brings together the best of component-based development with Astro's performance-first architecture. By using React islands, you can build highly interactive user interfaces while maintaining optimal performance.

## Understanding Island Architecture

Island architecture is a pattern where interactive components (islands) are isolated from the surrounding static content. This approach offers several benefits:

### Performance Benefits

- **Selective Hydration**: Only interactive parts of your page get hydrated
- **Reduced Bundle Size**: Static content stays lightweight
- **Faster Initial Load**: Users see content immediately
- **Better Core Web Vitals**: Improved performance metrics

## Setting Up React in Astro

First, install the React integration:

```bash
# Install React integration
bun add @astrojs/react react react-dom

# Install TypeScript types (optional)
bun add @types/react @types/react-dom
```

### Configure Astro Config

Update your `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
});
```

## Creating Your First React Island

React components in Astro work just like regular React components, but with special considerations for the island architecture:

```tsx
// components/Counter.tsx
import { useState } from 'react';

interface CounterProps {
  initialCount?: number;
}

export default function Counter({ initialCount = 0 }: CounterProps) {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="counter">
      <h3>Counter: {count}</h3>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(count - 1)}>
        Decrement
      </button>
    </div>
  );
}
```

### Using React Components in Astro Pages

Import and use your React component in any Astro page:

```astro
---
// pages/index.astro
import Counter from '../components/Counter.tsx';
---

<html lang="en">
  <head>
    <title>My Astro Site</title>
  </head>
  <body>
    <h1>Welcome to my site!</h1>
    <p>This is static content that renders immediately.</p>

    <!-- This becomes an interactive island -->
    <Counter initialCount={5} client:load />
  </body>
</html>
```

## Hydration Strategies

Astro offers different hydration strategies for your React islands:

### `client:load`
Hydrates immediately when the page loads. Use for above-the-fold interactive content.

### `client:idle`
Hydrates when the page becomes idle. Good for non-critical interactions.

### `client:visible`
Hydrates when the component enters the viewport. Perfect for content below the fold.

### `client:media`
Hydrates based on media queries. Useful for responsive interactions.

## Best Practices

### 1. Keep Islands Small
Only make components interactive when necessary. Static content should remain static.

### 2. Use Appropriate Hydration
Choose the right hydration strategy for each component based on its importance and position.

### 3. Avoid Prop Drilling
Since islands are isolated, avoid complex prop drilling. Consider using context or state management if needed.

### 4. Optimize Bundle Size
Be mindful of what you import. Use tree-shaking and dynamic imports when possible.

## Advanced Patterns

### Shared State Between Islands

```tsx
// components/ThemeProvider.tsx
import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

### Form Handling

```tsx
// components/ContactForm.tsx
import { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
      />
      <textarea
        placeholder="Message"
        value={formData.message}
        onChange={(e) => setFormData({...formData, message: e.target.value})}
      />
      <button type="submit">Send Message</button>
    </form>
  );
}
```

## Performance Monitoring

Monitor your React islands using browser dev tools:

- **Network Tab**: Check bundle sizes
- **Performance Tab**: Analyze hydration timing
- **Lighthouse**: Get Core Web Vitals scores

## Conclusion

React islands in Astro give you the flexibility of React with the performance benefits of Astro's architecture. By carefully choosing what to make interactive and when to hydrate components, you can build fast, accessible, and maintainable web applications.

The key is finding the right balance between static content and interactive islands. Start small, measure performance, and gradually add interactivity where it provides the most value to your users.