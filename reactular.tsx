import { IComponentOptions, IController, IChangesObject, auto } from 'angular';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

type OnChanges<T> = {
  [K in keyof T]: IChangesObject<T[K]>;
};

export const reactular = <Props extends object>(
  Component: React.ComponentType<Props>,
  bindingNames: Array<keyof Props> = [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wrapper?: string | React.ComponentType<React.PropsWithChildren<any>>,
): IComponentOptions => {
  const bindings: {
    [prop: string]: '<';
  } = {};
  for (const name of bindingNames) {
    bindings[name as string] = '<';
  }

  return {
    bindings,
    controller: [
      '$element',
      '$injector',
      class implements IController {
        private destroyed = false;
        private props: Props = {} as Props;

        constructor(
          private readonly $element: JQLite,
          private readonly $injector: auto.IInjectorService,
        ) {}

        public $onChanges(changes: OnChanges<Props>): void {
          if (this.destroyed) {
            return;
          }
          for (const change in changes) {
            if (changes.hasOwnProperty(change)) {
              this.props[change] = changes[change].currentValue;
            }
          }

          const Wrapper =
            typeof wrapper === 'string'
              ? this.$injector.get<
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  React.ComponentType<React.PropsWithChildren<any>>
                >(wrapper)
              : wrapper;

          let nodes = <Component {...this.props} />;
          if (Wrapper) {
            nodes = <Wrapper>{nodes}</Wrapper>;
          }

          render(nodes, this.$element[0]);
        }

        public $onDestroy(): void {
          this.destroyed = true;
          unmountComponentAtNode(this.$element[0]);
        }
      },
    ],
  };
};
