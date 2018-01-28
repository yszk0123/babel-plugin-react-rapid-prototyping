const fs = require('fs');
const { basename, dirname } = require('path');
const template = require('babel-template');
const build = template(`
  ;module.exports = function NAME(props) {
    return BODY;
  };
`);
const dirCache = {
  cache: new Map(),
  get(dir) {
    let filenames = this.cache.get(dir);
    if (!filenames) {
      filenames = fs.readdirSync(dir);
      this.cache.set(dir, filenames);
    }
    return filenames;
  },
};

function stripExtension(file) {
  return file.replace(/\.[^.]+$/, '');
}

module.exports = ({ types: t }) => {
  const nestedVisitor = {
    JSXAttribute(path) {
      if (path.node.name.name === 'class') {
        path.node.name.name = 'className';
        const exp = path.node.value.value
          .split(/\s+/)
          .map(name =>
            t.memberExpression(t.identifier('styles'), t.identifier(name)),
          );
        path
          .get('value')
          .replaceWith(
            t.jSXExpressionContainer(
              exp.length === 1
                ? exp[0]
                : t.callExpression(t.identifier('classNames'), exp),
            ),
          );
      } else if (path.node.name.name === 'for') {
        path.node.name.name = 'htmlFor';
      }
    },
  };

  return {
    inherits: require('babel-plugin-syntax-jsx'),
    visitor: {
      JSXOpeningElement(path, { file }) {
        const name = path.node.name.name;
        if (/^[A-Z]/.test(name)) {
          file.get('components').add(name);
        }
      },

      JSXElement(path, { file }) {
        path.traverse(nestedVisitor);
      },

      Program: {
        enter(path, { file }) {
          file.set('components', new Set());
          file.set(
            'needJSXWrapper',
            path.node.body &&
              path.node.body[0] &&
              path.node.body[0].expression &&
              path.node.body[0].expression.type === 'JSXElement',
          );
        },

        exit(path, { file }) {
          if (!file.get('needJSXWrapper') || path.scope.hasBinding('React')) {
            return;
          }
          if (this._rapidAlreadyRan) {
            return;
          }
          this._rapidAlreadyRan = true;

          const name = stripExtension(basename(file.opts.filename));
          const dir = dirname(file.opts.filename);
          const filenames = dirCache.get(dir);

          // Wrap JSX in a function
          const asd = build({
            NAME: t.identifier(name),
            BODY: path.node.body,
          });
          path.replaceWith(t.program(asd));

          // Auto Import
          const imports = [];

          // React
          const reactImportDeclaration = t.importDeclaration(
            [t.importDefaultSpecifier(t.identifier('React'))],
            t.stringLiteral('react'),
          );
          imports.push(reactImportDeclaration);

          // classNames
          const classImportDeclaration = t.importDeclaration(
            [t.importDefaultSpecifier(t.identifier('classnames'))],
            t.stringLiteral('classNames'),
          );
          imports.push(classImportDeclaration);

          // Styles
          if (filenames.includes(`${name}.css`)) {
            const stylesImportDeclaration = t.importDeclaration(
              [t.importDefaultSpecifier(t.identifier('styles'))],
              t.stringLiteral(`./${name}.css`),
            );
            imports.push(stylesImportDeclaration);
          }

          // Components
          file.get('components').forEach(componentName => {
            const componentImportDeclaration = t.importDeclaration(
              [t.importDefaultSpecifier(t.identifier(componentName))],
              t.stringLiteral(`./${componentName}`),
            );
            imports.push(componentImportDeclaration);
          });

          path.node.body.unshift(...imports);
        },
      },
    },
  };
};
