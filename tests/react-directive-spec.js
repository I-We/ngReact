'use strict';

// phantom doesn't support Function.bind
require('es5-shim');
require('../ngReact');

var React = require('react');
var ReactTestUtils = require('react-dom/test-utils');
var ReactDOM = require('react-dom');
var angular = require('angular');
require('angular-mocks');
var PropTypes = require('prop-types');

function Hello({ fname, lname, changeName, undeclared }) {
  const handleClick = () => {
    var value = changeName();
    if (value) {
      window.GlobalChangeNameValue = value;
    }
  };

  return (
    <div onClick={handleClick}>
      Hello {fname} {lname}
      {undeclared}
    </div>
  );
}

Hello.propTypes = {
  fname: PropTypes.string,
  lname: PropTypes.string,
  changeName: PropTypes.func,
};

function DeepHello({ fname, lname, undeclared }) {
  React.useEffect(() => {
    window.GlobalDeepHelloRenderCount =
      (window.GlobalDeepHelloRenderCount || 0) + 1;
  }, []);

  return (
    <div>
      Hello {fname} {lname}
      {undeclared}
    </div>
  );
}
DeepHello.propTypes = {
  person: PropTypes.object,
};

function People({ items }) {
  var names = items.map(person => person.fname + ' ' + person.lname).join(', ');
  return <div>Hello {names}</div>;
}

People.propTypes = {
  items: PropTypes.array,
};

function UppercaseProp({ Upper }) {
  var names = Upper;
  return <div>Hello {names}</div>;
}
UppercaseProp.propTypes = {
  Upper: PropTypes.string,
};

function Apply({ func }) {
  var fname = func.name || 'apply';
  return <div>{fname}</div>;
}

Apply.propTypes = {
  func: PropTypes.func,
};

function HelloNoPropTypes(props) {
  const { fname, lname, undeclared } = props;
  const handleClick = () => {
    var value = props.changeName();
    if (value) {
      window.GlobalChangeNameValue = value;
    }
  };

  return (
    <div onClick={handleClick}>
      Hello {fname} {lname}
      {undeclared}
    </div>
  );
}

