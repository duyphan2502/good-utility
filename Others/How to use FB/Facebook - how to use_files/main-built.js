
// ==========================================
// Copyright 2013 Twitter, Inc
// Licensed under The MIT License
// http://opensource.org/licenses/MIT
// ==========================================



define(

  'vendor/flight/lib/utils',[],

  function () {

    var arry = [];
    var DEFAULT_INTERVAL = 100;

    var utils = {

      isDomObj: function(obj) {
        return !!(obj.nodeType || (obj === window));
      },

      toArray: function(obj, from) {
        return arry.slice.call(obj, from);
      },

      // returns new object representing multiple objects merged together
      // optional final argument is boolean which specifies if merge is recursive
      // original objects are unmodified
      //
      // usage:
      //   var base = {a:2, b:6};
      //   var extra = {b:3, c:4};
      //   merge(base, extra); //{a:2, b:3, c:4}
      //   base; //{a:2, b:6}
      //
      //   var base = {a:2, b:6};
      //   var extra = {b:3, c:4};
      //   var extraExtra = {a:4, d:9};
      //   merge(base, extra, extraExtra); //{a:4, b:3, c:4. d: 9}
      //   base; //{a:2, b:6}
      //
      //   var base = {a:2, b:{bb:4, cc:5}};
      //   var extra = {a:4, b:{cc:7, dd:1}};
      //   merge(base, extra, true); //{a:4, b:{bb:4, cc:7, dd:1}}
      //   base; //{a:2, b:6}

      merge: function(/*obj1, obj2,....deepCopy*/) {
        // unpacking arguments by hand benchmarked faster
        var l = arguments.length,
            i = 0,
            args = new Array(l + 1);
        for (; i < l; i++) args[i + 1] = arguments[i];

        if (l === 0) {
          return {};
        }

        //start with empty object so a copy is created
        args[0] = {};

        if (args[args.length - 1] === true) {
          //jquery extend requires deep copy as first arg
          args.pop();
          args.unshift(true);
        }

        return $.extend.apply(undefined, args);
      },

      // updates base in place by copying properties of extra to it
      // optionally clobber protected
      // usage:
      //   var base = {a:2, b:6};
      //   var extra = {c:4};
      //   push(base, extra); //{a:2, b:6, c:4}
      //   base; //{a:2, b:6, c:4}
      //
      //   var base = {a:2, b:6};
      //   var extra = {b: 4 c:4};
      //   push(base, extra, true); //Error ("utils.push attempted to overwrite 'b' while running in protected mode")
      //   base; //{a:2, b:6}
      //
      // objects with the same key will merge recursively when protect is false
      // eg:
      // var base = {a:16, b:{bb:4, cc:10}};
      // var extra = {b:{cc:25, dd:19}, c:5};
      // push(base, extra); //{a:16, {bb:4, cc:25, dd:19}, c:5}
      //
      push: function(base, extra, protect) {
        if (base) {
          Object.keys(extra || {}).forEach(function(key) {
            if (base[key] && protect) {
              throw Error("utils.push attempted to overwrite '" + key + "' while running in protected mode");
            }

            if (typeof base[key] == "object" && typeof extra[key] == "object") {
              //recurse
              this.push(base[key], extra[key]);
            } else {
              //no protect, so extra wins
              base[key] = extra[key];
            }
          }, this);
        }

        return base;
      },

      isEnumerable: function(obj, property) {
        return Object.keys(obj).indexOf(property) > -1;
      },

      //build a function from other function(s)
      //util.compose(a,b,c) -> a(b(c()));
      //implementation lifted from underscore.js (c) 2009-2012 Jeremy Ashkenas
      compose: function() {
        var funcs = arguments;

        return function() {
          var args = arguments;

          for (var i = funcs.length-1; i >= 0; i--) {
            args = [funcs[i].apply(this, args)];
          }

          return args[0];
        };
      },

      // Can only unique arrays of homogeneous primitives, e.g. an array of only strings, an array of only booleans, or an array of only numerics
      uniqueArray: function(array) {
        var u = {}, a = [];

        for (var i = 0, l = array.length; i < l; ++i) {
          if (u.hasOwnProperty(array[i])) {
            continue;
          }

          a.push(array[i]);
          u[array[i]] = 1;
        }

        return a;
      },

      debounce: function(func, wait, immediate) {
        if (typeof wait != 'number') {
          wait = DEFAULT_INTERVAL;
        }

        var timeout, result;

        return function() {
          var context = this, args = arguments;
          var later = function() {
            timeout = null;
            if (!immediate) {
              result = func.apply(context, args);
            }
          };
          var callNow = immediate && !timeout;

          clearTimeout(timeout);
          timeout = setTimeout(later, wait);

          if (callNow) {
            result = func.apply(context, args);
          }

          return result;
        };
      },

      throttle: function(func, wait) {
        if (typeof wait != 'number') {
          wait = DEFAULT_INTERVAL;
        }

        var context, args, timeout, throttling, more, result;
        var whenDone = this.debounce(function(){
          more = throttling = false;
        }, wait);

        return function() {
          context = this; args = arguments;
          var later = function() {
            timeout = null;
            if (more) {
              result = func.apply(context, args);
            }
            whenDone();
          };

          if (!timeout) {
            timeout = setTimeout(later, wait);
          }

          if (throttling) {
            more = true;
          } else {
            throttling = true;
            result = func.apply(context, args);
          }

          whenDone();
          return result;
        };
      },

      countThen: function(num, base) {
        return function() {
          if (!--num) { return base.apply(this, arguments); }
        };
      },

      delegate: function(rules) {
        return function(e, data) {
          var target = $(e.target), parent;

          Object.keys(rules).forEach(function(selector) {
            if ((parent = target.closest(selector)).length) {
              data = data || {};
              data.el = parent[0];
              return rules[selector].apply(this, [e, data]);
            }
          }, this);
        };
      }

    };

    return utils;
  }
);



define('vendor/flight/lib/debug',[], function() {

    var logFilter;

    //******************************************************************************************
    // Search object model
    //******************************************************************************************

    function traverse(util, searchTerm, options) {
      var options = options || {};
      var obj = options.obj || window;
      var path = options.path || ((obj==window) ? "window" : "");
      var props = Object.keys(obj);
      props.forEach(function(prop) {
        if ((tests[util] || util)(searchTerm, obj, prop)){
          console.log([path, ".", prop].join(""), "->",["(", typeof obj[prop], ")"].join(""), obj[prop]);
        }
        if(Object.prototype.toString.call(obj[prop])=="[object Object]" && (obj[prop] != obj) && path.split(".").indexOf(prop) == -1) {
          traverse(util, searchTerm, {obj: obj[prop], path: [path,prop].join(".")});
        }
      });
    }

    function search(util, expected, searchTerm, options) {
      if (!expected || typeof searchTerm == expected) {
        traverse(util, searchTerm, options);
      } else {
        console.error([searchTerm, 'must be', expected].join(' '))
      }
    }

    var tests = {
      'name': function(searchTerm, obj, prop) {return searchTerm == prop},
      'nameContains': function(searchTerm, obj, prop) {return prop.indexOf(searchTerm)>-1},
      'type': function(searchTerm, obj, prop) {return obj[prop] instanceof searchTerm},
      'value': function(searchTerm, obj, prop) {return obj[prop] === searchTerm},
      'valueCoerced': function(searchTerm, obj, prop) {return obj[prop] == searchTerm}
    }

    function byName(searchTerm, options) {search('name', 'string', searchTerm, options);};
    function byNameContains(searchTerm, options) {search('nameContains', 'string', searchTerm, options);};
    function byType(searchTerm, options) {search('type', 'function', searchTerm, options);};
    function byValue(searchTerm, options) {search('value', null, searchTerm, options);};
    function byValueCoerced(searchTerm, options) {search('valueCoerced', null, searchTerm, options);};
    function custom(fn, options) {traverse(fn, null, options);};

    //******************************************************************************************
    // Event logging
    //******************************************************************************************

    var ALL = 'all'; //no filter

    //no logging by default
    var defaultEventNamesFilter = [];
    var defaultActionsFilter = [];

    var logFilter = retrieveLogFilter();

    function filterEventLogsByAction(/*actions*/) {
      var actions = [].slice.call(arguments);

      logFilter.eventNames.length || (logFilter.eventNames = ALL);
      logFilter.actions = actions.length ? actions : ALL;
      saveLogFilter();
    }

    function filterEventLogsByName(/*eventNames*/) {
      var eventNames = [].slice.call(arguments);

      logFilter.actions.length || (logFilter.actions = ALL);
      logFilter.eventNames = eventNames.length ? eventNames : ALL;
      saveLogFilter();
    }

    function hideAllEventLogs() {
      logFilter.actions = [];
      logFilter.eventNames = [];
      saveLogFilter();
    }

    function showAllEventLogs() {
      logFilter.actions = ALL;
      logFilter.eventNames = ALL;
      saveLogFilter();
    }

    function saveLogFilter() {
      if (window.localStorage) {
        localStorage.setItem('logFilter_eventNames', logFilter.eventNames);
        localStorage.setItem('logFilter_actions', logFilter.actions);
      }
    }

    function retrieveLogFilter() {
      var result = {
        eventNames: (window.localStorage && localStorage.getItem('logFilter_eventNames')) || defaultEventNamesFilter,
        actions: (window.localStorage && localStorage.getItem('logFilter_actions')) || defaultActionsFilter
      };
      //reconstitute arrays
      Object.keys(result).forEach(function(k) {
        var thisProp = result[k];
        if (typeof thisProp == 'string' && thisProp !== ALL) {
          result[k] = thisProp.split(',');
        }
      });
      return result;
    }

    return {

      enable: function(enable) {
        this.enabled = !!enable;

        if (enable && window.console) {
          console.info('Booting in DEBUG mode');
          console.info('You can configure event logging with DEBUG.events.logAll()/logNone()/logByName()/logByAction()');
        }

        window.DEBUG = this;
      },

      find: {
        byName: byName,
        byNameContains: byNameContains,
        byType: byType,
        byValue: byValue,
        byValueCoerced: byValueCoerced,
        custom: custom
      },

      events: {
        logFilter: logFilter,

        // Accepts any number of action args
        // e.g. DEBUG.events.logByAction("on", "off")
        logByAction: filterEventLogsByAction,

        // Accepts any number of event name args (inc. regex or wildcards)
        // e.g. DEBUG.events.logByName(/ui.*/, "*Thread*");
        logByName: filterEventLogsByName,

        logAll: showAllEventLogs,
        logNone: hideAllEventLogs
      }
    };
  }
);


// ==========================================
// Copyright 2013 Twitter, Inc
// Licensed under The MIT License
// http://opensource.org/licenses/MIT
// ==========================================



define(

  'vendor/flight/lib/compose',[
    './utils',
    './debug'
  ],

  function(util, debug) {

    //enumerables are shims - getOwnPropertyDescriptor shim doesn't work
    var canWriteProtect = debug.enabled && !util.isEnumerable(Object, 'getOwnPropertyDescriptor');
    //whitelist of unlockable property names
    var dontLock = ['mixedIn'];

    if (canWriteProtect) {
      //IE8 getOwnPropertyDescriptor is built-in but throws exeption on non DOM objects
      try {
        Object.getOwnPropertyDescriptor(Object, 'keys');
      } catch(e) {
        canWriteProtect = false;
      }
    }

    function setPropertyWritability(obj, isWritable) {
      if (!canWriteProtect) {
        return;
      }

      var props = Object.create(null);

      Object.keys(obj).forEach(
        function (key) {
          if (dontLock.indexOf(key) < 0) {
            var desc = Object.getOwnPropertyDescriptor(obj, key);
            desc.writable = isWritable;
            props[key] = desc;
          }
        }
      );

      Object.defineProperties(obj, props);
    }

    function unlockProperty(obj, prop, op) {
      var writable;

      if (!canWriteProtect || !obj.hasOwnProperty(prop)) {
        op.call(obj);
        return;
      }

      writable = Object.getOwnPropertyDescriptor(obj, prop).writable;
      Object.defineProperty(obj, prop, { writable: true });
      op.call(obj);
      Object.defineProperty(obj, prop, { writable: writable });
    }

    function mixin(base, mixins) {
      base.mixedIn = base.hasOwnProperty('mixedIn') ? base.mixedIn : [];

      mixins.forEach(function(mixin) {
        if (base.mixedIn.indexOf(mixin) == -1) {
          setPropertyWritability(base, false);
          mixin.call(base);
          base.mixedIn.push(mixin);
        }
      });

      setPropertyWritability(base, true);
    }

    return {
      mixin: mixin,
      unlockProperty: unlockProperty
    };

  }
);

// ==========================================
// Copyright 2013 Twitter, Inc
// Licensed under The MIT License
// http://opensource.org/licenses/MIT
// ==========================================



define(

  'vendor/flight/lib/registry',[
    './utils'
  ],

  function (util) {

    function parseEventArgs(instance, args) {
      var element, type, callback;
      var end = args.length;

      if (typeof args[end - 1] === 'function') {
        end -= 1;
        callback = args[end];
      }

      if (typeof args[end - 1] === 'object') {
        end -= 1;
      }

      if (end == 2) {
        element = args[0];
        type = args[1];
      } else {
        element = instance.node;
        type = args[0];
      }

      return {
        element: element,
        type: type,
        callback: callback
      };
    }

    function matchEvent(a, b) {
      return (
        (a.element == b.element) &&
        (a.type == b.type) &&
        (b.callback == null || (a.callback == b.callback))
      );
    }

    function Registry() {

      var registry = this;

      (this.reset = function() {
        this.components = [];
        this.allInstances = {};
        this.events = [];
      }).call(this);

      function ComponentInfo(component) {
        this.component = component;
        this.attachedTo = [];
        this.instances = {};

        this.addInstance = function(instance) {
          var instanceInfo = new InstanceInfo(instance);
          this.instances[instance.identity] = instanceInfo;
          this.attachedTo.push(instance.node);

          return instanceInfo;
        }

        this.removeInstance = function(instance) {
          delete this.instances[instance.identity];
          var indexOfNode = this.attachedTo.indexOf(instance.node);
          (indexOfNode > -1) && this.attachedTo.splice(indexOfNode, 1);

          if (!Object.keys(this.instances).length) {
            //if I hold no more instances remove me from registry
            registry.removeComponentInfo(this);
          }
        }

        this.isAttachedTo = function(node) {
          return this.attachedTo.indexOf(node) > -1;
        }
      }

      function InstanceInfo(instance) {
        this.instance = instance;
        this.events = [];

        this.addBind = function(event) {
          this.events.push(event);
          registry.events.push(event);
        };

        this.removeBind = function(event) {
          for (var i = 0, e; e = this.events[i]; i++) {
            if (matchEvent(e, event)) {
              this.events.splice(i, 1);
            }
          }
        }
      }

      this.addInstance = function(instance) {
        var component = this.findComponentInfo(instance);

        if (!component) {
          component = new ComponentInfo(instance.constructor);
          this.components.push(component);
        }

        var inst = component.addInstance(instance);

        this.allInstances[instance.identity] = inst;

        return component;
      };

      this.removeInstance = function(instance) {
        var index, instInfo = this.findInstanceInfo(instance);

        //remove from component info
        var componentInfo = this.findComponentInfo(instance);
        componentInfo && componentInfo.removeInstance(instance);

        //remove from registry
        delete this.allInstances[instance.identity];
      };

      this.removeComponentInfo = function(componentInfo) {
        var index = this.components.indexOf(componentInfo);
        (index > -1)  && this.components.splice(index, 1);
      };

      this.findComponentInfo = function(which) {
        var component = which.attachTo ? which : which.constructor;

        for (var i = 0, c; c = this.components[i]; i++) {
          if (c.component === component) {
            return c;
          }
        }

        return null;
      };

      this.findInstanceInfo = function(instance) {
          return this.allInstances[instance.identity] || null;
      };

      this.findInstanceInfoByNode = function(node) {
          var result = [];
          Object.keys(this.allInstances).forEach(function(k) {
            var thisInstanceInfo = this.allInstances[k];
            if(thisInstanceInfo.instance.node === node) {
              result.push(thisInstanceInfo);
            }
          }, this);
          return result;
      };

      this.on = function(componentOn) {
        var instance = registry.findInstanceInfo(this), boundCallback;

        // unpacking arguments by hand benchmarked faster
        var l = arguments.length, i = 1;
        var otherArgs = new Array(l - 1);
        for (; i < l; i++) otherArgs[i - 1] = arguments[i];

        if (instance) {
          boundCallback = componentOn.apply(null, otherArgs);
          if (boundCallback) {
            otherArgs[otherArgs.length-1] = boundCallback;
          }
          var event = parseEventArgs(this, otherArgs);
          instance.addBind(event);
        }
      };

      this.off = function(el, type, callback) {
        var event = parseEventArgs(this, arguments),
            instance = registry.findInstanceInfo(this);

        if (instance) {
          instance.removeBind(event);
        }

        //remove from global event registry
        for (var i = 0, e; e = registry.events[i]; i++) {
          if (matchEvent(e, event)) {
            registry.events.splice(i, 1);
          }
        }
      };

      //debug tools may want to add advice to trigger
      registry.trigger = function() {};

      this.teardown = function() {
        registry.removeInstance(this);
      };

      this.withRegistration = function() {
        this.after('initialize', function() {
          registry.addInstance(this);
        });

        this.around('on', registry.on);
        this.after('off', registry.off);
        //debug tools may want to add advice to trigger
        window.DEBUG && DEBUG.enabled && this.after('trigger', registry.trigger);
        this.after('teardown', {obj:registry, fnName:'teardown'});
      };

    }

    return new Registry;
  }
);

// ==========================================
// Copyright 2013 Twitter, Inc
// Licensed under The MIT License
// http://opensource.org/licenses/MIT
// ==========================================



define(

  'vendor/flight/lib/advice',[
    './utils',
    './compose'
  ],

  function (util, compose) {

    var advice = {

      around: function(base, wrapped) {
        return function composedAround() {
          // unpacking arguments by hand benchmarked faster
          var i = 0, l = arguments.length, args = new Array(l + 1);
          args[0] = base.bind(this);
          for (; i < l; i++) args[i + 1] = arguments[i];

          return wrapped.apply(this, args);
        }
      },

      before: function(base, before) {
        var beforeFn = (typeof before == 'function') ? before : before.obj[before.fnName];
        return function composedBefore() {
          beforeFn.apply(this, arguments);
          return base.apply(this, arguments);
        }
      },

      after: function(base, after) {
        var afterFn = (typeof after == 'function') ? after : after.obj[after.fnName];
        return function composedAfter() {
          var res = (base.unbound || base).apply(this, arguments);
          afterFn.apply(this, arguments);
          return res;
        }
      },

      // a mixin that allows other mixins to augment existing functions by adding additional
      // code before, after or around.
      withAdvice: function() {
        ['before', 'after', 'around'].forEach(function(m) {
          this[m] = function(method, fn) {

            compose.unlockProperty(this, method, function() {
              if (typeof this[method] == 'function') {
                return this[method] = advice[m](this[method], fn);
              } else {
                return this[method] = fn;
              }
            });

          };
        }, this);
      }
    };

    return advice;
  }
);

