# reactular

Reactular allows you to use React components in AngularJS (Angular 1.x). It began as a fork of [react2angular](https://github.com/coatue-oss/react2angular). See the [comparison below](#comparison-to-react2angular) for differences.

## Installation

```sh
# Using NPM:
npm install @vendhq/reactular react react-dom

# Or, using Yarn:
yarn add @vendhq/reactular react react-dom
```

## Usage

Basic usage looks like this:

```js
import angular from 'angular';
import React from 'react';

const HelloComponent = () => {
    return <span>Hello, world!</span>;
}

angular
  .module('myModule', [])
  .component('helloComponent', reactular(HelloComponent));
```

If you need to pass props to your React component, you must specify them in the call to `reactular`:

```js
import angular from 'angular';
import React from 'react';

const HelloComponent = (name) => {
    return <span>Hello, world!</span>;
}

angular
  .module('myModule', [])
  .component('helloComponent', reactular(HelloComponent), ['name']);
```

### Wrapper Component

The optional third parameter passed to reactular may specify a wrapping React component, either directly as a class or functional component, or as a string which is resolved into a component through AngularJS's `$injector`. Most commonly the wrapper component is used to provide context to React components.

#### Functional Wrapper

Basic wrapper usage might look like this:

```js
import angular from 'angular';
import React from 'react';

const MyContext = React.createContext();

const wrapper = ({ children }) => <MyContext.Provider value="world">{children}</MyContext.Provider>;

const HelloComponent = () => {
    const value = React.useContext(MyContext);
    return <span>Hello, {value}!</span>;
}

angular
  .module('myModule', [])
  .component('helloComponent', reactular(HelloComponent, [], wrapper));
```

You could use this functionality to ensure that every React component has access to something, such as a Redux store or an Apollo client.

#### AngularJS Injectable Wrapper

Using an AngularJS injectable as the wrapper, it's possible to give your React components access to AngularJS injectables. You can also wrap up this logic in a custom hook.

```js
import angular from 'angular';
import React from 'react';

const MyContext = React.createContext();

const useFilter = () => React.useContext(MyContext)

const HelloComponent = () => {
    // Get AngularJS's $filter through the context.
    const $filter = useFilter();
    const uppercase = $filter('uppercase');
    return <span>Hello, {uppercase('world')}!</span>;
}

angular
  .module('myModule', [])
  .service('reactWrapper', $filter => {
      return ({ children }) => <MyContext.Provider value={$filter}>{children}</MyContext.Provider>;
  })
  .component('helloComponent', reactular(HelloComponent, [], 'reactWrapper'));
```

## Limitations

### Transclusion

Transclusion is not supported. It could be added in the future, given a reasonable use case and implementation proposal.

It may be possible to work around this limitation in some cases. If you have a React component and you wish to "transclude" other React components, you might be able to create another component that does all the transclusion on the React side. For example, imagine that we have a component `Parent` and two other components, `Child1` and `Child2` that we want to transclude:

```js
const ComponentWithTransclusion = () => (
  <Parent>
    <Child1 />
    <Child2 />
  </Parent>
)

angular.component('componentWithTransclusion', reactular(ComponentWithTransclusion));
```

If the components you want to transclude exist on the AngularJS side, you could look at wrapping them with something like [angular2react](https://github.com/coatue-oss/angular2react) to make them available on the React side. This starts to become pretty complicated pretty fast, however.

### Binding

Only expression AngularJS binding (`<`) is supported. There is probably not any reasonable way to introduce support for two-way binding.

## Comparison to react2angular

Basic usage and behavior of Reactular is similar to react2angular, but it differs in a few ways.

### Rendering

react2angular does a shallow prop check every time the AngularJS `$onChanges` method is called and only re-renders the React component when it detects a change. (See coatue-oss/react2angular#93.)

Reactular re-renders the React component every time `$onChanges` is called. You may wrap your component with `React.memo` to get behavior similar to react2angular.

### Dependency Injection

Reactular does not directly support injecting AngularJS dependencies through props the way react2angular does. Instead, if you need to access AngularJS dependencies, do it through [wrapper components](#angularjs-injectable-wrapper) and React context. This makes it easier to use the same components from both AngularJS and React.

### Prop Types

Reactular does not have any special support for prop types. Prop names must always be passed to the `reactular` function.
