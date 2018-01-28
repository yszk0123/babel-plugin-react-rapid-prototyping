# Usage

## Input

```js
// MyComponent.js
<div class="foo">Hello, world</div>
```

```css
/* MyComponent.css */
.foo {
  color: red;
}
```

## Output

```js
import React from "react";
import styles from "./MyComponent.css";

export default function MyComponent() {
  return <div className={styles.foo}>Hello, world</div>;
};
```