// ==========================================
// Copyright 2013 Twitter, Inc
// Licensed under The MIT License
// http://opensource.org/licenses/MIT
// ==========================================



define(

  'vendor/flight/lib/logger',[
    './compose',
    './utils'
  ],

  function (compose, util) {

    var actionSymbols = {
      on:'<-',
      trigger: '->',
      off: 'x '
    };

    function elemToString(elem) {
      var tagStr = elem.tagName ? elem.tagName.toLowerCase() : elem.toString();
      var classStr = elem.className ? "." + (elem.className) : "";
      var result = tagStr + classStr;
      return elem.tagName ? ['\'', '\''].join(result) : result;
    }

    function log(action, component, eventArgs) {

      var name, elem, fn, fnName, logFilter, toRegExp, actionLoggable, nameLoggable;

      if (typeof eventArgs[eventArgs.length-1] == 'function') {
        fn = eventArgs.pop();
        fn = fn.unbound || fn; //use unbound version if any (better info)
      }

      if (typeof eventArgs[eventArgs.length - 1] == 'object') {
        eventArgs.pop(); //trigger data arg - not logged right now
      }

      if (eventArgs.length == 2) {
        elem = eventArgs[0];
        name = eventArgs[1];
      } else {
        elem = component.$node[0];
        name = eventArgs[0];
      }

      if (window.DEBUG && window.DEBUG.enabled) {
        logFilter = DEBUG.events.logFilter;

        // no regex for you, actions...
        actionLoggable = logFilter.actions=="all" || (logFilter.actions.indexOf(action) > -1);
        // event name filter allow wildcards or regex...
        toRegExp = function(expr) {
          return expr.test ? expr : new RegExp("^" + expr.replace(/\*/g, ".*") + "$");
        };
        nameLoggable =
          logFilter.eventNames=="all" ||
          logFilter.eventNames.some(function(e) {return toRegExp(e).test(name)});

        if (actionLoggable && nameLoggable) {
          console.info(
            actionSymbols[action],
            action,
            '[' + name + ']',
            elemToString(elem),
            component.constructor.describe.split(' ').slice(0,3).join(' ') //two mixins only
          );
        }
      }
    }

    function withLogging() {
      this.before('trigger', function() {
        log('trigger', this, util.toArray(arguments));
      });
      this.before('on', function() {
        log('on', this, util.toArray(arguments));
      });
      this.before('off', function(eventArgs) {
        log('off', this, util.toArray(arguments));
      });
    }

    return withLogging;
  }
);

