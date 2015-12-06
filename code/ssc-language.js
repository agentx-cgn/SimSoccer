/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals  H */
/*jshint -W030 */
/*jshint -W069 */
/*--------------- D S L -------------------------------------------------------

  builds a DSL with a fluent interface used in e.g. groups, 
  based on method chaining/cascading

  tested with 0 A.D. Alpha 18 Rhododactylus
  V: 0.1.1, agentx, CGN, Mar, 2015

*/

/*
  Intro: 

    WARNING  :  The language introduced here, looks like JavaScript and meets its
                syntax. However, e.g. a variable (object) does not hold a value, 
                instead it changes the state of the world, same do methods.

    DSL      :  The language module
    Corpus   :  A set of nouns, verbs and attributes [e.g. groups]
    World    :  An environment an actor can change via the language 
                [all groups share same world]. world is usually the first 
                parameter (w) in a script call function.
    Actor    :  Sets the meaning of nouns, verbs, attributes, at each time only 
                one actor is in a world. In the groups world each group instance 
                maps onto an actor.
    Sentence :  JS code written in DSL to describe the behaviour of the world
    Noun     :  Each sentence consist (minimum) of the world, noun and a verb,
                The world acts also as a noun, so w.log() is a valid sentence.
                Nouns are not followed by parenthesis in opposite to verbs.
    Subject   : The currently selected noun.
    Object    : The currently active noun.
    Verbs     : Assuming the nouns: units, resources + verbs: gather, move
                w.units.move(xy), or w.units.gather(w.resources) are correct.
    Modifiers : Stop sentence execution thus allowing flow control. The remainder
                of a sentence remains unheard.

                  .exists(a)   // breaks on a === undefined
                  .match(a, b) // on a !== b
                  .gt(a, b)    // on a < b
                  .lt(a, b)    // on a > b

                Above are global modifiers, groups have:

                  .member(a, b)   // breaks if a is not completely member of b


    Example   : 
                  var assign = function(w, item){
                    
                    // make item available as object
                    w.nounify("item", item);
                    
                    // keep requesting units until size
                    w.units.on                          // set units as subject
                      .member(item)                     // proceed if item is member of units
                      .lt(w.units.count, w.units.size)  // proceed if count < size
                      .request()                        // order 1 unit from economy
                    ;

                  };

*/


var DSL = {Nouns: {}};

DSL.World = function (config) {

  //dsl, 

  H.extend(this, config);

};

DSL.World.prototype = {
  constructor: DSL.World,
  toString: function(){},


};

DSL.Language = function (handler, corpus) {

  H.extend(this, {
    corpusname:    corpus,
    corpus:        DSL.Corpora[corpus],
    verbs:         {},
    world:         null,
    scriptname:    ""
  });

  // this.deb("  LANG: loaded corpus: %s", this.corpusname);

};

