import angular, {
  auto,
  bootstrap,
  element as $,
  ICompileService,
  IComponentOptions,
  IController,
  IRootScopeService,
  IScope,
  module,
} from 'angular';
import 'angular-mocks';
import * as React from 'react';
import { Simulate } from 'react-dom/test-utils';
import { reactular } from './reactular';

const wait = () => new Promise(resolve => setTimeout(resolve, 10));

class ClassComponent extends React.Component<Props> {
  render() {
    return (
      <div>
        <p>Foo: {this.props.foo}</p>
        <p>Bar: {this.props.bar.join(',')}</p>
        <p onClick={() => this.props.baz(42)}>Baz</p>
        {this.props.children}
      </div>
    );
  }
  componentWillUnmount() {
    //
  }
}

const FunctionComponent: React.FC<Props> = props => {
  React.useEffect(() => props.onUnmount);

  return (
    <div>
      <p>Foo: {props.foo}</p>
      <p>Bar: {props.bar.join(',')}</p>
      <p onClick={() => props.baz(42)}>Baz</p>
      {props.children}
    </div>
  );
};

const NoPropsFunctionComponent: React.FC = () => <div>Foo</div>;

class NoPropsClassComponent extends React.Component<Props> {
  render() {
    return <div>Foo</div>;
  }
}

function ContextComponent() {
  const v = React.useContext(MyContext);
  return <p>{v}</p>;
}

interface ClassProps {
  onChange: jest.Mock;
  onComponentWillUnmount: jest.Mock;
  onRender: jest.Mock;
  values: string[];
}

class ClassComponentTwo extends React.Component<ClassProps> {
  render() {
    this.props.onRender();
    return this.props.values.map((value, index) => (
      <div key={index}>{value}</div>
    ));
  }

  componentWillUnmount() {
    this.props.onComponentWillUnmount();
    this.props.onChange(this.props.values.map(val => `${val}ss`));
  }
}

class ClassComponentTwoWrapper implements IComponentOptions {
  bindings = {
    onComponentWillUnmount: '<',
    onRender: '<',
    values: '<',
  };
  template = `<test-angular-class-two
                on-change="$ctrl.onChange"
                on-component-will-unmount="$ctrl.onComponentWillUnmount"
                on-render="$ctrl.onRender"
                values="$ctrl.values">
              </test-angular-class-two>`;
  controller = class implements IController {
    values!: string[];

    constructor(private $scope: IScope) {}

    onChange = (values: string[]) => {
      this.values = values;
      this.$scope.$apply();
    };
  };
}

const MemoComponent = React.memo((props: Props) => {
  props.onRender && props.onRender();
  return <div>{props.foo}</div>;
});

const MyContext = React.createContext<string>('');

const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <MyContext.Provider value="world">{children}</MyContext.Provider>
);

const TestAngularClass = reactular(ClassComponent, ['foo', 'bar', 'baz']);
const TestAngularFunction = reactular(FunctionComponent, [
  'foo',
  'bar',
  'baz',
  'onUnmount',
]);
const TestAngularNoProps = reactular(NoPropsFunctionComponent);
const TestAngularNoPropsClass = reactular(NoPropsClassComponent);
const TestAngularInjectableWrapper = reactular(ContextComponent, [], 'wrapper');
const TestAngularWrapper = reactular(ContextComponent, [], wrapper);
const TestAngularClassTwo = reactular(ClassComponentTwo, [
  'values',
  'onComponentWillUnmount',
  'onRender',
  'onChange',
]);
const TestAngularMemo = reactular(MemoComponent, ['foo', 'onRender']);

