# Usage

## Input

```js
// MyComponent.js
<div class="foo">Hello, world</div>
```

```css
/* MyComponent.module.css */
.foo {
  color: red;
}
```

## Output

```js
import React from "react";
import styles from "./MyComponent.module.css";

export default function MyComponent() {
  return <div className={styles.foo}>Hello, world</div>;
};
```