DSL.Language.prototype = {
  constructor: DSL.Language,
  createWorld: function(actor){

    var self = this, world = {actor: actor};

    // this.deb("   DSL: createActor");
    
    H.extend(world, {

      dsl:      this,      // uplink

      execute:  false,     // script execution is enabled
      proceed:  false,     // sentence execution is enabled

      nouns:      {},      // can become a subject or objects
      subject:  null,      // currently active subject
      object:   null,      // currently active object

      // open a can of worms
      // TODO: make this debug/dev only
      "__noSuchMethod__": (name, args) => {
        H.throw("world %s does not implement method/verb '%s' with: [%s]", this.name, name, args);
        return world[name];
      },

      reset: (actor) => {
        // this.deb("   DSL: world reset from sentence: %s", world.sentence);
        world.actor    = actor;
        world.sentence = [];
        world.debug    = false;
        world.proceed  = true;
        world.execute  = true;
        world.subject  = null;
        world.object   = null;
        H.each(this.corpus.nouns, noun => {
          ( world.nouns[noun] && world.nouns[noun].update && world.nouns[noun].update() );
        });

      },
      nounify:  () => {

        var host, args = H.toArray(arguments);

        H.peekNext(args, 2, (noun, obj, next) => {

          if (this.corpus.nouns[noun]){
          
            if (typeof noun === "string" && typeof obj === "object"){
              this.setnoun(world, noun, new this.corpus.nouns[noun](obj, noun));
              next(2);
              
            } else {
              host = this.handler.nounify(world, actor, noun);
              this.setnoun(world, noun, new this.corpus.nouns[noun](host, noun));
              next(1);
              
            }

          } else {
            H.throw("Language: unknown noun: '%s'", noun);

          }
          
        });

      },

      // debug
      sentence: [],
      toString: () => H.format("[world %s]", this.corpusname),
      deb:      function(){
        self.deb.apply(self, arguments);
        return world;
      },
      log:      function(){
        var msg = H.format.apply(null, arguments);
        if (world.execute && world.proceed){
          world.deb("------: ");
          world.deb("      : " + msg);
          world.deb("      :    actor: %s, script: %s", world.actor, self.scriptname);
          world.deb("      :  subject: %s, object: %s", world.subject, world.object);
          world.deb("      : sentence: %s", world.sentence);
          H.each(self.corpus.nouns, noun => {
            if (world[noun]){
              world.deb("      : %s -> %s", noun, world[noun]);
            }
          });
          world.deb("------: ");
        }
        return world;
      },
      echo:   function(){
        if (world.execute && world.proceed){
          world.deb("   WLD: ECHO: %s %s", world.actor, H.format.apply(null, arguments));
        }
        return world;
      },

    });

    // Controlflow-Particle
    // on, off, do
    H.each(DSL.Corpora.globals.meta, (name, fn) => {
      Object.defineProperty(world, name, {
        get: fn, enumerable: true
      });
    });

    // Controlflow w/ Params
    // reset, end, member, lt, gt, match
    H.each(
      DSL.Corpora.globals.modifier, 
      this.corpus.modifier, 
      (name, fn) => this.setverb(world, name, fn)
    );

    // basically reduce
    // count, size, position, health
    H.each(
      this.corpus.attributes, 
      (name, fn) => this.setattribute(world, name, fn)
    );      

    // ??
    // points
    H.each(
      this.corpus.methods, 
      (name, fn) => this.setgetter(world, name, fn)
    );      

    return world;

  },
  runScript: function(world, actor, script, params){
    var t1, t0 = Date.now();
    this.world = world;
    this.scriptname = script.name;
    world.reset(actor);
    params.unshift(world);
    script.apply(actor, params);
    t1 = Date.now();
    if(t1 - t0 > 10){
      this.deb("WARN  : DSL: runScript took %s msec %s.%s", t1 - t0, actor, script.name);
    }
  },
  setnoun:  function(world, noun, obj){
    // this.deb("   DSL: setnoun: %s", noun);
    world.nouns[noun] = obj;
    Object.defineProperty(world, noun, {
        configurable: true, enumerable: true, 
        get: function () {
          if (this.execute){
            this.sentence.push(["o:", noun]);
            this.object = obj;
            // this.deb("   DSL: setobject: %s", noun);
          } else {
            // this.deb("   DSL: ignored setobject: %s", noun);
          }
          return this;
        }
    });
  },
  setverbs: function(world, verbs){
    H.each(verbs, (verb, fn) => this.setverb(world, verb, fn));
  },
  setverb:  function(world, verb, fn){
    // this.deb("   DSL: setverb: %s", verb);
    world[verb] = () => {
      var args = H.toArray(arguments); //, world = this.world;
      if (world.execute && world.proceed){
        if (world.debug){this.deb("   WLD: %s %s %s", world.subject.name, verb, world.object.name);}
        world.sentence.push(["v:", verb]);
        args.unshift(world.actor, world.subject, world.object);
        fn.apply(world, args);
        // this.deb("   DSL: applied verb '%s' args: %s", verb, args);
      } else {
        // this.deb("   DSL: ignored: verb '%s' pro: %s, exe: %s", verb, world.proceed, world.execute);
      }
      return world;
    };
  },
  setattribute:  function(world, attribute, fn){
    // this.deb("   DSL: setattribute: %s", attribute);
    Object.defineProperty(world, attribute, {
        configurable: true, enumerable: true, 
        get: function () {
          this.sentence.push(["a:", attribute]);
          if (this.execute && this.proceed){
            // this.deb("   DSL: read attribute '%s'", attribute);
            return fn.apply(this, [this.subject, this.object]);
          } else {
            // this.deb("   DSL: ignored attribute '%s' pro: %s, exe: %s", attribute, this.proceed, this.execute);
            return null;
          }
        }
    });
  },
  setgetter:  function(world, method, fn){
    // this.deb("   DSL: setgetter: %s", method);
    // this.deb("   DSL: setverb: %s", method);
    world[method] = () => {
      var args = H.toArray(arguments); //, world = this.world;
      if (world.execute && world.proceed){
        if (world.debug){this.deb("   WLD: %s %s %s", world.subject.name, method, world.object.name);}
        world.sentence.push(["m:", method]);
        args.unshift(world.subject, world.object);
        return fn.apply(world, args);
        // this.deb("   DSL: applied method '%s' args: %s", method, args);
      } else {
        // this.deb("   DSL: ignored: method '%s' pro: %s, exe: %s", method, world.proceed, world.execute);
      }
      return null;
    };
  },

};


  // Must be before corpus

DSL.Nouns.Group = function(host, name){
  this.name = name;
  this.host = host;
  this.update();
};
DSL.Nouns.Group.prototype = {
  constructor: DSL.Nouns.Group,
  toString: function(){return H.format("[noun:group %s]", this.name);},
  update: function(){
    this.position = this.host.position;
  }
};

  // a generic, represents an asset with a list of entities
  