describe('react-directive', () => {
  var provide, compileProvider;
  var compileElement;
  var elm;

  beforeEach(angular.mock.module('react'));

  beforeEach(
    angular.mock.module(($provide, $compileProvider) => {
      compileProvider = $compileProvider;
      provide = $provide;
    })
  );

  afterEach(() => {
    window.GlobalHello = undefined;
  });

  beforeEach(inject(($rootScope, $compile) => {
    compileElement = (html, scope) => {
      scope = scope || $rootScope;
      var elm = angular.element(html);
      $compile(elm)(scope);
      scope.$digest();
      return elm;
    };
  }));

  describe('creation', () => {
    beforeEach(() => {
      window.GlobalHello = Hello;
      provide.value('InjectedHello', Hello);
    });

    afterEach(() => {
      window.GlobalHello = undefined;
    });

    it('should create global component with name', () => {
      compileProvider.directive('globalHello', reactDirective => {
        return reactDirective('GlobalHello');
      });

      ReactDOM.flushSync(function () {
        elm = compileElement('<global-hello/>');
      });

      expect(elm.text().trim()).toEqual('Hello');
    });

    it('should create with component', () => {
      compileProvider.directive('helloFromComponent', reactDirective => {
        return reactDirective(Hello);
      });

      ReactDOM.flushSync(function () {
        elm = compileElement('<hello-from-component/>');
      });

      expect(elm.text().trim()).toEqual('Hello');
    });

    it('should create injectable component with name', () => {
      compileProvider.directive('injectedHello', reactDirective => {
        return reactDirective('InjectedHello');
      });

      ReactDOM.flushSync(function () {
        elm = compileElement('<injected-hello/>');
      });

      expect(elm.text().trim()).toEqual('Hello');
    });
  });

  it('should create with component', () => {
    compileProvider.directive('helloFromComponent', reactDirective => {
      return reactDirective(Hello);
    });

    ReactDOM.flushSync(function () {
      elm = compileElement('<hello-from-component/>');
    });
    expect(elm.text().trim()).toEqual('Hello');
  });

  describe('properties', () => {
    beforeEach(() => {
      provide.value('Hello', Hello);
      compileProvider.directive('hello', reactDirective => {
        return reactDirective('Hello');
      });
    });

    it('should be possible to provide a custom directive configuration', () => {
      compileProvider.directive('confHello', reactDirective => {
        return reactDirective(Hello, undefined, { restrict: 'C' });
      });
      ReactDOM.flushSync(function () {
        elm = compileElement('<div class="conf-hello"/>');
      });
      expect(elm.text().trim()).toEqual('Hello');
    });

    it('should be possible to provide properties from directive to the reactDirective', inject($rootScope => {
      compileProvider.directive('helloComponent', reactDirective => {
        return reactDirective(Hello, undefined, undefined, {
          fname: 'Clark',
          lname: 'Kent',
        });
      });
      ReactDOM.flushSync(function () {
        elm = compileElement('<hello-component />', $rootScope.$new());
      });
      expect(elm.text().trim()).toEqual('Hello Clark Kent');
    }));

    it('properties passed to reactDirective should override colliding properties passed as param', inject($rootScope => {
      compileProvider.directive('helloComponent', reactDirective => {
        return reactDirective(Hello, undefined, undefined, {
          fname: 'Clark',
          lname: 'Kent',
        });
      });
      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello-component fname="\'toBeOverridden\'"/>',
          $rootScope.$new()
        );
      });
      expect(elm.text().trim()).toEqual('Hello Clark Kent');
    }));

    it('should bind to properties on scope', inject($rootScope => {
      var scope = $rootScope.$new();
      scope.firstName = 'Clark';
      scope.lastName = 'Kent';

      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello fname="firstName" lname="lastName"/>',
          scope
        );
      });
      expect(elm.text().trim()).toEqual('Hello Clark Kent');
    }));

    it('should bind to object on scope', inject($rootScope => {
      var scope = $rootScope.$new();
      scope.person = { firstName: 'Clark', lastName: 'Kent' };

      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello fname="person.firstName" lname="person.lastName"/>',
          scope
        );
      });
      expect(elm.text().trim()).toEqual('Hello Clark Kent');
    }));

    it('should bind a capitalized property', inject($rootScope => {
      provide.value('UpperHello', UppercaseProp);
      compileProvider.directive('upperHello', reactDirective => {
        return reactDirective('UpperHello');
      });

      var scope = $rootScope.$new();
      scope.person = { name: 'Clark Kent' };

      ReactDOM.flushSync(function () {
        elm = compileElement('<upper-hello Upper="person.name" />', scope);
      });
      expect(elm.text().trim()).toEqual('Hello Clark Kent');
    }));

    it('should rerender when scope is updated', inject($rootScope => {
      var scope = $rootScope.$new();
      scope.person = { firstName: 'Clark', lastName: 'Kent' };

      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello fname="person.firstName" lname="person.lastName"/>',
          scope
        );
      });

      expect(elm.text().trim()).toEqual('Hello Clark Kent');

      scope.person.firstName = 'Bruce';
      scope.person.lastName = 'Banner';
      scope.$apply();

      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello fname="person.firstName" lname="person.lastName"/>',
          scope
        );
      });

      expect(elm.text().trim()).toEqual('Hello Bruce Banner');
    }));

    it('should accept callbacks as properties', inject($rootScope => {
      var scope = $rootScope.$new();
      scope.person = {
        fname: 'Clark',
        lname: 'Kent',
      };
      scope.change = () => {
        scope.person.fname = 'Bruce';
        scope.person.lname = 'Banner';
      };

      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello fname="person.fname" lname="person.lname" change-name="change"/>',
          scope
        );
      });

      expect(elm.text().trim()).toEqual('Hello Clark Kent');

      ReactTestUtils.Simulate.click(elm[0].firstChild);

      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello fname="person.fname" lname="person.lname" change-name="change"/>',
          scope
        );
      });

      expect(elm.text().trim()).toEqual('Hello Bruce Banner');
    }));

    it(': callback should not fail when executed inside a scope apply', inject($rootScope => {
      var scope = $rootScope.$new();
      scope.person = {
        fname: 'Clark',
        lname: 'Kent',
      };
      scope.change = () => {
        scope.person.fname = 'Bruce';
        scope.person.lname = 'Banner';
      };

      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello fname="person.fname" lname="person.lname" change-name="change"/>',
          scope
        );
      });

      scope.$apply(() => {
        expect(function () {
          ReactTestUtils.Simulate.click(elm[0].firstChild);
        }).not.toThrow();
      });
    }));

    it('should return callbacks value', inject($rootScope => {
      var scope = $rootScope.$new();
      scope.person = {
        fname: 'Clark',
        lname: 'Kent',
      };
      scope.change = () => {
        scope.person.fname = 'Bruce';
        scope.person.lname = 'Banner';
        return scope.person.fname + ' ' + scope.person.lname;
      };

      window.GlobalChangeNameValue = 'Clark Kent';

      expect(window.GlobalChangeNameValue).toEqual('Clark Kent');

      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello fname="person.fname" lname="person.lname" change-name="change"/>',
          scope
        );
      });

      expect(elm.text().trim()).toEqual('Hello Clark Kent');

      expect(window.GlobalChangeNameValue).toEqual('Clark Kent');

      ReactTestUtils.Simulate.click(elm[0].firstChild);

      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello fname="person.fname" lname="person.lname" change-name="change"/>',
          scope
        );
      });

      expect(elm.text().trim()).toEqual('Hello Bruce Banner');

      expect(window.GlobalChangeNameValue).toEqual('Bruce Banner');
    }));

    it('should scope.$apply() callback invocations made after changing props directly', inject($rootScope => {
      var scope = $rootScope.$new();
      scope.changeCount = 0;
      scope.person = {
        fname: 'Clark',
        lname: 'Kent',
      };
      scope.change = () => {
        scope.changeCount += 1;
      };

      var template = `<div>
        <p>{{changeCount}}</p>
        <hello fname="person.fname" lname="person.lname" change-name="change"/>
      </div>`;

      ReactDOM.flushSync(function () {
        elm = compileElement(template, scope);
      });

      expect(elm.children().eq(0).text().trim()).toEqual('0');

      // first callback invocation
      ReactTestUtils.Simulate.click(elm[0].children.item(1).lastChild);

      expect(elm.children().eq(0).text().trim()).toEqual('1');

      // change props directly
      scope.person.fname = 'Peter';
      scope.$apply();

      expect(elm.children().eq(0).text().trim()).toEqual('1');

      // second callback invocation
      ReactTestUtils.Simulate.click(elm[0].children.item(1).lastChild);

      expect(elm.children().eq(0).text().trim()).toEqual('2');
    }));

    it('should accept undeclared properties when specified', inject($rootScope => {
      compileProvider.directive('helloWithUndeclared', reactDirective => {
        return reactDirective('Hello', ['undeclared']);
      });
      var scope = $rootScope.$new();
      scope.name = 'Bruce Wayne';

      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello-with-undeclared undeclared="name"/>',
          scope
        );
      });
      expect(elm.text().trim()).toEqual('Hello  Bruce Wayne');
    }));

    it('should pass all attributes as props when no PropTypes is provided', inject($rootScope => {
      provide.value('HelloNoPropTypes', HelloNoPropTypes);
      compileProvider.directive('helloNoPropTypes', reactDirective =>
        reactDirective('HelloNoPropTypes')
      );

      var scope = $rootScope.$new();
      scope.firstName = 'Clark';
      scope.lastName = 'Kent';

      ReactDOM.flushSync(function () {
        elm = compileElement('<hello-no-prop-types fname="firstName"/>', scope);
      });

      expect(elm.text().trim()).toEqual('Hello Clark');

      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello-no-prop-types fname="firstName" lname="lastName"/>',
          scope
        );
      });

      expect(elm.text().trim()).toEqual('Hello Clark Kent');
    }));

    describe('propNames options', () => {
      it('should accept propNames as array of arrays', inject($rootScope => {
        compileProvider.directive('customHelloComponent', reactDirective => {
          return reactDirective(Hello, [['fname'], ['lname', {}]]);
        });

        var scope = $rootScope.$new();
        scope.person = { firstName: 'Clark', lastName: 'Kent' };

        ReactDOM.flushSync(function () {
          elm = compileElement(
            '<custom-hello-component fname="person.firstName" lname="person.lastName"/>',
            scope
          );
        });

        expect(elm.text().trim()).toEqual('Hello Clark Kent');

        scope.person.firstName = 'Bruce';
        scope.person.lastName = 'Banner';
        scope.$apply();

        ReactDOM.flushSync(function () {
          elm = compileElement(
            '<custom-hello-component fname="person.firstName" lname="person.lastName"/>',
            scope
          );
        });

        expect(elm.text().trim()).toEqual('Hello Bruce Banner');
      }));

      describe('watchDepth', () => {
        it('should support "reference" as individual watchDepth option', inject($rootScope => {
          compileProvider.directive('customPeople', reactDirective => {
            return reactDirective(People, [
              ['items', { watchDepth: 'reference' }],
            ]);
          });

          var scope = $rootScope.$new();
          scope.items = [
            { fname: 'Clark', lname: 'Kent' },
            { fname: 'Bruce', lname: 'Wayne' },
          ];

          ReactDOM.flushSync(function () {
            elm = compileElement('<custom-people items="items" />', scope);
          });

          expect(elm.text().trim()).toEqual('Hello Clark Kent, Bruce Wayne');

          scope.items[1] = { fname: 'Diana', lname: 'Prince' };
          scope.$apply();

          expect(elm.text().trim()).toEqual('Hello Clark Kent, Bruce Wayne');

          scope.items = scope.items.slice(0);
          scope.$apply();

          ReactDOM.flushSync(function () {
            elm = compileElement('<custom-people items="items" />', scope);
          });

          expect(elm.text().trim()).toEqual('Hello Clark Kent, Diana Prince');
        }));

        it('should support "collection" as individual watchDepth option', inject($rootScope => {
          compileProvider.directive('customPeople', reactDirective => {
            return reactDirective(People, [
              ['items', { watchDepth: 'collection' }],
            ]);
          });

          var scope = $rootScope.$new();
          scope.items = [
            { fname: 'Clark', lname: 'Kent' },
            { fname: 'Bruce', lname: 'Wayne' },
          ];
          ReactDOM.flushSync(function () {
            elm = compileElement(
              '<custom-people items="items" watch-depth="reference" />',
              scope
            );
          });

          expect(elm.text().trim()).toEqual('Hello Clark Kent, Bruce Wayne');

          scope.items[1].lname = 'Banner';
          scope.$apply();

          expect(elm.text().trim()).toEqual('Hello Clark Kent, Bruce Wayne');

          scope.items[1] = { fname: 'Bruce', lname: 'Banner' };
          scope.$apply();

          ReactDOM.flushSync(function () {
            elm = compileElement(
              '<custom-people items="items" watch-depth="reference" />',
              scope
            );
          });

          expect(elm.text().trim()).toEqual('Hello Clark Kent, Bruce Banner');
        }));

        it('should support "value" as individual watchDepth option', inject($rootScope => {
          compileProvider.directive('customPeople', reactDirective => {
            return reactDirective(People, [['items', { watchDepth: 'value' }]]);
          });

          var scope = $rootScope.$new();
          scope.items = [
            { fname: 'Clark', lname: 'Kent' },
            { fname: 'Bruce', lname: 'Wayne' },
          ];

          ReactDOM.flushSync(function () {
            elm = compileElement(
              '<custom-people items="items" watch-depth="reference" />',
              scope
            );
          });

          expect(elm.text().trim()).toEqual('Hello Clark Kent, Bruce Wayne');

          scope.items[1].lname = 'Banner';
          scope.$apply();

          ReactDOM.flushSync(function () {
            elm = compileElement(
              '<custom-people items="items" watch-depth="reference" />',
              scope
            );
          });

          expect(elm.text().trim()).toEqual('Hello Clark Kent, Bruce Banner');
        }));

        it("should fall back to directive's watch depth when no individual watchDepth option is provided", inject($rootScope => {
          compileProvider.directive('customPeople', reactDirective => {
            return reactDirective(People, [['items', {}]]);
          });

          var scope = $rootScope.$new();
          scope.items = [
            { fname: 'Clark', lname: 'Kent' },
            { fname: 'Bruce', lname: 'Wayne' },
          ];

          ReactDOM.flushSync(function () {
            elm = compileElement(
              '<custom-people items="items" watch-depth="reference" />',
              scope
            );
          });

          expect(elm.text().trim()).toEqual('Hello Clark Kent, Bruce Wayne');

          scope.items[1] = { fname: 'Diana', lname: 'Prince' };
          scope.$apply();

          expect(elm.text().trim()).toEqual('Hello Clark Kent, Bruce Wayne');

          scope.items = scope.items.slice(0);
          scope.$apply();

          ReactDOM.flushSync(function () {
            elm = compileElement(
              '<custom-people items="items" watch-depth="reference" />',
              scope
            );
          });

          expect(elm.text().trim()).toEqual('Hello Clark Kent, Diana Prince');
        }));
      });

      describe('wrapApply', () => {
        it('should wrap functions by default', inject($rootScope => {
          compileProvider.directive('apply', reactDirective => {
            return reactDirective(Apply);
          });

          var scope = $rootScope.$new();
          scope.func = function func() {};

          ReactDOM.flushSync(function () {
            elm = compileElement('<apply func="func" />', scope);
          });

          expect(elm.text().trim()).toEqual('wrapped');
        }));

        it('should not wrap functions if wrapApply is false ', inject($rootScope => {
          compileProvider.directive('apply', reactDirective => {
            return reactDirective(Apply, [['func', { wrapApply: false }]]);
          });

          var scope = $rootScope.$new();
          scope.func = function func() {};
          ReactDOM.flushSync(function () {
            elm = compileElement('<apply func="func" />', scope);
          });

          expect(elm.text().trim()).toEqual('func');
        }));
      });
    });
  });

  describe('watch-depth', () => {
    describe('value', () => {
      var elm, scope;

      beforeEach(inject($rootScope => {
        provide.value('Hello', Hello);
        compileProvider.directive('hello', reactDirective => {
          return reactDirective('Hello');
        });

        scope = $rootScope.$new();
        scope.person = { fname: 'Clark', lname: 'Kent' };
        ReactDOM.flushSync(function () {
          elm = compileElement(
            '<hello fname="person.fname" lname="person.lname" watch-depth="value"/>',
            scope
          );
        });
      }));

      it('should rerender when a property of scope object is updated', () =>
        inject($rootScope => {
          expect(elm.text().trim()).toEqual('Hello Clark Kent');

          scope.person.fname = 'Bruce';
          scope.person.lname = 'Banner';

          scope.$apply();

          ReactDOM.flushSync(function () {
            elm = compileElement(
              '<hello fname="person.fname" lname="person.lname" watch-depth="value"/>',
              scope
            );
          });

          expect(elm.text().trim()).toEqual('Hello Bruce Banner');
        }));
    });

    describe('collection', () => {
      var elm, scope;

      beforeEach(inject($rootScope => {
        provide.value('People', People);
        compileProvider.directive('people', reactDirective => {
          return reactDirective('People');
        });
        scope = $rootScope.$new();
        scope.people = [{ fname: 'Clark', lname: 'Kent' }];
        ReactDOM.flushSync(function () {
          elm = compileElement(
            '<people items="people" watch-depth="collection"/>',
            scope
          );
        });
      }));

      it('should rerender when an item is added to array in scope', () =>
        inject(() => {
          expect(elm.text().trim()).toEqual('Hello Clark Kent');

          scope.people.push({ fname: 'Bruce', lname: 'Banner' });
          scope.$apply();
          ReactDOM.flushSync(function () {
            elm = compileElement(
              '<people items="people" watch-depth="collection"/>',
              scope
            );
          });

          expect(elm.text().trim()).toEqual('Hello Clark Kent, Bruce Banner');
        }));

      it('should NOT rerender when an item in the array gets modified', () =>
        inject(() => {
          expect(elm.text().trim()).toEqual('Hello Clark Kent');

          var person = scope.people[0];
          person.fname = 'Bruce';
          person.lname = 'Banner';
          scope.$apply();

          expect(elm.text().trim()).toEqual('Hello Clark Kent');
        }));
    });
  });

  describe('destruction', () => {
    beforeEach(() => {
      provide.value('Hello', Hello);
      compileProvider.directive('hello', reactDirective => {
        return reactDirective('Hello');
      });
    });

    it('should unmount component when scope is destroyed', inject($rootScope => {
      var scope = $rootScope.$new();
      scope.person = { firstName: 'Clark', lastName: 'Kent' };
      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello fname="person.firstName" lname="person.lastName"/>',
          scope
        );
      });
      scope.$destroy();

      //unmountComponentAtNode returns:
      // * true if a component was unmounted and
      // * false if there was no component to unmount.
      expect(ReactDOM.unmountComponentAtNode(elm[0])).toEqual(false);
    }));
  });

  describe('deferred destruction', function () {
    beforeEach(() => {
      provide.value('Hello', Hello);
      compileProvider.directive('hello', reactDirective => {
        return reactDirective('Hello');
      });
    });

    it('should not unmount component when scope is destroyed', inject($rootScope => {
      var scope = $rootScope.$new();
      scope.person = { firstName: 'Clark', lastName: 'Kent' };
      scope.callback = jasmine.createSpy('callback');

      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello fname="person.firstName" lname="person.lastName" on-scope-destroy="callback()"/>',
          scope
        );
      });
      scope.$destroy();

      //unmountComponentAtNode returns:
      // * true if a component was unmounted and
      // * false if there was no component to unmount.
      expect(ReactDOM.unmountComponentAtNode(elm[0])).toEqual(false);

      expect(scope.callback.calls.count()).toEqual(1);
    }));

    it('should pass unmount function as a "unmountComponent" parameter to callback', inject($rootScope => {
      var scope = $rootScope.$new();
      scope.person = { firstName: 'Clark', lastName: 'Kent' };
      scope.callback = function (unmountFn) {
        if (unmountFn) {
          unmountFn();
        }
      };

      spyOn(scope, 'callback').and.callThrough();

      ReactDOM.flushSync(function () {
        elm = compileElement(
          '<hello fname="person.firstName" lname="person.lastName" on-scope-destroy="callback(unmountComponent)"/>',
          scope
        );
      });
      scope.$destroy();
      //unmountComponentAtNode returns:
      // * true if a component was unmounted and
      // * false if there was no component to unmount.
      expect(ReactDOM.unmountComponentAtNode(elm[0])).toEqual(false);

      expect(scope.callback.calls.count()).toEqual(1);
    }));
  });
});