/*!
* Bootstrap.js by @fat & @mdo
* Copyright 2012 Twitter, Inc.
* http://www.apache.org/licenses/LICENSE-2.0.txt
*/
!function(e){e(function(){e.support.transition=function(){var e=function(){var e=document.createElement("bootstrap"),t={WebkitTransition:"webkitTransitionEnd",MozTransition:"transitionend",OTransition:"oTransitionEnd otransitionend",transition:"transitionend"},n;for(n in t)if(e.style[n]!==undefined)return t[n]}();return e&&{end:e}}()})}(window.jQuery),!function(e){var t='[data-dismiss="alert"]',n=function(n){e(n).on("click",t,this.close)};n.prototype.close=function(t){function s(){i.trigger("closed").remove()}var n=e(this),r=n.attr("data-target"),i;r||(r=n.attr("href"),r=r&&r.replace(/.*(?=#[^\s]*$)/,"")),i=e(r),t&&t.preventDefault(),i.length||(i=n.hasClass("alert")?n:n.parent()),i.trigger(t=e.Event("close"));if(t.isDefaultPrevented())return;i.removeClass("in"),e.support.transition&&i.hasClass("fade")?i.on(e.support.transition.end,s):s()};var r=e.fn.alert;e.fn.alert=function(t){return this.each(function(){var r=e(this),i=r.data("alert");i||r.data("alert",i=new n(this)),typeof t=="string"&&i[t].call(r)})},e.fn.alert.Constructor=n,e.fn.alert.noConflict=function(){return e.fn.alert=r,this},e(document).on("click.alert.data-api",t,n.prototype.close)}(window.jQuery),!function(e){var t=function(t,n){this.$element=e(t),this.options=e.extend({},e.fn.button.defaults,n)};t.prototype.setState=function(e){var t="disabled",n=this.$element,r=n.data(),i=n.is("input")?"val":"html";e+="Text",r.resetText||n.data("resetText",n[i]()),n[i](r[e]||this.options[e]),setTimeout(function(){e=="loadingText"?n.addClass(t).attr(t,t):n.removeClass(t).removeAttr(t)},0)},t.prototype.toggle=function(){var e=this.$element.closest('[data-toggle="buttons-radio"]');e&&e.find(".active").removeClass("active"),this.$element.toggleClass("active")};var n=e.fn.button;e.fn.button=function(n){return this.each(function(){var r=e(this),i=r.data("button"),s=typeof n=="object"&&n;i||r.data("button",i=new t(this,s)),n=="toggle"?i.toggle():n&&i.setState(n)})},e.fn.button.defaults={loadingText:"loading..."},e.fn.button.Constructor=t,e.fn.button.noConflict=function(){return e.fn.button=n,this},e(document).on("click.button.data-api","[data-toggle^=button]",function(t){var n=e(t.target);n.hasClass("btn")||(n=n.closest(".btn")),n.button("toggle")})}(window.jQuery),!function(e){var t=function(t,n){this.$element=e(t),this.$indicators=this.$element.find(".carousel-indicators"),this.options=n,this.options.pause=="hover"&&this.$element.on("mouseenter",e.proxy(this.pause,this)).on("mouseleave",e.proxy(this.cycle,this))};t.prototype={cycle:function(t){return t||(this.paused=!1),this.interval&&clearInterval(this.interval),this.options.interval&&!this.paused&&(this.interval=setInterval(e.proxy(this.next,this),this.options.interval)),this},getActiveIndex:function(){return this.$active=this.$element.find(".item.active"),this.$items=this.$active.parent().children(),this.$items.index(this.$active)},to:function(t){var n=this.getActiveIndex(),r=this;if(t>this.$items.length-1||t<0)return;return this.sliding?this.$element.one("slid",function(){r.to(t)}):n==t?this.pause().cycle():this.slide(t>n?"next":"prev",e(this.$items[t]))},pause:function(t){return t||(this.paused=!0),this.$element.find(".next, .prev").length&&e.support.transition.end&&(this.$element.trigger(e.support.transition.end),this.cycle(!0)),clearInterval(this.interval),this.interval=null,this},next:function(){if(this.sliding)return;return this.slide("next")},prev:function(){if(this.sliding)return;return this.slide("prev")},slide:function(t,n){var r=this.$element.find(".item.active"),i=n||r[t](),s=this.interval,o=t=="next"?"left":"right",u=t=="next"?"first":"last",a=this,f;this.sliding=!0,s&&this.pause(),i=i.length?i:this.$element.find(".item")[u](),f=e.Event("slide",{relatedTarget:i[0],direction:o});if(i.hasClass("active"))return;this.$indicators.length&&(this.$indicators.find(".active").removeClass("active"),this.$element.one("slid",function(){var t=e(a.$indicators.children()[a.getActiveIndex()]);t&&t.addClass("active")}));if(e.support.transition&&this.$element.hasClass("slide")){this.$element.trigger(f);if(f.isDefaultPrevented())return;i.addClass(t),i[0].offsetWidth,r.addClass(o),i.addClass(o),this.$element.one(e.support.transition.end,function(){i.removeClass([t,o].join(" ")).addClass("active"),r.removeClass(["active",o].join(" ")),a.sliding=!1,setTimeout(function(){a.$element.trigger("slid")},0)})}else{this.$element.trigger(f);if(f.isDefaultPrevented())return;r.removeClass("active"),i.addClass("active"),this.sliding=!1,this.$element.trigger("slid")}return s&&this.cycle(),this}};var n=e.fn.carousel;e.fn.carousel=function(n){return this.each(function(){var r=e(this),i=r.data("carousel"),s=e.extend({},e.fn.carousel.defaults,typeof n=="object"&&n),o=typeof n=="string"?n:s.slide;i||r.data("carousel",i=new t(this,s)),typeof n=="number"?i.to(n):o?i[o]():s.interval&&i.pause().cycle()})},e.fn.carousel.defaults={interval:5e3,pause:"hover"},e.fn.carousel.Constructor=t,e.fn.carousel.noConflict=function(){return e.fn.carousel=n,this},e(document).on("click.carousel.data-api","[data-slide], [data-slide-to]",function(t){var n=e(this),r,i=e(n.attr("data-target")||(r=n.attr("href"))&&r.replace(/.*(?=#[^\s]+$)/,"")),s=e.extend({},i.data(),n.data()),o;i.carousel(s),(o=n.attr("data-slide-to"))&&i.data("carousel").pause().to(o).cycle(),t.preventDefault()})}(window.jQuery),!function(e){var t=function(t,n){this.$element=e(t),this.options=e.extend({},e.fn.collapse.defaults,n),this.options.parent&&(this.$parent=e(this.options.parent)),this.options.toggle&&this.toggle()};t.prototype={constructor:t,dimension:function(){var e=this.$element.hasClass("width");return e?"width":"height"},show:function(){var t,n,r,i;if(this.transitioning||this.$element.hasClass("in"))return;t=this.dimension(),n=e.camelCase(["scroll",t].join("-")),r=this.$parent&&this.$parent.find("> .accordion-group > .in");if(r&&r.length){i=r.data("collapse");if(i&&i.transitioning)return;r.collapse("hide"),i||r.data("collapse",null)}this.$element[t](0),this.transition("addClass",e.Event("show"),"shown"),e.support.transition&&this.$element[t](this.$element[0][n])},hide:function(){var t;if(this.transitioning||!this.$element.hasClass("in"))return;t=this.dimension(),this.reset(this.$element[t]()),this.transition("removeClass",e.Event("hide"),"hidden"),this.$element[t](0)},reset:function(e){var t=this.dimension();return this.$element.removeClass("collapse")[t](e||"auto")[0].offsetWidth,this.$element[e!==null?"addClass":"removeClass"]("collapse"),this},transition:function(t,n,r){var i=this,s=function(){n.type=="show"&&i.reset(),i.transitioning=0,i.$element.trigger(r)};this.$element.trigger(n);if(n.isDefaultPrevented())return;this.transitioning=1,this.$element[t]("in"),e.support.transition&&this.$element.hasClass("collapse")?this.$element.one(e.support.transition.end,s):s()},toggle:function(){this[this.$element.hasClass("in")?"hide":"show"]()}};var n=e.fn.collapse;e.fn.collapse=function(n){return this.each(function(){var r=e(this),i=r.data("collapse"),s=e.extend({},e.fn.collapse.defaults,r.data(),typeof n=="object"&&n);i||r.data("collapse",i=new t(this,s)),typeof n=="string"&&i[n]()})},e.fn.collapse.defaults={toggle:!0},e.fn.collapse.Constructor=t,e.fn.collapse.noConflict=function(){return e.fn.collapse=n,this},e(document).on("click.collapse.data-api","[data-toggle=collapse]",function(t){var n=e(this),r,i=n.attr("data-target")||t.preventDefault()||(r=n.attr("href"))&&r.replace(/.*(?=#[^\s]+$)/,""),s=e(i).data("collapse")?"toggle":n.data();n[e(i).hasClass("in")?"addClass":"removeClass"]("collapsed"),e(i).collapse(s)})}(window.jQuery),!function(e){function r(){e(".dropdown-backdrop").remove(),e(t).each(function(){i(e(this)).removeClass("open")})}function i(t){var n=t.attr("data-target"),r;n||(n=t.attr("href"),n=n&&/#/.test(n)&&n.replace(/.*(?=#[^\s]*$)/,"")),r=n&&e(n);if(!r||!r.length)r=t.parent();return r}var t="[data-toggle=dropdown]",n=function(t){var n=e(t).on("click.dropdown.data-api",this.toggle);e("html").on("click.dropdown.data-api",function(){n.parent().removeClass("open")})};n.prototype={constructor:n,toggle:function(t){var n=e(this),s,o;if(n.is(".disabled, :disabled"))return;return s=i(n),o=s.hasClass("open"),r(),o||("ontouchstart"in document.documentElement&&e('<div class="dropdown-backdrop"/>').insertBefore(e(this)).on("click",r),s.toggleClass("open")),n.focus(),!1},keydown:function(n){var r,s,o,u,a,f;if(!/(38|40|27)/.test(n.keyCode))return;r=e(this),n.preventDefault(),n.stopPropagation();if(r.is(".disabled, :disabled"))return;u=i(r),a=u.hasClass("open");if(!a||a&&n.keyCode==27)return n.which==27&&u.find(t).focus(),r.click();s=e("[role=menu] li:not(.divider):visible a",u);if(!s.length)return;f=s.index(s.filter(":focus")),n.keyCode==38&&f>0&&f--,n.keyCode==40&&f<s.length-1&&f++,~f||(f=0),s.eq(f).focus()}};var s=e.fn.dropdown;e.fn.dropdown=function(t){return this.each(function(){var r=e(this),i=r.data("dropdown");i||r.data("dropdown",i=new n(this)),typeof t=="string"&&i[t].call(r)})},e.fn.dropdown.Constructor=n,e.fn.dropdown.noConflict=function(){return e.fn.dropdown=s,this},e(document).on("click.dropdown.data-api",r).on("click.dropdown.data-api",".dropdown form",function(e){e.stopPropagation()}).on("click.dropdown.data-api",t,n.prototype.toggle).on("keydown.dropdown.data-api",t+", [role=menu]",n.prototype.keydown)}(window.jQuery),!function(e){var t=function(t,n){this.options=n,this.$element=e(t).delegate('[data-dismiss="modal"]',"click.dismiss.modal",e.proxy(this.hide,this)),this.options.remote&&this.$element.find(".modal-body").load(this.options.remote)};t.prototype={constructor:t,toggle:function(){return this[this.isShown?"hide":"show"]()},show:function(){var t=this,n=e.Event("show");this.$element.trigger(n);if(this.isShown||n.isDefaultPrevented())return;this.isShown=!0,this.escape(),this.backdrop(function(){var n=e.support.transition&&t.$element.hasClass("fade");t.$element.parent().length||t.$element.appendTo(document.body),t.$element.show(),n&&t.$element[0].offsetWidth,t.$element.addClass("in").attr("aria-hidden",!1),t.enforceFocus(),n?t.$element.one(e.support.transition.end,function(){t.$element.focus().trigger("shown")}):t.$element.focus().trigger("shown")})},hide:function(t){t&&t.preventDefault();var n=this;t=e.Event("hide"),this.$element.trigger(t);if(!this.isShown||t.isDefaultPrevented())return;this.isShown=!1,this.escape(),e(document).off("focusin.modal"),this.$element.removeClass("in").attr("aria-hidden",!0),e.support.transition&&this.$element.hasClass("fade")?this.hideWithTransition():this.hideModal()},enforceFocus:function(){var t=this;e(document).on("focusin.modal",function(e){t.$element[0]!==e.target&&!t.$element.has(e.target).length&&t.$element.focus()})},escape:function(){var e=this;this.isShown&&this.options.keyboard?this.$element.on("keyup.dismiss.modal",function(t){t.which==27&&e.hide()}):this.isShown||this.$element.off("keyup.dismiss.modal")},hideWithTransition:function(){var t=this,n=setTimeout(function(){t.$element.off(e.support.transition.end),t.hideModal()},500);this.$element.one(e.support.transition.end,function(){clearTimeout(n),t.hideModal()})},hideModal:function(){var e=this;this.$element.hide(),this.backdrop(function(){e.removeBackdrop(),e.$element.trigger("hidden")})},removeBackdrop:function(){this.$backdrop&&this.$backdrop.remove(),this.$backdrop=null},backdrop:function(t){var n=this,r=this.$element.hasClass("fade")?"fade":"";if(this.isShown&&this.options.backdrop){var i=e.support.transition&&r;this.$backdrop=e('<div class="modal-backdrop '+r+'" />').appendTo(document.body),this.$backdrop.click(this.options.backdrop=="static"?e.proxy(this.$element[0].focus,this.$element[0]):e.proxy(this.hide,this)),i&&this.$backdrop[0].offsetWidth,this.$backdrop.addClass("in");if(!t)return;i?this.$backdrop.one(e.support.transition.end,t):t()}else!this.isShown&&this.$backdrop?(this.$backdrop.removeClass("in"),e.support.transition&&this.$element.hasClass("fade")?this.$backdrop.one(e.support.transition.end,t):t()):t&&t()}};var n=e.fn.modal;e.fn.modal=function(n){return this.each(function(){var r=e(this),i=r.data("modal"),s=e.extend({},e.fn.modal.defaults,r.data(),typeof n=="object"&&n);i||r.data("modal",i=new t(this,s)),typeof n=="string"?i[n]():s.show&&i.show()})},e.fn.modal.defaults={backdrop:!0,keyboard:!0,show:!0},e.fn.modal.Constructor=t,e.fn.modal.noConflict=function(){return e.fn.modal=n,this},e(document).on("click.modal.data-api",'[data-toggle="modal"]',function(t){var n=e(this),r=n.attr("href"),i=e(n.attr("data-target")||r&&r.replace(/.*(?=#[^\s]+$)/,"")),s=i.data("modal")?"toggle":e.extend({remote:!/#/.test(r)&&r},i.data(),n.data());t.preventDefault(),i.modal(s).one("hide",function(){n.focus()})})}(window.jQuery),!function(e){var t=function(e,t){this.init("tooltip",e,t)};t.prototype={constructor:t,init:function(t,n,r){var i,s,o,u,a;this.type=t,this.$element=e(n),this.options=this.getOptions(r),this.enabled=!0,o=this.options.trigger.split(" ");for(a=o.length;a--;)u=o[a],u=="click"?this.$element.on("click."+this.type,this.options.selector,e.proxy(this.toggle,this)):u!="manual"&&(i=u=="hover"?"mouseenter":"focus",s=u=="hover"?"mouseleave":"blur",this.$element.on(i+"."+this.type,this.options.selector,e.proxy(this.enter,this)),this.$element.on(s+"."+this.type,this.options.selector,e.proxy(this.leave,this)));this.options.selector?this._options=e.extend({},this.options,{trigger:"manual",selector:""}):this.fixTitle()},getOptions:function(t){return t=e.extend({},e.fn[this.type].defaults,this.$element.data(),t),t.delay&&typeof t.delay=="number"&&(t.delay={show:t.delay,hide:t.delay}),t},enter:function(t){var n=e.fn[this.type].defaults,r={},i;this._options&&e.each(this._options,function(e,t){n[e]!=t&&(r[e]=t)},this),i=e(t.currentTarget)[this.type](r).data(this.type);if(!i.options.delay||!i.options.delay.show)return i.show();clearTimeout(this.timeout),i.hoverState="in",this.timeout=setTimeout(function(){i.hoverState=="in"&&i.show()},i.options.delay.show)},leave:function(t){var n=e(t.currentTarget)[this.type](this._options).data(this.type);this.timeout&&clearTimeout(this.timeout);if(!n.options.delay||!n.options.delay.hide)return n.hide();n.hoverState="out",this.timeout=setTimeout(function(){n.hoverState=="out"&&n.hide()},n.options.delay.hide)},show:function(){var t,n,r,i,s,o,u=e.Event("show");if(this.hasContent()&&this.enabled){this.$element.trigger(u);if(u.isDefaultPrevented())return;t=this.tip(),this.setContent(),this.options.animation&&t.addClass("fade"),s=typeof this.options.placement=="function"?this.options.placement.call(this,t[0],this.$element[0]):this.options.placement,t.detach().css({top:0,left:0,display:"block"}),this.options.container?t.appendTo(this.options.container):t.insertAfter(this.$element),n=this.getPosition(),r=t[0].offsetWidth,i=t[0].offsetHeight;switch(s){case"bottom":o={top:n.top+n.height,left:n.left+n.width/2-r/2};break;case"top":o={top:n.top-i,left:n.left+n.width/2-r/2};break;case"left":o={top:n.top+n.height/2-i/2,left:n.left-r};break;case"right":o={top:n.top+n.height/2-i/2,left:n.left+n.width}}this.applyPlacement(o,s),this.$element.trigger("shown")}},applyPlacement:function(e,t){var n=this.tip(),r=n[0].offsetWidth,i=n[0].offsetHeight,s,o,u,a;n.offset(e).addClass(t).addClass("in"),s=n[0].offsetWidth,o=n[0].offsetHeight,t=="top"&&o!=i&&(e.top=e.top+i-o,a=!0),t=="bottom"||t=="top"?(u=0,e.left<0&&(u=e.left*-2,e.left=0,n.offset(e),s=n[0].offsetWidth,o=n[0].offsetHeight),this.replaceArrow(u-r+s,s,"left")):this.replaceArrow(o-i,o,"top"),a&&n.offset(e)},replaceArrow:function(e,t,n){this.arrow().css(n,e?50*(1-e/t)+"%":"")},setContent:function(){var e=this.tip(),t=this.getTitle();e.find(".tooltip-inner")[this.options.html?"html":"text"](t),e.removeClass("fade in top bottom left right")},hide:function(){function i(){var t=setTimeout(function(){n.off(e.support.transition.end).detach()},500);n.one(e.support.transition.end,function(){clearTimeout(t),n.detach()})}var t=this,n=this.tip(),r=e.Event("hide");this.$element.trigger(r);if(r.isDefaultPrevented())return;return n.removeClass("in"),e.support.transition&&this.$tip.hasClass("fade")?i():n.detach(),this.$element.trigger("hidden"),this},fixTitle:function(){var e=this.$element;(e.attr("title")||typeof e.attr("data-original-title")!="string")&&e.attr("data-original-title",e.attr("title")||"").attr("title","")},hasContent:function(){return this.getTitle()},getPosition:function(){var t=this.$element[0];return e.extend({},typeof t.getBoundingClientRect=="function"?t.getBoundingClientRect():{width:t.offsetWidth,height:t.offsetHeight},this.$element.offset())},getTitle:function(){var e,t=this.$element,n=this.options;return e=t.attr("data-original-title")||(typeof n.title=="function"?n.title.call(t[0]):n.title),e},tip:function(){return this.$tip=this.$tip||e(this.options.template)},arrow:function(){return this.$arrow=this.$arrow||this.tip().find(".tooltip-arrow")},validate:function(){this.$element[0].parentNode||(this.hide(),this.$element=null,this.options=null)},enable:function(){this.enabled=!0},disable:function(){this.enabled=!1},toggleEnabled:function(){this.enabled=!this.enabled},toggle:function(t){var n=t?e(t.currentTarget)[this.type](this._options).data(this.type):this;n.tip().hasClass("in")?n.hide():n.show()},destroy:function(){this.hide().$element.off("."+this.type).removeData(this.type)}};var n=e.fn.tooltip;e.fn.tooltip=function(n){return this.each(function(){var r=e(this),i=r.data("tooltip"),s=typeof n=="object"&&n;i||r.data("tooltip",i=new t(this,s)),typeof n=="string"&&i[n]()})},e.fn.tooltip.Constructor=t,e.fn.tooltip.defaults={animation:!0,placement:"top",selector:!1,template:'<div class="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',trigger:"hover focus",title:"",delay:0,html:!1,container:!1},e.fn.tooltip.noConflict=function(){return e.fn.tooltip=n,this}}(window.jQuery),!function(e){var t=function(e,t){this.init("popover",e,t)};t.prototype=e.extend({},e.fn.tooltip.Constructor.prototype,{constructor:t,setContent:function(){var e=this.tip(),t=this.getTitle(),n=this.getContent();e.find(".popover-title")[this.options.html?"html":"text"](t),e.find(".popover-content")[this.options.html?"html":"text"](n),e.removeClass("fade top bottom left right in")},hasContent:function(){return this.getTitle()||this.getContent()},getContent:function(){var e,t=this.$element,n=this.options;return e=(typeof n.content=="function"?n.content.call(t[0]):n.content)||t.attr("data-content"),e},tip:function(){return this.$tip||(this.$tip=e(this.options.template)),this.$tip},destroy:function(){this.hide().$element.off("."+this.type).removeData(this.type)}});var n=e.fn.popover;e.fn.popover=function(n){return this.each(function(){var r=e(this),i=r.data("popover"),s=typeof n=="object"&&n;i||r.data("popover",i=new t(this,s)),typeof n=="string"&&i[n]()})},e.fn.popover.Constructor=t,e.fn.popover.defaults=e.extend({},e.fn.tooltip.defaults,{placement:"right",trigger:"click",content:"",template:'<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'}),e.fn.popover.noConflict=function(){return e.fn.popover=n,this}}(window.jQuery),!function(e){function t(t,n){var r=e.proxy(this.process,this),i=e(t).is("body")?e(window):e(t),s;this.options=e.extend({},e.fn.scrollspy.defaults,n),this.$scrollElement=i.on("scroll.scroll-spy.data-api",r),this.selector=(this.options.target||(s=e(t).attr("href"))&&s.replace(/.*(?=#[^\s]+$)/,"")||"")+" .nav li > a",this.$body=e("body"),this.refresh(),this.process()}t.prototype={constructor:t,refresh:function(){var t=this,n;this.offsets=e([]),this.targets=e([]),n=this.$body.find(this.selector).map(function(){var n=e(this),r=n.data("target")||n.attr("href"),i=/^#\w/.test(r)&&e(r);return i&&i.length&&[[i.position().top+(!e.isWindow(t.$scrollElement.get(0))&&t.$scrollElement.scrollTop()),r]]||null}).sort(function(e,t){return e[0]-t[0]}).each(function(){t.offsets.push(this[0]),t.targets.push(this[1])})},process:function(){var e=this.$scrollElement.scrollTop()+this.options.offset,t=this.$scrollElement[0].scrollHeight||this.$body[0].scrollHeight,n=t-this.$scrollElement.height(),r=this.offsets,i=this.targets,s=this.activeTarget,o;if(e>=n)return s!=(o=i.last()[0])&&this.activate(o);for(o=r.length;o--;)s!=i[o]&&e>=r[o]&&(!r[o+1]||e<=r[o+1])&&this.activate(i[o])},activate:function(t){var n,r;this.activeTarget=t,e(this.selector).parent(".active").removeClass("active"),r=this.selector+'[data-target="'+t+'"],'+this.selector+'[href="'+t+'"]',n=e(r).parent("li").addClass("active"),n.parent(".dropdown-menu").length&&(n=n.closest("li.dropdown").addClass("active")),n.trigger("activate")}};var n=e.fn.scrollspy;e.fn.scrollspy=function(n){return this.each(function(){var r=e(this),i=r.data("scrollspy"),s=typeof n=="object"&&n;i||r.data("scrollspy",i=new t(this,s)),typeof n=="string"&&i[n]()})},e.fn.scrollspy.Constructor=t,e.fn.scrollspy.defaults={offset:10},e.fn.scrollspy.noConflict=function(){return e.fn.scrollspy=n,this},e(window).on("load",function(){e('[data-spy="scroll"]').each(function(){var t=e(this);t.scrollspy(t.data())})})}(window.jQuery),!function(e){var t=function(t){this.element=e(t)};t.prototype={constructor:t,show:function(){var t=this.element,n=t.closest("ul:not(.dropdown-menu)"),r=t.attr("data-target"),i,s,o;r||(r=t.attr("href"),r=r&&r.replace(/.*(?=#[^\s]*$)/,""));if(t.parent("li").hasClass("active"))return;i=n.find(".active:last a")[0],o=e.Event("show",{relatedTarget:i}),t.trigger(o);if(o.isDefaultPrevented())return;s=e(r),this.activate(t.parent("li"),n),this.activate(s,s.parent(),function(){t.trigger({type:"shown",relatedTarget:i})})},activate:function(t,n,r){function o(){i.removeClass("active").find("> .dropdown-menu > .active").removeClass("active"),t.addClass("active"),s?(t[0].offsetWidth,t.addClass("in")):t.removeClass("fade"),t.parent(".dropdown-menu")&&t.closest("li.dropdown").addClass("active"),r&&r()}var i=n.find("> .active"),s=r&&e.support.transition&&i.hasClass("fade");s?i.one(e.support.transition.end,o):o(),i.removeClass("in")}};var n=e.fn.tab;e.fn.tab=function(n){return this.each(function(){var r=e(this),i=r.data("tab");i||r.data("tab",i=new t(this)),typeof n=="string"&&i[n]()})},e.fn.tab.Constructor=t,e.fn.tab.noConflict=function(){return e.fn.tab=n,this},e(document).on("click.tab.data-api",'[data-toggle="tab"], [data-toggle="pill"]',function(t){t.preventDefault(),e(this).tab("show")})}(window.jQuery),!function(e){var t=function(t,n){this.$element=e(t),this.options=e.extend({},e.fn.typeahead.defaults,n),this.matcher=this.options.matcher||this.matcher,this.sorter=this.options.sorter||this.sorter,this.highlighter=this.options.highlighter||this.highlighter,this.updater=this.options.updater||this.updater,this.source=this.options.source,this.$menu=e(this.options.menu),this.shown=!1,this.listen()};t.prototype={constructor:t,select:function(){var e=this.$menu.find(".active").attr("data-value");return this.$element.val(this.updater(e)).change(),this.hide()},updater:function(e){return e},show:function(){var t=e.extend({},this.$element.position(),{height:this.$element[0].offsetHeight});return this.$menu.insertAfter(this.$element).css({top:t.top+t.height,left:t.left}).show(),this.shown=!0,this},hide:function(){return this.$menu.hide(),this.shown=!1,this},lookup:function(t){var n;return this.query=this.$element.val(),!this.query||this.query.length<this.options.minLength?this.shown?this.hide():this:(n=e.isFunction(this.source)?this.source(this.query,e.proxy(this.process,this)):this.source,n?this.process(n):this)},process:function(t){var n=this;return t=e.grep(t,function(e){return n.matcher(e)}),t=this.sorter(t),t.length?this.render(t.slice(0,this.options.items)).show():this.shown?this.hide():this},matcher:function(e){return~e.toLowerCase().indexOf(this.query.toLowerCase())},sorter:function(e){var t=[],n=[],r=[],i;while(i=e.shift())i.toLowerCase().indexOf(this.query.toLowerCase())?~i.indexOf(this.query)?n.push(i):r.push(i):t.push(i);return t.concat(n,r)},highlighter:function(e){var t=this.query.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&");return e.replace(new RegExp("("+t+")","ig"),function(e,t){return"<strong>"+t+"</strong>"})},render:function(t){var n=this;return t=e(t).map(function(t,r){return t=e(n.options.item).attr("data-value",r),t.find("a").html(n.highlighter(r)),t[0]}),t.first().addClass("active"),this.$menu.html(t),this},next:function(t){var n=this.$menu.find(".active").removeClass("active"),r=n.next();r.length||(r=e(this.$menu.find("li")[0])),r.addClass("active")},prev:function(e){var t=this.$menu.find(".active").removeClass("active"),n=t.prev();n.length||(n=this.$menu.find("li").last()),n.addClass("active")},listen:function(){this.$element.on("focus",e.proxy(this.focus,this)).on("blur",e.proxy(this.blur,this)).on("keypress",e.proxy(this.keypress,this)).on("keyup",e.proxy(this.keyup,this)),this.eventSupported("keydown")&&this.$element.on("keydown",e.proxy(this.keydown,this)),this.$menu.on("click",e.proxy(this.click,this)).on("mouseenter","li",e.proxy(this.mouseenter,this)).on("mouseleave","li",e.proxy(this.mouseleave,this))},eventSupported:function(e){var t=e in this.$element;return t||(this.$element.setAttribute(e,"return;"),t=typeof this.$element[e]=="function"),t},move:function(e){if(!this.shown)return;switch(e.keyCode){case 9:case 13:case 27:e.preventDefault();break;case 38:e.preventDefault(),this.prev();break;case 40:e.preventDefault(),this.next()}e.stopPropagation()},keydown:function(t){this.suppressKeyPressRepeat=~e.inArray(t.keyCode,[40,38,9,13,27]),this.move(t)},keypress:function(e){if(this.suppressKeyPressRepeat)return;this.move(e)},keyup:function(e){switch(e.keyCode){case 40:case 38:case 16:case 17:case 18:break;case 9:case 13:if(!this.shown)return;this.select();break;case 27:if(!this.shown)return;this.hide();break;default:this.lookup()}e.stopPropagation(),e.preventDefault()},focus:function(e){this.focused=!0},blur:function(e){this.focused=!1,!this.mousedover&&this.shown&&this.hide()},click:function(e){e.stopPropagation(),e.preventDefault(),this.select(),this.$element.focus()},mouseenter:function(t){this.mousedover=!0,this.$menu.find(".active").removeClass("active"),e(t.currentTarget).addClass("active")},mouseleave:function(e){this.mousedover=!1,!this.focused&&this.shown&&this.hide()}};var n=e.fn.typeahead;e.fn.typeahead=function(n){return this.each(function(){var r=e(this),i=r.data("typeahead"),s=typeof n=="object"&&n;i||r.data("typeahead",i=new t(this,s)),typeof n=="string"&&i[n]()})},e.fn.typeahead.defaults={source:[],items:8,menu:'<ul class="typeahead dropdown-menu"></ul>',item:'<li><a href="#"></a></li>',minLength:1},e.fn.typeahead.Constructor=t,e.fn.typeahead.noConflict=function(){return e.fn.typeahead=n,this},e(document).on("focus.typeahead.data-api",'[data-provide="typeahead"]',function(t){var n=e(this);if(n.data("typeahead"))return;n.typeahead(n.data())})}(window.jQuery),!function(e){var t=function(t,n){this.options=e.extend({},e.fn.affix.defaults,n),this.$window=e(window).on("scroll.affix.data-api",e.proxy(this.checkPosition,this)).on("click.affix.data-api",e.proxy(function(){setTimeout(e.proxy(this.checkPosition,this),1)},this)),this.$element=e(t),this.checkPosition()};t.prototype.checkPosition=function(){if(!this.$element.is(":visible"))return;var t=e(document).height(),n=this.$window.scrollTop(),r=this.$element.offset(),i=this.options.offset,s=i.bottom,o=i.top,u="affix affix-top affix-bottom",a;typeof i!="object"&&(s=o=i),typeof o=="function"&&(o=i.top()),typeof s=="function"&&(s=i.bottom()),a=this.unpin!=null&&n+this.unpin<=r.top?!1:s!=null&&r.top+this.$element.height()>=t-s?"bottom":o!=null&&n<=o?"top":!1;if(this.affixed===a)return;this.affixed=a,this.unpin=a=="bottom"?r.top-n:null,this.$element.removeClass(u).addClass("affix"+(a?"-"+a:""))};var n=e.fn.affix;e.fn.affix=function(n){return this.each(function(){var r=e(this),i=r.data("affix"),s=typeof n=="object"&&n;i||r.data("affix",i=new t(this,s)),typeof n=="string"&&i[n]()})},e.fn.affix.Constructor=t,e.fn.affix.defaults={offset:0},e.fn.affix.noConflict=function(){return e.fn.affix=n,this},e(window).on("load",function(){e('[data-spy="affix"]').each(function(){var t=e(this),n=t.data();n.offset=n.offset||{},n.offsetBottom&&(n.offset.bottom=n.offsetBottom),n.offsetTop&&(n.offset.top=n.offsetTop),t.affix(n)})})}(window.jQuery);
define("vendor/bootstrap.min", function(){});

define(
  'vendor/flight/lib/base',[
    './utils',
    './registry',
    './debug'
  ],
  function(utils, registry, debug) {
  //common mixin allocates basic functionality - used by all component prototypes
  //callback context is bound to component
  var componentId = 0;

  function teardownInstance(instanceInfo){
    instanceInfo.events.slice().forEach(function(event) {
      var args = [event.type];

      event.element && args.unshift(event.element);
      (typeof event.callback == 'function') && args.push(event.callback);

      this.off.apply(this, args);
    }, instanceInfo.instance);
  }

  function checkSerializable(type, data) {
    try {
      window.postMessage(data, '*');
    } catch(e) {
      console.log('unserializable data for event',type,':',data);
      throw new Error(
        ["The event", type, "on component", this.toString(), "was triggered with non-serializable data"].join(" ")
      );
    }
  }

  function withBase() {

    // delegate trigger, bind and unbind to an element
    // if $element not supplied, use component's node
    // other arguments are passed on
    // event can be either a string specifying the type
    // of the event, or a hash specifying both the type
    // and a default function to be called.
    this.trigger = function() {
      var $element, type, data, event, defaultFn;
      var lastIndex = arguments.length - 1, lastArg = arguments[lastIndex];

      if (typeof lastArg != "string" && !(lastArg && lastArg.defaultBehavior)) {
        lastIndex--;
        data = lastArg;
      }

      if (lastIndex == 1) {
        $element = $(arguments[0]);
        event = arguments[1];
      } else {
        $element = this.$node;
        event = arguments[0];
      }

      if (event.defaultBehavior) {
        defaultFn = event.defaultBehavior;
        event = $.Event(event.type);
      }

      type = event.type || event;

      if (debug.enabled && window.postMessage) {
        checkSerializable.call(this, type, data);
      }

      if (typeof this.attr.eventData === 'object') {
        data = $.extend(true, {}, this.attr.eventData, data);
      }

      $element.trigger((event || type), data);

      if (defaultFn && !event.isDefaultPrevented()) {
        (this[defaultFn] || defaultFn).call(this);
      }

      return $element;
    };

    this.on = function() {
      var $element, type, callback, originalCb;
      var lastIndex = arguments.length - 1, origin = arguments[lastIndex];

      if (typeof origin == "object") {
        //delegate callback
        originalCb = utils.delegate(
          this.resolveDelegateRules(origin)
        );
      } else {
        originalCb = origin;
      }

      if (lastIndex == 2) {
        $element = $(arguments[0]);
        type = arguments[1];
      } else {
        $element = this.$node;
        type = arguments[0];
      }

      if (typeof originalCb != 'function' && typeof originalCb != 'object') {
        throw new Error("Unable to bind to '" + type + "' because the given callback is not a function or an object");
      }

      callback = originalCb.bind(this);
      callback.target = originalCb;

      // if the original callback is already branded by jQuery's guid, copy it to the context-bound version
      if (originalCb.guid) {
        callback.guid = originalCb.guid;
      }

      $element.on(type, callback);

      // get jquery's guid from our bound fn, so unbinding will work
      originalCb.guid = callback.guid;

      return callback;
    };

    this.off = function() {
      var $element, type, callback;
      var lastIndex = arguments.length - 1;

      if (typeof arguments[lastIndex] == "function") {
        callback = arguments[lastIndex];
        lastIndex -= 1;
      }

      if (lastIndex == 1) {
        $element = $(arguments[0]);
        type = arguments[1];
      } else {
        $element = this.$node;
        type = arguments[0];
      }

      return $element.off(type, callback);
    };

    this.resolveDelegateRules = function(ruleInfo) {
      var rules = {};

      Object.keys(ruleInfo).forEach(function(r) {
        if (!(r in this.attr)) {
          throw new Error('Component "' + this.toString() + '" wants to listen on "' + r + '" but no such attribute was defined.');
        }
        rules[this.attr[r]] = ruleInfo[r];
      }, this);

      return rules;
    };

    this.defaultAttrs = function(defaults) {
      utils.push(this.defaults, defaults, true) || (this.defaults = defaults);
    };

    this.select = function(attributeKey) {
      return this.$node.find(this.attr[attributeKey]);
    };

    this.initialize = function(node, attrs) {
      attrs = attrs || {};
      this.identity = componentId++;

      if (!node) {
        throw new Error("Component needs a node");
      }

      if (node.jquery) {
        this.node = node[0];
        this.$node = node;
      } else {
        this.node = node;
        this.$node = $(node);
      }

      //merge defaults with supplied options
      //put options in attr.__proto__ to avoid merge overhead
      var attr = Object.create(attrs);
      for (var key in this.defaults) {
        if (!attrs.hasOwnProperty(key)) {
          attr[key] = this.defaults[key];
        }
      }

      this.attr = attr;

      Object.keys(this.defaults || {}).forEach(function(key) {
        if (this.defaults[key] === null && this.attr[key] === null) {
          throw new Error('Required attribute "' + key + '" not specified in attachTo for component "' + this.toString() + '".');
        }
      }, this);

      return this;
    }

    this.teardown = function() {
      teardownInstance(registry.findInstanceInfo(this));
    };
  }

  return withBase;
});

// ==========================================
// Copyright 2013 Twitter, Inc
// Licensed under The MIT License
// http://opensource.org/licenses/MIT
// ==========================================



define(

  'vendor/flight/lib/component',[
    './advice',
    './utils',
    './compose',
    './base',
    './registry',
    './logger',
    './debug'
  ],

  function(advice, utils, compose, withBase, registry, withLogging, debug) {

    var functionNameRegEx = /function (.*?)\s?\(/;

    //teardown for all instances of this constructor
    function teardownAll() {
      var componentInfo = registry.findComponentInfo(this);

      componentInfo && Object.keys(componentInfo.instances).forEach(function(k) {
        var info = componentInfo.instances[k];
        info.instance.teardown();
      });
    }

    function checkSerializable(type, data) {
      try {
        window.postMessage(data, '*');
      } catch(e) {
        console.log('unserializable data for event',type,':',data);
        throw new Error(
          ["The event", type, "on component", this.toString(), "was triggered with non-serializable data"].join(" ")
        );
      }
    }

    function attachTo(selector/*, options args */) {
      // unpacking arguments by hand benchmarked faster
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      if (!selector) {
        throw new Error("Component needs to be attachTo'd a jQuery object, native node or selector string");
      }

      var options = utils.merge.apply(utils, args);

      $(selector).each(function(i, node) {
        var rawNode = node.jQuery ? node[0] : node;
        var componentInfo = registry.findComponentInfo(this)
        if (componentInfo && componentInfo.isAttachedTo(rawNode)) {
          //already attached
          return;
        }

        (new this).initialize(node, options);
      }.bind(this));
    }

    // define the constructor for a custom component type
    // takes an unlimited number of mixin functions as arguments
    // typical api call with 3 mixins: define(timeline, withTweetCapability, withScrollCapability);
    function define(/*mixins*/) {
      // unpacking arguments by hand benchmarked faster
      var l = arguments.length;
      var mixins = new Array(l + 3); //add three for common mixins
      for (var i = 0; i < l; i++) mixins[i] = arguments[i];

      var Component = function() {};

      Component.toString = Component.prototype.toString = function() {
        var prettyPrintMixins = mixins.map(function(mixin) {
          if (mixin.name == null) {
            //function name property not supported by this browser, use regex
            var m = mixin.toString().match(functionNameRegEx);
            return (m && m[1]) ? m[1] : "";
          } else {
            return (mixin.name != "withBase") ? mixin.name : "";
          }
        }).filter(Boolean).join(', ');
        return prettyPrintMixins;
      };

      if (debug.enabled) {
        Component.describe = Component.prototype.describe = Component.toString();
      }

      //'options' is optional hash to be merged with 'defaults' in the component definition
      Component.attachTo = attachTo;
      Component.teardownAll = teardownAll;

      // prepend common mixins to supplied list, then mixin all flavors
      if (debug.enabled) {
        mixins.unshift(withLogging);
      }
      mixins.unshift(withBase, advice.withAdvice, registry.withRegistration);
      compose.mixin(Component.prototype, mixins);

      return Component;
    }

    define.teardownAll = function() {
      registry.components.slice().forEach(function(c) {
        c.component.teardownAll();
      });
      registry.reset();
    };

    return define;
  }
);

/**
 * @license RequireJS i18n 2.0.2 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/i18n for details
 */
/*jslint regexp: true */
/*global require: false, navigator: false, define: false */

/**
 * This plugin handles i18n! prefixed modules. It does the following:
 *
 * 1) A regular module can have a dependency on an i18n bundle, but the regular
 * module does not want to specify what locale to load. So it just specifies
 * the top-level bundle, like "i18n!nls/colors".
 *
 * This plugin will load the i18n bundle at nls/colors, see that it is a root/master
 * bundle since it does not have a locale in its name. It will then try to find
 * the best match locale available in that master bundle, then request all the
 * locale pieces for that best match locale. For instance, if the locale is "en-us",
 * then the plugin will ask for the "en-us", "en" and "root" bundles to be loaded
 * (but only if they are specified on the master bundle).
 *
 * Once all the bundles for the locale pieces load, then it mixes in all those
 * locale pieces into each other, then finally sets the context.defined value
 * for the nls/colors bundle to be that mixed in locale.
 *
 * 2) A regular module specifies a specific locale to load. For instance,
 * i18n!nls/fr-fr/colors. In this case, the plugin needs to load the master bundle
 * first, at nls/colors, then figure out what the best match locale is for fr-fr,
 * since maybe only fr or just root is defined for that locale. Once that best
 * fit is found, all of its locale pieces need to have their bundles loaded.
 *
 * Once all the bundles for the locale pieces load, then it mixes in all those
 * locale pieces into each other, then finally sets the context.defined value
 * for the nls/fr-fr/colors bundle to be that mixed in locale.
 */
(function () {
    

    //regexp for reconstructing the master bundle name from parts of the regexp match
    //nlsRegExp.exec("foo/bar/baz/nls/en-ca/foo") gives:
    //["foo/bar/baz/nls/en-ca/foo", "foo/bar/baz/nls/", "/", "/", "en-ca", "foo"]
    //nlsRegExp.exec("foo/bar/baz/nls/foo") gives:
    //["foo/bar/baz/nls/foo", "foo/bar/baz/nls/", "/", "/", "foo", ""]
    //so, if match[5] is blank, it means this is the top bundle definition.
    var nlsRegExp = /(^.*(^|\/)nls(\/|$))([^\/]*)\/?([^\/]*)/;

    //Helper function to avoid repeating code. Lots of arguments in the
    //desire to stay functional and support RequireJS contexts without having
    //to know about the RequireJS contexts.
    function addPart(locale, master, needed, toLoad, prefix, suffix) {
        if (master[locale]) {
            needed.push(locale);
            if (master[locale] === true || master[locale] === 1) {
                toLoad.push(prefix + locale + '/' + suffix);
            }
        }
    }

    function addIfExists(req, locale, toLoad, prefix, suffix) {
        var fullName = prefix + locale + '/' + suffix;
        if (require._fileExists(req.toUrl(fullName + '.js'))) {
            toLoad.push(fullName);
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     * This is not robust in IE for transferring methods that match
     * Object.prototype names, but the uses of mixin here seem unlikely to
     * trigger a problem related to that.
     */
    function mixin(target, source, force) {
        var prop;
        for (prop in source) {
            if (source.hasOwnProperty(prop) && (!target.hasOwnProperty(prop) || force)) {
                target[prop] = source[prop];
            } else if (typeof source[prop] === 'object') {
                mixin(target[prop], source[prop], force);
            }
        }
    }

    define('i18n',['module'], function (module) {
        var masterConfig = module.config ? module.config() : {};

        return {
            version: '2.0.1+',
            /**
             * Called when a dependency needs to be loaded.
             */
            load: function (name, req, onLoad, config) {
                config = config || {};

                if (config.locale) {
                    masterConfig.locale = config.locale;
                }

                var masterName,
                    match = nlsRegExp.exec(name),
                    prefix = match[1],
                    locale = match[4],
                    suffix = match[5],
                    parts = locale.split("-"),
                    toLoad = [],
                    value = {},
                    i, part, current = "";

                //If match[5] is blank, it means this is the top bundle definition,
                //so it does not have to be handled. Locale-specific requests
                //will have a match[4] value but no match[5]
                if (match[5]) {
                    //locale-specific bundle
                    prefix = match[1];
                    masterName = prefix + suffix;
                } else {
                    //Top-level bundle.
                    masterName = name;
                    suffix = match[4];
                    locale = masterConfig.locale;
                    if (!locale) {
                        locale = masterConfig.locale =
                            typeof navigator === "undefined" ? "root" :
                            (navigator.language ||
                             navigator.userLanguage || "root").toLowerCase();
                    }
                    parts = locale.split("-");
                }

                if (config.isBuild) {
                    //Check for existence of all locale possible files and
                    //require them if exist.
                    toLoad.push(masterName);
                    addIfExists(req, "root", toLoad, prefix, suffix);
                    for (i = 0; i < parts.length; i++) {
                        part = parts[i];
                        current += (current ? "-" : "") + part;
                        addIfExists(req, current, toLoad, prefix, suffix);
                    }

                    req(toLoad, function () {
                        onLoad();
                    });
                } else {
                    //First, fetch the master bundle, it knows what locales are available.
                    req([masterName], function (master) {
                        //Figure out the best fit
                        var needed = [],
                            part;

                        //Always allow for root, then do the rest of the locale parts.
                        addPart("root", master, needed, toLoad, prefix, suffix);
                        for (i = 0; i < parts.length; i++) {
                            part = parts[i];
                            current += (current ? "-" : "") + part;
                            addPart(current, master, needed, toLoad, prefix, suffix);
                        }

                        //Load all the parts missing.
                        req(toLoad, function () {
                            var i, partBundle, part;
                            for (i = needed.length - 1; i > -1 && needed[i]; i--) {
                                part = needed[i];
                                partBundle = master[part];
                                if (partBundle === true || partBundle === 1) {
                                    partBundle = req(prefix + part + '/' + suffix);
                                }
                                mixin(value, partBundle);
                            }

                            //All done, notify the loader.
                            onLoad(value);
                        });
                    });
                }
            }
        };
    });
}());

function md5cycle(x, k) {
    var a = x[0], b = x[1], c = x[2], d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17,  606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12,  1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7,  1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7,  1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22,  1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14,  643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9,  38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5,  568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20,  1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14,  1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16,  1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11,  1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4,  681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23,  76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16,  530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10,  1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6,  1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6,  1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21,  1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15,  718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);

}

function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
}

function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
}

function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
}

function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
}

function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
}

function md51(s) {
    txt = '';
    var n = s.length,
        state = [1732584193, -271733879, -1732584194, 271733878], i;
    for (i=64; i<=s.length; i+=64) {
        md5cycle(state, md5blk(s.substring(i-64, i)));
    }
    s = s.substring(i-64);
    var tail = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
    for (i=0; i<s.length; i++)
        tail[i>>2] |= s.charCodeAt(i) << ((i%4) << 3);
    tail[i>>2] |= 0x80 << ((i%4) << 3);
    if (i > 55) {
        md5cycle(state, tail);
        for (i=0; i<16; i++) tail[i] = 0;
    }
    tail[14] = n*8;
    md5cycle(state, tail);
    return state;
}

/* there needs to be support for Unicode here,
 * unless we pretend that we can redefine the MD-5
 * algorithm for multi-byte characters (perhaps
 * by adding every four 16-bit characters and
 * shortening the sum to 32 bits). Otherwise
 * I suggest performing MD-5 as if every character
 * was two bytes--e.g., 0040 0025 = @%--but then
 * how will an ordinary MD-5 sum be matched?
 * There is no way to standardize text to something
 * like UTF-8 before transformation; speed cost is
 * utterly prohibitive. The JavaScript standard
 * itself needs to look at this: it should start
 * providing access to strings as preformed UTF-8
 * 8-bit unsigned value arrays.
 */
function md5blk(s) { /* I figured global was faster.   */
    var md5blks = [], i; /* Andy King said do it this way. */
    for (i=0; i<64; i+=4) {
        md5blks[i>>2] = s.charCodeAt(i)
            + (s.charCodeAt(i+1) << 8)
            + (s.charCodeAt(i+2) << 16)
            + (s.charCodeAt(i+3) << 24);
    }
    return md5blks;
}

var hex_chr = '0123456789abcdef'.split('');

function rhex(n)
{
    var s='', j=0;
    for(; j<4; j++)
        s += hex_chr[(n >> (j * 8 + 4)) & 0x0F]
            + hex_chr[(n >> (j * 8)) & 0x0F];
    return s;
}

function hex(x) {
    for (var i=0; i<x.length; i++)
        x[i] = rhex(x[i]);
    return x.join('');
}

function md5(s) {
    return hex(md51(s));
}

/* this function is much faster,
 so if possible we use it. Some IEs
 are the only ones I know of that
 need the idiotic second function,
 generated by an if clause.  */

function add32(a, b) {
    return (a + b) & 0xFFFFFFFF;
}

if (md5('hello') != '5d41402abc4b2a76b9719d911017c592') {
    function add32(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF),
            msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }
}
;
define("vendor/md5", function(){});

'use restrict';

define(
    'component_data/auth',[
        'vendor/flight/lib/component',
        'i18n!nls/content',
        'vendor/md5'
    ],
    function(defineComponent, i18n){

        return defineComponent(authData)

        function authData(){

            this.defaultAttrs({
                captchaFlag: false,
                captchaStored: '',
                api_url: '/forum/login_api.php',
                secret_code: '',
                email: '',
                input: {
                    username: '',
                    password: '',
                    captcha: '',
                    ga2f:   '',
                    cookie: 0,
                }
            });

            function makeid()
            {
                var text = "";
                var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

                for( var i=0; i < 5; i++ )
                    text += possible.charAt(Math.floor(Math.random() * possible.length));

                return text;
            }

            this.isSameUser = function(){
                return this.attr.input.username == localStorage.getItem('last_logged') || localStorage.getItem('last_logged') == null;
            }

            this.isSameCaptcha = function(){
                return this.attr.captchaStored == '' || this.attr.captchaStored == this.attr.input.captcha;
            }

            this.login = function(ev, data){

                $.extend(this.attr.input, data);

                $.post(this.attr.api_url, {
                    'do'            : 'login',
                    api_cookieuser  : this.attr.input.cookie,
                    securitytoken   : 'guest',
                    api_vb_login_md5password    : md5(this.attr.input.password),
                    api_vb_login_md5password_utf: md5(this.attr.input.password),
                    api_vb_login_password       : this.attr.input.password,
                    api_vb_login_username       : this.attr.input.username,
                    api_2factor                 : this.attr.input.ga2f,
                    api_captcha                 : this.attr.input.captcha,
                    api_salt                    : localStorage.getItem('api_salt')
                }, function(json){
                    if(json.error == 'require_2factor'){
                        this.trigger(document, 'authForm2Step', {msg: i18n.validation[json.error]});
                    }else if(json.error == 'require_captcha'){
                        this.trigger(document, 'authFormCaptcha', {captcha: json.captcha, msg: i18n.validation[json.error]});
                    }else if(json.error == 'invalid_authentication'){
                        this.trigger(document, 'authFormLogin');
                        this.trigger(document, 'authFormError', {error: i18n.validation[json.error]});
                    }else if(json.error == 'incorrect_captcha'){
                        this.trigger(document, 'authFormCaptcha', {captcha: json.captcha});
                        this.trigger(document, 'authFormError', {error: i18n.validation[json.error]});
                    }else if(json.error){
                        this.trigger(document, 'authFormError', {error: i18n.validation[json.error]});
                    }else{
                        localStorage.setItem('api_salt', json.salt);
                        this.trigger(document, 'authFormSuccess', {url: json.url});
                    }
                }.bind(this), 'json');
            }

            this.logout = function(){
                $.getJSON(this.attr.api_url, {'do': 'logout'}, function(json){
                    location.reload();
                }.bind(this));
            }

            this.newQR = function(ev, data){

                data = $.extend({}, {force: 0}, data);

                $.getJSON(this.attr.api_url, {'do': 'change2factor', force: data.force}, function(json){
                    if(json.error == 'require_changepass'){
                        this.trigger(document, 'authFormChangePassword', {msg: i18n.validation[json.error]});
                    }else if(json.error == 'already_used'){
                        this.attr.secret_code = json.secret_code;
                        this.attr.qr_url = json.qr_url;
                        this.trigger(document, 'authForm2FactorReady', {msg: i18n.validation[json.error]});
                    }else{
                        this.attr.secret_code = json.secret_code;
                        this.attr.qr_url = json.qr_url;
                        this.trigger(document, 'authFormChoosePhone');
                    }
                }.bind(this));
            }

            this.authChoosePhone = function(ev, data){

                if(data.phone == '' || data.phone == null){
                    this.trigger(document, 'authFormError', {error: i18n.validation.require_phone});
                    return;
                }

                this.trigger(document, 'authFormChange2Factor', {phone: data.phone, url: this.attr.qr_url, key: this.attr.secret_code});
            }

            this.updateQR = function(ev, data){
                $.post(this.attr.api_url, {'do': 'update2factor', api_new_2factor: this.attr.secret_code, api_new_code: data.code}, function(json){
                    if(json.error){
                        this.trigger(document, 'authFormError', {error: i18n.validation[json.error]});
                    }else{
                        this.trigger(document, 'authFormMsg', {title: i18n.box_title.twoFA,  msg: i18n.message.twoFA_enable});
                    }
                }.bind(this), 'JSON');
            }

            this.updatePassword = function(ev,data){
                $.post(this.attr.api_url, {
                    'do': 'updatePassword',
                    currentpassword: data.old_password,
                    currentpassword_md5: md5(data.old_password),
                    newpassword: data.new_password,
                    newpassword_md5: md5(data.new_password),
                    newpasswordconfirm: data.new_password_confirm,
                    newpasswordconfirm_md5: md5(data.new_password_confirm),
                }, function(json){
                    if(json.error){
                        this.trigger(document, 'authFormError', {error: i18n.validation[json.error]});
                    }else{
                        this.trigger(document, 'authFormChoosePhone', {force: 1});
                    }
                }.bind(this), 'JSON');
            }

            this.authDisable2Factor = function(ev, data){
                $.post(this.attr.api_url, {
                    'do': 'disable2Factor'
                }, function(json){
                    this.trigger(document, 'authFormMsg', {title: i18n.box_title.twoFA,  msg: i18n.message.twoFA_disable});
                }.bind(this), 'JSON')
            }

            this.authLostPassword = function(ev, data){
                this.attr.email = data.email;
                this.attr.captchaStored = makeid();
                this.trigger(document, 'authFormLostPasswordCaptcha', {captcha: this.attr.captchaStored, msg: i18n.validation.require_captcha});
            }

            this.authLostPasswordCaptcha = function(ev, data){

                if(data.captcha != this.attr.captchaStored)
                {
                    this.trigger(document, 'authFormError', {error: i18n.validation.require_captcha});
                    return;
                }

                $.post(this.attr.api_url, {
                    'do': 'lost_password',
                    'email': this.attr.email
                }, function(json){
                    if(json.error){
                        this.trigger(document, 'authFormMsg', {title: i18n.box_title.lost_password,  msg: i18n.validation[json.error]});
                    }else{
                        this.trigger(document, 'authFormMsg', {title: i18n.box_title.lost_password,  msg: i18n.message.new_password_sent});
                    }
                }.bind(this), 'JSON')
            }

            this.resetPassword = function(ev, data){



                $.post(this.attr.api_url, $.extend({
                    'do': 'reset_password',
                }, data), function(json){
                    if(json.error){
                        this.trigger(document, 'authFormMsg', {title: i18n.box_title.lost_password,  msg: i18n.validation[json.error]});
                    }else{
                        this.trigger(document, 'authFormMsg', {title: i18n.box_title.lost_password,  msg: i18n.message.reset_password});
                    }
                }.bind(this), 'JSON')
            }

            this.after('initialize', function(){
                this.on(document, 'authLogin', this.login);
                this.on(document, 'authLogout', this.logout);
                this.on(document, 'authNewQR', this.newQR);
                this.on(document, 'authUpdateQR', this.updateQR);
                this.on(document, 'authUpdatePassword', this.updatePassword);
                this.on(document, 'authChoosePhone', this.authChoosePhone);
                this.on(document, 'authDisable2Factor', this.authDisable2Factor);
                this.on(document, 'authLostPassword', this.authLostPassword);
                this.on(document, 'authLostPasswordCaptcha', this.authLostPasswordCaptcha);
                this.on(document, 'authResetPassword', this.resetPassword)

                if(location.hash.substr(0,16) == '#reset_password?'){
                    var query = location.hash.substr(16).split('&');
                    var reset_data = {};
                    for(var n in query){
                        var item = query[n].split('=');
                        reset_data[item[0]] = item[1];
                    }

                    this.trigger(document, 'authResetPassword', reset_data);
                }
            })
        }
    }
);
/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */

/*global define: false*/

(function (root, factory) {
  if (typeof exports === "object" && exports) {
    factory(exports); // CommonJS
  } else {
    var mustache = {};
    factory(mustache);
    if (typeof define === "function" && define.amd) {
      define('vendor/mustache.js/mustache',mustache); // AMD
    } else {
      root.Mustache = mustache; // <script>
    }
  }
}(this, function (mustache) {

  var whiteRe = /\s*/;
  var spaceRe = /\s+/;
  var nonSpaceRe = /\S/;
  var eqRe = /\s*=/;
  var curlyRe = /\s*\}/;
  var tagRe = /#|\^|\/|>|\{|&|=|!/;

  // Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
  // See https://github.com/janl/mustache.js/issues/189
  var RegExp_test = RegExp.prototype.test;
  function testRegExp(re, string) {
    return RegExp_test.call(re, string);
  }

  function isWhitespace(string) {
    return !testRegExp(nonSpaceRe, string);
  }

  var Object_toString = Object.prototype.toString;
  var isArray = Array.isArray || function (obj) {
    return Object_toString.call(obj) === '[object Array]';
  };

  function escapeRegExp(string) {
    return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
  }

  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };

  function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }

  function Scanner(string) {
    this.string = string;
    this.tail = string;
    this.pos = 0;
  }

  /**
   * Returns `true` if the tail is empty (end of string).
   */
  Scanner.prototype.eos = function () {
    return this.tail === "";
  };

  /**
   * Tries to match the given regular expression at the current position.
   * Returns the matched text if it can match, the empty string otherwise.
   */
  Scanner.prototype.scan = function (re) {
    var match = this.tail.match(re);

    if (match && match.index === 0) {
      this.tail = this.tail.substring(match[0].length);
      this.pos += match[0].length;
      return match[0];
    }

    return "";
  };

  /**
   * Skips all text until the given regular expression can be matched. Returns
   * the skipped string, which is the entire tail if no match can be made.
   */
  Scanner.prototype.scanUntil = function (re) {
    var match, pos = this.tail.search(re);

    switch (pos) {
    case -1:
      match = this.tail;
      this.pos += this.tail.length;
      this.tail = "";
      break;
    case 0:
      match = "";
      break;
    default:
      match = this.tail.substring(0, pos);
      this.tail = this.tail.substring(pos);
      this.pos += pos;
    }

    return match;
  };

  function Context(view, parent) {
    this.view = view || {};
    this.parent = parent;
    this._cache = {};
  }

  Context.make = function (view) {
    return (view instanceof Context) ? view : new Context(view);
  };

  Context.prototype.push = function (view) {
    return new Context(view, this);
  };

  Context.prototype.lookup = function (name) {
    var value = this._cache[name];

    if (!value) {
      if (name == '.') {
        value = this.view;
      } else {
        var context = this;

        while (context) {
          if (name.indexOf('.') > 0) {
            value = context.view;
            var names = name.split('.'), i = 0;
            while (value && i < names.length) {
              value = value[names[i++]];
            }
          } else {
            value = context.view[name];
          }

          if (value != null) break;

          context = context.parent;
        }
      }

      this._cache[name] = value;
    }

    if (typeof value === 'function') value = value.call(this.view);

    return value;
  };

  function Writer() {
    this.clearCache();
  }

  Writer.prototype.clearCache = function () {
    this._cache = {};
    this._partialCache = {};
  };

  Writer.prototype.compile = function (template, tags) {
    var fn = this._cache[template];

    if (!fn) {
      var tokens = mustache.parse(template, tags);
      fn = this._cache[template] = this.compileTokens(tokens, template);
    }

    return fn;
  };

  Writer.prototype.compilePartial = function (name, template, tags) {
    var fn = this.compile(template, tags);
    this._partialCache[name] = fn;
    return fn;
  };

  Writer.prototype.getPartial = function (name) {
    if (!(name in this._partialCache) && this._loadPartial) {
      this.compilePartial(name, this._loadPartial(name));
    }

    return this._partialCache[name];
  };

  Writer.prototype.compileTokens = function (tokens, template) {
    var self = this;
    return function (view, partials) {
      if (partials) {
        if (typeof partials === 'function') {
          self._loadPartial = partials;
        } else {
          for (var name in partials) {
            self.compilePartial(name, partials[name]);
          }
        }
      }

      return renderTokens(tokens, self, Context.make(view), template);
    };
  };

  Writer.prototype.render = function (template, view, partials) {
    return this.compile(template)(view, partials);
  };

  /**
   * Low-level function that renders the given `tokens` using the given `writer`
   * and `context`. The `template` string is only needed for templates that use
   * higher-order sections to extract the portion of the original template that
   * was contained in that section.
   */
  function renderTokens(tokens, writer, context, template) {
    var buffer = '';

    var token, tokenValue, value;
    for (var i = 0, len = tokens.length; i < len; ++i) {
      token = tokens[i];
      tokenValue = token[1];

      switch (token[0]) {
      case '#':
        value = context.lookup(tokenValue);

        if (typeof value === 'object') {
          if (isArray(value)) {
            for (var j = 0, jlen = value.length; j < jlen; ++j) {
              buffer += renderTokens(token[4], writer, context.push(value[j]), template);
            }
          } else if (value) {
            buffer += renderTokens(token[4], writer, context.push(value), template);
          }
        } else if (typeof value === 'function') {
          var text = template == null ? null : template.slice(token[3], token[5]);
          value = value.call(context.view, text, function (template) {
            return writer.render(template, context);
          });
          if (value != null) buffer += value;
        } else if (value) {
          buffer += renderTokens(token[4], writer, context, template);
        }

        break;
      case '^':
        value = context.lookup(tokenValue);

        // Use JavaScript's definition of falsy. Include empty arrays.
        // See https://github.com/janl/mustache.js/issues/186
        if (!value || (isArray(value) && value.length === 0)) {
          buffer += renderTokens(token[4], writer, context, template);
        }

        break;
      case '>':
        value = writer.getPartial(tokenValue);
        if (typeof value === 'function') buffer += value(context);
        break;
      case '&':
        value = context.lookup(tokenValue);
        if (value != null) buffer += value;
        break;
      case 'name':
        value = context.lookup(tokenValue);
        if (value != null) buffer += mustache.escape(value);
        break;
      case 'text':
        buffer += tokenValue;
        break;
      }
    }

    return buffer;
  }

  /**
   * Forms the given array of `tokens` into a nested tree structure where
   * tokens that represent a section have two additional items: 1) an array of
   * all tokens that appear in that section and 2) the index in the original
   * template that represents the end of that section.
   */
  function nestTokens(tokens) {
    var tree = [];
    var collector = tree;
    var sections = [];

    var token;
    for (var i = 0, len = tokens.length; i < len; ++i) {
      token = tokens[i];
      switch (token[0]) {
      case '#':
      case '^':
        sections.push(token);
        collector.push(token);
        collector = token[4] = [];
        break;
      case '/':
        var section = sections.pop();
        section[5] = token[2];
        collector = sections.length > 0 ? sections[sections.length - 1][4] : tree;
        break;
      default:
        collector.push(token);
      }
    }

    return tree;
  }

  /**
   * Combines the values of consecutive text tokens in the given `tokens` array
   * to a single token.
   */
  function squashTokens(tokens) {
    var squashedTokens = [];

    var token, lastToken;
    for (var i = 0, len = tokens.length; i < len; ++i) {
      token = tokens[i];
      if (token) {
        if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
          lastToken[1] += token[1];
          lastToken[3] = token[3];
        } else {
          lastToken = token;
          squashedTokens.push(token);
        }
      }
    }

    return squashedTokens;
  }

  function escapeTags(tags) {
    return [
      new RegExp(escapeRegExp(tags[0]) + "\\s*"),
      new RegExp("\\s*" + escapeRegExp(tags[1]))
    ];
  }

  /**
   * Breaks up the given `template` string into a tree of token objects. If
   * `tags` is given here it must be an array with two string values: the
   * opening and closing tags used in the template (e.g. ["<%", "%>"]). Of
   * course, the default is to use mustaches (i.e. Mustache.tags).
   */
  function parseTemplate(template, tags) {
    template = template || '';
    tags = tags || mustache.tags;

    if (typeof tags === 'string') tags = tags.split(spaceRe);
    if (tags.length !== 2) throw new Error('Invalid tags: ' + tags.join(', '));

    var tagRes = escapeTags(tags);
    var scanner = new Scanner(template);

    var sections = [];     // Stack to hold section tokens
    var tokens = [];       // Buffer to hold the tokens
    var spaces = [];       // Indices of whitespace tokens on the current line
    var hasTag = false;    // Is there a {{tag}} on the current line?
    var nonSpace = false;  // Is there a non-space char on the current line?

    // Strips all whitespace tokens array for the current line
    // if there was a {{#tag}} on it and otherwise only space.
    function stripSpace() {
      if (hasTag && !nonSpace) {
        while (spaces.length) {
          delete tokens[spaces.pop()];
        }
      } else {
        spaces = [];
      }

      hasTag = false;
      nonSpace = false;
    }

    var start, type, value, chr, token;
    while (!scanner.eos()) {
      start = scanner.pos;

      // Match any text between tags.
      value = scanner.scanUntil(tagRes[0]);
      if (value) {
        for (var i = 0, len = value.length; i < len; ++i) {
          chr = value.charAt(i);

          if (isWhitespace(chr)) {
            spaces.push(tokens.length);
          } else {
            nonSpace = true;
          }

          tokens.push(['text', chr, start, start + 1]);
          start += 1;

          // Check for whitespace on the current line.
          if (chr == '\n') stripSpace();
        }
      }

      // Match the opening tag.
      if (!scanner.scan(tagRes[0])) break;
      hasTag = true;

      // Get the tag type.
      type = scanner.scan(tagRe) || 'name';
      scanner.scan(whiteRe);

      // Get the tag value.
      if (type === '=') {
        value = scanner.scanUntil(eqRe);
        scanner.scan(eqRe);
        scanner.scanUntil(tagRes[1]);
      } else if (type === '{') {
        value = scanner.scanUntil(new RegExp('\\s*' + escapeRegExp('}' + tags[1])));
        scanner.scan(curlyRe);
        scanner.scanUntil(tagRes[1]);
        type = '&';
      } else {
        value = scanner.scanUntil(tagRes[1]);
      }

      // Match the closing tag.
      if (!scanner.scan(tagRes[1])) throw new Error('Unclosed tag at ' + scanner.pos);

      token = [type, value, start, scanner.pos];
      tokens.push(token);

      if (type === '#' || type === '^') {
        sections.push(token);
      } else if (type === '/') {
        // Check section nesting.
        if (sections.length === 0) throw new Error('Unopened section "' + value + '" at ' + start);
        var openSection = sections.pop();
        if (openSection[1] !== value) throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
      } else if (type === 'name' || type === '{' || type === '&') {
        nonSpace = true;
      } else if (type === '=') {
        // Set the tags for the next time around.
        tags = value.split(spaceRe);
        if (tags.length !== 2) throw new Error('Invalid tags at ' + start + ': ' + tags.join(', '));
        tagRes = escapeTags(tags);
      }
    }

    // Make sure there are no open sections when we're done.
    var openSection = sections.pop();
    if (openSection) throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);

    tokens = squashTokens(tokens);

    return nestTokens(tokens);
  }

  mustache.name = "mustache.js";
  mustache.version = "0.7.2";
  mustache.tags = ["{{", "}}"];

  mustache.Scanner = Scanner;
  mustache.Context = Context;
  mustache.Writer = Writer;

  mustache.parse = parseTemplate;

  // Export the escaping function so that the user may override it.
  // See https://github.com/janl/mustache.js/issues/244
  mustache.escape = escapeHtml;

  // All Mustache.* functions use this writer.
  var defaultWriter = new Writer();

  /**
   * Clears all cached templates and partials in the default writer.
   */
  mustache.clearCache = function () {
    return defaultWriter.clearCache();
  };

  /**
   * Compiles the given `template` to a reusable function using the default
   * writer.
   */
  mustache.compile = function (template, tags) {
    return defaultWriter.compile(template, tags);
  };

  /**
   * Compiles the partial with the given `name` and `template` to a reusable
   * function using the default writer.
   */
  mustache.compilePartial = function (name, template, tags) {
    return defaultWriter.compilePartial(name, template, tags);
  };

  /**
   * Compiles the given array of tokens (the output of a parse) to a reusable
   * function using the default writer.
   */
  mustache.compileTokens = function (tokens, template) {
    return defaultWriter.compileTokens(tokens, template);
  };

  /**
   * Renders the `template` with the given `view` and `partials` using the
   * default writer.
   */
  mustache.render = function (template, view, partials) {
    return defaultWriter.render(template, view, partials);
  };

  // This is here for backwards compatibility with 0.4.x.
  mustache.to_html = function (template, view, partials, send) {
    var result = mustache.render(template, view, partials);

    if (typeof send === "function") {
      send(result);
    } else {
      return result;
    }
  };

}));