module('test', [])
  .component('testAngularClass', TestAngularClass)
  .component('testAngularFunction', TestAngularFunction)
  .component('testAngularNoProps', TestAngularNoProps)
  .component('testAngularNoPropsClass', TestAngularNoPropsClass)
  .constant('foo', 'CONSTANT FOO')
  .factory('wrapper', (foo: string) => {
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <MyContext.Provider value={foo}>{children}</MyContext.Provider>
    );
    return wrapper;
  })
  .component('testAngularInjectableWrapper', TestAngularInjectableWrapper)
  .component('testAngularWrapper', TestAngularWrapper)
  .component('testAngularClassTwo', TestAngularClassTwo)
  .component('testAngularClassTwoWrapper', new ClassComponentTwoWrapper())
  .component('testAngularMemo', TestAngularMemo);

bootstrap($([]), ['test'], { strictDi: true });

interface Props {
  bar: boolean[];
  baz(value: number): void;
  foo: number;
  onRender?(): void;
  onUnmount?(): void;
  children?: React.ReactNode;
}

describe('reactular', () => {
  let $compile: ICompileService;
  let $rootScope: IRootScopeService;

  beforeEach(() => {
    angular.mock.module('test');
    angular.mock.inject(function ($injector: auto.IInjectorService) {
      $compile = $injector.get('$compile');
      $rootScope = $injector.get('$rootScope');
    });
  });

  describe('initialization', () => {
    it('should give an angular component', () => {
      expect(TestAngularClass.bindings).not.toBeUndefined();
      expect(TestAngularClass.controller).not.toBeUndefined();
    });

    it('should have empty bindings when parameter is an empty array', () => {
      const reactAngularComponent = reactular(NoPropsClassComponent, []);
      expect(reactAngularComponent.bindings).toEqual({});
    });

    it('should have empty bindings when parameter is not passed', () => {
      expect(reactular(NoPropsFunctionComponent).bindings).toEqual({});
    });
  });

  describe('react classes', () => {
    it('should render', async () => {
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
      });
      const element = $(
        `<test-angular-class foo="foo" bar="bar" baz="baz"></test-angular-class>`,
      );

      $compile(element)(scope);
      $rootScope.$apply();
      await wait();
      expect(element.find('p').length).toBe(3);
    });

    it('should render (even if the component takes no props)', async () => {
      const scope = $rootScope.$new(true);
      const element = $(
        `<test-angular-no-props-class></test-angular-no-props-class>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      await wait();
      expect(element.text()).toBe('Foo');
    });

    it('should update', async () => {
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
      });
      const element = $(
        `<test-angular-class foo="foo" bar="bar" baz="baz"></test-angular-class>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      await wait();
      expect(element.find('p').eq(1).text()).toBe('Bar: true,false');
      scope.$apply(() => (scope.bar = [false, true, true]));
      await wait();
      expect(element.find('p').eq(1).text()).toBe('Bar: false,true,true');
    });

    it('should destroy', async () => {
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
      });
      const element = $(
        `<test-angular-class foo="foo" bar="bar" baz="baz"></test-angular-class>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      await wait();
      jest.spyOn(ClassComponent.prototype, 'componentWillUnmount');
      scope.$destroy();
      expect(ClassComponent.prototype.componentWillUnmount).toHaveBeenCalled();
    });

    it('should take callbacks', async () => {
      const baz = jest.fn();
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz,
        foo: 1,
      });
      const element = $(
        `<test-angular-class foo="foo" bar="bar" baz="baz"></test-angular-class>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      await wait();
      Simulate.click(element.find('p').eq(2)[0]);
      expect(baz).toHaveBeenCalledWith(42);
    });

    // TODO: support children
    it('should not support children', async () => {
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
      });
      const element = $(
        `<test-angular-class foo="foo" bar="bar" baz="baz"><span>Transcluded</span></test-angular-class>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      await wait();
      expect(element.find('span').length).toBe(0);
    });
  });

  describe('react functional components', () => {
    it('should render', async () => {
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
      });
      const element = $(
        `<test-angular-function foo="foo" bar="bar" baz="baz"></test-angular-function>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      await wait();
      expect(element.find('p').length).toBe(3);
    });

    it('should render (even if the component takes no props)', async () => {
      const scope = $rootScope.$new(true);
      const element = $(`<test-angular-no-props></test-angular-no-props>`);
      $compile(element)(scope);
      $rootScope.$apply();
      await wait();
      expect(element.text()).toBe('Foo');
    });

    it('should update', async () => {
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
      });
      const element = $(
        `<test-angular-function foo="foo" bar="bar" baz="baz"></test-angular-function>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      await wait();
      expect(element.find('p').eq(1).text()).toBe('Bar: true,false');
      scope.$apply(() => (scope.bar = [false, true, true]));
      await wait();
      expect(element.find('p').eq(1).text()).toBe('Bar: false,true,true');
    });

    it('should destroy', done => {
      const onUnmount = done;
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
        onUnmount,
      });
      const element = $(
        `<test-angular-function foo="foo" bar="bar" baz="baz" on-unmount="onUnmount"></test-angular-function>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      wait().then(() => {
        scope.$destroy();
      });
      // onUnmount is called asynchronously.
      // No assertion, but the test will time out if onUnmount is never called.
    });

    it('should take callbacks', async () => {
      const baz = jest.fn();
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz,
        foo: 1,
      });
      const element = $(
        `<test-angular-function foo="foo" bar="bar" baz="baz"></test-angular-function>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      await wait();
      Simulate.click(element.find('p').eq(2)[0]);
      expect(baz).toHaveBeenCalledWith(42);
    });

    it('should render inside a wrapper component', async () => {
      const element = $(`<test-angular-wrapper></test-angular-wrapper>`);
      $compile(element)($rootScope);
      $rootScope.$apply();
      await wait();
      expect(element.find('p').text()).toBe('world');
    });

    it('should inject wrapper strings as components', async () => {
      const element = $(
        `<test-angular-injectable-wrapper></test-angular-injectable-wrapper>`,
      );
      $compile(element)($rootScope);
      $rootScope.$apply();
      await wait();
      expect(element.find('p').text()).toBe('CONSTANT FOO');
    });

    // TODO: support children
    it('should not support children', async () => {
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
      });
      const element = $(
        `<test-angular-function foo="foo" bar="bar" baz="baz"><span>Transcluded</span></test-angular-function>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      await wait();
      expect(element.find('span').length).toBe(0);
    });

    it('should not call render after component unmount', async () => {
      const componentWillUnmountSpy = jest.fn();
      const renderSpy = jest.fn();

      const scope = Object.assign($rootScope.$new(true), {
        onComponentWillUnmount: componentWillUnmountSpy,
        onRender: renderSpy,
        values: ['val1'],
      });
      const element = $(`
        <test-angular-class-two-wrapper
          on-render="onRender"
          on-component-will-unmount="onComponentWillUnmount"
          values="values">
        </test-angular-class-two-wrapper>
      `);

      $compile(element)(scope);

      const childScope = angular
        .element(element.find('test-angular-class-two'))
        .scope();
      $rootScope.$apply();
      await wait();

      // Erase first render caused on apply
      renderSpy.mockClear();
      expect(renderSpy).toBeCalledTimes(0);

      // Destroy child component to cause unmount
      childScope.$destroy();

      // Make sure render on child was not called after unmount
      expect(componentWillUnmountSpy).toBeCalledTimes(1);
      expect(renderSpy).toBeCalledTimes(0);
    });
  });

  it('should re-render memoized components only when props change', async () => {
    const renderSpy = jest.fn();

    const scope = Object.assign($rootScope.$new(true), {
      onRender: renderSpy,
      foo: 1,
    });
    const element = $(`
        <test-angular-memo
          on-render="onRender"
          foo="foo">
        </test-angular-memo>
      `);

    $compile(element)(scope);
    $rootScope.$apply();
    await wait();
    expect(renderSpy).toHaveBeenCalledTimes(1);

    renderSpy.mockClear();
    scope.$apply(() => (scope.foo = 1));
    await wait();
    expect(renderSpy).not.toHaveBeenCalled();

    renderSpy.mockClear();
    scope.$apply(() => (scope.foo = 2));
    await wait();
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
