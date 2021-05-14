import angular, {
  auto,
  bootstrap,
  element as $,
  IAugmentedJQuery,
  ICompileService,
  IComponentOptions,
  IController,
  IHttpService,
  IRootScopeService,
  IQService,
  IScope,
  module,
} from 'angular';
import 'angular-mocks';
import * as React from 'react';
import { Simulate } from 'react-dom/test-utils';
import { reactular } from './reactular';

class TestOne extends React.Component<Props> {
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

const TestTwo: React.FC<Props> = props => {
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

const TestThree: React.FC = () => <div>Foo</div>;

class TestFour extends React.Component<Props> {
  render() {
    return <div>Foo</div>;
  }
}

class TestSixService {
  constructor(private $q: IQService) {}

  foo() {
    return this.$q.resolve('testSixService result');
  }
}

type DIProps = {
  $element: IAugmentedJQuery;
  $http: IHttpService;
  testSixService: TestSixService;
};

class TestSix extends React.Component<Props & DIProps> {
  state = {
    elementText: '',
    result: '',
    testSixService: '',
  };

  render() {
    return (
      <div>
        <p>{this.state.result}</p>
        <p>{this.state.elementText}</p>
        <p>{this.state.testSixService}</p>
        <p>{this.props.foo}</p>
        <span>$element result</span>
      </div>
    );
  }

  componentDidMount() {
    this.setState({
      elementText: this.props.$element.find('span').text(),
    });
    this.props.$http
      .get('https://example.com/')
      .then(_ => this.setState({ result: _.data }));
    this.props.testSixService
      .foo()
      .then(_ => this.setState({ testSixService: _ }));
  }
}

function TestSeven(props: Props) {
  return <p>{props.foo}</p>;
}

interface TestEightProps {
  onChange: jest.Mock;
  onComponentWillUnmount: jest.Mock;
  onRender: jest.Mock;
  values: string[];
}

class TestEight extends React.Component<TestEightProps> {
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

class TestEightWrapper implements IComponentOptions {
  bindings = {
    onComponentWillUnmount: '<',
    onRender: '<',
    values: '<',
  };
  template = `<test-angular-eight
                on-change="$ctrl.onChange"
                on-component-will-unmount="$ctrl.onComponentWillUnmount"
                on-render="$ctrl.onRender"
                values="$ctrl.values">
              </test-angular-eight>`;
  controller = class implements IController {
    values!: string[];

    constructor(private $scope: IScope) {}

    onChange = (values: string[]) => {
      this.values = values;
      this.$scope.$apply();
    };
  };
}

const MyContext = React.createContext<string>('');

const wrapper: React.FC = ({ children }) => (
  <MyContext.Provider value="world">{children}</MyContext.Provider>
);

const TestAngularOne = reactular(TestOne, ['foo', 'bar', 'baz']);
const TestAngularTwo = reactular(TestTwo, ['foo', 'bar', 'baz', 'onUnmount']);
const TestAngularThree = reactular(TestThree);
const TestAngularFour = reactular(TestFour);
const TestAngularSix = reactular(TestSix, ['foo'], 'wrapper');
const TestAngularSeven = reactular(TestSeven, [], wrapper);
const TestAngularEight = reactular(TestEight, [
  'values',
  'onComponentWillUnmount',
  'onRender',
  'onChange',
]);

module('test', [])
  .component('testAngularOne', TestAngularOne)
  .component('testAngularTwo', TestAngularTwo)
  .component('testAngularThree', TestAngularThree)
  .component('testAngularFour', TestAngularFour)
  .service('testSixService', ['$q', TestSixService])
  .constant('foo', 'CONSTANT FOO')
  .component('testAngularSix', TestAngularSix)
  .component('testAngularSeven', TestAngularSeven)
  .component('testAngularEight', TestAngularEight)
  .component('testAngularEightWrapper', new TestEightWrapper());

bootstrap($([]), ['test'], { strictDi: true });

interface Props {
  bar: boolean[];
  baz(value: number): void;
  foo: number;
  onUnmount?(): void;
}

describe('reactular', () => {
  let $compile: ICompileService;
  // let $http: IHttpService
  // let $q: IQService
  let $rootScope: IRootScopeService;

  beforeEach(() => {
    angular.mock.module('test');
    angular.mock.inject(function ($injector: auto.IInjectorService) {
      $compile = $injector.get('$compile');
      // $http = $inject.get('$http');
      // $q = $inject.get('$q');
      $rootScope = $injector.get('$rootScope');
    });
  });

  describe('initialization', () => {
    it('should give an angular component', () => {
      expect(TestAngularOne.bindings).not.toBeUndefined();
      expect(TestAngularOne.controller).not.toBeUndefined();
    });

    it('should have empty bindings when parameter is an empty array', () => {
      const reactAngularComponent = reactular(TestFour, []);
      expect(reactAngularComponent.bindings).toEqual({});
    });

    it('should have empty bindings when parameter is not passed', () => {
      expect(reactular(TestThree).bindings).toEqual({});
    });
  });

  describe('react classes', () => {
    it('should render', () => {
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
      });
      const element = $(
        `<test-angular-one foo="foo" bar="bar" baz="baz"></test-angular-one>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      expect(element.find('p').length).toBe(3);
    });

    it('should render (even if the component takes no props)', () => {
      const scope = $rootScope.$new(true);
      const element = $(`<test-angular-four></test-angular-four>`);
      $compile(element)(scope);
      $rootScope.$apply();
      expect(element.text()).toBe('Foo');
    });

    it('should update', () => {
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
      });
      const element = $(
        `<test-angular-one foo="foo" bar="bar" baz="baz"></test-angular-one>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      expect(element.find('p').eq(1).text()).toBe('Bar: true,false');
      scope.$apply(() => (scope.bar = [false, true, true]));
      expect(element.find('p').eq(1).text()).toBe('Bar: false,true,true');
    });

    it('should destroy', () => {
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
      });
      const element = $(
        `<test-angular-one foo="foo" bar="bar" baz="baz"></test-angular-one>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      jest.spyOn(TestOne.prototype, 'componentWillUnmount');
      scope.$destroy();
      expect(TestOne.prototype.componentWillUnmount).toHaveBeenCalled();
    });

    it('should take callbacks', () => {
      const baz = jest.fn();
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz,
        foo: 1,
      });
      const element = $(
        `<test-angular-one foo="foo" bar="bar" baz="baz"></test-angular-one>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      Simulate.click(element.find('p').eq(2)[0]);
      expect(baz).toHaveBeenCalledWith(42);
    });

    // TODO: support children
    it('should not support children', () => {
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
      });
      const element = $(
        `<test-angular-one foo="foo" bar="bar" baz="baz"><span>Transcluded</span></test-angular-one>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      expect(element.find('span').length).toBe(0);
    });
  });

  describe('react stateless components', () => {
    it('should render', () => {
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
      });
      const element = $(
        `<test-angular-two foo="foo" bar="bar" baz="baz"></test-angular-two>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      expect(element.find('p').length).toBe(3);
    });

    it('should render (even if the component takes no props)', () => {
      const scope = $rootScope.$new(true);
      const element = $(`<test-angular-three></test-angular-three>`);
      $compile(element)(scope);
      $rootScope.$apply();
      expect(element.text()).toBe('Foo');
    });

    it('should update', () => {
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
      });
      const element = $(
        `<test-angular-two foo="foo" bar="bar" baz="baz"></test-angular-two>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      expect(element.find('p').eq(1).text()).toBe('Bar: true,false');
      scope.$apply(() => (scope.bar = [false, true, true]));
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
        `<test-angular-two foo="foo" bar="bar" baz="baz" on-unmount="onUnmount"></test-angular-two>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      scope.$destroy();
      // onUnmount is called asynchronously.
      // No assertion, but the test will time out if onUnmount is never called.
    });

    it('should take callbacks', () => {
      const baz = jest.fn();
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz,
        foo: 1,
      });
      const element = $(
        `<test-angular-two foo="foo" bar="bar" baz="baz"></test-angular-two>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      Simulate.click(element.find('p').eq(2)[0]);
      expect(baz).toHaveBeenCalledWith(42);
    });

    // TODO: support children
    it('should not support children', () => {
      const scope = Object.assign($rootScope.$new(true), {
        bar: [true, false],
        baz: (value: number) => value + 1,
        foo: 1,
      });
      const element = $(
        `<test-angular-two foo="foo" bar="bar" baz="baz"><span>Transcluded</span></test-angular-two>`,
      );
      $compile(element)(scope);
      $rootScope.$apply();
      expect(element.find('span').length).toBe(0);
    });

    it('should not call render after component unmount', () => {
      const componentWillUnmountSpy = jest.fn();
      const renderSpy = jest.fn();

      const scope = Object.assign($rootScope.$new(true), {
        onComponentWillUnmount: componentWillUnmountSpy,
        onRender: renderSpy,
        values: ['val1'],
      });
      const element = $(`
        <test-angular-eight-wrapper
          on-render="onRender"
          on-component-will-unmount="onComponentWillUnmount"
          values="values">
        </test-angular-eight-wrapper>
      `);

      $compile(element)(scope);

      const childScope = angular
        .element(element.find('test-angular-eight'))
        .scope();
      $rootScope.$apply();

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
});