DSL.Nouns.Bodies = function(host, name){
  this.name = name;
  this.host = host;
  this.update();
};
DSL.Nouns.Bodies.prototype = {
  constructor: DSL.Nouns.Bodies,
  toString: function(){return H.format("[noun:entities %s[%s]]", this.name, this.list.join("|"));},
  update: function(){
    this.list = this.host.resources.slice();
    this.size = this.host.size;
    this.position = this.host.position;
  }
};

DSL.Nouns.Device = function(device, name){
  this.name = name;
  this.device = device;
  this.verbs = [
    "scan",
  ];
};
DSL.Nouns.Device.prototype = {
  constructor: DSL.Nouns.Device,
  toString: function(){return H.format("[noun:scanner  %s[%s]]", this.name, this.list.join("|"));},
};

DSL.Helper = {
  vision: function( /* list */ ){},
};

DSL.Corpora = {
  globals: {
    meta: {
      on: function(){
        if (this.execute){
          this.proceed = true;  
          this.sentence = ["s:", this.object.name];
          this.subject = this.object;
          // this.deb("   DSL: on setsubject: %s", this.subject);
          // this.deb("--.on.out");
        }
        return this;
      },
      do: function(){
        if (this.execute && this.proceed){
          this.sentence.push(["s:", this.object.name]);
          this.subject = this.object;
          // this.deb("   DSL: do setsubject: %s", this.subject);
        }
        return this;          
      },
      off: function(){
        if (this.execute && this.proceed){
          this.subject = null;
          this.object = null;
          this.proceed = false; 
        }
        return this;          
      },
      exit:    function(){
        if (this.proceed){
          this.subject = null;
          this.object  = null;
          this.execute = false; 
          this.proceed = false; 
          // this.deb("   DSL: EXIT ================");
        }
        return this;
      },
    },
    modifier: {
      match:  function(act, sub, obj, a, b){
        if (this.execute && this.proceed){
          if (a === undefined && b === undefined){
            this.proceed = false;
          } else if (a !== undefined && b === undefined){
            this.proceed = !!a;
            // pass on single param valid
          } else if (a !== b){
            this.proceed = false;
          }
        }
        return this;
      },
      gt:     function(act, sub, obj, a, b){
        if (this.execute && this.proceed){
          if (a !== undefined && b !== undefined && ( a <= b)){
            this.proceed = false;
          }
        }
        // this.log("   DSL: lt.out:  got %s, %s proceed: %s", a, b, this.proceed);
        return this;
      },
      lt:     function(act, sub, obj, a, b){
        if (this.execute && this.proceed){
          if (a !== undefined && b !== undefined && ( a >= b)){
            this.proceed = false;
          }
        }
        // this.log("   DSL: lt.out:  got %s, %s proceed: %s", a, b, this.proceed);
        return this;
      }
    },
  },
  groups: {
    name: "groups",
    // verbs are defined in groups.js
    nouns : {

      // devices, special
      "group":       DSL.Nouns.Group,
      "path":        DSL.Nouns.Path,
      "scanner":     DSL.Nouns.Device,   

      // based on entities
      "ball":        DSL.Nouns.Bodies,   
      "player":      DSL.Nouns.Bodies,   
      "players":     DSL.Nouns.Bodies,   
      "opponent":    DSL.Nouns.Bodies, 
      "keeper":      DSL.Nouns.Bodies,  

    },
    methods: {
      points: function(s, o, selector){
        return [o.list[selector]];
      },
    },
    attributes: {
      health:       function(s, o){return this.health(o.list);}, 
      count:        function(s, o){return o.list.length;}, 
      first:        function(s, o){return o.list[0];}, 
      size:         function(s, o){return o.size;}, 
      distance:     function(s, o){
        return this.dsl.map.distance (
          this.dsl.map.getCenter(s.list), 
          this.dsl.map.getCenter(o.list)
        );
      }, 
      direction:    function(s, o){
        var 
          spos = this.dsl.map.getCenter(s.list),
          opos = this.dsl.map.getCenter(o.list);
        return [ opos[0] - spos[0], opos[1] - spos[1] ];
      },
      position:     function(s, o){
        if (o instanceof DSL.Nouns.Group){
          return o.position;
        } else {
          return this.dsl.map.getCenter(o.list);
        }
      },
    },
    modifier: {
      member: function(act, s, o){

        // this.deb("   DSL: member.in: s: %s, o: %s, pro: %s, exe: %s", s, o, this.proceed, this.execute);

        if (s instanceof DSL.Nouns.Resources){
          // relies on groups have only single resource asset
          this.proceed = o.isresource;
          // this.deb("   DSL: match s = resource and o = res %s", o.isresource);

        } else {
          this.proceed = this.proceed ? (
            s && o && s.list && o.list && 
            s.list.length && o.list.length &&
            o.list.every(r => s.list.indexOf(r) !== -1)
          ) : false;

        }

        // this.deb("   DSL: member.out: s: %s, o: %s, pro: %s, exe: %s", s, o, this.proceed, this.execute);

        return this;
      },
    }
  }
};