define('templates',[],function(){
    var auth_form = '\
    <!-- Modal -->\
    <div class="vbb-api">\
    <div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">\
    <div class="modal-dialog">\
    <form class="modal-content">\
        <div class="modal-header">\
            <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
            <h4 class="modal-title">Login</h4>\
        </div>\
        <div class="modal-body">\
            <div class="alert-holder"></div> \
                <div class="input extra-content"></div>\
                <div class="input hide">\
                    <input type="text" class="form-control" name="username" placeholder="{{username}}">\
                </div>\
                <div class="input hide">\
                    <input type="password" class="form-control" name="password" placeholder="{{password}}">\
                </div>\
                <div class="input hide">\
                    <input type="password" class="form-control" name="new_password" placeholder="{{new_pass}}">\
                </div>\
                <div class="input hide">\
                    <input type="password" class="form-control" name="new_password_confirm" placeholder="{{new_pass_confirm}}">\
                </div>\
                <div class="checkbox hide"><label><input type="checkbox" name="remember_me">{{remember_me}}</label></div>\
               <input type="submit" class="hide">\
        </div>\
        <div class="modal-footer">\
            <button class="btn pull-left prev hide">{{prev}}</button>\
            <input type="text" class="form-control" name="code" placeholder="{{code}}">\
            <button class="btn btn-primary active">{{submit}}</button>\
        </div>\
    </form>\
    </div>\
    </div>\
    </div><!--end .voz-api-->\
    ';

    var alert_error = '<div class="alert alert-danger fade in">\
                        <button type="button" class="close" data-dismiss="alert">&times;</button>\
                        {{&msg}}\
                    </div>';
    var alert_success = '<div class="alert alert-success">\
                        <button type="button" class="close" data-dismiss="alert">&times;</button>\
                     {{&msg}}\
                    </div>';

    var phones_2factor = '\
    <p>{{&msg_top}}</p>\
    {{#items}}\
    <div class="radio col-lg-offset-1">\
        <label>\
            <input type="radio" name="phone" value="{{slug}}">\
            {{title}}\
        </label>\
    </div>\
    {{/items}}\
    <p>{{&msg_bottom}}</p>\
    ';

    var captcha = '\
    <p>{{msg}}</p>\
    <h3 class="text-center">{{code}}</h3>\
    ';

    return {
        auth_form: auth_form,
        alert_error: alert_error,
        phones_2factor: phones_2factor,
        captcha: captcha
    }
});
//
// showdown.js -- A javascript port of Markdown.
//
// Copyright (c) 2007 John Fraser.
//
// Original Markdown Copyright (c) 2004-2005 John Gruber
//   <http://daringfireball.net/projects/markdown/>
//
// Redistributable under a BSD-style open source license.
// See license.txt for more information.
//
// The full source distribution is at:
//
//				A A L
//				T C A
//				T K B
//
//   <http://www.attacklab.net/>
//
//
// Wherever possible, Showdown is a straight, line-by-line port
// of the Perl version of Markdown.
//
// This is not a normal parser design; it's basically just a
// series of string substitutions.  It's hard to read and
// maintain this way,  but keeping Showdown close to the original
// design makes it easier to port new features.
//
// More importantly, Showdown behaves like markdown.pl in most
// edge cases.  So web applications can do client-side preview
// in Javascript, and then build identical HTML on the server.
//
// This port needs the new RegExp functionality of ECMA 262,
// 3rd Edition (i.e. Javascript 1.5).  Most modern web browsers
// should do fine.  Even with the new regular expression features,
// We do a lot of work to emulate Perl's regex functionality.
// The tricky changes in this file mostly have the "attacklab:"
// label.  Major or self-explanatory changes don't.
//
// Smart diff tools like Araxis Merge will be able to match up
// this file with markdown.pl in a useful way.  A little tweaking
// helps: in a copy of markdown.pl, replace "#" with "//" and
// replace "$text" with "text".  Be sure to ignore whitespace
// and line endings.
//
//
// Showdown usage:
//
//   var text = "Markdown *rocks*.";
//
//   var converter = new Showdown.converter();
//   var html = converter.makeHtml(text);
//
//   alert(html);
//
// Note: move the sample code to the bottom of this
// file before uncommenting it.
//
//
// Showdown namespace
//
var Showdown={extensions:{}},forEach=Showdown.forEach=function(a,b){if(typeof a.forEach=="function")a.forEach(b);else{var c,d=a.length;for(c=0;c<d;c++)b(a[c],c,a)}},stdExtName=function(a){return a.replace(/[_-]||\s/g,"").toLowerCase()};Showdown.converter=function(a){var b,c,d,e=0,f=[],g=[];if(typeof module!="undefind"&&typeof exports!="undefined"&&typeof require!="undefind"){var h=require("fs");if(h){var i=h.readdirSync((__dirname||".")+"/extensions").filter(function(a){return~a.indexOf(".js")}).map(function(a){return a.replace(/\.js$/,"")});Showdown.forEach(i,function(a){var b=stdExtName(a);Showdown.extensions[b]=require("./extensions/"+a)})}}this.makeHtml=function(a){return b={},c={},d=[],a=a.replace(/~/g,"~T"),a=a.replace(/\$/g,"~D"),a=a.replace(/\r\n/g,"\n"),a=a.replace(/\r/g,"\n"),a="\n\n"+a+"\n\n",a=M(a),a=a.replace(/^[ \t]+$/mg,""),Showdown.forEach(f,function(b){a=k(b,a)}),a=z(a),a=m(a),a=l(a),a=o(a),a=K(a),a=a.replace(/~D/g,"$$"),a=a.replace(/~T/g,"~"),Showdown.forEach(g,function(b){a=k(b,a)}),a};if(a&&a.extensions){var j=this;Showdown.forEach(a.extensions,function(a){typeof a=="string"&&(a=Showdown.extensions[stdExtName(a)]);if(typeof a!="function")throw"Extension '"+a+"' could not be loaded.  It was either not found or is not a valid extension.";Showdown.forEach(a(j),function(a){a.type?a.type==="language"||a.type==="lang"?f.push(a):(a.type==="output"||a.type==="html")&&g.push(a):g.push(a)})})}var k=function(a,b){if(a.regex){var c=new RegExp(a.regex,"g");return b.replace(c,a.replace)}if(a.filter)return a.filter(b)},l=function(a){return a+="~0",a=a.replace(/^[ ]{0,3}\[(.+)\]:[ \t]*\n?[ \t]*<?(\S+?)>?[ \t]*\n?[ \t]*(?:(\n*)["(](.+?)[")][ \t]*)?(?:\n+|(?=~0))/gm,function(a,d,e,f,g){return d=d.toLowerCase(),b[d]=G(e),f?f+g:(g&&(c[d]=g.replace(/"/g,"&quot;")),"")}),a=a.replace(/~0/,""),a},m=function(a){a=a.replace(/\n/g,"\n\n");var b="p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|ins|del|style|section|header|footer|nav|article|aside",c="p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|style|section|header|footer|nav|article|aside";return a=a.replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|ins|del)\b[^\r]*?\n<\/\2>[ \t]*(?=\n+))/gm,n),a=a.replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|style|section|header|footer|nav|article|aside)\b[^\r]*?<\/\2>[ \t]*(?=\n+)\n)/gm,n),a=a.replace(/(\n[ ]{0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g,n),a=a.replace(/(\n\n[ ]{0,3}<!(--[^\r]*?--\s*)+>[ \t]*(?=\n{2,}))/g,n),a=a.replace(/(?:\n\n)([ ]{0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g,n),a=a.replace(/\n\n/g,"\n"),a},n=function(a,b){var c=b;return c=c.replace(/\n\n/g,"\n"),c=c.replace(/^\n/,""),c=c.replace(/\n+$/g,""),c="\n\n~K"+(d.push(c)-1)+"K\n\n",c},o=function(a){a=v(a);var b=A("<hr />");return a=a.replace(/^[ ]{0,2}([ ]?\*[ ]?){3,}[ \t]*$/gm,b),a=a.replace(/^[ ]{0,2}([ ]?\-[ ]?){3,}[ \t]*$/gm,b),a=a.replace(/^[ ]{0,2}([ ]?\_[ ]?){3,}[ \t]*$/gm,b),a=x(a),a=y(a),a=E(a),a=m(a),a=F(a),a},p=function(a){return a=B(a),a=q(a),a=H(a),a=t(a),a=r(a),a=I(a),a=G(a),a=D(a),a=a.replace(/  +\n/g," <br />\n"),a},q=function(a){var b=/(<[a-z\/!$]("[^"]*"|'[^']*'|[^'">])*>|<!(--.*?--\s*)+>)/gi;return a=a.replace(b,function(a){var b=a.replace(/(.)<\/?code>(?=.)/g,"$1`");return b=N(b,"\\`*_"),b}),a},r=function(a){return a=a.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g,s),a=a.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\]\([ \t]*()<?(.*?(?:\(.*?\).*?)?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g,s),a=a.replace(/(\[([^\[\]]+)\])()()()()()/g,s),a},s=function(a,d,e,f,g,h,i,j){j==undefined&&(j="");var k=d,l=e,m=f.toLowerCase(),n=g,o=j;if(n==""){m==""&&(m=l.toLowerCase().replace(/ ?\n/g," ")),n="#"+m;if(b[m]!=undefined)n=b[m],c[m]!=undefined&&(o=c[m]);else{if(!(k.search(/\(\s*\)$/m)>-1))return k;n=""}}n=N(n,"*_");var p='<a href="'+n+'"';return o!=""&&(o=o.replace(/"/g,"&quot;"),o=N(o,"*_"),p+=' title="'+o+'"'),p+=">"+l+"</a>",p},t=function(a){return a=a.replace(/(!\[(.*?)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g,u),a=a.replace(/(!\[(.*?)\]\s?\([ \t]*()<?(\S+?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g,u),a},u=function(a,d,e,f,g,h,i,j){var k=d,l=e,m=f.toLowerCase(),n=g,o=j;o||(o="");if(n==""){m==""&&(m=l.toLowerCase().replace(/ ?\n/g," ")),n="#"+m;if(b[m]==undefined)return k;n=b[m],c[m]!=undefined&&(o=c[m])}l=l.replace(/"/g,"&quot;"),n=N(n,"*_");var p='<img src="'+n+'" alt="'+l+'"';return o=o.replace(/"/g,"&quot;"),o=N(o,"*_"),p+=' title="'+o+'"',p+=" />",p},v=function(a){function b(a){return a.replace(/[^\w]/g,"").toLowerCase()}return a=a.replace(/^(.+)[ \t]*\n=+[ \t]*\n+/gm,function(a,c){return A('<h1 id="'+b(c)+'">'+p(c)+"</h1>")}),a=a.replace(/^(.+)[ \t]*\n-+[ \t]*\n+/gm,function(a,c){return A('<h2 id="'+b(c)+'">'+p(c)+"</h2>")}),a=a.replace(/^(\#{1,6})[ \t]*(.+?)[ \t]*\#*\n+/gm,function(a,c,d){var e=c.length;return A("<h"+e+' id="'+b(d)+'">'+p(d)+"</h"+e+">")}),a},w,x=function(a){a+="~0";var b=/^(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm;return e?a=a.replace(b,function(a,b,c){var d=b,e=c.search(/[*+-]/g)>-1?"ul":"ol";d=d.replace(/\n{2,}/g,"\n\n\n");var f=w(d);return f=f.replace(/\s+$/,""),f="<"+e+">"+f+"</"+e+">\n",f}):(b=/(\n\n|^\n?)(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/g,a=a.replace(b,function(a,b,c,d){var e=b,f=c,g=d.search(/[*+-]/g)>-1?"ul":"ol",f=f.replace(/\n{2,}/g,"\n\n\n"),h=w(f);return h=e+"<"+g+">\n"+h+"</"+g+">\n",h})),a=a.replace(/~0/,""),a};w=function(a){return e++,a=a.replace(/\n{2,}$/,"\n"),a+="~0",a=a.replace(/(\n)?(^[ \t]*)([*+-]|\d+[.])[ \t]+([^\r]+?(\n{1,2}))(?=\n*(~0|\2([*+-]|\d+[.])[ \t]+))/gm,function(a,b,c,d,e){var f=e,g=b,h=c;return g||f.search(/\n{2,}/)>-1?f=o(L(f)):(f=x(L(f)),f=f.replace(/\n$/,""),f=p(f)),"<li>"+f+"</li>\n"}),a=a.replace(/~0/g,""),e--,a};var y=function(a){return a+="~0",a=a.replace(/(?:\n\n|^)((?:(?:[ ]{4}|\t).*\n+)+)(\n*[ ]{0,3}[^ \t\n]|(?=~0))/g,function(a,b,c){var d=b,e=c;return d=C(L(d)),d=M(d),d=d.replace(/^\n+/g,""),d=d.replace(/\n+$/g,""),d="<pre><code>"+d+"\n</code></pre>",A(d)+e}),a=a.replace(/~0/,""),a},z=function(a){return a+="~0",a=a.replace(/(?:^|\n)```(.*)\n([\s\S]*?)\n```/g,function(a,b,c){var d=b,e=c;return e=C(e),e=M(e),e=e.replace(/^\n+/g,""),e=e.replace(/\n+$/g,""),e="<pre><code"+(d?' class="'+d+'"':"")+">"+e+"\n</code></pre>",A(e)}),a=a.replace(/~0/,""),a},A=function(a){return a=a.replace(/(^\n+|\n+$)/g,""),"\n\n~K"+(d.push(a)-1)+"K\n\n"},B=function(a){return a=a.replace(/(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm,function(a,b,c,d,e){var f=d;return f=f.replace(/^([ \t]*)/g,""),f=f.replace(/[ \t]*$/g,""),f=C(f),b+"<code>"+f+"</code>"}),a},C=function(a){return a=a.replace(/&/g,"&amp;"),a=a.replace(/</g,"&lt;"),a=a.replace(/>/g,"&gt;"),a=N(a,"*_{}[]\\",!1),a},D=function(a){return a=a.replace(/(\*\*|__)(?=\S)([^\r]*?\S[*_]*)\1/g,"<strong>$2</strong>"),a=a.replace(/(\*|_)(?=\S)([^\r]*?\S)\1/g,"<em>$2</em>"),a},E=function(a){return a=a.replace(/((^[ \t]*>[ \t]?.+\n(.+\n)*\n*)+)/gm,function(a,b){var c=b;return c=c.replace(/^[ \t]*>[ \t]?/gm,"~0"),c=c.replace(/~0/g,""),c=c.replace(/^[ \t]+$/gm,""),c=o(c),c=c.replace(/(^|\n)/g,"$1  "),c=c.replace(/(\s*<pre>[^\r]+?<\/pre>)/gm,function(a,b){var c=b;return c=c.replace(/^  /mg,"~0"),c=c.replace(/~0/g,""),c}),A("<blockquote>\n"+c+"\n</blockquote>")}),a},F=function(a){a=a.replace(/^\n+/g,""),a=a.replace(/\n+$/g,"");var b=a.split(/\n{2,}/g),c=[],e=b.length;for(var f=0;f<e;f++){var g=b[f];g.search(/~K(\d+)K/g)>=0?c.push(g):g.search(/\S/)>=0&&(g=p(g),g=g.replace(/^([ \t]*)/g,"<p>"),g+="</p>",c.push(g))}e=c.length;for(var f=0;f<e;f++)while(c[f].search(/~K(\d+)K/)>=0){var h=d[RegExp.$1];h=h.replace(/\$/g,"$$$$"),c[f]=c[f].replace(/~K\d+K/,h)}return c.join("\n\n")},G=function(a){return a=a.replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g,"&amp;"),a=a.replace(/<(?![a-z\/?\$!])/gi,"&lt;"),a},H=function(a){return a=a.replace(/\\(\\)/g,O),a=a.replace(/\\([`*_{}\[\]()>#+-.!])/g,O),a},I=function(a){return a=a.replace(/<((https?|ftp|dict):[^'">\s]+)>/gi,'<a href="$1">$1</a>'),a=a.replace(/<(?:mailto:)?([-.\w]+\@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi,function(a,b){return J(K(b))}),a},J=function(a){var b=[function(a){return"&#"+a.charCodeAt(0)+";"},function(a){return"&#x"+a.charCodeAt(0).toString(16)+";"},function(a){return a}];return a="mailto:"+a,a=a.replace(/./g,function(a){if(a=="@")a=b[Math.floor(Math.random()*2)](a);else if(a!=":"){var c=Math.random();a=c>.9?b[2](a):c>.45?b[1](a):b[0](a)}return a}),a='<a href="'+a+'">'+a+"</a>",a=a.replace(/">.+:/g,'">'),a},K=function(a){return a=a.replace(/~E(\d+)E/g,function(a,b){var c=parseInt(b);return String.fromCharCode(c)}),a},L=function(a){return a=a.replace(/^(\t|[ ]{1,4})/gm,"~0"),a=a.replace(/~0/g,""),a},M=function(a){return a=a.replace(/\t(?=\t)/g,"    "),a=a.replace(/\t/g,"~A~B"),a=a.replace(/~B(.+?)~A/g,function(a,b,c){var d=b,e=4-d.length%4;for(var f=0;f<e;f++)d+=" ";return d}),a=a.replace(/~A/g,"    "),a=a.replace(/~B/g,""),a},N=function(a,b,c){var d="(["+b.replace(/([\[\]\\])/g,"\\$1")+"])";c&&(d="\\\\"+d);var e=new RegExp(d,"g");return a=a.replace(e,O),a},O=function(a,b){var c=b.charCodeAt(0);return"~E"+c+"E"}},typeof module!="undefined"&&(module.exports=Showdown),typeof define=="function"&&define.amd&&define("showdown",[],function(){return Showdown});
define("vendor/showdown/compressed/showdown", function(){});



define(
    'component_ui/auth_form',[
        'vendor/flight/lib/component',
        'vendor/mustache.js/mustache',
        'templates',
        'i18n!nls/content',
        'converter'
    ],
    function(defineComponent, Mustache, templates, i18n){
        return defineComponent(AuthForm);

        function AuthForm(){

            //var that = this

            this.defaultAttrs({
                state                   : 'login',
                vbbFormLogin            : 'form[action^="login"]',
                vbbBtnLogout            : 'a[href*="login.php?do=logout"]',
                formSelector            : '#myModal form',
                titleSelector           : '#myModal .modal-title',
                controlGroupSelector    : '#myModal .input',
                holderErrorSelector     : '#myModal .alert-holder',
                holderCaptchaSelector   : '#myModal .captcha-holder',
                btnSubmitSelector       : '#myModal .btn.active',
                btnPrevSelector         : '#myModal .btn.prev',
                btnShowPasswordSelector : '#myModal input[type="checkbox"]',
                btnEnable2Factor        : '.enable_2f',
                inputUsernameSelector   : '#myModal [name=username]',
                inputPasswordSelector   : '#myModal [name=password]',
                inputNewPasswordSelector: '#myModal [name=new_password]',
                inputNewPasswordConfirmSelector
                                        : '#myModal [name=new_password_confirm]',
                inputCodeSelector       : '#myModal [name=code]',
                inputPhoneSelector      : '#myModal [name=phone]:checked',
                inputRememberSelector   : '#myModal [name=remember_me]',
                extraContent            : '#myModal .extra-content',
                holderQRCode            : '#myModal .image-holder',
                phones                  : []
            });

            this.submit = function(ev, data){
                ev.preventDefault();
                this.select('formSelector').trigger('submit');
                return false;
            }

            this.submitHandler = function(ev, data){

                ev.preventDefault();
                var authData;
                switch(this.attr.state){
                    case 'msg':
                        $('#myModal').modal('hide');
                        return;
                        break;

                    case 'enable2factor':
                        this.trigger(document, 'authUpdateQR', {code: this.select('inputCodeSelector').val()});
                        return;
                        break;

                    case 'changePassword':
                        this.trigger(document, 'authUpdatePassword', {
                            old_password: this.select('inputPasswordSelector').val(),
                            new_password: this.select('inputNewPasswordSelector').val(),
                            new_password_confirm: this.select('inputNewPasswordConfirmSelector').val(),
                        });
                        return;
                        break;

                    case 'choose_phone':
                        this.trigger(document, 'authChoosePhone', {phone: this.select('inputPhoneSelector').val()});
                        return;
                        break;

                    case '2factor_ready':
                        this.trigger(document, 'authNewQR', {force: 1});
                        return;
                        break;

                    case 'login':
                        authData = {
                            password: this.select('inputPasswordSelector').val(),
                            username: this.select('inputUsernameSelector').val(),
                            cookie: this.select('inputRememberSelector').is(':checked') ? 1 : 0
                        }
                        break;

                    case 'lost_password':
                        this.trigger(document, 'authLostPassword', {
                            email: this.select('inputUsernameSelector').val(),
                        });
                        return;
                        break;

                    case 'lost_password_captcha':
                        if(this.select('inputCodeSelector').val() == ''){
                            this.trigger(document, 'authFormError', {error: i18n.validation.require_captcha});
                            return;
                        }

                        this.trigger(document, 'authLostPasswordCaptcha', {
                            captcha: this.select('inputCodeSelector').val(),
                        });

                        return;
                        break;

                    case 'captcha':
                        if(this.select('inputCodeSelector').val() == ''){
                            this.trigger(document, 'authFormError', {error: i18n.validation.require_captcha});
                            return;
                        }

                        authData = {
                            captcha: this.select('inputCodeSelector').val()
                        }
                        break;

                    case '2factor':
                        authData = {
                            ga2f: this.select('inputCodeSelector').val()
                        }
                        break;
                }

                this.trigger(document, 'authLogin', authData);
            }

            this.prev = function(ev, data){

                ev.preventDefault();

                switch(this.attr.state){
                    case 'enable2factor':
                        this.trigger(document, 'authFormChoosePhone');
                        break;

                    case '2factor_ready':
                        this.trigger(document, 'authDisable2Factor');
                        break;

                    case 'login':
                        this.trigger(document, 'authFormLostPassword');
                        break;
                }

                return false;
            }

            this.btnShowpass = function(ev, data){
                if(this.select('btnShowPasswordSelector').is(':checked'))
                    $(data.el).parents('.input-append').children('input').attr('type', 'text');
                else
                    $(data.el).parents('.input-append').children('input').attr('type', 'password');
            }

            this.hidepass = function(ev, data){
                this.select('inputPasswordSelector').attr('type', 'password');
                this.select('btnShowPasswordSelector').attr('checked', false);
            }

            this.success = function(ev, data){
                // reload page when login success
                if(data.url){
                    window.location = data.url;
                }else{
                    location.reload();
                }
            }

            this.error = function(ev, data){
                this.select('holderErrorSelector').hide().html(Mustache.render(templates.alert_error, {msg: data.error})).fadeIn();
            }

            this.showModel = function(ev, data){
                //console.log('test', this.select('inputUsernameSelector'));
                ev.preventDefault();
                $('#myModal').modal('show');
                $('#myModal').show();
                this.trigger(document, 'authFormLogin');
                return false;
            }

            this.enable2Factor = function(ev, data){
                ev.preventDefault();
                $('#myModal').modal('show');
                //this.trigger(document, 'authFormChange2Factor');
                this.trigger(document, 'authNewQR');
                return false;
            }

            this.hideAll = function(){
                this.select('controlGroupSelector').addClass('hide');
                this.select('inputCodeSelector').addClass('hide').val('');
                this.select('btnPrevSelector').addClass('hide');
                this.select('holderErrorSelector').empty();
                this.select('inputRememberSelector').parents('.checkbox').addClass('hide');
                this.select('inputUsernameSelector').attr('placeholder', i18n.button.username);
            }

            this.login = function(ev, data){
                this.hideAll();
                this.attr.state = 'login';
                this.select('titleSelector').text(i18n.box_title.login);
                this.select('btnSubmitSelector').text(i18n.button.sign_in);
                this.select('inputUsernameSelector').parents('.input').removeClass('hide');
                this.select('inputPasswordSelector').parents('.input').removeClass('hide');
                this.select('inputRememberSelector').parents('.checkbox').removeClass('hide');
                this.select('btnPrevSelector').removeClass('hide').text(i18n.button.lost_password);
                setTimeout(function(){
                    this.select('inputUsernameSelector').focus();
                }.bind(this),300);
            }

            this.lostPassword = function(ev, data){
                this.hideAll();
                this.attr.state = 'lost_password';
                this.select('titleSelector').text(i18n.box_title.lost_password);
                this.select('inputUsernameSelector').attr('placeholder', i18n.button.email).parents('.input').removeClass('hide');
                this.select('btnSubmitSelector').text(i18n.button.reset_password);
                setTimeout(function(){
                    this.select('inputUsernameSelector').focus();
                }.bind(this),300);
            }

            this.lostPasswordCaptcha = function(ev, data){
                this.hideAll();
                this.attr.state = 'lost_password_captcha';
                this.select('titleSelector').text(i18n.box_title.captcha);
                this.select('btnSubmitSelector').text(i18n.button.verify);
                this.select('holderCaptchaSelector').html(data.captcha);
                this.select('inputCodeSelector').removeClass('hide');
                this.select('extraContent').removeClass('hide').html(Mustache.render(templates.captcha, {code: data.captcha, msg: data.msg}));
            }

            this.captcha = function(ev, data){
                this.hideAll();
                this.attr.state = 'captcha';
                this.select('titleSelector').text(i18n.box_title.captcha);
                this.select('btnSubmitSelector').text(i18n.button.verify);
                this.select('holderCaptchaSelector').html(data.captcha);
                this.select('inputCodeSelector').removeClass('hide');
                this.select('extraContent').removeClass('hide').html(Mustache.render(templates.captcha, {code: data.captcha, msg: data.msg}));
            }

            this.twofactor = function(ev, data){
                this.hideAll();
                this.attr.state = '2factor';
                this.select('titleSelector').text(i18n.box_title.twoFA);
                this.select('btnSubmitSelector').text(i18n.button.verify);
                this.select('inputCodeSelector').removeClass('hide');
                this.select('extraContent').removeClass('hide').html(data.msg);
            }

            this.twofactor_ready = function(ev, data){
                this.hideAll();
                this.attr.state = '2factor_ready';
                this.select('titleSelector').text(i18n.box_title.twoFA);
                this.select('btnSubmitSelector').text(i18n.button.move_phone);
                this.select('btnPrevSelector').removeClass('hide').text(i18n.button.twoFA_disable);
                this.select('extraContent').removeClass('hide').html(data.msg);
            }

            this.choosePhone = function(ev, data){
                this.hideAll();
                this.attr.state = 'choose_phone';
                this.select('titleSelector').text(i18n.box_title.twoFA);
                this.select('btnSubmitSelector').text(i18n.button.continue);
                this.select('extraContent').removeClass('hide').html(Mustache.render(
                    templates.phones_2factor,
                    {
                        items: this.attr.phones,
                        msg_top: i18n.message.choose_phone_top,
                        msg_bottom: i18n.message.choose_phone_bottom
                    }
                ));
            }

            this.change2Factor = function(ev, data){
                data = $.extend({}, {force: 0}, data);
                this.hideAll();
                this.attr.state = 'enable2factor';
                this.select('titleSelector').text(i18n.box_title.twoFA);
                this.select('btnSubmitSelector').text(i18n.button.verify_and_save);
                this.select('inputCodeSelector').removeClass('hide');
                this.select('btnPrevSelector').removeClass('hide').text(i18n.button.prev);

                var app_url;
                for(var n in this.attr.phones){
                    if(this.attr.phones[n].slug == data.phone){
                        app_url = this.attr.phones[n].app_url
                    }
                }

                this.select('extraContent')
                    .removeClass('hide')
                    .html(converter.makeHtml(Mustache.render(
                        i18n.markdown_2factor[data.phone],
                        {
                            image_url: data.url,
                            secret_key: data.key,
                            app_url: app_url
                        }
                    )));

            }

            this.changePassword = function(ev, data){
                this.hideAll();
                this.attr.state = 'changePassword';
                this.select('titleSelector').text(i18n.box_title.twoFA);
                this.select('btnSubmitSelector').text(i18n.button.change_pass);
                this.select('extraContent').removeClass('hide').html(data.msg);
                this.select('inputPasswordSelector').parents('.input').removeClass('hide');
                this.select('inputNewPasswordSelector').parents('.input').removeClass('hide');
                this.select('inputNewPasswordConfirmSelector').parents('.input').removeClass('hide');
            }

            this.updateQR = function(ev, data){
                this.select('holderQRCode').html('<img src="'+data.url+'" />');
            }

            this.msg = function(ev, data){
                $('#myModal').modal('show');
                this.hideAll();
                this.attr.state = 'msg';
                this.select('titleSelector').text(data.title);
                this.select('btnSubmitSelector').text('OK');
                this.select('extraContent').removeClass('hide').html(data.msg);
            }

            this.hitLogout = function(ev, data){
                this.trigger(document, 'authLogout');
                ev.preventDefault();
                return false;
            }

            this.after('initialize', function() {

                $('body').append(Mustache.render(templates.auth_form, i18n.button));

                this.select('btnEnable2Factor').text(i18n.button.twoFA_trigger);

                this.on('click', {
                    vbbFormLogin: this.showModel,
                    btnShowPasswordSelector: this.btnShowpass,
                    btnSubmitSelector: this.submit,
                    vbbBtnLogout: this.hitLogout,
                    btnEnable2Factor: this.enable2Factor,
                    btnPrevSelector: this.prev
                });

                this.on('submit', {
                    'formSelector': this.submitHandler
                });

                this.on(document, 'authFormError', this.error);
                this.on(document, 'authFormSuccess', this.success);
                this.on(document, 'authFormLogin', this.login);
                this.on(document, 'authFormCaptcha', this.captcha);
                this.on(document, 'authForm2Step', this.twofactor);
                this.on(document, 'authForm2FactorReady', this.twofactor_ready);
                this.on(document, 'authFormChange2Factor', this.change2Factor);
                this.on(document, 'authFormUpdateQR', this.updateQR)
                this.on(document, 'authFormChangePassword', this.changePassword)
                this.on(document, 'authFormChoosePhone', this.choosePhone)
                this.on(document, 'authFormMsg', this.msg)
                this.on(document, 'authFormLostPassword', this.lostPassword)
                this.on(document, 'authFormLostPasswordCaptcha', this.lostPasswordCaptcha)

                $('#myModal').modal({
                    backdrop: false,
                    show: false
                })

                $('#myModal').on('hidden.bs.modal', function () {
                    $('body').removeClass('modal-open');
                })

                $('#myModal').on('show.bs.modal', function () {
                    $('body').addClass('modal-open');
                })

            });

        }
    }
);


define(
    'boot/page',[
        'data',
        'component_data/auth',
        'component_ui/auth_form',
    ],

    function( data, AuthData, AuthFormUI) {

        function initialize() {
            AuthData.attachTo(document, {phones: data.phones, api_url: data.api_url});
            AuthFormUI.attachTo(document, {phones: data.phones});
        }

        return initialize;
    }
);

(function(definition){if(typeof define=="function"){define('vendor/es5-shim/es5-shim.min',definition)}else if(typeof YUI=="function"){YUI.add("es5",definition)}else{definition()}})(function(){function Empty(){}if(!Function.prototype.bind){Function.prototype.bind=function bind(that){var target=this;if(typeof target!="function"){throw new TypeError("Function.prototype.bind called on incompatible "+target)}var args=_Array_slice_.call(arguments,1);var bound=function(){if(this instanceof bound){var result=target.apply(this,args.concat(_Array_slice_.call(arguments)));if(Object(result)===result){return result}return this}else{return target.apply(that,args.concat(_Array_slice_.call(arguments)))}};if(target.prototype){Empty.prototype=target.prototype;bound.prototype=new Empty;Empty.prototype=null}return bound}}var call=Function.prototype.call;var prototypeOfArray=Array.prototype;var prototypeOfObject=Object.prototype;var _Array_slice_=prototypeOfArray.slice;var _toString=call.bind(prototypeOfObject.toString);var owns=call.bind(prototypeOfObject.hasOwnProperty);var defineGetter;var defineSetter;var lookupGetter;var lookupSetter;var supportsAccessors;if(supportsAccessors=owns(prototypeOfObject,"__defineGetter__")){defineGetter=call.bind(prototypeOfObject.__defineGetter__);defineSetter=call.bind(prototypeOfObject.__defineSetter__);lookupGetter=call.bind(prototypeOfObject.__lookupGetter__);lookupSetter=call.bind(prototypeOfObject.__lookupSetter__)}if([1,2].splice(0).length!=2){var array_splice=Array.prototype.splice;if(function(){function makeArray(l){var a=[];while(l--){a.unshift(l)}return a}var array=[],lengthBefore;array.splice.bind(array,0,0).apply(null,makeArray(20));array.splice.bind(array,0,0).apply(null,makeArray(26));lengthBefore=array.length;array.splice(5,0,"XXX");if(lengthBefore+1==array.length){return true}}()){Array.prototype.splice=function(start,deleteCount){if(!arguments.length){return[]}else{return array_splice.apply(this,[start===void 0?0:start,deleteCount===void 0?this.length-start:deleteCount].concat(_Array_slice_.call(arguments,2)))}}}else{Array.prototype.splice=function(start,deleteCount){var result,args=_Array_slice_.call(arguments,2),addElementsCount=args.length;if(!arguments.length){return[]}if(start===void 0){start=0}if(deleteCount===void 0){deleteCount=this.length-start}if(addElementsCount>0){if(deleteCount<=0){if(start==this.length){this.push.apply(this,args);return[]}if(start==0){this.unshift.apply(this,args);return[]}}result=_Array_slice_.call(this,start,start+deleteCount);args.push.apply(args,_Array_slice_.call(this,start+deleteCount,this.length));args.unshift.apply(args,_Array_slice_.call(this,0,start));args.unshift(0,this.length);array_splice.apply(this,args);return result}return array_splice.call(this,start,deleteCount)}}}if([].unshift(0)!=1){var array_unshift=Array.prototype.unshift;Array.prototype.unshift=function(){array_unshift.apply(this,arguments);return this.length}}if(!Array.isArray){Array.isArray=function isArray(obj){return _toString(obj)=="[object Array]"}}var boxedString=Object("a"),splitString=boxedString[0]!="a"||!(0 in boxedString);if(!Array.prototype.forEach){Array.prototype.forEach=function forEach(fun){var object=toObject(this),self=splitString&&_toString(this)=="[object String]"?this.split(""):object,thisp=arguments[1],i=-1,length=self.length>>>0;if(_toString(fun)!="[object Function]"){throw new TypeError}while(++i<length){if(i in self){fun.call(thisp,self[i],i,object)}}}}if(!Array.prototype.map){Array.prototype.map=function map(fun){var object=toObject(this),self=splitString&&_toString(this)=="[object String]"?this.split(""):object,length=self.length>>>0,result=Array(length),thisp=arguments[1];if(_toString(fun)!="[object Function]"){throw new TypeError(fun+" is not a function")}for(var i=0;i<length;i++){if(i in self)result[i]=fun.call(thisp,self[i],i,object)}return result}}if(!Array.prototype.filter){Array.prototype.filter=function filter(fun){var object=toObject(this),self=splitString&&_toString(this)=="[object String]"?this.split(""):object,length=self.length>>>0,result=[],value,thisp=arguments[1];if(_toString(fun)!="[object Function]"){throw new TypeError(fun+" is not a function")}for(var i=0;i<length;i++){if(i in self){value=self[i];if(fun.call(thisp,value,i,object)){result.push(value)}}}return result}}if(!Array.prototype.every){Array.prototype.every=function every(fun){var object=toObject(this),self=splitString&&_toString(this)=="[object String]"?this.split(""):object,length=self.length>>>0,thisp=arguments[1];if(_toString(fun)!="[object Function]"){throw new TypeError(fun+" is not a function")}for(var i=0;i<length;i++){if(i in self&&!fun.call(thisp,self[i],i,object)){return false}}return true}}if(!Array.prototype.some){Array.prototype.some=function some(fun){var object=toObject(this),self=splitString&&_toString(this)=="[object String]"?this.split(""):object,length=self.length>>>0,thisp=arguments[1];if(_toString(fun)!="[object Function]"){throw new TypeError(fun+" is not a function")}for(var i=0;i<length;i++){if(i in self&&fun.call(thisp,self[i],i,object)){return true}}return false}}if(!Array.prototype.reduce){Array.prototype.reduce=function reduce(fun){var object=toObject(this),self=splitString&&_toString(this)=="[object String]"?this.split(""):object,length=self.length>>>0;if(_toString(fun)!="[object Function]"){throw new TypeError(fun+" is not a function")}if(!length&&arguments.length==1){throw new TypeError("reduce of empty array with no initial value")}var i=0;var result;if(arguments.length>=2){result=arguments[1]}else{do{if(i in self){result=self[i++];break}if(++i>=length){throw new TypeError("reduce of empty array with no initial value")}}while(true)}for(;i<length;i++){if(i in self){result=fun.call(void 0,result,self[i],i,object)}}return result}}if(!Array.prototype.reduceRight){Array.prototype.reduceRight=function reduceRight(fun){var object=toObject(this),self=splitString&&_toString(this)=="[object String]"?this.split(""):object,length=self.length>>>0;if(_toString(fun)!="[object Function]"){throw new TypeError(fun+" is not a function")}if(!length&&arguments.length==1){throw new TypeError("reduceRight of empty array with no initial value")}var result,i=length-1;if(arguments.length>=2){result=arguments[1]}else{do{if(i in self){result=self[i--];break}if(--i<0){throw new TypeError("reduceRight of empty array with no initial value")}}while(true)}if(i<0){return result}do{if(i in this){result=fun.call(void 0,result,self[i],i,object)}}while(i--);return result}}if(!Array.prototype.indexOf||[0,1].indexOf(1,2)!=-1){Array.prototype.indexOf=function indexOf(sought){var self=splitString&&_toString(this)=="[object String]"?this.split(""):toObject(this),length=self.length>>>0;if(!length){return-1}var i=0;if(arguments.length>1){i=toInteger(arguments[1])}i=i>=0?i:Math.max(0,length+i);for(;i<length;i++){if(i in self&&self[i]===sought){return i}}return-1}}if(!Array.prototype.lastIndexOf||[0,1].lastIndexOf(0,-3)!=-1){Array.prototype.lastIndexOf=function lastIndexOf(sought){var self=splitString&&_toString(this)=="[object String]"?this.split(""):toObject(this),length=self.length>>>0;if(!length){return-1}var i=length-1;if(arguments.length>1){i=Math.min(i,toInteger(arguments[1]))}i=i>=0?i:length-Math.abs(i);for(;i>=0;i--){if(i in self&&sought===self[i]){return i}}return-1}}if(!Object.keys){var hasDontEnumBug=true,dontEnums=["toString","toLocaleString","valueOf","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","constructor"],dontEnumsLength=dontEnums.length;for(var key in{toString:null}){hasDontEnumBug=false}Object.keys=function keys(object){if(typeof object!="object"&&typeof object!="function"||object===null){throw new TypeError("Object.keys called on a non-object")}var keys=[];for(var name in object){if(owns(object,name)){keys.push(name)}}if(hasDontEnumBug){for(var i=0,ii=dontEnumsLength;i<ii;i++){var dontEnum=dontEnums[i];if(owns(object,dontEnum)){keys.push(dontEnum)}}}return keys}}var negativeDate=-621987552e5,negativeYearString="-000001";if(!Date.prototype.toISOString||new Date(negativeDate).toISOString().indexOf(negativeYearString)===-1){Date.prototype.toISOString=function toISOString(){var result,length,value,year,month;if(!isFinite(this)){throw new RangeError("Date.prototype.toISOString called on non-finite value.")}year=this.getUTCFullYear();month=this.getUTCMonth();year+=Math.floor(month/12);month=(month%12+12)%12;result=[month+1,this.getUTCDate(),this.getUTCHours(),this.getUTCMinutes(),this.getUTCSeconds()];year=(year<0?"-":year>9999?"+":"")+("00000"+Math.abs(year)).slice(0<=year&&year<=9999?-4:-6);length=result.length;while(length--){value=result[length];if(value<10){result[length]="0"+value}}return year+"-"+result.slice(0,2).join("-")+"T"+result.slice(2).join(":")+"."+("000"+this.getUTCMilliseconds()).slice(-3)+"Z"}}var dateToJSONIsSupported=false;try{dateToJSONIsSupported=Date.prototype.toJSON&&new Date(NaN).toJSON()===null&&new Date(negativeDate).toJSON().indexOf(negativeYearString)!==-1&&Date.prototype.toJSON.call({toISOString:function(){return true}})}catch(e){}if(!dateToJSONIsSupported){Date.prototype.toJSON=function toJSON(key){var o=Object(this),tv=toPrimitive(o),toISO;if(typeof tv==="number"&&!isFinite(tv)){return null}toISO=o.toISOString;if(typeof toISO!="function"){throw new TypeError("toISOString property is not callable")}return toISO.call(o)}}if(!Date.parse||"Date.parse is buggy"){Date=function(NativeDate){function Date(Y,M,D,h,m,s,ms){var length=arguments.length;if(this instanceof NativeDate){var date=length==1&&String(Y)===Y?new NativeDate(Date.parse(Y)):length>=7?new NativeDate(Y,M,D,h,m,s,ms):length>=6?new NativeDate(Y,M,D,h,m,s):length>=5?new NativeDate(Y,M,D,h,m):length>=4?new NativeDate(Y,M,D,h):length>=3?new NativeDate(Y,M,D):length>=2?new NativeDate(Y,M):length>=1?new NativeDate(Y):new NativeDate;date.constructor=Date;return date}return NativeDate.apply(this,arguments)}var isoDateExpression=new RegExp("^"+"(\\d{4}|[+-]\\d{6})"+"(?:-(\\d{2})"+"(?:-(\\d{2})"+"(?:"+"T(\\d{2})"+":(\\d{2})"+"(?:"+":(\\d{2})"+"(?:(\\.\\d{1,}))?"+")?"+"("+"Z|"+"(?:"+"([-+])"+"(\\d{2})"+":(\\d{2})"+")"+")?)?)?)?"+"$");var months=[0,31,59,90,120,151,181,212,243,273,304,334,365];function dayFromMonth(year,month){var t=month>1?1:0;return months[month]+Math.floor((year-1969+t)/4)-Math.floor((year-1901+t)/100)+Math.floor((year-1601+t)/400)+365*(year-1970)}for(var key in NativeDate){Date[key]=NativeDate[key]}Date.now=NativeDate.now;Date.UTC=NativeDate.UTC;Date.prototype=NativeDate.prototype;Date.prototype.constructor=Date;Date.parse=function parse(string){var match=isoDateExpression.exec(string);if(match){var year=Number(match[1]),month=Number(match[2]||1)-1,day=Number(match[3]||1)-1,hour=Number(match[4]||0),minute=Number(match[5]||0),second=Number(match[6]||0),millisecond=Math.floor(Number(match[7]||0)*1e3),offset=!match[4]||match[8]?0:Number(new NativeDate(1970,0)),signOffset=match[9]==="-"?1:-1,hourOffset=Number(match[10]||0),minuteOffset=Number(match[11]||0),result;if(hour<(minute>0||second>0||millisecond>0?24:25)&&minute<60&&second<60&&millisecond<1e3&&month>-1&&month<12&&hourOffset<24&&minuteOffset<60&&day>-1&&day<dayFromMonth(year,month+1)-dayFromMonth(year,month)){result=((dayFromMonth(year,month)+day)*24+hour+hourOffset*signOffset)*60;result=((result+minute+minuteOffset*signOffset)*60+second)*1e3+millisecond+offset;if(-864e13<=result&&result<=864e13){return result}}return NaN}return NativeDate.parse.apply(this,arguments)};return Date}(Date)}if(!Date.now){Date.now=function now(){return(new Date).getTime()}}if(!Number.prototype.toFixed||8e-5.toFixed(3)!=="0.000"||.9.toFixed(0)==="0"||1.255.toFixed(2)!=="1.25"||0xde0b6b3a7640080.toFixed(0)!=="1000000000000000128"){(function(){var base,size,data,i;base=1e7;size=6;data=[0,0,0,0,0,0];function multiply(n,c){var i=-1;while(++i<size){c+=n*data[i];data[i]=c%base;c=Math.floor(c/base)}}function divide(n){var i=size,c=0;while(--i>=0){c+=data[i];data[i]=Math.floor(c/n);c=c%n*base}}function toString(){var i=size;var s="";while(--i>=0){if(s!==""||i===0||data[i]!==0){var t=String(data[i]);if(s===""){s=t}else{s+="0000000".slice(0,7-t.length)+t}}}return s}function pow(x,n,acc){return n===0?acc:n%2===1?pow(x,n-1,acc*x):pow(x*x,n/2,acc)}function log(x){var n=0;while(x>=4096){n+=12;x/=4096}while(x>=2){n+=1;x/=2}return n}Number.prototype.toFixed=function(fractionDigits){var f,x,s,m,e,z,j,k;f=Number(fractionDigits);f=f!==f?0:Math.floor(f);if(f<0||f>20){throw new RangeError("Number.toFixed called with invalid number of decimals")}x=Number(this);if(x!==x){return"NaN"}if(x<=-1e21||x>=1e21){return String(x)}s="";if(x<0){s="-";x=-x}m="0";if(x>1e-21){e=log(x*pow(2,69,1))-69;z=e<0?x*pow(2,-e,1):x/pow(2,e,1);z*=4503599627370496;e=52-e;if(e>0){multiply(0,z);j=f;while(j>=7){multiply(1e7,0);j-=7}multiply(pow(10,j,1),0);j=e-1;while(j>=23){divide(1<<23);j-=23}divide(1<<j);multiply(1,1);divide(2);m=toString()}else{multiply(0,z);multiply(1<<-e,0);m=toString()+"0.00000000000000000000".slice(2,2+f)}}if(f>0){k=m.length;if(k<=f){m=s+"0.0000000000000000000".slice(0,f-k+2)+m}else{m=s+m.slice(0,k-f)+"."+m.slice(k-f)}}else{m=s+m}return m}})()}var string_split=String.prototype.split;if("ab".split(/(?:ab)*/).length!==2||".".split(/(.?)(.?)/).length!==4||"tesst".split(/(s)*/)[1]==="t"||"".split(/.?/).length===0||".".split(/()()/).length>1){(function(){var compliantExecNpcg=/()??/.exec("")[1]===void 0;String.prototype.split=function(separator,limit){var string=this;if(separator===void 0&&limit===0)return[];if(Object.prototype.toString.call(separator)!=="[object RegExp]"){return string_split.apply(this,arguments)}var output=[],flags=(separator.ignoreCase?"i":"")+(separator.multiline?"m":"")+(separator.extended?"x":"")+(separator.sticky?"y":""),lastLastIndex=0,separator=new RegExp(separator.source,flags+"g"),separator2,match,lastIndex,lastLength;string+="";if(!compliantExecNpcg){separator2=new RegExp("^"+separator.source+"$(?!\\s)",flags)}limit=limit===void 0?-1>>>0:limit>>>0;while(match=separator.exec(string)){lastIndex=match.index+match[0].length;if(lastIndex>lastLastIndex){output.push(string.slice(lastLastIndex,match.index));if(!compliantExecNpcg&&match.length>1){match[0].replace(separator2,function(){for(var i=1;i<arguments.length-2;i++){if(arguments[i]===void 0){match[i]=void 0}}})}if(match.length>1&&match.index<string.length){Array.prototype.push.apply(output,match.slice(1))}lastLength=match[0].length;lastLastIndex=lastIndex;if(output.length>=limit){break}}if(separator.lastIndex===match.index){separator.lastIndex++}}if(lastLastIndex===string.length){if(lastLength||!separator.test("")){output.push("")}}else{output.push(string.slice(lastLastIndex))}return output.length>limit?output.slice(0,limit):output}})()}else if("0".split(void 0,0).length){String.prototype.split=function(separator,limit){if(separator===void 0&&limit===0)return[];return string_split.apply(this,arguments)}}if("".substr&&"0b".substr(-1)!=="b"){var string_substr=String.prototype.substr;String.prototype.substr=function(start,length){return string_substr.call(this,start<0?(start=this.length+start)<0?0:start:start,length)}}var ws="	\n\f\r \xa0\u1680\u180e\u2000\u2001\u2002\u2003"+"\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028"+"\u2029\ufeff";if(!String.prototype.trim||ws.trim()){ws="["+ws+"]";var trimBeginRegexp=new RegExp("^"+ws+ws+"*"),trimEndRegexp=new RegExp(ws+ws+"*$");String.prototype.trim=function trim(){if(this===void 0||this===null){throw new TypeError("can't convert "+this+" to object")}return String(this).replace(trimBeginRegexp,"").replace(trimEndRegexp,"")}}function toInteger(n){n=+n;if(n!==n){n=0}else if(n!==0&&n!==1/0&&n!==-(1/0)){n=(n>0||-1)*Math.floor(Math.abs(n))}return n}function isPrimitive(input){var type=typeof input;return input===null||type==="undefined"||type==="boolean"||type==="number"||type==="string"}function toPrimitive(input){var val,valueOf,toString;if(isPrimitive(input)){return input}valueOf=input.valueOf;if(typeof valueOf==="function"){val=valueOf.call(input);if(isPrimitive(val)){return val}}toString=input.toString;if(typeof toString==="function"){val=toString.call(input);if(isPrimitive(val)){return val}}throw new TypeError}var toObject=function(o){if(o==null){throw new TypeError("can't convert "+o+" to object")}return Object(o)}});
/*
//@ sourceMappingURL=es5-shim.map
*/;
(function(definition){if(typeof define=="function"){define('vendor/es5-shim/es5-sham.min',definition)}else if(typeof YUI=="function"){YUI.add("es5-sham",definition)}else{definition()}})(function(){var call=Function.prototype.call;var prototypeOfObject=Object.prototype;var owns=call.bind(prototypeOfObject.hasOwnProperty);var defineGetter;var defineSetter;var lookupGetter;var lookupSetter;var supportsAccessors;if(supportsAccessors=owns(prototypeOfObject,"__defineGetter__")){defineGetter=call.bind(prototypeOfObject.__defineGetter__);defineSetter=call.bind(prototypeOfObject.__defineSetter__);lookupGetter=call.bind(prototypeOfObject.__lookupGetter__);lookupSetter=call.bind(prototypeOfObject.__lookupSetter__)}if(!Object.getPrototypeOf){Object.getPrototypeOf=function getPrototypeOf(object){return object.__proto__||(object.constructor?object.constructor.prototype:prototypeOfObject)}}function doesGetOwnPropertyDescriptorWork(object){try{object.sentinel=0;return Object.getOwnPropertyDescriptor(object,"sentinel").value===0}catch(exception){}}if(Object.defineProperty){var getOwnPropertyDescriptorWorksOnObject=doesGetOwnPropertyDescriptorWork({});var getOwnPropertyDescriptorWorksOnDom=typeof document=="undefined"||doesGetOwnPropertyDescriptorWork(document.createElement("div"));if(!getOwnPropertyDescriptorWorksOnDom||!getOwnPropertyDescriptorWorksOnObject){var getOwnPropertyDescriptorFallback=Object.getOwnPropertyDescriptor}}if(!Object.getOwnPropertyDescriptor||getOwnPropertyDescriptorFallback){var ERR_NON_OBJECT="Object.getOwnPropertyDescriptor called on a non-object: ";Object.getOwnPropertyDescriptor=function getOwnPropertyDescriptor(object,property){if(typeof object!="object"&&typeof object!="function"||object===null){throw new TypeError(ERR_NON_OBJECT+object)}if(getOwnPropertyDescriptorFallback){try{return getOwnPropertyDescriptorFallback.call(Object,object,property)}catch(exception){}}if(!owns(object,property)){return}var descriptor={enumerable:true,configurable:true};if(supportsAccessors){var prototype=object.__proto__;object.__proto__=prototypeOfObject;var getter=lookupGetter(object,property);var setter=lookupSetter(object,property);object.__proto__=prototype;if(getter||setter){if(getter){descriptor.get=getter}if(setter){descriptor.set=setter}return descriptor}}descriptor.value=object[property];descriptor.writable=true;return descriptor}}if(!Object.getOwnPropertyNames){Object.getOwnPropertyNames=function getOwnPropertyNames(object){return Object.keys(object)}}if(!Object.create){var createEmpty;var supportsProto=Object.prototype.__proto__===null;if(supportsProto||typeof document=="undefined"){createEmpty=function(){return{__proto__:null}}}else{createEmpty=function(){var iframe=document.createElement("iframe");var parent=document.body||document.documentElement;iframe.style.display="none";parent.appendChild(iframe);iframe.src="javascript:";var empty=iframe.contentWindow.Object.prototype;parent.removeChild(iframe);iframe=null;delete empty.constructor;delete empty.hasOwnProperty;delete empty.propertyIsEnumerable;delete empty.isPrototypeOf;delete empty.toLocaleString;delete empty.toString;delete empty.valueOf;empty.__proto__=null;function Empty(){}Empty.prototype=empty;createEmpty=function(){return new Empty};return new Empty}}Object.create=function create(prototype,properties){var object;function Type(){}if(prototype===null){object=createEmpty()}else{if(typeof prototype!=="object"&&typeof prototype!=="function"){throw new TypeError("Object prototype may only be an Object or null")}Type.prototype=prototype;object=new Type;object.__proto__=prototype}if(properties!==void 0){Object.defineProperties(object,properties)}return object}}function doesDefinePropertyWork(object){try{Object.defineProperty(object,"sentinel",{});return"sentinel"in object}catch(exception){}}if(Object.defineProperty){var definePropertyWorksOnObject=doesDefinePropertyWork({});var definePropertyWorksOnDom=typeof document=="undefined"||doesDefinePropertyWork(document.createElement("div"));if(!definePropertyWorksOnObject||!definePropertyWorksOnDom){var definePropertyFallback=Object.defineProperty,definePropertiesFallback=Object.defineProperties}}if(!Object.defineProperty||definePropertyFallback){var ERR_NON_OBJECT_DESCRIPTOR="Property description must be an object: ";var ERR_NON_OBJECT_TARGET="Object.defineProperty called on non-object: ";var ERR_ACCESSORS_NOT_SUPPORTED="getters & setters can not be defined "+"on this javascript engine";Object.defineProperty=function defineProperty(object,property,descriptor){if(typeof object!="object"&&typeof object!="function"||object===null){throw new TypeError(ERR_NON_OBJECT_TARGET+object)}if(typeof descriptor!="object"&&typeof descriptor!="function"||descriptor===null){throw new TypeError(ERR_NON_OBJECT_DESCRIPTOR+descriptor)}if(definePropertyFallback){try{return definePropertyFallback.call(Object,object,property,descriptor)}catch(exception){}}if(owns(descriptor,"value")){if(supportsAccessors&&(lookupGetter(object,property)||lookupSetter(object,property))){var prototype=object.__proto__;object.__proto__=prototypeOfObject;delete object[property];object[property]=descriptor.value;object.__proto__=prototype}else{object[property]=descriptor.value}}else{if(!supportsAccessors){throw new TypeError(ERR_ACCESSORS_NOT_SUPPORTED)}if(owns(descriptor,"get")){defineGetter(object,property,descriptor.get)}if(owns(descriptor,"set")){defineSetter(object,property,descriptor.set)}}return object}}if(!Object.defineProperties||definePropertiesFallback){Object.defineProperties=function defineProperties(object,properties){if(definePropertiesFallback){try{return definePropertiesFallback.call(Object,object,properties)}catch(exception){}}for(var property in properties){if(owns(properties,property)&&property!="__proto__"){Object.defineProperty(object,property,properties[property])}}return object}}if(!Object.seal){Object.seal=function seal(object){return object}}if(!Object.freeze){Object.freeze=function freeze(object){return object}}try{Object.freeze(function(){})}catch(exception){Object.freeze=function freeze(freezeObject){return function freeze(object){if(typeof object=="function"){return object}else{return freezeObject(object)}}}(Object.freeze)}if(!Object.preventExtensions){Object.preventExtensions=function preventExtensions(object){return object}}if(!Object.isSealed){Object.isSealed=function isSealed(object){return false}}if(!Object.isFrozen){Object.isFrozen=function isFrozen(object){return false}}if(!Object.isExtensible){Object.isExtensible=function isExtensible(object){if(Object(object)!==object){throw new TypeError}var name="";while(owns(object,name)){name+="?"}object[name]=true;var returnValue=owns(object,name);delete object[name];return returnValue}}});
/*
//@ sourceMappingURL=es5-sham.map
*/;
requirejs.config({
    //baseUrl : 'http://l2vote.local/static/voz',
    paths   : {
        plugin          : '../vendor/require',
        jPlugin         : '../vendor/jPlugin',
        vendor          : '../vendor',
        nls             : 'i18n'
    },
    shim: {
        'boot/page': [
            'vendor/bootstrap.min'
        ],
        'vendor/es5-shim/es5-sham.min': [
            'vendor/es5-shim/es5-shim.min'
        ],
        'vendor/flight/tools/debug/debug': [
            'vendor/es5-shim/es5-sham.min'
        ]
    },
    locale  : 'VN',
    urlArgs: "bust=" +  new Date().getTime()
});

define('converter', ['vendor/showdown/compressed/showdown'], function(){
    //console.log('init Converter');
    window.converter = new Showdown.converter();
})

require(
    [
        'vendor/flight/lib/compose',
        'vendor/flight/lib/registry',
        'vendor/flight/lib/advice',
        'vendor/flight/lib/logger',
        'vendor/flight/lib/debug',
        'boot/page',
        'vendor/es5-shim/es5-shim.min',
        'vendor/es5-shim/es5-sham.min'
        //'vendor/jquery-cookie/jquery.cookie'
    ],
    function(
        compose
        , registry
        , advice
        , withLogging
        , debug
        , initialize
        ) {
        debug.enable(true);
        debug.events.logAll();
        compose.mixin(registry, [advice.withAdvice, withLogging]);
        $(document).ready(function(){
            initialize();
        })
    }
);
define("main", function(){});
